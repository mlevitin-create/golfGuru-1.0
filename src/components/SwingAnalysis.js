import React from 'react';

const SwingAnalysis = ({ swingData, navigateTo }) => {
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

  return (
    <div className="analysis-container">
      <div className="card">
        <h2>Swing Analysis</h2>
        <p>Analyzed on {formatDate(swingData.date)}</p>

        <div className="video-container">
          <video 
            src={swingData.videoUrl} 
            controls 
            width="100%"
          />
        </div>

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
              <div className="metric-label">
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                <span>{value}/100</span>
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
      </div>
    </div>
  );
};

export default SwingAnalysis;