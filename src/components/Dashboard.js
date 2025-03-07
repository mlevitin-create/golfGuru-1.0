import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ swingHistory, navigateTo, userStats }) => {
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

  const { best, worst } = getMetricExtremes();

  return (
    <div>
      <section className="welcome-section">
        <h2>
          {currentUser 
            ? `Welcome back, ${currentUser.displayName?.split(' ')[0] || 'Golfer'}!` 
            : 'Welcome to Golf Guru'}
        </h2>
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

      {/* User stats section - only show when logged in */}
      {currentUser && userStats && (
        <section className="user-stats">
          <div 
            className="dashboard-cards" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '20px' 
            }}
          >
            <div className="dashboard-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Swings Analyzed</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>{userStats.swingCount || 0}</p>
            </div>
            <div className="dashboard-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Average Score</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>{(userStats.averageScore || 0).toFixed(1)}</p>
            </div>
            <div className="dashboard-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Improvement</h4>
              <p style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                margin: '5px 0',
                color: (userStats.improvement || 0) >= 0 ? '#27ae60' : '#e74c3c'
              }}>
                {(userStats.improvement || 0) > 0 ? '+' : ''}{(userStats.improvement || 0).toFixed(1)}
              </p>
            </div>
            <div className="dashboard-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <h4>Days Since First Upload</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>
                {userStats.created 
                  ? Math.ceil((new Date() - new Date(userStats.created)) / (1000 * 60 * 60 * 24)) 
                  : 0}
              </p>
            </div>
          </div>
        </section>
      )}

      {hasHistory && (
        <section className="dashboard-cards">
          <div className="dashboard-card">
            <h3>Latest Swing</h3>
            <div 
              className="score-circle" 
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: '#f5f5f5',
                border: `6px solid ${latestSwing.overallScore >= 80 ? '#27ae60' : latestSwing.overallScore >= 60 ? '#f39c12' : '#e74c3c'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                margin: '15px auto'
              }}
            >
              {latestSwing.overallScore}
            </div>
            <p>Analyzed on {formatDate(latestSwing.date)}</p>
            <button 
              className="button" 
              onClick={() => navigateTo('analysis')}
              style={{ marginTop: '10px' }}
            >
              View Details
            </button>
          </div>

          {improvementScore !== null && (
            <div className="dashboard-card">
              <h3>Your Progress</h3>
              <div style={{ 
                fontSize: '1.8rem', 
                fontWeight: 'bold',
                margin: '15px auto',
                color: improvementScore >= 0 ? '#27ae60' : '#e74c3c'
              }}>
                {improvementScore > 0 ? '+' : ''}{improvementScore.toFixed(1)}
              </div>
              <p>{improvementScore >= 0 ? 'Improvement' : 'Decline'} since last swing</p>
              <button 
                className="button" 
                onClick={() => navigateTo('tracker')}
                style={{ marginTop: '10px' }}
              >
                View Progress
              </button>
            </div>
          )}

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
                backgroundColor: '#3498db',
                opacity: hasHistory ? 1 : 0.5
              }}
              disabled={!hasHistory}
            >
              Compare with Pros
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
                  // Set this swing as the current swing data and navigate to analysis
                  // In a real implementation, you would pass the swing ID and fetch the data
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
      
      {!currentUser && hasHistory && (
        <section className="login-prompt" style={{ marginTop: '20px', textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <h3>Save Your Progress</h3>
          <p>Sign in to save your swing analyses and track your progress over time</p>
          <button 
            className="button" 
            onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))}
            style={{ marginTop: '10px' }}
          >
            Sign In with Google
          </button>
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