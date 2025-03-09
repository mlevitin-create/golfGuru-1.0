import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Scroll to top when component mounts or when swing changes
  useEffect(() => {
    window.scrollTo(0, 0);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [swingData?.id]);

  // Create a more reliable video player experience for mobile
  useEffect(() => {
    if (videoRef.current && swingData?.videoUrl) {
      // Set a solid background color to prevent white background
      videoRef.current.style.backgroundColor = '#2c3e50'; // Dark blue background
      
      // Force poster image to be first frame when possible
      try {
        videoRef.current.onloadedmetadata = () => {
          // Create poster from the video itself
          videoRef.current.currentTime = 0.1;
        };
      } catch (e) {
        console.log('Could not set initial frame as poster:', e);
      }
    }
  }, [swingData]);

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

  // Format date with time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date without time
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
        
        {/* Date Information with both recorded and analyzed dates */}
        <div className="date-info" style={{ marginBottom: '15px' }}>
          {swingData.recordedDate && (
            <p>
              <strong>Recorded on:</strong> {formatDate(swingData.recordedDate)}
            </p>
          )}
          <p><strong>Analyzed on:</strong> {formatDateTime(swingData.date)}</p>
        </div>

        {/* Custom video container with controlled dimensions */}
        <div className="video-container" style={{ 
          maxWidth: '100%', 
          margin: '0 auto',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#2c3e50', // Dark background color
          maxHeight: '500px', // Add maximum height for desktop
          display: 'flex',
          justifyContent: 'center'
        }}>
          <video 
            ref={videoRef}
            src={swingData.videoUrl} 
            controls 
            playsInline
            preload="metadata"
            style={{ 
              maxWidth: '600px', // Maximum width on desktop
              width: '100%', // Responsive width
              maxHeight: '500px', // Maximum height
              objectFit: 'contain', // Maintain aspect ratio
              display: 'block',
              borderRadius: '8px',
              backgroundColor: '#2c3e50' // Ensure background color is set
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
            {swingData.outcome && <p><strong>Outcome:</strong> {swingData.outcome.charAt(0).toUpperCase() + swingData.outcome.slice(1)}</p>}
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