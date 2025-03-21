// Updated SwingAnalysis.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SwingOwnershipHandler from './SwingOwnershipHandler';
import useVideoUrl from '../hooks/useVideoUrl';
import firestoreService from '../services/firestoreService';
import { metricInsightsGenerator } from '../services/geminiService';
import { getMetricInfo, getCategoryColor, getScoreColor } from '../utils/swingUtils';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricInsights, setMetricInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState(null);
  const [activeRowId, setActiveRowId] = useState(null);
  
  // Handle video URL management
  const { videoUrl, isTemporary, isYouTube, hasVideo } = useVideoUrl(swingData);
  
  // Get ownership information
  const ownershipHandler = SwingOwnershipHandler({ swingData });

  // Add document-level click handler to hide tooltips when clicking elsewhere
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Check if the click was outside any tooltip
      if (activeTooltip && !activeTooltip.contains(e.target) && 
          !e.target.classList.contains('metric-row')) {
        hideAllTooltips();
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  useEffect(() => {
    // Reset selected metric when swing data changes
    setSelectedMetric(null);
    setMetricInsights(null);
  }, [swingData]);
  
  if (!swingData) {
    return (
      <div className="card">
        <h2>No Swing Analysis Available</h2>
        <p>Please select or upload a swing to analyze.</p>
        <button 
          className="button"
          onClick={() => navigateTo('upload')}
          style={{ marginTop: '15px' }}
        >
          Upload Swing
        </button>
      </div>
    );
  }

  // First, add a function to generate insight text based on the metric and its score
const generateInsightText = (metricKey, score) => {
  // Default insights map with score ranges and corresponding messages
  const insights = {
    backswing: {
      high: "Your backswing shows excellent form with proper rotation and club position.",
      medium: "Your backswing is decent but could use more consistency in positioning.",
      low: "Your backswing needs work - focus on proper rotation and club position."
    },
    stance: {
      high: "Your stance provides excellent stability and alignment for consistent shots.",
      medium: "Your stance is adequate but could be improved for better balance.",
      low: "Your stance needs significant improvement for better stability."
    },
    grip: {
      high: "Your grip is excellent, allowing for proper club control through impact.",
      medium: "Your grip is functional but could be adjusted for better control.",
      low: "Your grip needs refinement to improve overall control and consistency."
    },
    focus: {
      high: "Your mental focus is exceptional throughout the swing.",
      medium: "Your focus is good but occasionally wavers during the swing.",
      low: "Your focus needs improvement - try establishing a consistent pre-shot routine."
    },
    hipRotation: {
      high: "Your hip rotation generates excellent power transfer through impact.",
      medium: "Your hip rotation is adequate but could generate more power.",
      low: "Your hip rotation is limited, reducing power and consistency."
    },
    shallowing: {
      high: "Your club shallowing is excellent, creating an ideal attack angle.",
      medium: "Your shallowing is adequate but could be more consistent.",
      low: "Your club path is too steep - work on proper shallowing technique."
    },
    confidence: {
      high: "Your confidence is exceptional, allowing for committed swings.",
      medium: "Your confidence is good but could be more consistent.",
      low: "Work on building confidence through positive reinforcement."
    },
    swingSpeed: {
      high: "Your swing speed generates excellent distance while maintaining control.",
      medium: "Your swing speed is good but could be optimized for better results.",
      low: "Your swing speed needs work - focus on proper sequencing for more power."
    },
    pacing: {
      high: "Your tempo and rhythm are excellent, creating a smooth, powerful swing.",
      medium: "Your tempo is good but could be more consistent.",
      low: "Your swing rhythm needs work - practice with a metronome."
    },
    // Add more metrics as needed
  };

  // Get the normalized key for consistency
  const normalizedKey = metricKeyMap[metricKey] || metricKey.toLowerCase();
  
  // Determine score range
  let range;
  if (score >= 80) range = "high";
  else if (score >= 60) range = "medium";
  else range = "low";
  
  // Get insight for the specific metric and score range
  if (insights[normalizedKey] && insights[normalizedKey][range]) {
    return insights[normalizedKey][range];
  }
  
  // Default insights if specific one not found
  const defaultInsights = {
    high: `You scored ${score} due to strong technique and proper execution.`,
    medium: `You scored ${score}, showing decent performance with room for improvement.`,
    low: `You scored ${score}, indicating this area needs focused practice.`
  };
  
  return defaultInsights[range];
};

  const normalizeMetricKey = (key) => {
    // Map alternative names to standard ones
    const metricMap = {
      'swingBack': 'backswing',
      'clubTrajectoryBackswing': 'backswing',
      'swingForward': 'downswing',
      'clubTrajectoryForswing': 'downswing'
    };
    
    return metricMap[key] || key;
  };

  const metricKeyMap = {
    'swingBack': 'backswing',
    'clubTrajectoryBackswing': 'backswing',
    'swingForward': 'downswing',
    'clubTrajectoryForswing': 'downswing',
    'pacing': 'tempo & rhythm'
  };

  let activeTooltip = null;

  // Function to create and show tooltip
  const showTooltip = (element, metricKey, score) => {
    // Remove any existing tooltip first
    hideAllTooltips();
    
    // Create new tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'metric-tooltip';
    tooltip.innerHTML = `
      <div style="padding: 15px; max-width: 300px;">
        <p>${generateInsightText(metricKey, score)}</p>
        <p style="margin-top: 10px; font-style: italic; color: #666;">Click for detailed analysis</p>
      </div>
    `;
    
    // Style the tooltip
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '100';
    tooltip.style.backgroundColor = 'white';
    tooltip.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    tooltip.style.borderRadius = '8px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.width = '300px';
    tooltip.style.top = `${element.offsetHeight}px`;
    
    // Add to DOM
    element.appendChild(tooltip);
    
    // Update active tooltip reference
    activeTooltip = tooltip;
  };
  
  // Function to hide all tooltips
  const hideAllTooltips = () => {
    const tooltips = document.querySelectorAll('.metric-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.parentNode.removeChild(tooltip);
    });
    activeTooltip = null;
  };
  
  // Function to get the display name for a metric
