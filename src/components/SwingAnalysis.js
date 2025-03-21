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
  
  // Handle video URL management
  const { videoUrl, isTemporary, isYouTube, hasVideo } = useVideoUrl(swingData);
  
  // Get ownership information
  const ownershipHandler = SwingOwnershipHandler({ swingData });
  
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
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Overall Score */}
        <div className="overall-score-section" style={{ marginBottom: '20px' }}>
          <div style={{ 
            borderTop: '1px solid #ccc',
            borderBottom: '1px solid #ccc',
            padding: '10px 0',
            display: 'flex'
          }}>
            <div style={{ 
              fontSize: '6rem', 
              fontWeight: 'bold', 
              color: '#333',
              width: '200px'
            }}>
              {Math.round(swingData.overallScore)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'normal', color: '#666', marginBottom: '5px' }}>
                Out of 100
              </div>
              {swingData.clubName && (
                <div style={{ fontSize: '1rem', color: '#666' }}>
                  Club: {swingData.clubName}
                </div>
              )}
              {swingData.recordedDate && (
                <div style={{ fontSize: '1rem', color: '#666' }}>
                  {new Date(swingData.recordedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              )}
            </div>
            
            {/* Metrics Overview Table - Right Column */}
            <div style={{ flex: 1, marginLeft: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#546e47', color: 'white' }}>
                    <th style={{ padding: '5px 10px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '5px 10px', textAlign: 'center' }}>Score</th>
                    <th style={{ padding: '5px 10px', textAlign: 'right' }}>vs Average</th>
                  </tr>
                </thead>
                <tbody>
                  {allMetrics.map((metric) => (
                    <tr 
                      key={metric.key} 
                      onClick={() => handleMetricClick(metric.key)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedMetric === metric.key ? '#f0f7ff' : 'transparent',
                        opacity: loadingInsights && selectedMetric !== metric.key ? 0.5 : 1
                      }}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Top and Bottom Metrics */}
        <div className="metrics-highlights" style={{ marginBottom: '20px' }}>
          <div style={{
            borderBottom: '1px solid #ccc',
            paddingBottom: '10px',
            marginBottom: '10px'
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
                      color: selectedMetric === normalizeMetricKey(key) ? '#546e47' : 'inherit',
                      fontWeight: selectedMetric === normalizeMetricKey(key) ? 'bold' : 'normal'
                    }}
                  >
                    <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem' }}>
                      {value}
                    </span>
                    <span>{getMetricInfo(key).title}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
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
                    <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem' }}>
                      {value}
                    </span>
                    <span>{metricInfo.title}</span>
                  </div>
                );
              })}
            </div>
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
              marginTop: '10px',
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