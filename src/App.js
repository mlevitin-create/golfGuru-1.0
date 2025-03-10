// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import VideoUpload from './components/VideoUpload';
import SwingAnalysis from './components/SwingAnalysis';
import SwingTracker from './components/SwingTracker';
import Navigation from './components/Navigation';
import MobileNavDropdown from './components/MobileNavDropdown';
import ProComparison from './components/ProComparison';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import WelcomeModal from './components/WelcomeModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import geminiService from './services/geminiService';
import firestoreService from './services/firestoreService';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Modal component for login and other modal content
const Modal = ({ isOpen, onClose, children, canClose = true }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={canClose ? onClose : undefined}
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
  const [isProfileSetupModalOpen, setIsProfileSetupModalOpen] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Check if the screen is mobile size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Enhanced navigation handler with robust scroll to top functionality
  const navigateTo = (page, params = null) => {
    setCurrentPage(page);
    setPageParams(params);
    
    // If navigating to analysis page with specific swing data, update current swing data
    if (page === 'analysis' && params && params.swingData) {
      setSwingData(params.swingData);
    }
    
    setError(null);
    
    // Scroll to the top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // User setup status check - defined outside useEffect to avoid recreation
  const checkUserSetupStatus = async () => {
    if (currentUser) {
      try {
        // First check localStorage flag set during login/signup
        const needsProfileSetup = localStorage.getItem('needsProfileSetup');
        
        if (needsProfileSetup === 'true') {
          console.log("User needs profile setup, showing setup modal");
          setIsProfileSetupModalOpen(true);
          return;
        }
        
        // Double check Firestore for setup status (as a backup)
        const userData = await firestoreService.getUserData(currentUser.uid);
        
        if (userData) {
          if (userData.setupCompleted === false) {
            // User needs to complete setup - set flag and show setup modal
            localStorage.setItem('needsProfileSetup', 'true');
            setIsProfileSetupModalOpen(true);
            return;
          }
        } else {
          // No user data found, they likely need to complete setup
          localStorage.setItem('needsProfileSetup', 'true');
          setIsProfileSetupModalOpen(true);
          return;
        }
        
        // If we got here, the user has completed setup
        console.log("User has completed setup, proceeding to dashboard");
        
        // Ensure they have clubs (just in case)
        const userClubs = await firestoreService.getUserClubs(currentUser.uid);
        if (!userClubs || userClubs.length === 0) {
          // Add default clubs in the background
          try {
            const DEFAULT_CLUBS = [
              { id: 'driver', name: 'Driver', type: 'Wood', confidence: 5, distance: 230 },
              { id: '3-wood', name: '3 Wood', type: 'Wood', confidence: 5, distance: 210 },
              { id: '5-wood', name: '5 Wood', type: 'Wood', confidence: 5, distance: 195 },
              { id: '4-iron', name: '4 Iron', type: 'Iron', confidence: 5, distance: 180 },
              { id: '5-iron', name: '5 Iron', type: 'Iron', confidence: 5, distance: 170 },
              { id: '6-iron', name: '6 Iron', type: 'Iron', confidence: 5, distance: 160 },
              { id: '7-iron', name: '7 Iron', type: 'Iron', confidence: 5, distance: 150 },
              { id: '8-iron', name: '8 Iron', type: 'Iron', confidence: 5, distance: 140 },
              { id: '9-iron', name: '9 Iron', type: 'Iron', confidence: 5, distance: 130 },
              { id: 'pw', name: 'Pitching Wedge', type: 'Wedge', confidence: 5, distance: 120 },
              { id: 'sw', name: 'Sand Wedge', type: 'Wedge', confidence: 5, distance: 100 },
              { id: 'lw', name: 'Lob Wedge', type: 'Wedge', confidence: 5, distance: 80 },
              { id: 'putter', name: 'Putter', type: 'Putter', confidence: 5, distance: 0 }
            ];
            await firestoreService.saveUserClubs(currentUser.uid, DEFAULT_CLUBS);
            console.log("Default clubs saved as a backup measure");
          } catch (clubSaveError) {
            console.error("Error saving default clubs:", clubSaveError);
          }
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

  // Run the user setup check when the current user changes
  useEffect(() => {
    checkUserSetupStatus();
  }, [currentUser]); // Depend only on currentUser, not navigateTo
  
  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      console.log('Loading user data. CurrentUser:', currentUser);
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
        setUserClubs([]);
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
          pageParams={pageParams}
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%' 
        }}>
          <h1 
            onClick={() => navigateTo('dashboard')}
            style={{
              cursor: 'pointer',
              margin: 0,
              userSelect: 'none' // Prevents text selection when clicking
            }}
          >
            GOLF GURU
          </h1>
          
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
              <span style={{ 
                marginRight: '10px', 
                color: 'white',
                display: isMobile ? 'none' : 'inline' 
              }}>
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
                padding: isMobile ? '6px 12px' : '8px 16px',
                fontSize: isMobile ? '0.8rem' : '0.9rem'
              }}
            >
              Sign In
            </button>
          )}
        </div>
        <p>AI-Powered Swing Analysis</p>
        
        {/* Mobile Dropdown Navigation */}
        {isMobile && (
          <div style={{ marginTop: '10px', width: '100%' }}>
            <MobileNavDropdown 
              currentPage={currentPage} 
              navigateTo={navigateTo} 
              showProfile={!!currentUser}
              pageParams={pageParams}
            />
          </div>
        )}
      </header>
      
      <main className="App-main">
        {renderPage()}
      </main>
      
      {/* Show navigation for both mobile and desktop - this keeps the bottom navigation */}
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
        <WelcomeModal onClose={() => setIsWelcomeModalOpen(false)} />
      </Modal>
      
      {/* Profile Setup Modal - canClose is false to force completion */}
      <Modal isOpen={isProfileSetupModalOpen} onClose={() => setIsProfileSetupModalOpen(false)} canClose={false}>
        <ProfileSetupModal 
          onClose={() => {
            setIsProfileSetupModalOpen(false);
            // After profile setup is complete, refresh user data
            // This ensures we have the latest club data, etc.
            if (currentUser) {
              firestoreService.getUserClubs(currentUser.uid)
                .then(clubs => setUserClubs(clubs || []))
                .catch(err => console.error("Error refreshing clubs after setup:", err));
            }
          }} 
          currentUser={currentUser}
          currentUserData={{}} // Pass any existing user data here
        />
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