const getMetricDisplayName = (key) => {
  // Check if we have a custom display name for this metric
  if (metricKeyMap[key]) {
    // Convert the mapped name to proper case
    return metricKeyMap[key].charAt(0).toUpperCase() + metricKeyMap[key].slice(1);
  }
  
  // Use the getMetricInfo method if available
  if (getMetricInfo) {
    return getMetricInfo(key).title;
  }
  
  // Fallback: Format the raw key with spaces and capitalization
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

// Function to deduplicate metrics by combining similar ones
const deduplicateMetrics = (metrics) => {
  const uniqueMetrics = {};
  
  // First pass: Group metrics by their normalized names
  Object.entries(metrics).forEach(([key, value]) => {
    const normalizedKey = metricKeyMap[key] || key.toLowerCase();
    
    // If we haven't processed this metric type yet or this score is higher
    if (!uniqueMetrics[normalizedKey] || value > uniqueMetrics[normalizedKey].value) {
      uniqueMetrics[normalizedKey] = { 
        originalKey: key, 
        value: value 
      };
    }
  });
  
  // Convert back to an object with original metric keys
  const result = {};
  Object.entries(uniqueMetrics).forEach(([normalizedKey, data]) => {
    result[data.originalKey] = data.value;
  });
  
  return result;
};

  
  // Handle metric click to generate insights
  const handleMetricClick = async (metricKey) => {
    if (loadingInsights) return;
    
    // Normalize the metric key to handle duplicates
    const normalizedKey = normalizeMetricKey(metricKey);
    
    // If clicking the same metric, toggle off
    if (selectedMetric === normalizedKey) {
      setSelectedMetric(null);
      setMetricInsights(null);
      return;
    }
    
    setSelectedMetric(normalizedKey);
    setLoadingInsights(true);
    setError(null);
    
    try {
      // Get insights from Gemini service - real analysis
      const insights = await metricInsightsGenerator.generateMetricInsights(swingData, normalizedKey);
      setMetricInsights(insights);
    } catch (error) {
      console.error(`Error getting insights for ${normalizedKey}:`, error);
      setError(`Failed to analyze ${getMetricInfo(normalizedKey).title}. Please try again.`);
      
      // Use defaults as fallback
      const defaultInsights = metricInsightsGenerator.getDefaultInsights(normalizedKey, swingData);
      setMetricInsights(defaultInsights);
    } finally {
      setLoadingInsights(false);
    }
  };
  
  // Sort metrics by score
  const processedMetrics = deduplicateMetrics(swingData.metrics || {});
  const sortedMetrics = Object.entries(processedMetrics)
    .sort((a, b) => b[1] - a[1]);

  
  // Get top and bottom 3 metrics
  const topMetrics = sortedMetrics.slice(0, 3);
  const bottomMetrics = sortedMetrics.slice(-3).reverse();
  
  // Generate list of all metrics for the detailed table
  const allMetrics = sortedMetrics.map(([key, value]) => {
    const metricInfo = getMetricInfo(key);
    return {
      key,
      value,
      title: metricInfo.title,
      category: metricInfo.category
    };
  });
  
  // Group metrics by category
  const metricsByCategory = allMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {});

  return (
    <div className="swing-analysis-container">
      <h1 style={{ 
        color: '#546e47', 
        textAlign: 'center', 
        fontSize: '2.5rem', 
        marginBottom: '20px',
        fontWeight: '400',
        fontFamily: 'serif'
      }}>
        Swing AI
      </h1>
      
      {ownershipHandler.renderOwnershipBadge()}
      {ownershipHandler.renderStorageMessage()}
      
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px 15px', 
          borderRadius: '5px', 
          marginBottom: '15px' 
        }}>
          {error}
        </div>
      )}
      
      <div className="analysis-content" style={{ 
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Overall Score Section with Table on Right */}
        <div style={{ 
          display: 'flex',
          borderTop: '1px solid #ccc',
          borderBottom: '1px solid #ccc',
          padding: '10px 0'
        }}>
          {/* Left side - Overall score and attributes */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            width: '40%',
            paddingRight: '20px'
          }}>
            {/* Overall Score */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ 
                fontSize: '6rem', 
                fontWeight: 'bold', 
                color: '#333',
                lineHeight: '1'
              }}>
                {Math.round(swingData.overallScore)}
              </div>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>
                Out of 100
              </div>
              <div style={{ fontSize: '1rem', color: '#666' }}>
                {new Date(swingData.recordedDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            
            {/* Top 3 Attributes */}
            <div style={{
              borderTop: '1px solid #ccc',
              paddingTop: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Top 3 Attributes</h3>
              <div>
                {topMetrics.map(([key, value], index) => {
                  const metricInfo = getMetricInfo(key);
                  return (
                    <div 
                      key={key}
                      onClick={() => handleMetricClick(key)}
                      style={{ 
                        marginBottom: '5px', 
                        cursor: 'pointer',
                        color: selectedMetric === key ? '#546e47' : 'inherit',
                        fontWeight: selectedMetric === key ? 'bold' : 'normal'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                        {value}
                      </span>
                      <span>{metricInfo.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Bottom 3 Attributes */}
            <div style={{
              borderTop: '1px solid #ccc',
              paddingTop: '15px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Bottom 3 Attributes</h3>
              <div>
                {bottomMetrics.map(([key, value], index) => {
                  const metricInfo = getMetricInfo(key);
                  return (
                    <div 
                      key={key}
                      onClick={() => handleMetricClick(key)}
                      style={{ 
                        marginBottom: '5px', 
                        cursor: 'pointer',
                        color: selectedMetric === key ? '#546e47' : 'inherit',
                        fontWeight: selectedMetric === key ? 'bold' : 'normal'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                        {value}
                      </span>
                      <span>{metricInfo.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Right side - Metrics Table */}
          <div style={{ flex: '1' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#546e47', color: 'white' }}>
                  <th style={{ padding: '5px 10px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '5px 10px', textAlign: 'center' }}>Score</th>
                  <th style={{ padding: '5px 10px', textAlign: 'right' }}>vs Average</th>
                </tr>
              </thead>
              <tbody>
              {allMetrics.map((metric, index) => {
              const rowId = `metric-row-${index}`;
              const isActive = activeRowId === rowId;
              
              return (
                <tr 
                  key={metric.key}
                  id={rowId}
                  className="metric-row"
                  onClick={() => {
                    handleMetricClick(metric.key);
                    // Auto-scroll to insights section when clicked
                    setTimeout(() => {
                      const insightsElement = document.querySelector('.metric-insights');
                      if (insightsElement) {
                        insightsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 200);
                  }}
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedMetric === metric.key ? '#f0f7ff' : 'transparent',
                    opacity: loadingInsights && selectedMetric !== metric.key ? 0.5 : 1,
                    position: 'relative' // For the tooltip positioning
                  }}
                  onMouseEnter={() => setActiveRowId(rowId)}
                  onMouseLeave={() => setActiveRowId(null)}
                >
                  <td style={{ 
                    padding: '5px 10px', 
                    borderBottom: '1px dotted #ddd',
                    color: selectedMetric === metric.key ? '#000' : '#666'
                  }}>
                    {metric.title}
                  </td>
                  <td style={{ 
                    padding: '5px 10px', 
                    textAlign: 'center', 
                    borderBottom: '1px dotted #ddd',
                    fontWeight: selectedMetric === metric.key ? 'bold' : 'normal' 
                  }}>
                    {metric.value}
                  </td>
                  <td style={{ 
                    padding: '5px 10px', 
                    textAlign: 'right', 
                    borderBottom: '1px dotted #ddd',
                    color: metric.value > 70 ? 'green' : 'red' 
                  }}>
                    {metric.value > 70 ? '+' : '-'}x%
                  </td>
                  
                  {/* Tooltip - rendered conditionally instead of added/removed from DOM */}
                  {isActive && (
                    <div 
                      className="metric-tooltip"
                      style={{
                        position: 'absolute',
                        zIndex: '100',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '300px',
                        top: '100%',
                        padding: '15px',
                        pointerEvents: 'none' // Make tooltip non-interactive to prevent hover issues
                      }}
                    >
                      <p>{generateInsightText(metric.key, metric.value)}</p>
                      <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
                        Click for detailed analysis
                      </p>
                    </div>
                  )}
                </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Selected Metric Insights */}
        {selectedMetric && (
          <div 
            className="metric-insights"
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: '20px',
              marginTop: '20px',
              position: 'relative'
            }}
          >
            {loadingInsights ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                padding: '30px 0'
              }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '15px' }}>Analyzing {getMetricInfo(selectedMetric).title}...</p>
              </div>
            ) : metricInsights ? (
              <>
                <h3 style={{ margin: '0 0 15px 0' }}>
                  {getMetricInfo(selectedMetric).title} Analysis
                </h3>
                
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '0',
                    right: '0',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>
                    Score: {swingData.metrics[selectedMetric]}
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#27ae60' }}>Strengths</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      {metricInsights.goodAspects.map((aspect, index) => (
                        <li key={index}>{aspect}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#e74c3c' }}>Areas for Improvement</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      {metricInsights.improvementAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ 
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '5px',
                    marginTop: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#3498db' }}>Recommendations</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      {metricInsights.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                    
                    <h4 style={{ margin: '15px 0 8px 0', color: '#9b59b6' }}>How it Should Feel</h4>
                    <ul style={{ margin: '0', paddingLeft: '20px' }}>
                      {metricInsights.feelTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  marginTop: '20px'
                }}>
                  <button
                    onClick={() => {
                      setSelectedMetric(null);
                      setMetricInsights(null);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Close
                    <span style={{ marginLeft: '5px' }}>×</span>
                  </button>
                </div>
              </>
            ) : (
              <p>Error loading insights. Please try again.</p>
            )}
          </div>
        )}
        
        {/* Recommendations */}
        {swingData.recommendations && swingData.recommendations.length > 0 && (
          <div className="recommendations" style={{ 
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Key Recommendations</h3>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {swingData.recommendations.map((rec, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Video Display */}
        {hasVideo && (
          <div className="video-container" style={{ 
            marginTop: '30px', 
            display: 'flex',
            justifyContent: 'center'
          }}>
            {isYouTube ? (
              <iframe
                width="560"
                height="315"
                src={videoUrl}
                title="Golf Swing Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ maxWidth: '100%', borderRadius: '8px' }}
              ></iframe>
            ) : (
              <video
                src={videoUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
              ></video>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <div className="dashboard-nav" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '40px',
        border: '1px solid #ddd',
        borderRadius: '50px',
        overflow: 'hidden',
        maxWidth: '600px',
        margin: '40px auto 20px auto'
      }}>
        <button
          onClick={() => navigateTo('upload')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          UPLOAD
        </button>
        
        <button
          onClick={() => navigateTo('dashboard')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          DASHBOARD
        </button>
        
        <button
          onClick={() => navigateTo('comparison')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          CADDIE
        </button>
        
        <button
          onClick={() => navigateTo('profile')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          MY BAG
        </button>
      </div>
      
      {/* Copyright */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '0.8rem',
        color: '#999'
      }}>
        © {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default SwingAnalysis;