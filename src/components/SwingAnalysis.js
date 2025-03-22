// Modified version of the SwingAnalysis.js component
// This fixes the mobile UI issue where metric insights appear above the table
// instead of expanding below the clicked row

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SwingOwnershipHandler from './SwingOwnershipHandler';
import useVideoUrl from '../hooks/useVideoUrl';
import { metricInsightsGenerator } from '../services/geminiService';
import { getMetricInfo, getCategoryColor, getScoreColor } from '../utils/swingUtils';
import './SwingAnalysis.css';

const SwingAnalysis = ({ swingData, navigateTo }) => {
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

  // Reset selected metric when swing data changes
  useEffect(() => {
    setSelectedMetric(null);
    setMetricInsights(null);
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

  // Using useCallback to ensure function reference stability
  const generateAIAnalysis = useCallback(async (metricKey) => {
    // Update UI state
    setSelectedMetric(metricKey);
    setLoadingInsights(true);
    setError(null);
    
    try {
      // Get insights from Gemini service
      const insights = await metricInsightsGenerator.generateMetricInsights(swingData, metricKey);
      setMetricInsights(insights);
    } catch (error) {
      console.error(`Error getting insights for ${metricKey}:`, error);
      setError(`Failed to analyze ${getMetricInfo(metricKey).title}. Please try again.`);
      
      // Use defaults as fallback
      const defaultInsights = metricInsightsGenerator.getDefaultInsights(metricKey, swingData);
      setMetricInsights(defaultInsights);
    } finally {
      setLoadingInsights(false);
    }
  }, [swingData]);
  
  // State for showing basic insights (first click)
  const [showingBasicInsight, setShowingBasicInsight] = useState(null);
  
  // Handle basic metric click (first click)
  const handleMetricClick = (metricKey) => {
    if (loadingInsights) return;
    
    // Second click on the same metric - collapse everything
    if (showingBasicInsight === metricKey) {
      setShowingBasicInsight(null);
      return;
    }
    
    // First click on this metric - show basic insight
    setShowingBasicInsight(metricKey);
    
    // If full insights are shown for any metric, hide them
    if (selectedMetric !== null) {
      setSelectedMetric(null);
      setMetricInsights(null);
    }
    
    // Scroll to the metric row after a short delay to allow DOM update
    if (isMobile) {
      setTimeout(() => {
        const metricRow = document.getElementById(`metric-row-${metricKey}`);
        if (metricRow) {
          metricRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  
  // Handle deep dive button click (second click)
  const handleDeepDiveClick = (metricKey, e) => {
    // Prevent the click from bubbling up to the row
    if (e) e.stopPropagation();
    
    if (loadingInsights) return;
    
    // Start loading insights for selected metric
    setSelectedMetric(metricKey);
    generateAIAnalysis(metricKey);
    
    // Scroll to the metric row after a short delay to allow DOM update
    if (isMobile) {
      setTimeout(() => {
        const metricRow = document.getElementById(`metric-row-${metricKey}`);
        if (metricRow) {
          metricRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

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

  // Sort metrics by score
  const sortedMetrics = Object.entries(swingData.metrics || {})
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

  // Render the metric insights component
  const renderMetricInsights = (metricKey) => {
    if (!selectedMetric || selectedMetric !== metricKey) return null;
    
    return (
      <div 
        className="metric-insights in-table-insights"
        style={{
          backgroundColor: '#fff',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: isMobile ? '15px' : '20px',
          marginTop: '-8px',
          marginBottom: '15px',
          borderTop: '1px solid #e0e0e0',
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
            <p style={{ marginTop: '15px' }}>Analyzing {getMetricInfo(metricKey).title}...</p>
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
                {getMetricInfo(metricKey).title} Analysis
              </h3>
              
              <div style={{
                backgroundColor: getScoreColor(swingData.metrics[metricKey]),
                color: 'white',
                fontWeight: 'bold',
                padding: '3px 10px',
                borderRadius: '15px',
                fontSize: '0.9rem'
              }}>
                {swingData.metrics[metricKey]}
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
    );
  };

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
                  const metricId = `top-metric-${key}`;
                  return (
                    <React.Fragment key={key}>
                      <div 
                        id={metricId}
                        onClick={() => handleMetricClick(key)}
                        style={{ 
                          marginBottom: showingBasicInsight === key ? 0 : '5px', 
                          cursor: 'pointer',
                          color: selectedMetric === key ? '#546e47' : 'inherit',
                          fontWeight: selectedMetric === key ? 'bold' : 'normal',
                          padding: '5px 0',
                          backgroundColor: showingBasicInsight === key ? '#f8f9fa' : 'transparent',
                          borderRadius: showingBasicInsight === key ? '8px 8px 0 0' : '0',
                        }}
                      >
                        <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                          {value}
                        </span>
                        <span>{metricInfo.title}</span>
                      </div>
                      
                      {/* Basic insight (first click) */}
                      {showingBasicInsight === key && selectedMetric !== key && (
                        <div 
                          className="basic-insight"
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '0 0 8px 8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            padding: '15px',
                            marginBottom: '15px',
                            borderTop: '1px solid #e0e0e0',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {getMetricInfo(key).title}
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
                          
                          <p style={{ margin: '10px 0' }}>
                            {/* Generate basic insight based on score */}
                            {value >= 80 ? 
                              `You scored ${value} due to strong technique and proper execution.` :
                              value >= 60 ?
                              `You scored ${value}, showing decent performance with room for improvement.` :
                              `You scored ${value}, indicating this area needs focused practice.`
                            }
                          </p>
                          
                          {/* Button for deep dive analytics */}
                          <button
                            onClick={(e) => handleDeepDiveClick(key, e)}
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
                      
                      {/* Full AI analysis (second click) */}
                      {selectedMetric === key && (
                        <div 
                          className="metric-insights"
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '0 0 8px 8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            padding: isMobile ? '15px' : '20px',
                            marginBottom: '15px',
                            borderTop: '1px solid #e0e0e0',
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
                              <p style={{ marginTop: '15px' }}>Analyzing {getMetricInfo(key).title}...</p>
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
                                  {getMetricInfo(key).title} Analysis
                                </h3>
                                
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

                              {/* Same collapsible sections as before */}
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
                    </React.Fragment>
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
                  const metricId = `bottom-metric-${key}`;
                  return (
                    <React.Fragment key={key}>
                      <div 
                        id={metricId}
                        onClick={() => handleMetricClick(key)}
                        style={{ 
                          marginBottom: showingBasicInsight === key ? 0 : '5px', 
                          cursor: 'pointer',
                          color: selectedMetric === key ? '#546e47' : 'inherit',
                          fontWeight: selectedMetric === key ? 'bold' : 'normal',
                          padding: '5px 0',
                          backgroundColor: showingBasicInsight === key ? '#f8f9fa' : 'transparent',
                          borderRadius: showingBasicInsight === key ? '8px 8px 0 0' : '0',
                        }}
                      >
                        <span style={{ fontWeight: 'bold', marginRight: '10px', fontSize: '1.1rem', color: '#333' }}>
                          {value}
                        </span>
                        <span>{metricInfo.title}</span>
                      </div>
                      
                      {/* Basic insight (first click) */}
                      {showingBasicInsight === key && selectedMetric !== key && (
                        <div 
                          className="basic-insight"
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '0 0 8px 8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            padding: '15px',
                            marginBottom: '15px',
                            borderTop: '1px solid #e0e0e0',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {getMetricInfo(key).title}
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
                          
                          <p style={{ margin: '10px 0' }}>
                            {/* Generate basic insight based on score */}
                            {value >= 80 ? 
                              `You scored ${value} due to strong technique and proper execution.` :
                              value >= 60 ?
                              `You scored ${value}, showing decent performance with room for improvement.` :
                              `You scored ${value}, indicating this area needs focused practice.`
                            }
                          </p>
                          
                          {/* Button for deep dive analytics */}
                          <button
                            onClick={(e) => handleDeepDiveClick(key, e)}
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
                      
                      {/* Full AI analysis (second click) */}
                      {selectedMetric === key && (
                        <div 
                          className="metric-insights"
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: '0 0 8px 8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            padding: isMobile ? '15px' : '20px',
                            marginBottom: '15px',
                            borderTop: '1px solid #e0e0e0',
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
                              <p style={{ marginTop: '15px' }}>Analyzing {getMetricInfo(key).title}...</p>
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
                                  {getMetricInfo(key).title} Analysis
                                </h3>
                                
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

                              {/* Collapsible sections as before */}
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

                              {/* Other sections as before */}
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
                    </React.Fragment>
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
            <div className="metrics-table-container">
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
                  {allMetrics.map((metric) => (
                    <React.Fragment key={metric.key}>
                      <tr 
                        id={`metric-row-${metric.key}`}
                        className={`metric-row ${selectedMetric === metric.key ? 'active' : ''} ${showingBasicInsight === metric.key ? 'showing-basic' : ''}`}
                        onClick={() => handleMetricClick(metric.key)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: selectedMetric === metric.key ? '#f0f7ff' : (showingBasicInsight === metric.key ? '#f8f9fa' : 'transparent'),
                          opacity: loadingInsights && selectedMetric !== metric.key ? 0.5 : 1,
                          borderRadius: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? '8px 8px 0 0' : '0',
                          position: 'relative'
                        }}
                      >
                        <td style={{ 
                          padding: isMobile ? '12px 8px' : '8px 10px', 
                          borderBottom: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? 'none' : '1px dotted #ddd',
                          color: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? '#000' : '#666'
                        }}>
                          {metric.title}
                        </td>
                        <td style={{ 
                          padding: isMobile ? '12px 8px' : '8px 10px', 
                          textAlign: 'center', 
                          borderBottom: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? 'none' : '1px dotted #ddd',
                          fontWeight: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? 'bold' : 'normal',
                          fontSize: isMobile ? '1rem' : 'inherit'
                        }}>
                          {metric.value}
                        </td>
                        <td style={{ 
                          padding: isMobile ? '12px 8px' : '8px 10px', 
                          textAlign: 'right', 
                          borderBottom: (selectedMetric === metric.key || showingBasicInsight === metric.key) ? 'none' : '1px dotted #ddd',
                          color: metric.value > 70 ? 'green' : 'red' 
                        }}>
                          {metric.value > 70 ? '+' : '-'}x%
                        </td>
                      </tr>
                      
                      {/* Basic insight (first click) */}
                      {showingBasicInsight === metric.key && selectedMetric !== metric.key && (
                        <tr className="basic-insight-row">
                          <td colSpan="3" style={{ padding: 0, borderBottom: '1px dotted #ddd' }}>
                            <div 
                              className="basic-insight"
                              style={{
                                backgroundColor: '#fff',
                                borderRadius: '0 0 8px 8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                padding: '15px',
                                marginTop: '-8px',
                                marginBottom: '15px',
                                borderTop: '1px solid #e0e0e0',
                                position: 'relative'
                              }}
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
                              
                              <p style={{ margin: '10px 0' }}>
                                {/* Generate basic insight based on score */}
                                {metric.value >= 80 ? 
                                  `You scored ${metric.value} due to strong technique and proper execution.` :
                                  metric.value >= 60 ?
                                  `You scored ${metric.value}, showing decent performance with room for improvement.` :
                                  `You scored ${metric.value}, indicating this area needs focused practice.`
                                }
                              </p>
                              
                              {/* Button for deep dive analytics */}
                              <button
                                onClick={(e) => handleDeepDiveClick(metric.key, e)}
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
                          </td>
                        </tr>
                      )}
                      
                      {/* Detailed insights (second click) */}
                      {selectedMetric === metric.key && (
                        <tr className="insights-row">
                          <td colSpan="3" style={{ padding: 0, borderBottom: '1px dotted #ddd' }}>
                            {renderMetricInsights(metric.key)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
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
        © {new Date().getFullYear()} Swing AI
      </div>
    </div>
  );
};

export default SwingAnalysis;