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
// In App.js, replace the existing avatar code:
import UserAvatar from './components/UserAvatar';
import WelcomeModal from './components/WelcomeModal';
import geminiService from './services/geminiService';
import firestoreService from './services/firestoreService';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Modal component for login
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
  const [swingData, setSwingData] = useState(null);
  const [swingHistory, setSwingHistory] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  
  // Check if this is the user's first visit
  // In the AppContent component of App.js
  // In App.js
    useEffect(() => {
      // Use a different key for testing
      const hasVisitedBefore = localStorage.getItem('hasVisitedBefore_v2');
      console.log("Has visited before:", hasVisitedBefore);
      
      if (!hasVisitedBefore) {
        console.log("First visit, showing welcome modal");
        setIsWelcomeModalOpen(true);
        localStorage.setItem('hasVisitedBefore_v2', 'true');
      }
    }, []);

  // Listen for custom events to open login modal
  useEffect(() => {
    const handleOpenLoginModal = () => setIsLoginModalOpen(true);
    window.addEventListener('openLoginModal', handleOpenLoginModal);
    
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);
  
  // Load user swings when user is authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          // Fetch user's swing history
          const swings = await firestoreService.getUserSwings(currentUser.uid);
          setSwingHistory(swings);
          
          // Set the most recent swing as the current swing data
          if (swings.length > 0) {
            setSwingData(swings[0]);
          }
          
          // Get user stats
          const stats = await firestoreService.getUserStats(currentUser.uid);
          setUserStats(stats);
        } catch (error) {
          console.error('Error loading user data:', error);
          setError('Failed to load your data. Please try again later.');
        }
      } else {
        // Clear user data when logged out
        setSwingHistory([]);
        setSwingData(null);
        setUserStats(null);
      }
    };
    
    loadUserData();
  }, [currentUser]);

  // Function to analyze swing
  const analyzeSwing = async (videoFile) => {
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
          videoFile
        );
        
        // Update state with the saved data (includes Firestore ID)
        setSwingData(savedSwing);
        setSwingHistory(prev => [savedSwing, ...prev]);
        
        // Refresh user stats
        const stats = await firestoreService.getUserStats(currentUser.uid);
        setUserStats(stats);
      } else {
        // Just use the local data if not logged in
        setSwingData(analysisResult);
        setSwingHistory(prev => [analysisResult, ...prev]);
        
        // Prompt user to login to save their data
        setIsLoginModalOpen(true);
      }
      
      setCurrentPage('analysis');
    } catch (error) {
      console.error("Error analyzing swing:", error);
      setError(error.message || "Failed to analyze swing. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Navigation handler
  const navigateTo = (page) => {
    setCurrentPage(page);
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
        />;
      case 'upload':
        return <VideoUpload 
          onVideoUpload={analyzeSwing} 
          isAnalyzing={isAnalyzing}
          error={error}
        />;
      case 'analysis':
        return <SwingAnalysis 
          swingData={swingData} 
          navigateTo={navigateTo}
          setSwingHistory={setSwingHistory}  // Add this prop 
        />;
      case 'tracker':
        return <SwingTracker 
        swingHistory={swingHistory} 
        setSwingHistory={setSwingHistory}  // Add this prop
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
        />;
      default:
        return <Dashboard 
          swingHistory={swingHistory} 
          navigateTo={navigateTo}
          userStats={userStats}
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
                <UserAvatar user={currentUser} size={35} />
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
      
      <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)}>
        <Login onClose={() => setIsLoginModalOpen(false)} />
      </Modal>

      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={() => setIsWelcomeModalOpen(false)} />
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