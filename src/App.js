import React, { useState, useEffect } from 'react';
import './App.css';
import VideoUpload from './components/VideoUpload';
import SwingAnalysis from './components/SwingAnalysis';
import SwingTracker from './components/SwingTracker';
import Navigation from './components/Navigation';
import ProComparison from './components/ProComparison';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import ClubBag from './components/ClubBag';
import WelcomeModal from './components/WelcomeModal';
import SetupFlow from './components/SetupFlow';
import geminiService from './services/geminiService';
import firestoreService from './services/firestoreService';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Modal component for login and other modal content
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};

// App content component (wrapped by AuthProvider)
const AppContent = () => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState(null);
  const [swingData, setSwingData] = useState(null);
  const [swingHistory, setSwingHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isSetupFlowOpen, setIsSetupFlowOpen] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  
  // Check if this is the user's first visit or login
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      if (currentUser) {
        try {
          // Check if the user has completed setup
          const userData = await firestoreService.getUserData(currentUser.uid);
          
          if (!userData || !userData.setupCompleted) {
            setIsSetupFlowOpen(true);
          }
        } catch (error) {
          console.error('Error checking user setup status:', error);
        }
      } else {
        // For non-authenticated users, check localStorage
        const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
        if (!hasVisitedBefore) {
          setIsWelcomeModalOpen(true);
          localStorage.setItem('hasVisitedBefore', 'true');
        }
      }
    };
    
    checkFirstTimeUser();
  }, [currentUser]);
  
  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          // Fetch user's swing history
          const swings = await firestoreService.getUserSwings(currentUser.uid);
          setSwingHistory(swings);
          
          // Set the most recent swing as the current swing data if on dashboard
          if (swings.length > 0 && currentPage === 'dashboard') {
            setSwingData(swings[0]);
          }
          
          // Get user stats
          const stats = await firestoreService.getUserStats(currentUser.uid);
          setUserStats(stats);
          
          // Get user clubs
          const clubs = await firestoreService.getUserClubs(currentUser.uid);
          setUserClubs(clubs || []);
          
        } catch (error) {
          console.error('Error loading user data:', error);
          setError('Failed to load your data. Please try again later.');
        }
      } else {
        // Clear user data when logged out
        setSwingHistory([]);
        setUserStats(null);
      }
    };
    
    loadUserData();
  }, [currentUser, currentPage]);

  // Function to analyze swing with optional club data
  const analyzeSwing = async (videoFile, clubData = null) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Get analysis from Gemini (or mock data)
      const analysisResult = await geminiService.analyzeGolfSwing(videoFile);
      
      // Save to Firestore if user is logged in
      if (currentUser) {
        const savedSwing = await firestoreService.saveSwingAnalysis(
          analysisResult, 
          currentUser.uid, 
          videoFile,
          clubData
        );
        
        // Update state with the saved data (includes Firestore ID)
        setSwingData(savedSwing);
        setSwingHistory(prev => [savedSwing, ...prev]);
        
        // Refresh user stats
        const stats = await firestoreService.getUserStats(currentUser.uid);
        setUserStats(stats);
      } else {
        // Just use the local data if not logged in
        const localResult = {
          ...analysisResult,
          _isLocalOnly: true,
          videoUrl: URL.createObjectURL(videoFile)
        };
        
        // Add club data if provided
        if (clubData) {
          localResult.clubId = clubData.clubId;
          localResult.clubName = clubData.clubName;
          localResult.clubType = clubData.clubType;
          localResult.outcome = clubData.outcome;
        }
        
        setSwingData(localResult);
        setSwingHistory(prev => [localResult, ...prev]);
        
        // Prompt user to login to save their data
        setIsLoginModalOpen(true);
      }
      
      navigateTo('analysis');
    } catch (error) {
      console.error("Error analyzing swing:", error);
      setError(error.message || "Failed to analyze swing. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle setup flow completion
  const handleSetupComplete = async (userData) => {
    if (currentUser) {
      try {
        // Save user profile data to Firestore
        await firestoreService.saveUserProfile(currentUser.uid, {
          ...userData,
          setupCompleted: true
        });
        
        // Update clubs state
        setUserClubs(userData.clubs);
        
        // Close setup flow modal
        setIsSetupFlowOpen(false);
      } catch (error) {
        console.error("Error saving user profile:", error);
        setError("Failed to save your profile. Please try again.");
      }
    } else {
      // For non-authenticated users, just close the modal
      setIsSetupFlowOpen(false);
    }
  };

  // Enhanced navigation handler with optional parameters
  const navigateTo = (page, params = null) => {
    setCurrentPage(page);
    setPageParams(params);
    setError(null);
  };

  // Render appropriate component based on current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
          swingHistory={swingHistory} 
          navigateTo={navigateTo} 
          userStats={userStats}
          userClubs={userClubs}
        />;
      case 'upload':
        return <VideoUpload 
          onVideoUpload={analyzeSwing}
          isAnalyzing={isAnalyzing}
          navigateTo={navigateTo}
        />;
      case 'analysis':
        return <SwingAnalysis 
          swingData={swingData} 
          navigateTo={navigateTo}
          setSwingHistory={setSwingHistory}
        />;
      case 'tracker':
        return <SwingTracker 
          swingHistory={swingHistory}
          setSwingHistory={setSwingHistory}
          navigateTo={navigateTo}
        />;
      case 'comparison':
        return <ProComparison 
          swingData={swingData} 
        />;
      case 'profile':
        return <UserProfile 
          navigateTo={navigateTo}
          userStats={userStats}
          userClubs={userClubs}
          setUserClubs={setUserClubs}
          setupClubsTab={pageParams?.setupClubs}
        />;
      case 'clubs':
        return <ClubBag 
          onComplete={() => navigateTo('profile')}
        />;
      default:
        return <Dashboard 
          swingHistory={swingHistory} 
          navigateTo={navigateTo}
          userStats={userStats}
          userClubs={userClubs}
        />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1>GOLF GURU</h1>
          
          {currentUser ? (
            <div 
              className="user-avatar" 
              onClick={() => navigateTo('profile')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{ marginRight: '10px', color: 'white' }}>
                {currentUser.displayName?.split(' ')[0] || 'User'}
              </span>
              <img 
                src={currentUser.photoURL || '/default-avatar.png'} 
                alt="Avatar" 
                style={{
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  border: '2px solid white'
                }}
              />
            </div>
          ) : (
            <button 
              className="button" 
              onClick={() => setIsLoginModalOpen(true)}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem'
              }}
            >
              Sign In
            </button>
          )}
        </div>
        <p>AI-Powered Swing Analysis</p>
      </header>
      
      <main className="App-main">
        {renderPage()}
      </main>
      
      <Navigation 
        currentPage={currentPage} 
        navigateTo={navigateTo} 
        showProfile={!!currentUser}
      />
      
      {/* Modals */}
      <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)}>
        <Login onClose={() => setIsLoginModalOpen(false)} />
      </Modal>

      <Modal isOpen={isWelcomeModalOpen} onClose={() => setIsWelcomeModalOpen(false)}>
        <WelcomeModal onClose={() => setIsWelcomeModalOpen(false)} onSetup={() => setIsSetupFlowOpen(true)} />
      </Modal>
      
      <Modal 
        isOpen={isSetupFlowOpen} 
        onClose={() => currentUser ? null : setIsSetupFlowOpen(false)} // Only allow closing for non-auth users
      >
        <SetupFlow onComplete={handleSetupComplete} />
      </Modal>
    </div>
  );
};

// Main App component with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;