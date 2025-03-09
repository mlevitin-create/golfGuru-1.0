import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    insights: true,
    actions: true,
    recentSwings: true
  });
  
  // Calculate latest score and improvement if history exists
  const hasHistory = swingHistory && swingHistory.length > 0;
  const latestSwing = hasHistory ? swingHistory[0] : null;
  const previousSwing = hasHistory && swingHistory.length > 1 ? swingHistory[1] : null;
  
  const improvementScore = latestSwing && previousSwing 
    ? latestSwing.overallScore - previousSwing.overallScore 
    : null;

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get color based on score value
  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

  // Find the best and worst metrics from latest swing
  const getMetricExtremes = () => {
    if (!latestSwing) return { best: null, worst: null };

    let best = { name: '', value: 0 };
    let worst = { name: '', value: 100 };

    Object.entries(latestSwing.metrics).forEach(([key, value]) => {
      const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      if (value > best.value) {
        best = { name, value };
      }
      
      if (value < worst.value) {
        worst = { name, value };
      }
    });

    return { best, worst };
  };

  // Calculate days since first upload
  const getDaysSinceFirstUpload = () => {
    if (!hasHistory || swingHistory.length === 0) return 0;
    
    // Find the earliest swing
    const sortedSwings = [...swingHistory].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA - dateB;
    });
    
    const firstSwingDate = sortedSwings[0].date instanceof Date 
      ? sortedSwings[0].date 
      : new Date(sortedSwings[0].date);
    
    const today = new Date();
    const diffTime = Math.abs(today - firstSwingDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays || 1; // Return at least 1 day
  };

  // Generate insights from swing data
  const generateInsights = () => {
    if (!hasHistory || swingHistory.length < 2) return [];
  
    // Sort swings chronologically
    const sortedSwings = [...swingHistory].sort((a, b) => 
      new Date(a.recordedDate) - new Date(b.recordedDate)
    );
    
    // Get first and last swings
    const firstSwing = sortedSwings[0];
    const lastSwing = sortedSwings[sortedSwings.length - 1];
    
    // Find most improved and declined metrics
    const metricChanges = {};
    
    if (firstSwing.metrics && lastSwing.metrics) {
      Object.keys(firstSwing.metrics).forEach(key => {
        if (lastSwing.metrics[key] !== undefined) {
          metricChanges[key] = {
            name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            change: lastSwing.metrics[key] - firstSwing.metrics[key],
            startValue: firstSwing.metrics[key],
            endValue: lastSwing.metrics[key]
          };
        }
      });
    }
    
    // Sort metrics by change
    const sortedMetrics = Object.values(metricChanges).sort((a, b) => b.change - a.change);
    
    // Find most improved metric
    const mostImproved = sortedMetrics.length > 0 ? sortedMetrics[0] : null;
    
    // Find most declined metric
    const mostDeclined = sortedMetrics.length > 0 && sortedMetrics[sortedMetrics.length - 1].change < 0
      ? sortedMetrics[sortedMetrics.length - 1] 
      : null;
    
    // Generate insights
    const insights = [];
    
    if (mostImproved && mostImproved.change > 3) {
      insights.push(`Your ${mostImproved.name.toLowerCase()} has improved by ${mostImproved.change.toFixed(1)} points.`);
    }
    
    if (mostDeclined && mostDeclined.change < -3) {
      insights.push(`Your ${mostDeclined.name.toLowerCase()} needs attention (${mostDeclined.change.toFixed(1)} points).`);
    }
    
    // Add a customized recommendation
    if (mostDeclined) {
      switch(mostDeclined.name.toLowerCase()) {
        case 'backswing':
          insights.push(`Focus on shoulder turn during backswing.`);
          break;
        case 'hip rotation':
          insights.push(`Practice proper hip rotation drills.`);
          break;
        case 'grip':
          insights.push(`Check your grip pressure.`);
          break;
        case 'stance':
          insights.push(`Work on balance in your setup position.`);
          break;
        default:
          insights.push(`Focus on ${mostDeclined.name.toLowerCase()}.`);
      }
    }
    
    return insights.slice(0, 3); // Return top 3 insights
  };

  const insights = generateInsights();
  const { best, worst } = getMetricExtremes();

  return (
    <div>
      <section className="welcome-section">
        <h2>{currentUser ? `Welcome, ${currentUser.displayName?.split(' ')[0] || 'Golfer'}!` : 'Welcome to Golf Guru'}</h2>
        
        {!hasHistory && (
          <div className="get-started">
            <p>Upload your first swing video to get started!</p>
            <button 
              className="button" 
              onClick={() => navigateTo('upload')}
              style={{margin: '10px 0'}}
            >
              Upload Swing Video
            </button>
          </div>
        )}
      </section>

      {hasHistory && (
        <>
          {/* Stats Overview - Compact Card Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px',
            margin: '15px 0'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '15px 10px',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{fontSize: '0.8rem', color: '#777'}}>Swings</div>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>{swingHistory.length}</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '15px 10px',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{fontSize: '0.8rem', color: '#777'}}>Avg Score</div>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>
                {userStats && userStats.averageScore 
                  ? userStats.averageScore.toFixed(1) 
                  : (swingHistory.reduce((sum, swing) => sum + swing.overallScore, 0) / swingHistory.length).toFixed(1)}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '15px 10px',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{fontSize: '0.8rem', color: '#777'}}>Last Score</div>
              <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(latestSwing.overallScore)}}>
                {latestSwing.overallScore.toFixed(1)}
              </div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '15px 10px',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{fontSize: '0.8rem', color: '#777'}}>Improvement</div>
              <div style={{
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                color: improvementScore >= 0 ? '#27ae60' : '#e74c3c'
              }}>
                {improvementScore !== null ? (improvementScore > 0 ? '+' : '') + improvementScore.toFixed(1) : '0.0'}
              </div>
            </div>
          </div>
          
          {/* Quick Actions Section */}
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: expandedSections.actions ? '10px' : '0'
              }}
              onClick={() => toggleSection('actions')}
            >
              <h3 style={{margin: '0'}}>Quick Actions</h3>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transform: expandedSections.actions ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <path d="M6 9L12 15L18 9" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {expandedSections.actions && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}>
                <button 
                  className="button" 
                  onClick={() => navigateTo('upload')}
                  style={{
                    padding: '10px 5px',
                    fontSize: '0.9rem',
                    width: '100%'
                  }}
                >
                  Upload Swing
                </button>
                <button 
                  className="button" 
                  onClick={() => navigateTo('comparison')}
                  style={{
                    padding: '10px 5px',
                    fontSize: '0.9rem',
                    width: '100%',
                    backgroundColor: '#3498db',
                    opacity: hasHistory ? 1 : 0.5
                  }}
                  disabled={!hasHistory}
                >
                  Compare Pros
                </button>
                <button 
                  className="button" 
                  onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'progress' })}
                  style={{
                    padding: '10px 5px',
                    fontSize: '0.9rem',
                    width: '100%',
                    backgroundColor: '#f39c12',
                    opacity: swingHistory.length >= 2 ? 1 : 0.5
                  }}
                  disabled={swingHistory.length < 2}
                >
                  Progress Analysis
                </button>
                <button 
                  className="button" 
                  onClick={() => navigateTo('tracker')}
                  style={{
                    padding: '10px 5px',
                    fontSize: '0.9rem',
                    width: '100%',
                    backgroundColor: '#2ecc71',
                    opacity: hasHistory ? 1 : 0.5
                  }}
                  disabled={!hasHistory}
                >
                  Swing Tracker
                </button>
              </div>
            )}
          </div>
          
          {/* Insights Section */}
          {insights.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: expandedSections.insights ? '10px' : '0'
                }}
                onClick={() => toggleSection('insights')}
              >
                <h3 style={{margin: '0'}}>Swing Insights</h3>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    transform: expandedSections.insights ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.3s ease'
                  }}
                >
                  <path d="M6 9L12 15L18 9" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {expandedSections.insights && (
                <ul style={{
                  paddingLeft: '20px',
                  margin: '10px 0'
                }}>
                  {insights.map((insight, index) => (
                    <li key={index} style={{marginBottom: '8px'}}>{insight}</li>
                  ))}
                  <li>
                    <button 
                      onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'progress' })}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3498db',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '0.9rem',
                        textDecoration: 'underline'
                      }}
                    >
                      See Full Analysis →
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
          
          {/* Recent Swings Section */}
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: expandedSections.recentSwings ? '10px' : '0'
              }}
              onClick={() => toggleSection('recentSwings')}
            >
              <h3 style={{margin: '0'}}>Recent Swings</h3>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transform: expandedSections.recentSwings ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <path d="M6 9L12 15L18 9" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {expandedSections.recentSwings && (
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                margin: '10px 0 5px'
              }}>
                {swingHistory.slice(0, 5).map((swing, index) => (
                  <div 
                    key={swing.id || index} 
                    onClick={() => navigateTo('analysis', { swingData: swing })}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      borderBottom: index < Math.min(swingHistory.length - 1, 4) ? '1px solid #eee' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{flex: 1}}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <strong>{formatDate(swing.recordedDate)}</strong>
                        {swing.clubName && (
                          <span style={{
                            backgroundColor: '#e8f4fd',
                            color: '#3498db',
                            padding: '1px 6px',
                            borderRadius: '12px',
                            fontSize: '0.7rem'
                          }}>
                            {swing.clubName}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#777',
                        display: swing.outcome ? 'block' : 'none'
                      }}>
                        {swing.outcome && swing.outcome.charAt(0).toUpperCase() + swing.outcome.slice(1)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <div style={{
                        width: '35px',
                        height: '35px',
                        borderRadius: '50%',
                        backgroundColor: getScoreColor(swing.overallScore),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {Math.round(swing.overallScore)}
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="#bdc3c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                ))}
                {swingHistory.length > 5 && (
                  <div style={{textAlign: 'center', padding: '10px 0 5px'}}>
                    <button 
                      onClick={() => navigateTo('tracker')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3498db',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        textDecoration: 'underline'
                      }}
                    >
                      View All Swings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      <section className="app-info" style={{ 
        marginTop: '20px', 
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#777'
      }}>
        <p>Golf Guru - Version 1.1</p>
      </section>
    </div>
  );
};

export default Dashboard;