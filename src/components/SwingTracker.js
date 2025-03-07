import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SwingTracker = ({ swingHistory, setSwingHistory, navigateTo }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState('overallScore');
  
  if (!swingHistory || swingHistory.length === 0) {
    return (
      <div className="card">
        <h2>No Swing History Available</h2>
        <p>Upload and analyze your swings to track your progress over time</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle delete swing
  const handleDeleteSwing = async (swingId, e) => {
    e.stopPropagation(); // Prevent navigating to swing details
    
    if (window.confirm('Are you sure you want to delete this swing? This action cannot be undone.')) {
      try {
        await firestoreService.deleteSwing(swingId, currentUser.uid);
        // Update local state to remove the deleted swing
        setSwingHistory(prev => prev.filter(swing => swing.id !== swingId));
      } catch (error) {
        console.error('Error deleting swing:', error);
        alert('Failed to delete swing: ' + error.message);
      }
    }
  };

  // Convert Firebase timestamp objects if needed and sort history by date
  const processedHistory = swingHistory.map(swing => ({
    ...swing,
    date: swing.date instanceof Date ? swing.date : new Date(swing.date)
  }));
  
  const sortedHistory = [...processedHistory].sort((a, b) => a.date - b.date);

  // Get all available metrics from the first swing data
  const metrics = [
    { key: 'overallScore', label: 'Overall Score' },
    ...Object.keys(sortedHistory[0].metrics || {}).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }))
  ];

  // Prepare data for the chart
  const chartData = sortedHistory.map(swing => ({
    date: formatDate(swing.date),
    value: selectedMetric === 'overallScore' 
      ? swing.overallScore 
      : swing.metrics[selectedMetric]
  }));

  // Find the max value for the chart
  const maxValue = Math.max(...chartData.map(d => d.value), 100);

  // Calculate the improvements
  const improvements = sortedHistory.length > 1 
    ? {
        first: selectedMetric === 'overallScore' 
          ? sortedHistory[0].overallScore 
          : sortedHistory[0].metrics[selectedMetric],
        last: selectedMetric === 'overallScore' 
          ? sortedHistory[sortedHistory.length - 1].overallScore 
          : sortedHistory[sortedHistory.length - 1].metrics[selectedMetric]
      } 
    : null;

  const improvementDiff = improvements ? improvements.last - improvements.first : 0;

  return (
    <div className="card">
      <h2>Swing Progress Tracker</h2>
      <p>Track how your swing has improved over time</p>
      
      {!currentUser && swingHistory.length > 0 && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          <p style={{ margin: 0 }}>
            <strong>Note:</strong> Sign in to save your progress and track your improvement over time.
          </p>
        </div>
      )}
      
      <div className="metric-selector">
        <label htmlFor="metric-select">Select Metric:</label>
        <select 
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            marginLeft: '10px'
          }}
        >
          {metrics.map(metric => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="chart-container" style={{ position: 'relative', marginTop: '20px' }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px' }}>
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div style={{ marginLeft: '40px', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
          {chartData.map((data, index) => (
            <div key={index} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div 
                style={{ 
                  width: '30px', 
                  height: `${(data.value / 100) * 100}%`, 
                  backgroundColor: '#3498db',
                  marginBottom: '10px',
                  borderRadius: '5px 5px 0 0',
                  position: 'relative'
                }}
              >
                <span style={{ 
                  position: 'absolute', 
                  top: '-25px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  fontWeight: 'bold'
                }}>
                  {data.value}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem' }}>{data.date}</span>
            </div>
          ))}
        </div>
      </div>
      
      {improvements && (
        <div className="improvements-summary" style={{ marginTop: '30px', textAlign: 'center' }}>
          <h3>Your Progress</h3>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            maxWidth: '400px', 
            margin: '0 auto',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            padding: '15px'
          }}>
            <div>
              <p>First Recording</p>
              <h4>{improvements.first}</h4>
            </div>
            <div>
              <p>Improvement</p>
              <h4 style={{ color: improvementDiff >= 0 ? '#27ae60' : '#e74c3c' }}>
                {improvementDiff > 0 ? '+' : ''}{improvementDiff.toFixed(1)}
              </h4>
            </div>
            <div>
              <p>Latest Recording</p>
              <h4>{improvements.last}</h4>
            </div>
          </div>
        </div>
      )}
      
      <div className="history-list" style={{ marginTop: '30px' }}>
        <h3>Swing History ({sortedHistory.length} swings)</h3>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '10px'
        }}>
          {[...sortedHistory].reverse().map((swing, index) => (
            <div 
              key={swing.id || index} 
              className="swing-history-item"
              onClick={() => {
                // Navigate to analysis page with this swing data
                navigateTo('analysis', swing);
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                borderBottom: '1px solid #ecf0f1',
                cursor: 'pointer'
              }}
            >
              <div>
                <strong>{formatDate(swing.date)}</strong>
              </div>
              <div>
                Score: <span style={{ fontWeight: 'bold' }}>{swing.overallScore}</span>
              </div>
              
              {/* Delete button - only show for authenticated users who own this swing */}
              {currentUser && swing.userId === currentUser.uid && !swing._isLocalOnly && (
                <button 
                  onClick={(e) => handleDeleteSwing(swing.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '5px',
                    marginLeft: '10px'
                  }}
                  aria-label="Delete swing"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {sortedHistory.length > 5 && (
        <div className="insights" style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <h3>Long-term Insights</h3>
          <p>Based on your {sortedHistory.length} recorded swings:</p>
          <ul>
            <li>Your average score is {(sortedHistory.reduce((sum, swing) => sum + swing.overallScore, 0) / sortedHistory.length).toFixed(1)}</li>
            <li>You've improved by {(sortedHistory[sortedHistory.length - 1].overallScore - sortedHistory[0].overallScore).toFixed(1)} points since your first swing</li>
            <li>That's a {((sortedHistory[sortedHistory.length - 1].overallScore - sortedHistory[0].overallScore) / sortedHistory[0].overallScore * 100).toFixed(1)}% improvement!</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SwingTracker;