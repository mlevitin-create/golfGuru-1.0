// src/components/SwingAnalysis.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const videoRef = useRef(null);

  // Generate thumbnail from video URL when component mounts
  useEffect(() => {
    if (swingData && swingData.videoUrl) {
      generateThumbnail(swingData.videoUrl);
    }
  }, [swingData]);

  // Generate thumbnail from video URL
  const generateThumbnail = (videoUrl) => {
    const videoElement = document.createElement('video');
    videoElement.crossOrigin = 'anonymous'; // To handle cross-origin issues
    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    // When video data is loaded, create thumbnail
    videoElement.onloadeddata = () => {
      console.log('Video loaded, seeking to thumbnail position');
      // Seek to 1 second or 1/4 through the video, whichever is less
      videoElement.currentTime = 1;
    };
    
    // Once we've seeked to the right place, capture the frame
    videoElement.onseeked = () => {
      console.log('Video seeked, generating thumbnail');
      try {
        const canvas = document.createElement('canvas');
        // Set canvas dimensions to match video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Create thumbnail URL from canvas
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        console.log('Thumbnail generated successfully');
        setThumbnailUrl(thumbnailUrl);
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        // If thumbnail generation fails, we'll still have the video element
      }
    };
    
    // Handle errors
    videoElement.onerror = (err) => {
      console.error('Error loading video for thumbnail:', err);
    };
    
    // Set video source
    videoElement.src = videoUrl;
    videoElement.load();
  };

  // Handle playing the video when thumbnail is clicked
  const handleThumbnailClick = () => {
    if (videoRef.current) {
      videoRef.current.style.display = 'block';
      videoRef.current.play();
    }
  };

  if (!swingData) {
    return (
      <div className="card">
        <h2>No Swing Data Available</h2>
        <p>Please upload a video to analyze your swing</p>
        <button 
          className="button" 
          onClick={() => navigateTo('upload')}
        >
          Upload Swing Video
        </button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

  // Handle delete swing
  const handleDeleteSwing = async (swingId) => {
    if (window.confirm('Are you sure you want to delete this swing? This action cannot be undone.')) {
      try {
        await firestoreService.deleteSwing(swingId, currentUser.uid);
        // Update local state to remove the deleted swing
        setSwingHistory(prev => prev.filter(swing => swing.id !== swingId));
        // Redirect to dashboard
        navigateTo('dashboard');
      } catch (error) {
        console.error('Error deleting swing:', error);
        alert('Failed to delete swing: ' + error.message);
      }
    }
  };

  return (
    <div className="analysis-container">
      <div className="card">
        <h2>Swing Analysis</h2>
        <p>Analyzed on {formatDate(swingData.date)}</p>

        <div className="video-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
          {thumbnailUrl ? (
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <img 
                src={thumbnailUrl} 
                alt="Video preview" 
                style={{ 
                  width: '100%', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={handleThumbnailClick}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V19L19 12L8 5Z" fill="white" />
                </svg>
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#f1f1f1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px'
            }}>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '4px solid rgba(0, 0, 0, 0.1)',
                borderTopColor: '#3498db',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          )}
          <video 
            ref={videoRef}
            src={swingData.videoUrl} 
            controls 
            width="100%"
            style={{ 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              display: thumbnailUrl ? 'none' : 'block' // Hide initially if we have a thumbnail
            }}
          />
        </div>

        <div className="overall-score">
          <h3>Overall Score</h3>
          <div 
            className="score-circle" 
            style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              backgroundColor: '#f5f5f5',
              border: `8px solid ${getScoreColor(swingData.overallScore)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              margin: '20px auto'
            }}
          >
            {swingData.overallScore}
          </div>
        </div>

        {/* Club information if available */}
        {swingData.clubName && (
          <div className="club-info" style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px 15px', 
            borderRadius: '8px',
            marginBottom: '20px' 
          }}>
            <h3>Club Used</h3>
            <p><strong>Club:</strong> {swingData.clubName}</p>
            <p><strong>Type:</strong> {swingData.clubType}</p>
            {swingData.outcome && <p><strong>Outcome:</strong> {swingData.outcome}</p>}
          </div>
        )}

        <div className="metrics-section">
          <h3>Swing Metrics</h3>
          
          {Object.entries(swingData.metrics).map(([key, value]) => (
            <div key={key} className="metric-item">
              <div className="metric-label">
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                <span>{value}/100</span>
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ 
                    width: `${value}%`, 
                    backgroundColor: getScoreColor(value) 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="recommendations">
          <h3>Recommendations</h3>
          <ul>
            {swingData.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>

        <div className="action-buttons">
          <button 
            className="button" 
            onClick={() => navigateTo('comparison')}
            style={{ marginRight: '10px' }}
          >
            Compare with Pros
          </button>
          <button 
            className="button" 
            onClick={() => navigateTo('upload')}
          >
            Upload New Video
          </button>
        </div>

        {/* Delete button - only show for authenticated users who own this swing */}
        {swingData.id && !swingData._isLocalOnly && currentUser && swingData.userId === currentUser.uid && (
          <button 
            className="button" 
            onClick={() => handleDeleteSwing(swingData.id)}
            style={{ 
              backgroundColor: '#e74c3c',
              marginTop: '10px',
              width: '100%'
            }}
          >
            Delete This Swing
          </button>
        )}
      </div>
    </div>
  );
};

export default SwingAnalysis;