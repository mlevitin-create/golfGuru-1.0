import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserLoginIndicator from './UserLoginIndicator';
import ClubSelector from './ClubSelector';
import ShotOutcomeSelector from './ShotOutcomeSelector';

const VideoUploadPreview = ({ 
  videoFile, 
  videoUrl, 
  onAnalyze, 
  onDelete, 
  navigateTo,
  isProcessing = false 
}) => {
  const { currentUser } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoError, setVideoError] = useState(null);
  
  // Ownership selection state
  const [swingOwnership, setSwingOwnership] = useState('self');
  const [proName, setProName] = useState('');
  const [showProNameInput, setShowProNameInput] = useState(false);
  
  // Club and outcome selection state
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [clubData, setClubData] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  
  // Step management (steps: ownership > club > analyze)
  const [step, setStep] = useState('ownership');
  
  // Reference to the video element
  const videoRef = useRef(null);
  
  // Load user clubs when needed
  useEffect(() => {
    if (currentUser && step === 'club' && swingOwnership === 'self') {
      // Import the service at runtime to avoid issues
      import('../services/firestoreService').then(module => {
        const firestoreService = module.default;
        firestoreService.getUserClubs(currentUser.uid)
          .then(clubs => {
            setUserClubs(clubs || []);
          })
          .catch(error => {
            console.error('Error loading clubs:', error);
          });
      });
    }
  }, [currentUser, step, swingOwnership]);
  
  // Handle video metadata loading
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const handleMetadataLoaded = () => {
        setVideoLoaded(true);
        setVideoDuration(videoRef.current.duration);
      };
      
      const handleError = (e) => {
        console.error("Video load error:", e);
        setVideoError("Failed to load video. Please try uploading again.");
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
      videoRef.current.addEventListener('error', handleError);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleMetadataLoaded);
          videoRef.current.removeEventListener('error', handleError);
        }
      };
    }
  }, [videoUrl, videoRef]);
  
  // Helper function to get label for shot outcome
  const getShotOutcomeLabel = (outcomeId) => {
    const outcomeMap = {
      'straight': 'Straight',
      'fade': 'Fade/Slice',
      'draw': 'Draw/Hook',
      'push': 'Push',
      'pull': 'Pull',
      'thin': 'Thin/Topped',
      'fat': 'Fat/Chunked',
      'shank': 'Shank'
    };
    
    return outcomeMap[outcomeId] || outcomeId;
  };
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          // Some browsers require user interaction before autoplay
          setVideoError("Click directly on the video to play");
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handle ownership change
  const handleOwnershipChange = (ownership) => {
    setSwingOwnership(ownership);
    setShowProNameInput(ownership === 'pro');
    
    // If changing to non-user swing, skip club selection step when continuing
    if (ownership === 'pro' || ownership === 'other') {
      // Reset club data since it won't be used
      setSelectedClubId('');
      setSelectedOutcome('');
      setClubData(null);
    }
  };
  
  // Handle analyze button click
  const handleAnalyze = () => {
    if (onAnalyze && !isProcessing) {
      // Create metadata with ownership information
      const metadata = {
        swingOwnership,
        recordedDate: new Date()
      };
      
      // Add pro golfer name if applicable
      if (swingOwnership === 'pro' && proName.trim()) {
        metadata.proGolferName = proName.trim();
      }
      
      // Add club and shot outcome data if available
      if (clubData) {
        metadata.clubId = clubData.clubId;
        metadata.clubName = clubData.clubName;
        metadata.clubType = clubData.clubType;
        metadata.outcome = clubData.outcome;
      }
      
      onAnalyze(metadata);
    }
  };
  
  // Handle club selection completion
  const handleClubSelectionComplete = (data) => {
    // Save the club data for later use in analysis
    setClubData(data);
    
    // Move to analyze step
    setStep('analyze');
  };
  
  // Handle club selection skip
  const handleClubSelectionSkip = (setupIntent) => {
    // If user wants to set up clubs, navigate to profile
    if (setupIntent === 'setup-clubs') {
      navigateTo('profile', { setupClubs: true });
      return;
    }
    
    // Otherwise just continue without club data
    setClubData({
      // Still include outcome if it was selected
      outcome: selectedOutcome || null
    });
    
    // Move to analyze step
    setStep('analyze');
  };
  
  // Handle delete button click
  const handleDelete = () => {
    if (onDelete) {
      // Stop video playback if playing
      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      onDelete();
    }
  };

  // Format video duration
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="upload-preview-container" style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      height: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
      backgroundColor: '#ffffff',
      minHeight: '80vh'
    }}>
      {/* Login status indicator in the top right */}
      <UserLoginIndicator 
        isLoggedIn={!!currentUser} 
        onProfileClick={() => navigateTo('profile')} 
      />
      
      {/* Main title */}
      <h1 style={{ 
        fontSize: '3.5rem', 
        color: '#546e47', 
        fontWeight: '400',
        marginBottom: '10px',
        fontFamily: 'serif'
      }}>
        Swing AI
      </h1>
      
      {/* Subtitle */}
      <p style={{ 
        fontSize: '1.25rem', 
        color: '#546e47', 
        marginBottom: '40px',
        fontFamily: 'serif',
        fontWeight: '400'
      }}>
        Improving your golf swing using next-gen AI
      </p>
      
      {/* Video preview container */}
      <div style={{
        width: '100%',
        maxWidth: '350px',
        height: '220px',
        margin: '0 auto 30px auto',
        position: 'relative',
        border: '1px solid #e0e0e0',
        borderRadius: '15px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* Info button */}
        <button 
          onClick={() => setShowInfoTooltip(!showInfoTooltip)}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: 'rgba(224, 224, 216, 0.8)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#555',
            zIndex: 10
          }}
          aria-label="Show information"
        >
          i
        </button>
        
        {/* Close/Delete button */}
        <button 
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: 'rgba(224, 224, 216, 0.8)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#555',
            zIndex: 10
          }}
          aria-label="Delete video"
        >
          ×
        </button>
        
        {/* Info tooltip */}
        {showInfoTooltip && (
          <div style={{
            position: 'absolute',
            top: '45px',
            left: '10px',
            width: '200px',
            padding: '10px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 20,
            textAlign: 'left',
            fontSize: '0.8rem',
            color: '#555'
          }}>
            <p style={{ margin: '0 0 5px 0' }}>
              Upload a clear video of your full swing for best results.
            </p>
            <p style={{ margin: '0' }}>
              Videos should be in landscape orientation and show your entire body.
            </p>
          </div>
        )}
        
        {/* Video error message */}
        {videoError && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 15,
            maxWidth: '90%',
            color: '#e74c3c'
          }}>
            {videoError}
          </div>
        )}
        
        {/* Video element if available */}
        {videoUrl ? (
          <>
            <video 
              ref={videoRef}
              src={videoUrl}
              onClick={togglePlayPause}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                cursor: 'pointer'
              }}
              playsInline
              preload="metadata"
            />
            
            {/* Video controls overlay */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '20px',
              padding: '5px 10px'
            }}>
              {/* Play/Pause button */}
              <button
                onClick={togglePlayPause}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="4" width="4" height="16" fill="white"/>
                    <rect x="14" y="4" width="4" height="16" fill="white"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L5 21V3Z" fill="white"/>
                  </svg>
                )}
              </button>
              
              {/* Duration */}
              {videoLoaded && (
                <span style={{ color: 'white', fontSize: '0.8rem', marginLeft: '5px' }}>
                  {formatDuration(videoDuration)}
                </span>
              )}
            </div>
          </>
        ) : (
          /* Placeholder when no video */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            height: '100%',
            width: '100%'
          }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '400',
              margin: '0',
              color: '#555',
              fontFamily: 'serif'
            }}>
              UPLOADED
            </h3>
            <h3 style={{ 
              fontSize: '1.2rem', 
              fontWeight: '400',
              margin: '5px 0 0 0',
              color: '#555',
              fontFamily: 'serif'
            }}>
              VIDEO
            </h3>
          </div>
        )}
      </div>
      
      {/* Ownership selection - only shown in ownership step */}
      {step === 'ownership' && (
        <div style={{
          width: '100%',
          maxWidth: '350px',
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '20px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ 
            textAlign: 'left', 
            margin: '0 0 15px 0',
            fontSize: '1.1rem',
            color: '#333'
          }}>
            Who is in this swing video?
          </h3>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="swingOwnership"
                value="self"
                checked={swingOwnership === 'self'}
                onChange={() => handleOwnershipChange('self')}
                style={{ marginRight: '10px' }}
              />
              <div>
                <span style={{ fontWeight: '500' }}>Me</span>
                <span style={{ marginLeft: '5px', fontSize: '0.85rem', color: '#666' }}>
                  (my own swing)
                </span>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="swingOwnership"
                value="other"
                checked={swingOwnership === 'other'}
                onChange={() => handleOwnershipChange('other')}
                style={{ marginRight: '10px' }}
              />
              <div>
                <span style={{ fontWeight: '500' }}>Friend</span>
                <span style={{ marginLeft: '5px', fontSize: '0.85rem', color: '#666' }}>
                  (someone else's swing)
                </span>
              </div>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="swingOwnership"
                value="pro"
                checked={swingOwnership === 'pro'}
                onChange={() => handleOwnershipChange('pro')}
                style={{ marginRight: '10px' }}
              />
              <div>
                <span style={{ fontWeight: '500' }}>Pro Golfer</span>
                <span style={{ marginLeft: '5px', fontSize: '0.85rem', color: '#666' }}>
                  (a professional golfer's swing)
                </span>
              </div>
            </label>
            
            {/* Pro golfer name input */}
            {showProNameInput && (
              <div style={{ 
                marginTop: '10px', 
                marginLeft: '25px', 
                width: 'calc(100% - 25px)'
              }}>
                <input
                  type="text"
                  placeholder="Professional golfer's name"
                  value={proName}
                  onChange={(e) => setProName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Club selector section - shown only when on club step and for self swings */}
      {step === 'club' && swingOwnership === 'self' && (
        <div style={{ width: '100%', maxWidth: '350px', marginBottom: '30px', backgroundColor: 'white', borderRadius: '15px', padding: '20px', border: '1px solid #e0e0e0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Shot Details</h3>
          
          {userClubs.length > 0 ? (
            <>
              <div className="club-selection" style={{ marginBottom: '20px' }}>
                <label htmlFor="club-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Which club did you use?
                </label>
                
                <select 
                  id="club-select"
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">-- Select a club --</option>
                  {userClubs.map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.distance} yards)
                    </option>
                  ))}
                </select>
              </div>
              
              <ShotOutcomeSelector 
                selectedOutcome={selectedOutcome}
                onOutcomeChange={setSelectedOutcome}
              />
              
              <div className="action-buttons" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button 
                  className="button"
                  onClick={() => handleClubSelectionSkip()}
                  style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
                >
                  Skip
                </button>
                <button 
                  className="button"
                  onClick={() => {
                    // If a club is selected, find the club details
                    if (selectedClubId) {
                      const selectedClub = userClubs.find(club => club.id === selectedClubId);
                      handleClubSelectionComplete({
                        clubId: selectedClubId,
                        clubName: selectedClub.name,
                        clubType: selectedClub.type,
                        outcome: selectedOutcome || null
                      });
                    } else {
                      // No club selected
                      handleClubSelectionComplete({
                        outcome: selectedOutcome || null
                      });
                    }
                  }}
                  style={{ padding: '10px 20px' }}
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            // No clubs set up
            <div style={{ backgroundColor: '#e2f3f5', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
              <p>You haven't set up your clubs yet. You can continue without selecting a club or set up your clubs in your profile.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                <button 
                  className="button"
                  onClick={() => handleClubSelectionSkip()}
                  style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
                >
                  Skip
                </button>
                <button 
                  className="button"
                  onClick={() => handleClubSelectionSkip('setup-clubs')}
                  style={{ padding: '10px 20px' }}
                >
                  Set Up My Clubs
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Analysis step - show summary of collected info */}
      {step === 'analyze' && (
        <div style={{
          width: '100%',
          maxWidth: '350px',
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '20px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Ready to Analyze</h3>
          
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>Swing type:</div>
            <div style={{ marginLeft: '10px' }}>
              {swingOwnership === 'self' ? 'My own swing' : 
               swingOwnership === 'other' ? 'Friend\'s swing' : 
               `Professional golfer${proName ? ` (${proName})` : ''}`}
            </div>
          </div>
          
          {swingOwnership === 'self' && clubData && (
            <>
              {clubData.clubName && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: 'bold' }}>Club:</div>
                  <div style={{ marginLeft: '10px' }}>{clubData.clubName}</div>
                </div>
              )}
              
              {clubData.outcome && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: 'bold' }}>Shot outcome:</div>
                  <div style={{ marginLeft: '10px' }}>{getShotOutcomeLabel(clubData.outcome)}</div>
                </div>
              )}
            </>
          )}
          
          <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#666' }}>
            Our AI will analyze your swing and provide detailed feedback on your technique.
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '40px',
        width: '100%',
        maxWidth: '350px'
      }}>
        {/* Back button shown conditionally */}
        {step !== 'ownership' && (
          <button
            onClick={() => setStep(step === 'club' ? 'ownership' : 'club')}
            disabled={isProcessing}
            style={{
              padding: '10px 0',
              backgroundColor: '#95a5a6', // Gray for back button
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: '500',
              flex: 1,
              opacity: !isProcessing ? 1 : 0.7
            }}
          >
            Back
          </button>
        )}
        
        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          disabled={!videoUrl}
          style={{
            padding: '10px 0',
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            cursor: videoUrl ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: '500',
            flex: 1,
            opacity: videoUrl ? 1 : 0.7
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        {/* Continue button in ownership step */}
        {step === 'ownership' && (
          <button
            onClick={() => {
              // For non-user swings, skip club selector
              if (swingOwnership === 'pro' || swingOwnership === 'other') {
                setStep('analyze');
              } else {
                setStep('club');
              }
            }}
            disabled={!videoUrl || isProcessing}
            style={{
              padding: '10px 0',
              backgroundColor: '#546e47',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: videoUrl && !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: '500',
              flex: 1,
              opacity: videoUrl && !isProcessing ? 1 : 0.7
            }}
          >
            Continue
          </button>
        )}
        
        {/* Analyze button in analyze step */}
        {step === 'analyze' && (
          <button
            onClick={handleAnalyze}
            disabled={!videoUrl || isProcessing}
            style={{
              padding: '10px 0',
              backgroundColor: '#546e47',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: videoUrl && !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: '500',
              flex: 1,
              opacity: videoUrl && !isProcessing ? 1 : 0.7,
              position: 'relative'
            }}
          >
            {isProcessing ? (
              <>
                <span style={{ visibility: 'hidden' }}>Analyzing...</span>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  Analyzing...
                </div>
              </>
            ) : 'Analyze'}
            </button>
          )}
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={!videoUrl || isProcessing}
            style={{
              padding: '10px 0',
              backgroundColor: '#546e47',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: videoUrl && !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: '500',
              flex: 1,
              opacity: videoUrl && !isProcessing ? 1 : 0.7
            }}
          >
            Delete
          </button>
        </div>
        
        {/* Navigation tabs */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '400px',
          borderRadius: '50px',
          overflow: 'hidden',
          border: '1px solid #eee',
          backgroundColor: '#f2f2f0',
          margin: '20px auto'
        }}>
          <button 
            onClick={() => navigateTo('upload')}
            style={{
              padding: '12px 0',
              backgroundColor: 'white', // Current page
              color: '#546e47',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.3s ease'
            }}
          >
            UPLOAD
          </button>
          
          <button 
            onClick={() => navigateTo('dashboard')}
            style={{
              padding: '12px 0',
              backgroundColor: '#f2f2f0',
              color: '#546e47',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.3s ease'
            }}
          >
            DASHBOARD
          </button>
          
          <button 
            onClick={() => navigateTo('comparison')}
            style={{
              padding: '12px 0',
              backgroundColor: '#f2f2f0',
              color: '#546e47',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.3s ease'
            }}
          >
            CADDIE
          </button>
          
          <button 
            onClick={() => navigateTo('profile')}
            style={{
              padding: '12px 0',
              backgroundColor: '#f2f2f0',
              color: '#546e47',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.3s ease'
            }}
          >
            MY BAG
          </button>
        </div>
        
        {/* Copyright */}
        <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#999' }}>
          © {new Date().getFullYear()}
        </div>
      </div>
    );
  };
  
  export default VideoUploadPreview;