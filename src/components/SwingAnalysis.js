// src/components/SwingAnalysis.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
    // Alternative approach if window.scrollTo doesn't work well on mobile
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [swingData?.id]); // Scroll when swing ID changes

  // Attempt to generate thumbnail, but with timeout to prevent endless loading
  useEffect(() => {
    if (swingData && swingData.videoUrl) {
      setLoadingThumbnail(true);
      
      // Set a timeout to ensure we don't show loading spinner forever
      const timeoutId = setTimeout(() => {
        setLoadingThumbnail(false);
      }, 5000); // 5 second timeout
      
      try {
        generateThumbnail(swingData.videoUrl);
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        setLoadingThumbnail(false);
      }
      
      return () => clearTimeout(timeoutId);
    }
  }, [swingData]);

  // Simplified thumbnail generation with better error handling
  const generateThumbnail = (videoUrl) => {
    try {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.preload = 'metadata';
      
      // Set up event handlers
      videoElement.onloadeddata = () => {
        try {
          videoElement.currentTime = 1;
        } catch (error) {
          console.error("Error seeking video:", error);
          setLoadingThumbnail(false);
        }
      };
      
      videoElement.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          setThumbnailUrl(canvas.toDataURL('image/jpeg'));
        } catch (error) {
          console.error("Error creating thumbnail:", error);
        } finally {
          setLoadingThumbnail(false);
        }
      };
      
      videoElement.onerror = () => {
        console.error("Video element error");
        setLoadingThumbnail(false);
      };
      
      // Set source and load
      videoElement.src = videoUrl;
      
      // Additional error handling for load method
      try {
        videoElement.load();
      } catch (error) {
        console.error("Error loading video:", error);
        setLoadingThumbnail(false);
      }
    } catch (error) {
      console.error("Error in thumbnail generation:", error);
      setLoadingThumbnail(false);
    }
  };

  if (!swingData) {
    return (
      <div className="card" ref={containerRef}>
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
    <div className="analysis-container" ref={containerRef}>
      <div className="card">
        <h2>Swing Analysis</h2>
        <p>Analyzed on {formatDate(swingData.date)}</p>

        <div className="video-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
          {/* Just use the video element directly - no thumbnails on older videos */}
          <video 
            ref={videoRef}
            src={swingData.videoUrl} 
            controls 
            width="100%"
            poster="/video-placeholder.jpg" // Optional: generic poster image from public folder
            style={{ 
              borderRadius: '8px', 
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
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