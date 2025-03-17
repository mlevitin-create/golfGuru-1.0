import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import { metricInsightsGenerator } from '../services/geminiService';
import './SwingAnalysis.css'; // Import a CSS file for styling
import FeedbackWidget from './FeedbackWidget';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [expandedMetrics, setExpandedMetrics] = useState({});
  const [metricInsights, setMetricInsights] = useState({});
  const [loadingInsights, setLoadingInsights] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const videoRef = useRef(null); // Create a video reference

  // Scroll to top and reset expanded metrics when swing data changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setExpandedMetrics({});
    setMetricInsights({});
    setExpandedSections({});
  }, [swingData?.id]);

  // When a new metric is expanded, initialize its sections as expanded
  useEffect(() => {
    // For any newly expanded metric, set all its sections to expanded
    Object.keys(expandedMetrics).forEach(metric => {
      if (expandedMetrics[metric] && !expandedSections[metric]) {
        setExpandedSections(prev => ({
          ...prev,
          [metric]: {
            goodAspects: true,
            improvementAreas: true,
            technicalBreakdown: true,
            recommendations: true,
            feelTips: true
          }
        }));
      }
    });
  }, [expandedMetrics]);

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

  // Toggle metric expansion and fetch insights with debounce to prevent double triggering
  const toggleMetricExpansion = (metricKey, event) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Add a delay flag to prevent double-triggering on mobile
    if (window.lastToggleTime && (Date.now() - window.lastToggleTime < 300)) {
      console.log('Ignoring rapid toggle');
      return;
    }
    
    window.lastToggleTime = Date.now();
    
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

  // Toggle section expansion with debounce
  const toggleSection = (metricKey, section, event) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Add a delay flag to prevent double-triggering on mobile
    if (window.lastSectionToggleTime && (Date.now() - window.lastSectionToggleTime < 300)) {
      console.log('Ignoring rapid section toggle');
      return;
    }
    
    window.lastSectionToggleTime = Date.now();
    
    setExpandedSections(prev => ({
      ...prev,
      [metricKey]: {
        ...(prev[metricKey] || {}),
        [section]: !(prev[metricKey] && prev[metricKey][section])
      }
    }));
  };

  // Check if a section is expanded
  const isSectionExpanded = (metricKey, section) => 
    expandedSections[metricKey] && expandedSections[metricKey][section];

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
            <div 
              className="section-header"
              onClick={(e) => toggleSection(metricKey, section, e)}
              role="button"
              tabIndex={0}
              aria-expanded={isSectionExpanded(metricKey, section) || false}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
            >
              <h4>
                {section === 'goodAspects' && 'What Went Well'}
                {section === 'improvementAreas' && 'Areas to Improve'}
                {section === 'technicalBreakdown' && 'Technical Breakdown'}
                {section === 'recommendations' && 'Actionable Recommendations'}
              </h4>
              <button 
                className="toggle-button"
                aria-label={`Toggle ${section}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(metricKey, section, e);
                }}
              >
                {isSectionExpanded(metricKey, section) ? '−' : '+'}
              </button>
            </div>
            
            {isSectionExpanded(metricKey, section) && (
              <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
                {insights && insights[section] && Array.isArray(insights[section]) ? (
                  insights[section].map((item, index) => (
                    <li key={index} style={{ marginBottom: '5px' }}>{item}</li>
                  ))
                ) : (
                  <li>No data available</li> // Or any other fallback
                )}
              </ul>
            )}
          </div>
        ))}
        
        {/* New section for Feel Tips */}
        {insights.feelTips && insights.feelTips.length > 0 && (
          <div className="feel-tips">
            <div 
              className="section-header"
              onClick={(e) => toggleSection(metricKey, 'feelTips', e)}
              role="button"
              tabIndex={0}
              aria-expanded={isSectionExpanded(metricKey, 'feelTips') || false}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
            >
              <h4>How It Should Feel</h4>
              <button 
                className="toggle-button"
                aria-label="Toggle Feel Tips"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(metricKey, 'feelTips', e);
                }}
              >
                {isSectionExpanded(metricKey, 'feelTips') ? '−' : '+'}
              </button>
            </div>
            
            {isSectionExpanded(metricKey, 'feelTips') && (
              <ul style={{ paddingLeft: '20px', marginBottom: '0' }}>
                {insights.feelTips.map((tip, index) => (
                  <li key={index} style={{ marginBottom: '5px' }}>{tip}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to get more descriptive section titles based on the swing recipe
  const getMetricDisplayInfo = (metricKey) => {
    // Map internal metric keys to display-friendly information
    const metricInfo = {
      // Existing metrics
      backswing: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8
      },
      stance: {
        title: "Stance",
        description: "Your foot position, width, alignment, and posture",
        category: "Setup",
        difficulty: 2
      },
      grip: {
        title: "Grip",
        description: "How you hold the club and hand positioning",
        category: "Setup",
        difficulty: 3
      },
      swingBack: {
        title: "Backswing Club Path",
        description: "The path your club takes on the way back",
        category: "Club",
        difficulty: 8
      },
      swingForward: {
        title: "Downswing Club Path",
        description: "The path your club takes on the way down to impact",
        category: "Club",
        difficulty: 8
      },
      hipRotation: {
        title: "Hip Rotation",
        description: "How your hips rotate throughout the swing",
        category: "Body",
        difficulty: 6
      },
      swingSpeed: {
        title: "Swing Speed",
        description: "The velocity and acceleration through your swing",
        category: "Club",
        difficulty: 7
      },
      shallowing: {
        title: "Shallowing",
        description: "How well your club drops into the proper path during downswing",
        category: "Club",
        difficulty: 9
      },
      pacing: {
        title: "Tempo & Rhythm",
        description: "The timing and rhythm throughout your swing",
        category: "Body",
        difficulty: 6
      },
      confidence: {
        title: "Confidence",
        description: "Your mental composure and commitment to the swing",
        category: "Mental",
        difficulty: 7
      },
      focus: {
        title: "Focus",
        description: "Your concentration and attention during setup and swing",
        category: "Mental",
        difficulty: 4
      },
      headPosition: {
        title: "Head Position",
        description: "The stability and position of your head during the swing",
        category: "Body",
        difficulty: 4
      },
      shoulderPosition: {
        title: "Shoulder Position",
        description: "How your shoulders move and position throughout the swing",
        category: "Body",
        difficulty: 6
      },
      armPosition: {
        title: "Arm Position",
        description: "The positioning of your arms throughout the swing",
        category: "Body", 
        difficulty: 6
      },
      followThrough: {
        title: "Follow Through",
        description: "Your swing completion after ball contact",
        category: "Body",
        difficulty: 4
      },
      
      // Additional metrics from Swing Recipe
      stiffness: {
        title: "Stiffness",
        description: "Your ability to remove tension from your body during your swing",
        category: "Body",
        difficulty: 5
      },
      ballPosition: {
        title: "Ball Position",
        description: "The position of the ball relative to your stance and club type",
        category: "Setup",
        difficulty: 1
      },
      impactPosition: {
        title: "Impact Position",
        description: "The position and angle of the club at the moment of impact",
        category: "Club",
        difficulty: 10
      },
      
      // Variants with different naming conventions that might appear in the data
      clubTrajectoryBackswing: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8
      },
      clubTrajectoryForswing: {
        title: "Downswing",
        description: "The path your club takes on the way down to impact",
        category: "Club",
        difficulty: 8
      }
    };
  
    // Default display info if not found
    const defaultInfo = {
      title: metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: "An important aspect of your golf swing",
      category: "General",
      difficulty: 5
    };
  
    return metricInfo[metricKey] || defaultInfo;
  };

  // Helper function for category colors
  const getCategoryColor = (category) => {
    switch(category) {
      case 'Mental': return '#9b59b6'; // Purple
      case 'Body': return '#e67e22';   // Orange
      case 'Setup': return '#3498db';  // Blue
      case 'Club': return '#2ecc71';   // Green
      default: return '#95a5a6';       // Gray
    }
  };

  // Replace the renderVideo function in SwingAnalysis.js with this code:

  // Render video based on type (YouTube or regular file)
  const renderVideo = () => {
    // Handle YouTube videos
    if (swingData.isYouTubeVideo) {
      return (
        <div className="video-container">
          <div style={{ 
            position: 'relative',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            width: '100%',
            maxWidth: '600px', // Match the max-width from CSS for uploaded videos
            height: 0,
            overflow: 'hidden',
            borderRadius: '8px',
            margin: '0 auto'
          }}>
            <iframe
              src={swingData.videoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '8px'
              }}
            ></iframe>
          </div>
        </div>
      );
    } 
    // Handle non-user swings where video was skipped
    else if (swingData.isVideoSkipped || swingData.videoUrl === 'non-user-swing') {
      return (
        <div className="video-container">
          <div style={{
            width: '100%',
            maxWidth: '600px',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            margin: '0 auto',
            padding: '20px',
            textAlign: 'center'
          }}>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#3498db" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <p style={{ marginTop: '15px', fontSize: '1.1rem' }}>
              {swingData.swingOwnership === 'pro' 
                ? `Analysis for ${swingData.proGolferName || 'professional golfer'}'s swing` 
                : swingData.swingOwnership === 'other' 
                  ? "Analysis for friend's swing" 
                  : "Video not saved to optimize storage"}
            </p>
            <p style={{ marginTop: '5px', fontSize: '0.9rem', color: '#666' }}>
              This swing was analyzed but the video wasn't stored since it's not your own swing.
            </p>
          </div>
        </div>
      );
    } 
    // Handle regular uploaded videos
    else {
      return (
        <div className="video-container">
          <video
            ref={videoRef}
            src={swingData.videoUrl}
            controls
            playsInline
            preload="metadata"
          />
        </div>
      );
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
          
          {swingData.isYouTubeVideo && (
            <div style={{
              display: 'inline-block',
              backgroundColor: '#f0f7ff',
              color: '#3498db',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginTop: '5px',
              marginLeft: '5px'
            }}>
              YouTube Video
            </div>
          )}
        </div>

        {/* Render video based on source type */}
        {renderVideo()}

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
                className={`metric-label ${expandedMetrics[key] ? 'expanded' : ''}`}
                onClick={(e) => toggleMetricExpansion(key, e)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedMetrics[key] || false}
                style={{
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {getMetricDisplayInfo(key).title}
                  </span>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#777',
                    marginTop: '2px',
                    display: expandedMetrics[key] ? 'none' : 'block'
                  }}>
                    {getMetricDisplayInfo(key).description}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#555',
                    display: expandedMetrics[key] ? 'flex' : 'none',
                    marginTop: '3px',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      backgroundColor: getCategoryColor(getMetricDisplayInfo(key).category),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '0.7rem'
                    }}>
                      {getMetricDisplayInfo(key).category}
                    </span>
                    <span>
                      Difficulty: {getMetricDisplayInfo(key).difficulty}/10
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    backgroundColor: getScoreColor(value),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginRight: '8px'
                  }}>
                    {value}
                  </div>
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
      
      {/* Feedback Collection */}
      <div className="feedback-section" style={{ marginTop: '30px' }}>
        <FeedbackWidget 
          swingData={swingData} 
          onFeedbackGiven={() => {
            // Optionally handle feedback submission completion
            console.log('Feedback submitted');
          }} 
        />
      </div>
    </div>
  );
};

export default SwingAnalysis;