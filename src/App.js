// src/App.js - Updated to handle swing ownership properly for storage
import React, { useState, useEffect } from 'react';
import './App.css';
import VideoUpload from './components/VideoUpload';
import SwingAnalysis from './components/SwingAnalysis';
import VideoUploadPreview from './components/VideoUploadPreview';
import MetricInsights from './components/MetricInsights';
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
import ClubAnalytics from './components/ClubAnalytics';
import AdminAccessCheck from './components/AdminAccessCheck';
import AdminPage from './admin/AdminPage';
import HomePage from './components/HomePage';
import UserLoginIndicator from './components/UserLoginIndicator';

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
  const [currentPage, setCurrentPage] = useState('home'); // Default to 'home'
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
  
  // State for video preview
  const [uploadedVideoFile, setUploadedVideoFile] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  
  useEffect(() => {
    // Only run this check when on upload-preview page and user is logged in
    if (currentPage === 'upload-preview' && currentUser) {
      // Check if the user has previous swing data
      const checkPreviousSwings = async () => {
        try {
          // Get user's swings
          const userSwings = await firestoreService.getUserSwings(currentUser.uid);
          
          // If user has previous swings, redirect to dashboard
          if (userSwings && userSwings.length > 0) {
            console.log('User has previous swings, redirecting to dashboard');
            navigateTo('dashboard');
          }
        } catch (error) {
          console.error('Error checking previous swings:', error);
          // Continue with upload preview if there's an error
        }
      };
      
      checkPreviousSwings();
    }
  }, [currentPage, currentUser]);

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

  // Listen for the openLoginModal event
  useEffect(() => {
    const handleOpenLoginModal = () => {
      setIsLoginModalOpen(true);
    };
    
    window.addEventListener('openLoginModal', handleOpenLoginModal);
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);

  // Update the navigateTo function in App.js
  const navigateTo = (page, params = null) => {
    // Special handling for upload-preview page
    if (page === 'upload-preview' && currentUser) {
      // Check if user has previous swings before navigating
      firestoreService.getUserSwings(currentUser.uid)
        .then(swings => {
          if (swings && swings.length > 0) {
            console.log('User has previous swings, redirecting to dashboard');
            setCurrentPage('dashboard');
            setPageParams(null);
          } else {
            // No previous swings, continue to upload preview
            setCurrentPage(page);
            setPageParams(params);
          }
        })
        .catch(error => {
          console.error('Error checking previous swings:', error);
          // On error, still navigate to the requested page
          setCurrentPage(page);
          setPageParams(params);
        });
    } else {
      // Normal navigation for other pages
      setCurrentPage(page);
      setPageParams(params);
    }
    
    // Rest of navigation code...
    setError(null);
    
    // Scroll to the top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // NEW: Handle video file upload to show preview
  const handleVideoFileSelect = (file) => {
    // Clean up previous preview URL if exists
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    
    // Create a new URL for the preview
    const videoUrl = URL.createObjectURL(file);
    
    // Set state for the preview component
    setUploadedVideoFile(file);
    setUploadedVideoUrl(videoUrl);
    
    // Navigate to the preview screen
    navigateTo('upload-preview');
  };

  // Function to analyze swing with ownership metadata
  const handleVideoUpload = async (videoFile, metadata) => {
    setIsAnalyzing(true);
    setError(null);
    console.log("Analyzing video with metadata:", metadata);
    
    try {
      // Get analysis from Gemini (or mock data)
      const analysisResult = await geminiService.analyzeGolfSwing(videoFile, metadata);

      // Save to Firestore if user is logged in
      if (currentUser) {
        // Important: For non-user swings, inform user that video won't be stored
        let infoMessage = null;
        if (metadata.swingOwnership !== 'self' && videoFile) {
          infoMessage = {
            type: 'info',
            message: metadata.swingOwnership === 'pro' 
              ? `Analysis for ${metadata.proGolferName || 'a professional golfer'}'s swing. Video not stored to optimize storage.` 
              : "Analysis for a friend's swing. Video not stored to optimize storage."
          };
          // Set info message
          setError(infoMessage);
        }

        const savedSwing = await firestoreService.saveSwingAnalysis(
          analysisResult,
          currentUser.uid,
          metadata.swingOwnership === 'self' ? videoFile : null, // Only save video if it's the user's own swing
          metadata // Pass metadata including ownership info
        );

        // For non-user swings, create a temporary videoUrl for analysis display
        // This will be used for in-memory analysis but won't be saved to Storage
        if (videoFile && metadata.swingOwnership !== 'self') {
          savedSwing._temporaryVideoUrl = URL.createObjectURL(videoFile);
          // Add flag to track temporary URLs so we can revoke them later
          savedSwing._hasTemporaryUrl = true;
        }

        // Update state with the saved data (includes Firestore ID)
        setSwingData(savedSwing);
        
        // Only add to swing history if it's the user's own swing
        if (metadata.swingOwnership === 'self') {
          setSwingHistory(prev => [savedSwing, ...prev]);
          
          // Refresh user stats
          const stats = await firestoreService.getUserStats(currentUser.uid);
          setUserStats(stats);
        } else {
          console.log(`Swing for ${metadata.swingOwnership} not added to user's history/tracker`);
        }
      } else {
        // For non-authenticated users
        const isNonUserSwing = metadata.swingOwnership !== 'self';
        
        const localResult = {
          ...analysisResult,
          _isLocalOnly: true,
          // Create object URL for video display
          videoUrl: videoFile ? URL.createObjectURL(videoFile) : null,
          // For YouTube videos
          ...(metadata.youtubeVideo ? { 
            videoUrl: metadata.youtubeVideo.embedUrl, 
            youtubeVideoId: metadata.youtubeVideo.videoId, 
            isYouTubeVideo: true 
          } : {}),
          // Flag non-user swings appropriately
          isVideoSkipped: isNonUserSwing,
          // Include all metadata
          recordedDate: metadata.recordedDate,
          swingOwnership: metadata.swingOwnership,
          proGolferName: metadata.proGolferName,
          // Club data if available
          ...(metadata.clubId && { clubId: metadata.clubId }),
          ...(metadata.clubName && { clubName: metadata.clubName }),
          ...(metadata.clubType && { clubType: metadata.clubType }),
          ...(metadata.outcome && { outcome: metadata.outcome })
        };

        setSwingData(localResult);
        
        // Only add to local swing history if it's the user's own swing
        if (metadata.swingOwnership === 'self') {
          setSwingHistory(prev => [localResult, ...prev]);
        } else {
          console.log(`Swing for ${metadata.swingOwnership} not added to local history`);
          
          // Display info message for non-user swings
          if (videoFile) {
            setError({
              type: 'info',
              message: metadata.swingOwnership === 'pro' 
                ? `Analysis for ${metadata.proGolferName || 'a professional golfer'}'s swing.` 
                : "Analysis for a friend's swing."
            });
          }
        }

        // Prompt user to login to save their data
        setIsLoginModalOpen(true);
      }

      // Clean up video preview if we came from there
      if (currentPage === 'upload-preview') {
        if (uploadedVideoUrl) {
          URL.revokeObjectURL(uploadedVideoUrl);
        }
        setUploadedVideoFile(null);
        setUploadedVideoUrl(null);
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
      case 'home':
        return <HomePage 
          navigateTo={navigateTo} 
          swingHistory={swingHistory} 
          userStats={userStats}
          userClubs={userClubs}
        />;
      case 'dashboard':
        return <Dashboard 
          swingHistory={swingHistory} 
          navigateTo={navigateTo} 
          userStats={userStats}
          userClubs={userClubs}
        />;
      case 'upload':
        return <VideoUpload 
          onVideoUpload={handleVideoUpload}
          onVideoSelect={handleVideoFileSelect}
          isAnalyzing={isAnalyzing}
          navigateTo={navigateTo}
        />;
      case 'upload-preview':
        return <VideoUploadPreview 
          videoFile={uploadedVideoFile}
          videoUrl={uploadedVideoUrl}
          onAnalyze={(metadata) => {
            // Start analysis with the uploaded video file and ownership metadata
            if (uploadedVideoFile) {
              handleVideoUpload(uploadedVideoFile, {
                // Default date if not provided
                recordedDate: new Date(),
                // Ownership data from the component
                ...metadata
              });
            }
          }}
          onDelete={() => {
            // Clean up and go back to upload
            if (uploadedVideoUrl) {
              URL.revokeObjectURL(uploadedVideoUrl);
            }
            setUploadedVideoFile(null);
            setUploadedVideoUrl(null);
            navigateTo('upload');
          }}
          navigateTo={navigateTo}
        isProcessing={isAnalyzing}
      />;
    case 'analysis':
      return <SwingAnalysis 
        swingData={swingData} 
        navigateTo={navigateTo}
        setSwingHistory={setSwingHistory}
      />;
    case 'progress': // Changed from 'tracker'
      // Redirect to the profile page with the progress tab active
      navigateTo('profile', { activeTab: 'progress' });
      // Return a loading state temporarily while redirect happens
      return (
        <div className="card">
          <h2>Loading Progress Analysis...</h2>
          <div className="spinner"></div>
        </div>
      );
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
    case 'admin':
      if (!currentUser) {
        return (
          <div className="card">
            <h2>Authentication Required</h2>
            <p>You need to log in to access this page.</p>
            <button 
              className="button"
              onClick={() => setIsLoginModalOpen(true)}
            >
              Sign In
            </button>
          </div>
        );
      }
      return <AdminAccessCheck><AdminPage /></AdminAccessCheck>;
    default:
      return <HomePage 
        navigateTo={navigateTo} 
        swingHistory={swingHistory} 
        userStats={userStats}
        userClubs={userClubs}
      />;
  }
};

  // Simplified header for specific pages
  const usesSimplifiedHeader = ['home', 'upload-preview'].includes(currentPage);

  return (
    <div className="App">
      {!usesSimplifiedHeader && (
        <header className="App-header">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            width: '100%' 
          }}>
            <h1 
              onClick={() => navigateTo('home')}
              style={{
                cursor: 'pointer',
                margin: 0,
                userSelect: 'none'
              }}
            >
              Swing AI
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
                  color: '#546e47',
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
                    border: '2px solid #546e47'
                  }}
                />
              </div>
            ) : (
              <button 
                className="button" 
                onClick={() => setIsLoginModalOpen(true)}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  backgroundColor: '#546e47'
                }}
              >
                Sign In
              </button>
            )}
          </div>
          <p style={{ color: '#546e47' }}>Improving your golf swing using next-gen AI</p>
          
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
      )}
      
      <main className="App-main">
        {error && (
          <div style={{ 
            backgroundColor: error.type === 'info' ? '#e1f5fe' : '#f8d7da', 
            color: error.type === 'info' ? '#0277bd' : '#721c24', 
            padding: '10px 15px', 
            borderRadius: '5px', 
            marginBottom: '15px',
            textAlign: 'center',
            maxWidth: '800px',
            margin: '0 auto 15px auto'
          }}>
            {error.message || error}
          </div>
        )}
        
        {renderPage()}
      </main>
      
      {/* Show navigation for both mobile and desktop - this keeps the bottom navigation */}
      {!usesSimplifiedHeader && (
        <Navigation 
          currentPage={currentPage} 
          navigateTo={navigateTo} 
          showProfile={!!currentUser}
        />
      )}
      
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