// Mobile-Optimized SwingAnalysis.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SwingOwnershipHandler from './SwingOwnershipHandler';
import useVideoUrl from '../hooks/useVideoUrl';
import firestoreService from '../services/firestoreService';
import { metricInsightsGenerator } from '../services/geminiService';
import { getMetricInfo, getCategoryColor, getScoreColor } from '../utils/swingUtils';
import './SwingAnalysis.css';

const SwingAnalysis = ({ swingData, navigateTo, setSwingHistory }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricInsights, setMetricInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [expandedSections, setExpandedSections] = useState({
    goodAspects: true,
    improvementAreas: true,
    technicalBreakdown: false,
    recommendations: true,
    feelTips: true
  });
  const [activeTooltip, setActiveTooltip] = useState(null);
  const tooltipRef = useRef(null);
  
  // Handle video URL management
  const { videoUrl, isTemporary, isYouTube, hasVideo } = useVideoUrl(swingData);
  
  // Get ownership information
  const ownershipHandler = SwingOwnershipHandler({ swingData });

  // Check if screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle click outside tooltip
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        // Only close if clicked element isn't the metric row that opened it
        if (!event.target.closest('.metric-row')) {
          setActiveTooltip(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset selected metric when swing data changes
  useEffect(() => {
    setSelectedMetric(null);
    setMetricInsights(null);
    setActiveTooltip(null);
  }, [swingData]);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Check if a section is expanded
  const isSectionExpanded = (section) => {
    return expandedSections[section];
  };
  
  // Show tooltip for a metric
  const showTooltip = (metricId, metricKey, value) => {
    // On mobile, toggle tooltip visibility
    if (isMobile) {
      if (activeTooltip === metricId) {
        setActiveTooltip(null);
      } else {
        setActiveTooltip(metricId);
      }
    } else {
      // On desktop, just show the tooltip on hover
      setActiveTooltip(metricId);
    }
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    // Only hide on desktop (hover out)
    if (!isMobile) {
      setActiveTooltip(null);
    }
  };

  // Function to generate insight text based on the metric and its score
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
  
  // Using useCallback to ensure function reference stability
  const generateAIAnalysis = useCallback(async (metricKey) => {
    // Normalize the metric key
    const normalizedKey = normalizeMetricKey(metricKey);
    
    // Update UI state
    setSelectedMetric(normalizedKey);
    setLoadingInsights(true);
    setError(null);
    
    // Close any open tooltips
    setActiveTooltip(null);
    
    try {
      // Get insights from Gemini service
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
  }, [swingData]);
  
  // Handle metric click for desktop - initiates analysis directly
  const handleDesktopMetricClick = useCallback((metricKey) => {
    if (loadingInsights) return;
    
    const normalizedKey = normalizeMetricKey(metricKey);
    
    // If clicking the same metric, toggle off
    if (selectedMetric === normalizedKey) {
      setSelectedMetric(null);
      setMetricInsights(null);
      return;
    }
    
    // On desktop: directly perform analysis
    generateAIAnalysis(normalizedKey);
  }, [loadingInsights, selectedMetric, generateAIAnalysis]);

  if (!swingData) {
    return (
      <div className="card">
        <h2>No Swing Analysis Available</h2>
        <p>Please select or upload a swing to analyze.</p>
        <button 
          className="button"
          onClick={() => navigateTo('upload')}
          style={{ marginTop: '15px', width: isMobile ? '100%' : 'auto' }}
        >
          Upload Swing
        </button>
      </div>
    );
  }

  const metricKeyMap = {
    'swingBack': 'backswing',
    'clubTrajectoryBackswing': 'backswing',
    'swingForward': 'downswing',
    'clubTrajectoryForswing': 'downswing',
    'pacing': 'tempo & rhythm'
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

  // Function to deduplicate metrics by combining similar ones
  function deduplicateMetrics(metrics) {
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
  }

  return (
    <div className="swing-analysis-container">
      <h1 style={{ 
        color: '#546e47', 
        textAlign: 'center', 
        fontSize: isMobile ? '2rem' : '2.5rem', 
        marginBottom: isMobile ? '10px' : '20px',
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
        {/* Overall Score Section - Responsive Layout */}
        <div style={{ 
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          borderTop: '1px solid #ccc',
          borderBottom: '1px solid #ccc',
          padding: isMobile ? '10px 0 15px' : '10px 0'
        }}>
          {/* Left side - Overall score and attributes */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            width: isMobile ? '100%' : '40%',
            paddingRight: isMobile ? '0' : '20px',
            marginBottom: isMobile ? '20px' : '0'
          }}>
            {/* Overall Score */}
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'space-between' : 'flex-start'
            }}>
              <div style={{ 
                fontSize: isMobile ? '4.5rem' : '6rem', 
                fontWeight: 'bold', 
                color: '#333',
                lineHeight: '1'
              }}>
                {Math.round(swingData.overallScore)}
              </div>
              <div style={{ marginLeft: isMobile ? 'auto' : '15px' }}>
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
            </div>
            
            {/* Top 3 Attributes */}
            <div style={{
              borderTop: '1px solid #ccc',
              paddingTop: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: isMobile ? '1.1rem' : '1.3rem'
              }}>
                Top 3 Attributes
              </h3>
              <div>
              {topMetrics.map(([key, value], index) => {
                  const metricInfo = getMetricInfo(key);
                  const metricId = `top-metric-${index}`;
                  return (
                    <div 
                      key={key}
                      className="metric-row"
                      onClick={() => {
                        // For both mobile and desktop, first show tooltip
                        showTooltip(metricId, key, value);
                      }}
                      style={{ 
                        marginBottom: '5px', 
                        cursor: 'pointer',
                        color: selectedMetric === key ? '#546e47' : 'inherit',
                        fontWeight: selectedMetric === key ? 'bold' : 'normal',
                        padding: isMobile ? '8px 5px' : '5px 0',
                        borderRadius: '5px',
                        backgroundColor: isMobile && selectedMetric === key ? '#f0f7ff' : 'transparent',
                        position: 'relative'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                        {value}
                      </span>
                      <span>{metricInfo.title}</span>
                      
                      {/* Tooltip for top metrics */}
                      {activeTooltip === metricId && (
                        <div 
                          ref={tooltipRef}
                          className="metric-tooltip"
                          style={{
                            position: 'absolute',
                            zIndex: 100,
                            backgroundColor: 'white',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            left: isMobile ? '0' : '50%',
                            width: isMobile ? '100%' : '300px',
                            transform: isMobile ? 'none' : 'translateX(-50%)',
                            top: isMobile ? '100%' : '-120px',
                            padding: '15px',
                            border: '1px solid #ddd'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {metricInfo.title}
                            </h4>
                            
                            <div style={{
                              backgroundColor: getScoreColor(value),
                              color: 'white',
                              fontWeight: 'bold',
                              padding: '3px 10px',
                              borderRadius: '15px',
                              fontSize: '0.9rem'
                            }}>
                              {value}
                            </div>
                          </div>
                          
                          <p style={{ margin: '10px 0' }}>{generateInsightText(key, value)}</p>
                          
                          {/* Button for deep dive analytics */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAIAnalysis(key);
                              setActiveTooltip(null); // Close tooltip
                              
                              // Auto-scroll to insights section after clicking
                              setTimeout(() => {
                                const insightsElement = document.querySelector('.metric-insights');
                                if (insightsElement) {
                                  insightsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 200);
                            }}
                            style={{
                              marginTop: '10px',
                              backgroundColor: '#546e47',
                              color: 'white',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '8px 15px',
                              width: '100%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem'
                            }}
                          >
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{ marginRight: '5px' }}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12" y2="8" />
                            </svg>
                            Generate AI Deep Dive Analysis
                          </button>
                        </div>
                      )}
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
              <h3 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: isMobile ? '1.1rem' : '1.3rem'
              }}>
                Bottom 3 Attributes
              </h3>
              <div>
                {bottomMetrics.map(([key, value], index) => {
                  const metricInfo = getMetricInfo(key);
                  const metricId = `bottom-metric-${index}`;
                  return (
                    <div 
                      key={key}
                      className="metric-row"
                      onClick={() => {
                        // For both mobile and desktop, first show tooltip
                        showTooltip(metricId, key, value);
                      }}
                      style={{ 
                        marginBottom: '5px', 
                        cursor: 'pointer',
                        color: selectedMetric === key ? '#546e47' : 'inherit',
                        fontWeight: selectedMetric === key ? 'bold' : 'normal',
                        padding: isMobile ? '8px 5px' : '5px 0',
                        borderRadius: '5px',
                        backgroundColor: isMobile && selectedMetric === key ? '#f0f7ff' : 'transparent',
                        position: 'relative'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                        {value}
                      </span>
                      <span>{metricInfo.title}</span>
                      
                      {/* Tooltip for bottom metrics */}
                      {activeTooltip === metricId && (
                        <div 
                          ref={tooltipRef}
                          className="metric-tooltip"
                          style={{
                            position: 'absolute',
                            zIndex: 100,
                            backgroundColor: 'white',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            left: isMobile ? '0' : '50%',
                            width: isMobile ? '100%' : '300px',
                            transform: isMobile ? 'none' : 'translateX(-50%)',
                            top: isMobile ? '100%' : '-120px',
                            padding: '15px',
                            border: '1px solid #ddd'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {metricInfo.title}
                            </h4>
                            
                            <div style={{
                              backgroundColor: getScoreColor(value),
                              color: 'white',
                              fontWeight: 'bold',
                              padding: '3px 10px',
                              borderRadius: '15px',
                              fontSize: '0.9rem'
                            }}>
                              {value}
                            </div>
                          </div>
                          
                          <p style={{ margin: '10px 0' }}>{generateInsightText(key, value)}</p>
                          
                          {/* Button for deep dive analytics */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateAIAnalysis(key);
                              setActiveTooltip(null); // Close tooltip
                              
                              // Auto-scroll to insights section after clicking
                              setTimeout(() => {
                                const insightsElement = document.querySelector('.metric-insights');
                                if (insightsElement) {
                                  insightsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 200);
                            }}
                            style={{
                              marginTop: '10px',
                              backgroundColor: '#546e47',
                              color: 'white',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '8px 15px',
                              width: '100%',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem'
                            }}
                          >
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{ marginRight: '5px' }}
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12" y2="8" />
                            </svg>
                            Generate AI Deep Dive Analysis
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Right side - Metrics Table - Mobile optimized */}
          <div style={{ 
            flex: '1', 
            maxHeight: isMobile ? '300px' : 'none',
            overflowY: isMobile ? 'auto' : 'visible',
            paddingRight: isMobile ? '5px' : '0'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}>
              <thead style={{ position: isMobile ? 'sticky' : 'static', top: 0, backgroundColor: '#546e47', zIndex: 10 }}>
                <tr style={{ backgroundColor: '#546e47', color: 'white' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Score</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>vs Avg</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((metric, index) => {
                  const metricId = `metric-${index}`;
                  return (
                  <tr 
                    key={metric.key}
                    className="metric-row"
                    onClick={(e) => {
                      // On mobile: always show tooltip first
                      if (isMobile) {
                        showTooltip(metricId, metric.key, metric.value);
                      } else {
                        // On desktop: directly generate insights
                        handleDesktopMetricClick(metric.key);
                        // Auto-scroll to insights section when clicked
                        setTimeout(() => {
                          const insightsElement = document.querySelector('.metric-insights');
                          if (insightsElement) {
                            insightsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 200);
                      }
                    }}
                    onMouseEnter={() => !isMobile && showTooltip(metricId, metric.key, metric.value)}
                    onMouseLeave={() => !isMobile && hideTooltip()}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedMetric === metric.key ? '#f0f7ff' : (index % 2 === 0 ? '#f9f9f9' : 'transparent'),
                      opacity: loadingInsights && selectedMetric !== metric.key ? 0.5 : 1,
                      position: 'relative'
                    }}
                  >
                    <td style={{ 
                      padding: isMobile ? '12px 8px' : '8px 10px', 
                      borderBottom: '1px dotted #ddd',
                      color: selectedMetric === metric.key ? '#000' : '#666'
                    }}>
                      {metric.title}
                    </td>
                    <td style={{ 
                      padding: isMobile ? '12px 8px' : '8px 10px', 
                      textAlign: 'center', 
                      borderBottom: '1px dotted #ddd',
                      fontWeight: selectedMetric === metric.key ? 'bold' : 'normal',
                      fontSize: isMobile ? '1rem' : 'inherit'
                    }}>
                      {metric.value}
                    </td>
                    <td style={{ 
                      padding: isMobile ? '12px 8px' : '8px 10px', 
                      textAlign: 'right', 
                      borderBottom: '1px dotted #ddd',
                      color: metric.value > 70 ? 'green' : 'red' 
                    }}>
                      {metric.value > 70 ? '+' : '-'}x%
                    </td>
                    
                    {/* Tooltip - only display when active */}
                    {activeTooltip === metricId && (
                      <div 
                        ref={tooltipRef}
                        className="metric-tooltip"
                        style={{
                          position: 'absolute',
                          zIndex: 100,
                          backgroundColor: 'white',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                          borderRadius: '8px',
                          left: '0', // Set left to 0 for both mobile and desktop
                          width: '100%', // Full width for both mobile and desktop
                          transform: 'none', // Remove the translateX
                          top: '100%', // Always position below the row
                          padding: '15px',
                          border: '1px solid #ddd'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                            {getMetricInfo(metric.key).title}
                          </h4>
                          
                          <div style={{
                            backgroundColor: getScoreColor(metric.value),
                            color: 'white',
                            fontWeight: 'bold',
                            padding: '3px 10px',
                            borderRadius: '15px',
                            fontSize: '0.9rem'
                          }}>
                            {metric.value}
                          </div>
                        </div>
                        
                        <p style={{ margin: '10px 0' }}>{generateInsightText(metric.key, metric.value)}</p>
                        
                        {/* Button for deep dive analytics */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateAIAnalysis(metric.key);
                            
                            // Auto-scroll to insights section after clicking
                            setTimeout(() => {
                              const insightsElement = document.querySelector('.metric-insights');
                              if (insightsElement) {
                                insightsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }, 200);
                          }}
                          style={{
                            marginTop: '10px',
                            backgroundColor: '#546e47',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 15px',
                            width: '100%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem'
                          }}
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            style={{ marginRight: '5px' }}
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12" y2="8" />
                          </svg>
                          Generate AI Deep Dive Analysis
                        </button>
                      </div>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Selected Metric Insights - With collapsible sections for mobile */}
        {selectedMetric && (
          <div 
            className="metric-insights"
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              padding: isMobile ? '15px' : '20px',
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h3 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.3rem' }}>
                    {getMetricInfo(selectedMetric).title} Analysis
                  </h3>
                  
                  <div style={{
                    backgroundColor: getScoreColor(swingData.metrics[selectedMetric]),
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '3px 10px',
                    borderRadius: '15px',
                    fontSize: '0.9rem'
                  }}>
                    {swingData.metrics[selectedMetric]}
                  </div>
                </div>

                {/* Collapsible sections */}
                <div className="goodAspects">
                  <div 
                    className="section-header" 
                    onClick={() => toggleSection('goodAspects')}
                  >
                    <h4>What You're Doing Well</h4>
                    <button className="toggle-button">
                      {isSectionExpanded('goodAspects') ? '−' : '+'}
                    </button>
                  </div>
                  {isSectionExpanded('goodAspects') && (
                    <ul>
                      {metricInsights.goodAspects.map((aspect, index) => (
                        <li key={`good-${index}`}>{aspect}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="improvementAreas">
                  <div 
                    className="section-header" 
                    onClick={() => toggleSection('improvementAreas')}
                  >
                    <h4>Areas for Improvement</h4>
                    <button className="toggle-button">
                      {isSectionExpanded('improvementAreas') ? '−' : '+'}
                    </button>
                  </div>
                  {isSectionExpanded('improvementAreas') && (
                    <ul>
                      {metricInsights.improvementAreas.map((area, index) => (
                        <li key={`improve-${index}`}>{area}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="technicalBreakdown">
                  <div 
                    className="section-header" 
                    onClick={() => toggleSection('technicalBreakdown')}
                  >
                    <h4>Technical Breakdown</h4>
                    <button className="toggle-button">
                      {isSectionExpanded('technicalBreakdown') ? '−' : '+'}
                    </button>
                  </div>
                  {isSectionExpanded('technicalBreakdown') && (
                    <ul>
                      {metricInsights.technicalBreakdown.map((item, index) => (
                        <li key={`tech-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="recommendations">
                  <div 
                    className="section-header" 
                    onClick={() => toggleSection('recommendations')}
                  >
                    <h4>Recommendations</h4>
                    <button className="toggle-button">
                      {isSectionExpanded('recommendations') ? '−' : '+'}
                    </button>
                  </div>
                  {isSectionExpanded('recommendations') && (
                    <ul>
                      {metricInsights.recommendations.map((rec, index) => (
                        <li key={`rec-${index}`}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Feel tips section */}
                {metricInsights.feelTips && metricInsights.feelTips.length > 0 && (
                  <div className="feel-tips">
                    <div 
                      className="section-header" 
                      onClick={() => toggleSection('feelTips')}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <h4>Feel Tips</h4>
                      <button className="toggle-button">
                        {isSectionExpanded('feelTips') ? '−' : '+'}
                      </button>
                    </div>
                    {isSectionExpanded('feelTips') && (
                      <ul>
                        {metricInsights.feelTips.map((tip, index) => (
                          <li key={`feel-${index}`}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
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
                      backgroundColor: '#f0f0f0',
                      border: 'none',
                      borderRadius: '5px',
                      padding: isMobile ? '10px 15px' : '8px 12px',
                      color: '#666',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: isMobile ? '1rem' : '0.9rem'
                    }}
                  >
                    Close Analysis
                    <span style={{ marginLeft: '5px', fontSize: '1.1rem' }}>×</span>
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
            padding: isMobile ? '15px' : '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              color: '#333',
              fontSize: isMobile ? '1.2rem' : '1.3rem'
            }}>
              Key Recommendations
            </h3>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {swingData.recommendations.map((rec, index) => (
                <li key={index} style={{ 
                  marginBottom: '10px',
                  lineHeight: '1.4',
                  fontSize: isMobile ? '0.95rem' : '1rem'
                }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Video Display - Mobile optimized */}
        {hasVideo && (
          <div className="video-container" style={{ 
            marginTop: '20px', 
            display: 'flex',
            justifyContent: 'center',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#2c3e50'
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
                style={{ 
                  maxWidth: '100%', 
                  borderRadius: '8px',
                  width: isMobile ? '100%' : '560px',
                  height: isMobile ? '240px' : '315px'
                }}
              ></iframe>
            ) : (
              <video
                src={videoUrl}
                controls
                playsInline
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: isMobile ? '240px' : '400px', 
                  borderRadius: '8px',
                  backgroundColor: '#2c3e50'
                }}
              ></video>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation - Mobile optimized */}
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
        © {new Date().getFullYear()} Swing AI
      </div>
    </div>
  );
};

export default SwingAnalysis;