import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  // Add this line to log the swingHistory prop
  console.log('Dashboard - swingHistory:', swingHistory);
  // Calculate latest score and improvement if history exists
  const hasHistory = swingHistory && swingHistory.length > 0;
  //const latestSwing = hasHistory ? swingHistory[0] : null;
  //const previousSwing = hasHistory && swingHistory.length > 1 ? swingHistory[1] : null;
  
  //const improvementScore = latestSwing && previousSwing 
    //? latestSwing.overallScore - previousSwing.overallScore 
    //: null;

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

          {/*{/* <div className="dashboard-card">
            <h3>Average Score</h3>
            <div 
              style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold',
                margin: '15px auto',
                color: '#2c3e50'
              }}
            >
              {userStats && userStats.averageScore ? userStats.averageScore.toFixed(1) : (swingHistory.reduce((sum, swing) => sum + (swing.overallScore || 0), 0) / swingHistory.length).toFixed(1)}
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
          </div>*/}

          <div className="dashboard-card">
            <h3>Days Since First Upload</h3>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              margin: '15px auto',
              color: '#2c3e50'
            }}>
              {daysSinceFirstUpload}
            </div>
            <p>Days tracking progress</p>
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
            {/* Quick actions for Club Analytics and Stats */}
            <button 
              className="button" 
              onClick={() => navigateTo('profile', { setupClubs: false, activeTab: 'stats' })}
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