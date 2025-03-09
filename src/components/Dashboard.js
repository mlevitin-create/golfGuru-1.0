// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Check if the screen is mobile size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
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

        {/* Mobile Upload Button - Always show at top on mobile */}
        {isMobile && (
          <button 
            className="button" 
            onClick={() => navigateTo('upload')}
            style={{ 
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              fontSize: '1rem',
              backgroundColor: '#3498db',
              borderRadius: '8px',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Upload Swing Video
          </button>
        )}

        {!hasHistory && !isMobile && (
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

          {/* Fifth card for practice consistency */}
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
            {!isMobile && (
              <button 
                className="button" 
                onClick={() => navigateTo('upload')}
                style={{ marginTop: '10px', fontSize: '0.9rem' }}
              >
                Practice Now
              </button>
            )}
          </div>
        </section>
      )}

      {hasHistory && (
        <section className="dashboard-cards" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            {!isMobile && (
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
            )}
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
            {/* New quick actions for Club Analytics and Stats */}
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
          
          {best && worst && (
            <div className="dashboard-card">
              <h3>Swing Insights</h3>
              <div style={{ textAlign: 'left', marginTop: '15px' }}>
                <p><strong>Strongest area:</strong> {best.name} ({best.value}/100)</p>
                <p><strong>Area to improve:</strong> {worst.name} ({worst.value}/100)</p>
                <p style={{ marginTop: '15px' }}>
                  <strong>Quick tip:</strong> Focus on improving your {worst.name.toLowerCase()} for better results.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {hasHistory && swingHistory.length > 0 && (
        <section className="recent-swings">
          <h3>Recent Swings</h3>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '10px'
          }}>
            {swingHistory.slice(0, 5).map((swing, index) => (
              <div 
                key={index} 
                className="swing-history-item"
                onClick={() => {
                  // Navigate to analysis page with this swing data
                  navigateTo('analysis');
                }}
              >
                <div>
                  <strong>{formatDate(swing.date)}</strong>
                </div>
                <div>
                  Score: <span style={{ fontWeight: 'bold' }}>{swing.overallScore}</span>
                </div>
              </div>
            ))}
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