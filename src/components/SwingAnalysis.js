// src/components/SwingAnalysis.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MetricInsights from './MetricInsights';
import { metricInsightsGenerator } from '../services/geminiService';
import firestoreService from '../services/firestoreService';
import FeedbackWidget from './FeedbackWidget';
import SwingOwnershipHandler from './SwingOwnershipHandler';
import videoUrlManager from '../utils/VideoUrlManager';
import './SwingAnalysis.css';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricInsights, setMetricInsights] = useState({});
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [videoSource, setVideoSource] = useState(null);
  const videoRef = useRef(null);

  // Initialize ownership handler
  const ownershipHandler = SwingOwnershipHandler({ swingData });

  useEffect(() => {
    // Reset state when swingData changes
    setSelectedMetric(null);
    setMetricInsights({});
    setExpandedSections({});
    
    // Handle video URL
    if (swingData) {
      // Get the best video URL from the data
      const url = videoUrlManager.getVideoUrlFromSwingData(swingData);
      setVideoSource(url);
      console.log(`Using ${swingData.isYouTubeVideo ? 'YouTube' : 'temporary'} video URL for display: ${url}`);
    } else {
      setVideoSource(null);
    }
    
    // Clean up temporary URL when component unmounts
    return () => {
      // Handled by VideoUrlManager
    };
  }, [swingData]);

  // Handle metric selection
  async function handleMetricSelect(metricKey) {
    // Update selected metric immediately for UI response
    setSelectedMetric(metricKey);
    
    // Check if we already have insights for this metric
    if (metricInsights[metricKey]) {
      return;
    }
    
    // Start loading
    setIsLoadingInsights(true);
    setError(null);
    
    try {
      // Generate insights using API
      // Pass the full swing data for proper context
      const insights = await metricInsightsGenerator.generateMetricInsights(swingData, metricKey);
      
      // Update insights state with new data
      setMetricInsights(prevInsights => ({
        ...prevInsights,
        [metricKey]: insights
      }));
    } catch (error) {
      console.error('Error generating metric insights:', error);
      setError('Failed to load metric insights. Please try again.');
      
      // Fallback to default insights
      const defaultInsights = metricInsightsGenerator.getDefaultInsights(metricKey, swingData);
      setMetricInsights(prevInsights => ({
        ...prevInsights,
        [metricKey]: defaultInsights
      }));
    } finally {
      setIsLoadingInsights(false);
    }
  }

  // Handle section toggle
  const toggleSection = (metricKey, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${metricKey}_${section}`]: !prev[`${metricKey}_${section}`]
    }));
  };

  // Check if section is expanded
  const isSectionExpanded = (metricKey, section) => {
    return !!expandedSections[`${metricKey}_${section}`];
  };

  // Handle delete swing
  const handleDeleteSwing = async () => {
    if (!currentUser || !swingData?.id) return;
    
    // Only confirm deletion for own swings
    if (swingData.swingOwnership !== 'self') {
      navigateTo('tracker');
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await firestoreService.deleteSwing(swingData.id, currentUser.uid);
      
      // Update swing history
      setSwingHistory(prevHistory => 
        prevHistory.filter(swing => swing.id !== swingData.id)
      );
      
      // Navigate to tracker
      navigateTo('tracker');
    } catch (error) {
      console.error('Error deleting swing:', error);
      setError('Failed to delete swing. Please try again.');
      setIsDeleting(false);
    }
  };

  // Check if source video is available
  const hasVideo = !!videoSource;
  const isYouTubeVideo = swingData?.isYouTubeVideo;

  if (!swingData) {
    return (
      <div className="card">
        <h2>No swing data available</h2>
        <p>Please upload a swing video to analyze.</p>
        <button 
          className="button"
          onClick={() => navigateTo('upload')}
        >
          Upload a swing
        </button>
      </div>
    );
  }

  // Get color for the overall score
  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="swing-analysis-container">
      <div className="card">
        <h2>Swing Analysis</h2>
        
        {/* Error message */}
        {error && (
          <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
            {error}
          </div>
        )}
        
        {/* Ownership badge */}
        {ownershipHandler.renderOwnershipBadge()}
        
        {/* Storage optimization message */}
        {ownershipHandler.renderStorageMessage()}
        
        <div className="analysis-header">
          <div className="score-container">
            <div 
              className="overall-score" 
              style={{ 
                background: getScoreColor(swingData.overallScore),
                color: 'white',
                borderRadius: '50%',
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                marginRight: '20px'
              }}
            >
              {Math.round(swingData.overallScore)}
            </div>
            <div className="score-info">
              <h3>Overall Score</h3>
              <p>
                {swingData.clubName && <span><strong>Club:</strong> {swingData.clubName}<br /></span>}
                <strong>Date:</strong> {formatDate(swingData.recordedDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Video section */}
        {hasVideo && (
          <div className="video-container">
            {isYouTubeVideo ? (
              <iframe 
                width="100%" 
                height="315" 
                src={videoSource} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            ) : (
              <video 
                ref={videoRef}
                src={videoSource} 
                controls 
                preload="metadata"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            )}
          </div>
        )}

        {/* Recommendations */}
        <div className="recommendations">
          <h3>Recommendations</h3>
          <ul>
            {swingData.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Metrics heading */}
        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Swing Metrics</h3>

        {/* Metrics list */}
        <div className="metrics-container">
          {Object.entries(swingData.metrics).map(([key, value]) => (
            <div key={key} className="metric-item">
              <div 
                className={`metric-label ${selectedMetric === key ? 'expanded' : ''}`}
                onClick={() => handleMetricSelect(key)}
              >
                <div className="metric-name">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </div>
                <div className="metric-value-container">
                  <div 
                    className="metric-value" 
                    style={{ 
                      backgroundColor: getScoreColor(value),
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}
                  >
                    {Math.round(value)}
                  </div>
                </div>
              </div>
              
              {selectedMetric === key && (
                <MetricInsights 
                  metricKey={key}
                  insights={metricInsights[key]}
                  isLoading={isLoadingInsights}
                  getScoreColor={getScoreColor}
                  score={Math.round(value)}
                  toggleSection={(section) => toggleSection(key, section)}
                  isSectionExpanded={(section) => isSectionExpanded(key, section)}
                  swingData={swingData}
                />
              )}
            </div>
          ))}
        </div>

        {/* Feedback section */}
        <div style={{ marginTop: '30px' }}>
          <FeedbackWidget 
            swingData={swingData} 
            onFeedbackGiven={() => {
              // You could refresh data or show a confirmation here
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="action-buttons" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
          <button 
            className="button"
            onClick={() => navigateTo('tracker')}
            style={{ backgroundColor: '#95a5a6' }}
          >
            Back to Tracker
          </button>
          
          {currentUser && swingData?.id && swingData.swingOwnership === 'self' && (
            <button 
              className="button"
              onClick={() => setIsDeleteModalOpen(true)}
              style={{ backgroundColor: '#e74c3c' }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Swing'}
            </button>
          )}
          
          <button 
            className="button"
            onClick={() => navigateTo('upload')}
          >
            Upload New Swing
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" style={{
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
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3>Delete Swing?</h3>
            <p>Are you sure you want to delete this swing? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                className="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ backgroundColor: '#95a5a6' }}
              >
                Cancel
              </button>
              <button 
                className="button"
                onClick={handleDeleteSwing}
                style={{ backgroundColor: '#e74c3c' }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwingAnalysis;