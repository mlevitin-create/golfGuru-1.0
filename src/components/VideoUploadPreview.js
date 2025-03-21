// src/components/VideoUploadPreview.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserLoginIndicator from './UserLoginIndicator';

/**
 * Component to display a video preview with controls before analysis
 * @param {Object} props - Component props
 * @param {File} props.videoFile - The video file uploaded by the user
 * @param {string} props.videoUrl - URL of the video preview
 * @param {Function} props.onAnalyze - Function to call when analysis is requested
 * @param {Function} props.onDelete - Function to call to delete/remove the video
 * @param {Function} props.navigateTo - Navigation function
 * @returns {JSX.Element}
 */
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
  
  // Reference to the video element
  const videoRef = useRef(null);
  
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
      
      onAnalyze(metadata);
    }
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
  
  // Handle ownership change
  const handleOwnershipChange = (ownership) => {
    setSwingOwnership(ownership);
    setShowProNameInput(ownership === 'pro');
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
      backgroundColor: '#f7f7f5',
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
      
      {/* Ownership selection */}
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
      
      {/* Action buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '40px',
        width: '100%',
        maxWidth: '350px'
      }}>
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