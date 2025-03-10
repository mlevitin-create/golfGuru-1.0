import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import { metricInsightsGenerator } from '../services/geminiService';
import './SwingAnalysis.css'; // Import a CSS file for styling

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [expandedMetrics, setExpandedMetrics] = useState({});
  const [metricInsights, setMetricInsights] = useState({});
  const [loadingInsights, setLoadingInsights] = useState({});
  const videoRef = useRef(null); // Create a video reference

  // Scroll to top and reset expanded metrics when swing data changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setExpandedMetrics({});
    setMetricInsights({});
  }, [swingData?.id]);

  // Get score color based on metric value
  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

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

  // Fetch insights for a specific metric
  const fetchMetricInsights = async (metricKey, enhancedSwingData) => {
    // If insights already exist or are currently loading, do nothing
    if (metricInsights[metricKey] || loadingInsights[metricKey]) return;
  
    // Set loading state
    setLoadingInsights(prev => ({
      ...prev,
      [metricKey]: true
    }));
  
    try {
      // Log that we're passing video for enhanced analysis
      console.log(`Fetching insights for ${metricKey} with video analysis`);
      
      // Generate insights using the enhanced Gemini service
      // This now passes the swing data WITH video
      const insights = await metricInsightsGenerator.generateMetricInsights(enhancedSwingData, metricKey);
  
      // Update insights state
      setMetricInsights(prev => ({
        ...prev,
        [metricKey]: insights
      }));
    } catch (error) {
      console.error(`Error fetching insights for ${metricKey}:`, error);
      // Fallback to default insights
      setMetricInsights(prev => ({
        ...prev,
        [metricKey]: metricInsightsGenerator.getDefaultInsights(metricKey)
      }));
    } finally {
      // Clear loading state
      setLoadingInsights(prev => ({
        ...prev,
        [metricKey]: false
      }));
    }
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

  // Toggle metric expansion and fetch insights
  const toggleMetricExpansion = (metricKey) => {
    setExpandedMetrics(prev => ({
      ...prev,
      [metricKey]: !prev[metricKey]
    }));
  
    // Fetch insights when expanding
    if (!expandedMetrics[metricKey]) {
      // Create a copy of the swing data with the current video element reference
      const swingDataWithVideo = {
        ...swingData,
        // Ensure the videoUrl is current and accessible
        videoUrl: swingData.videoUrl || (videoRef.current ? videoRef.current.src : null)
      };
      
      // Pass the enhanced swing data with video reference
      fetchMetricInsights(metricKey, swingDataWithVideo);
    }
  };

  // Render metric insights
  const renderMetricInsights = (metricKey, score) => {
    const insights = metricInsights[metricKey];
    const isLoading = loadingInsights[metricKey];
  
    // Determine insight tone based on score
    const insightTone = score >= 80 ? 'positive' : score >= 60 ? 'neutral' : 'needs-improvement';
  
    // If loading, show loading spinner
    if (isLoading) {
      return (
        <div
          className="insights-loading"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px'
          }}
        >
          <div
            className="spinner"
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0, 0, 0, 0.1)',
              borderTopColor: '#3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ marginLeft: '10px' }}>Generating insights...</span>
        </div>
      );
    }
  
    // If no insights yet, return null
    if (!insights) return null;
  
    // Validate insights structure before rendering
    if (!insights.goodAspects || !insights.improvementAreas || !insights.technicalBreakdown || !insights.recommendations) {
      console.error("Invalid insights structure:", insights);
      return <div>Error loading insights.</div>; // Or a more user-friendly message
    }
  
    return (
      <div
        className="metric-insights"
        style={{
          backgroundColor: insightTone === 'positive' ? '#e6f3e6' :
            insightTone === 'neutral' ? '#f0f0f0' : '#f9e6e6',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '10px'
        }}
      >
        {/* Standard insights sections */}
        {['goodAspects', 'improvementAreas', 'technicalBreakdown', 'recommendations'].map(section => (
          <div key={section} className={section}>
            <h4>
              {section === 'goodAspects' && 'What Went Well'}
              {section === 'improvementAreas' && 'Areas to Improve'}
              {section === 'technicalBreakdown' && 'Technical Breakdown'}
              {section === 'recommendations' && 'Actionable Recommendations'}
            </h4>
            <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
              {insights && insights[section] && Array.isArray(insights[section]) ? (
                insights[section].map((item, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                ))
              ) : (
                <li>No data available</li> // Or any other fallback
              )}
            </ul>
          </div>
        ))}
        
        {/* New section for Feel Tips */}
        {insights.feelTips && insights.feelTips.length > 0 && (
          <div className="feel-tips" style={{
            marginTop: '15px',
            backgroundColor: '#f0f7ff',
            padding: '12px',
            borderRadius: '8px',
            borderLeft: '4px solid #3498db'
          }}>
            <h4 style={{ marginTop: 0, color: '#2c3e50', marginBottom: '10px' }}>How It Should Feel</h4>
            <ul style={{ paddingLeft: '20px', marginBottom: '0' }}>
              {insights.feelTips.map((tip, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
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

  return (
    <div className="analysis-container">
      <div className="card">
        <h2>Swing Analysis</h2>

        {/* Date Information */}
        <div className="date-info" style={{ marginBottom: '15px' }}>
          {swingData.recordedDate && (
            <p>
              <strong>Recorded on:</strong> {formatDateTime(swingData.recordedDate)}
              {swingData.clubName && ` with ${swingData.clubName}`}
            </p>
          )}
          <p><strong>Analyzed on:</strong> {formatDateTime(swingData.date)}</p>

          {swingData.outcome && (
            <div style={{
              display: 'inline-block',
              backgroundColor: '#f0f7ff',
              color: '#3498db',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginTop: '5px'
            }}>
              Shot Outcome: {swingData.outcome.charAt(0).toUpperCase() + swingData.outcome.slice(1)}
            </div>
          )}
        </div>

        {/* Custom video container with controlled dimensions */}
        <div className="video-container">
          <video
            ref={videoRef}
            src={swingData.videoUrl}
            controls
            playsInline
            preload="metadata"
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

        <div className="metrics-section">
          <h3>Swing Metrics</h3>

          {Object.entries(swingData.metrics).map(([key, value]) => (
            <div key={key} className="metric-item">
              <div
                className="metric-label"
                onClick={() => toggleMetricExpansion(key)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '10px' }}>{value}/100</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transform: expandedMetrics[key] ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="#666"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
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

              {/* Expanded Metric Insights */}
              {expandedMetrics[key] && renderMetricInsights(key, value)}
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