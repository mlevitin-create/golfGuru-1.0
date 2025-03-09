import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  // Calculate latest score and improvement if history exists
  const hasHistory = swingHistory && swingHistory.length > 0;
  const latestSwing = hasHistory ? swingHistory[0] : null;
  const previousSwing = hasHistory && swingHistory.length > 1 ? swingHistory[1] : null;
  
  const improvementScore = latestSwing && previousSwing 
    ? latestSwing.overallScore - previousSwing.overallScore 
    : null;

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

  const { best, worst } = getMetricExtremes();
  const daysSinceFirstUpload = getDaysSinceFirstUpload();

  return (
    <div>
      <section className="welcome-section">
        <h2>{currentUser ? `Welcome back, ${currentUser.displayName?.split(' ')[0] || 'Golfer'}!` : 'Welcome to Golf Guru'}</h2>
        <p>Your personal AI golf coach to help improve your swing</p>

        {!hasHistory && (
          <div className="get-started">
            <p>Upload your first swing video to get started!</p>
            <button 
              className="button" 
              onClick={() => navigateTo('upload')}
            >
              Upload Swing Video
            </button>
          </div>
        )}
      </section>

      {hasHistory && (
        <section className="dashboard-cards">
          <div className="dashboard-card">
            <h3>Swings Analyzed</h3>
            <div 
              style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold',
                margin: '15px auto',
                color: '#2c3e50'
              }}
            >
              {swingHistory.length}
            </div>
            <p>Total swings</p>
          </div>

          <div className="dashboard-card">
            <h3>Average Score</h3>
            <div 
              style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold',
                margin: '15px auto',
                color: '#2c3e50'
              }}
            >
              {userStats && userStats.averageScore ? userStats.averageScore.toFixed(1) : (swingHistory.reduce((sum, swing) => sum + swing.overallScore, 0) / swingHistory.length).toFixed(1)}
            </div>
            <p>Out of 100</p>
          </div>

          <div className="dashboard-card">
            <h3>Improvement</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              margin: '15px auto',
              color: improvementScore >= 0 ? '#27ae60' : '#e74c3c'
            }}>
              {improvementScore !== null ? (improvementScore > 0 ? '+' : '') + improvementScore.toFixed(1) : '0.0'}
            </div>
            <p>Since last swing</p>
          </div>

          <div className="dashboard-card">
            <h3>Progress Snapshot</h3>
            {swingHistory.length >= 2 ? (
              <>
                {(() => {
                  // Sort swings chronologically
                  const sortedSwings = [...swingHistory].sort((a, b) => 
                    new Date(a.recordedDate) - new Date(b.recordedDate)
                  );
                  
                  // Get first and last swings
                  const firstSwing = sortedSwings[0];
                  const lastSwing = sortedSwings[sortedSwings.length - 1];
                  
                  // Calculate overall change
                  const overallChange = lastSwing.overallScore - firstSwing.overallScore;
                  const percentChange = ((overallChange / firstSwing.overallScore) * 100).toFixed(1);
                  
                  // Calculate days tracked
                  const firstDate = new Date(firstSwing.recordedDate);
                  const lastDate = new Date(lastSwing.recordedDate);
                  const daysTracked = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) || 1;
                  
                  // Calculate rate of improvement 
                  const improvementRate = (overallChange / daysTracked).toFixed(2);
                  
                  return (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '2.5rem', 
                        fontWeight: 'bold',
                        color: overallChange >= 0 ? '#27ae60' : '#e74c3c',
                        margin: '10px 0'
                      }}>
                        {overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}
                      </div>
                      <p style={{ margin: '5px 0' }}>Overall score change</p>
                      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{daysTracked}</div>
                          <div style={{ fontSize: '0.8rem', color: '#777' }}>Days tracked</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{percentChange}%</div>
                          <div style={{ fontSize: '0.8rem', color: '#777' }}>Change rate</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{improvementRate}</div>
                          <div style={{ fontSize: '0.8rem', color: '#777' }}>Points/day</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p>Upload at least 2 swings to see your progress over time</p>
                <button 
                  className="button" 
                  onClick={() => navigateTo('upload')}
                  style={{ marginTop: '10px', fontSize: '0.9rem' }}
                >
                  Upload Swing
                </button>
              </div>
            )}
          </div>

          {/* Practice consistency card */}
          <div className="dashboard-card">
            <h3>Practice Consistency</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              margin: '15px auto',
              color: '#3498db'
            }}>
              {userStats && userStats.consecutiveDays ? userStats.consecutiveDays : '0'} days
            </div>
            <p>Current practice streak</p>
            <button 
              className="button" 
              onClick={() => navigateTo('upload')}
              style={{ marginTop: '10px', fontSize: '0.9rem' }}
            >
              Practice Now
            </button>
          </div>
        </section>
      )}

      {hasHistory && (
        <section className="dashboard-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <button 
              className="button" 
              onClick={() => navigateTo('upload')}
              style={{ 
                marginTop: '15px', 
                width: '100%',
                marginBottom: '10px'
              }}
            >
              Upload New Swing
            </button>
            <button 
              className="button" 
              onClick={() => navigateTo('comparison')}
              style={{ 
                width: '100%',
                marginBottom: '10px',
                backgroundColor: '#3498db',
                opacity: hasHistory ? 1 : 0.5
              }}
              disabled={!hasHistory}
            >
              Compare with Pros
            </button>
            {/* New Progress Analysis button */}
            <button 
              className="button" 
              onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'progress' })}
              style={{ 
                width: '100%',
                marginBottom: '10px',
                backgroundColor: '#f39c12',
                opacity: hasHistory > 1 ? 1 : 0.5  /* Require at least 2 swings */
              }}
              disabled={swingHistory.length < 2}
            >
              Progress Analysis
            </button>
            {/* Quick actions for Club Analytics and Stats */}
            <button 
              className="button" 
              onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'analytics' })}
              style={{ 
                width: '100%',
                marginBottom: '10px',
                backgroundColor: '#2ecc71',
                opacity: hasHistory ? 1 : 0.5
              }}
              disabled={!hasHistory}
            >
              Club Analytics
            </button>
            <button 
              className="button" 
              onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'stats' })}
              style={{ 
                width: '100%',
                backgroundColor: '#9b59b6',
                opacity: hasHistory ? 1 : 0.5
              }}
              disabled={!hasHistory}
            >
              View Stats
            </button>
          </div>
          
          {swingHistory.length >= 2 && (
            <div className="dashboard-card">
              <h3>Swing Insights</h3>
              {(() => {
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
                
                // Get clubs data if available
                const clubData = {};
                swingHistory.forEach(swing => {
                  if (swing.clubName) {
                    if (!clubData[swing.clubName]) {
                      clubData[swing.clubName] = {
                        swings: [],
                        name: swing.clubName
                      };
                    }
                    clubData[swing.clubName].swings.push(swing);
                  }
                });
                
                // Find best performing club
                let bestClub = null;
                let bestClubAvg = -1;
                
                Object.values(clubData).forEach(club => {
                  if (club.swings.length >= 2) {
                    const avgScore = club.swings.reduce((sum, swing) => sum + swing.overallScore, 0) / club.swings.length;
                    if (avgScore > bestClubAvg) {
                      bestClubAvg = avgScore;
                      bestClub = club.name;
                    }
                  }
                });
                
                // Generate insights
                const insights = [];
                
                if (mostImproved && mostImproved.change > 3) {
                  insights.push(`Your ${mostImproved.name.toLowerCase()} has improved significantly by ${mostImproved.change.toFixed(1)} points.`);
                }
                
                if (mostDeclined && mostDeclined.change < -3) {
                  insights.push(`Your ${mostDeclined.name.toLowerCase()} has declined by ${Math.abs(mostDeclined.change).toFixed(1)} points and may need attention.`);
                }
                
                if (bestClub) {
                  insights.push(`Your ${bestClub} shows the highest average score among your clubs.`);
                }
                
                // Generate practice consistency insight
                if (userStats && userStats.consecutiveDays) {
                  if (userStats.consecutiveDays > 3) {
                    insights.push(`Great job maintaining a ${userStats.consecutiveDays}-day practice streak!`);
                  }
                }
                
                // Add a swing trend insight
                if (sortedSwings.length >= 5) {
                  const recentScores = sortedSwings.slice(-5).map(swing => swing.overallScore);
                  const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
                  const olderAvg = sortedSwings.slice(-10, -5).length > 0 ? 
                    sortedSwings.slice(-10, -5).reduce((sum, swing) => sum + swing.overallScore, 0) / sortedSwings.slice(-10, -5).length : 
                    recentAvg;
                  
                  if (recentAvg > olderAvg + 3) {
                    insights.push(`Your recent swings show significant improvement over previous sessions.`);
                  } else if (recentAvg < olderAvg - 3) {
                    insights.push(`Your recent swings have declined compared to previous sessions. Consider reviewing fundamentals.`);
                  } else {
                    insights.push(`Your swing performance has been relatively consistent recently.`);
                  }
                }
                
                // Add a customized recommendation
                if (insights.length < 3) {
                  if (mostDeclined) {
                    switch(mostDeclined.name.toLowerCase()) {
                      case 'backswing':
                        insights.push(`Try focusing on maintaining a full shoulder turn during your backswing.`);
                        break;
                      case 'hip rotation':
                        insights.push(`Practice drills that emphasize proper hip rotation through impact.`);
                        break;
                      case 'grip':
                        insights.push(`Consider checking your grip pressure - it may be too tight or inconsistent.`);
                        break;
                      case 'stance':
                        insights.push(`Work on establishing a stable, balanced setup position before each swing.`);
                        break;
                      default:
                        insights.push(`Consider focusing on your ${mostDeclined.name.toLowerCase()} in your next practice session.`);
                    }
                  } else {
                    insights.push(`Focus on maintaining consistency in your swing tempo and mechanics.`);
                  }
                }
                
                return (
                  <div style={{ textAlign: 'left' }}>
                    {insights.length > 0 ? (
                      <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                        {insights.map((insight, index) => (
                          <li key={index} style={{ marginBottom: '8px' }}>{insight}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Upload more swings to generate personalized insights</p>
                    )}
                    
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <button 
                        className="button" 
                        onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'progress' })}
                        style={{ fontSize: '0.9rem' }}
                      >
                        See Full Analysis
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      )}
      
      {/* Enhanced Recent Swings Section */}
      {hasHistory && swingHistory.length > 0 && (
        <section className="recent-swings">
          <h3>Recent Swings</h3>
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '10px'
          }}>
            {swingHistory.slice(0, 5).map((swing, index) => (
              <div 
                key={swing.id || index} 
                className="swing-history-item"
                onClick={() => {
                  // Navigate to analysis page with this specific swing data
                  navigateTo('analysis', { swingData: swing });
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  borderBottom: index < swingHistory.length - 1 ? '1px solid #ecf0f1' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  backgroundColor: 'transparent',
                  borderRadius: index === 0 ? '10px 10px 0 0' : index === swingHistory.length - 1 ? '0 0 10px 10px' : '0'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{formatDate(swing.recordedDate)}</strong>
                    {swing.clubName && (
                      <span style={{ 
                        backgroundColor: '#e8f4fd', 
                        color: '#3498db',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        marginLeft: '10px',
                        fontWeight: 'bold'
                      }}>
                        {swing.clubName}
                      </span>
                    )}
                    {swing.outcome && (
                      <span style={{ 
                        backgroundColor: '#eafaf1', 
                        color: '#27ae60',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        marginLeft: '8px'
                      }}>
                        {swing.outcome.charAt(0).toUpperCase() + swing.outcome.slice(1)}
                      </span>
                    )}
                  </div>
                  
                  {/* Miniature metrics display */}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#7f8c8d' }}>
                    {swing.metrics && Object.entries(swing.metrics)
                      .sort((a, b) => b[1] - a[1]) // Sort by highest value
                      .slice(0, 3) // Take top 3 metrics
                      .map(([key, value]) => (
                        <span key={key}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).split(' ')[0]}: {value}
                        </span>
                      ))
                    }
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: getScoreColor(swing.overallScore),
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    marginRight: '5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {swing.overallScore}
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="#bdc3c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
          
          {swingHistory.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button 
                onClick={() => navigateTo('tracker')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3498db',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '5px 10px',
                  textDecoration: 'underline'
                }}
              >
                View All Swings
              </button>
            </div>
          )}
        </section>
      )}
      
      <section className="app-info" style={{ marginTop: '30px', textAlign: 'center' }}>
        <h3>Golf Guru - AI-Powered Swing Analysis</h3>
        <p>Version 1.1 - Created by Max Levitin & Rob Montoro</p>
      </section>
    </div>
  );
};

export default Dashboard;