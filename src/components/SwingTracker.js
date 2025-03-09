import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SwingTracker = ({ swingHistory, setSwingHistory, navigateTo }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState('overallScore');
  const [selectedClub, setSelectedClub] = useState('all');
  const [availableClubs, setAvailableClubs] = useState([]);

  useEffect(() => {
    if (swingHistory) {
      const clubs = new Set(swingHistory.map(swing => swing.clubName).filter(Boolean));
      setAvailableClubs(['all', ...clubs]);
    }
  }, [swingHistory]);

  if (!swingHistory || swingHistory.length === 0) {
    return (
      <div className="card">
        <h2>No Swing History Available</h2>
        <p>Upload and analyze your swings to track your progress over time</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Convert Firebase timestamp objects if needed and sort history by recordedDate
  const processedHistory = swingHistory.map(swing => ({
    ...swing,
    date: swing.recordedDate instanceof Date ? swing.recordedDate : new Date(swing.recordedDate)
  }));

  const sortedHistory = [...processedHistory].sort((a, b) => a.date - b.date);

  // Filter history by selected club
  const filteredHistory = selectedClub === 'all'
    ? sortedHistory
    : sortedHistory.filter(swing => swing.clubName === selectedClub);

  // Get all available metrics from the first swing data
  const metrics = [
    { key: 'overallScore', label: 'Overall Score' },
    ...Object.keys(sortedHistory[0].metrics || {}).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }))
  ];

  // Prepare data for the chart
  const chartData = filteredHistory.map(swing => ({
    date: formatDate(swing.recordedDate),
    value: selectedMetric === 'overallScore'
      ? swing.overallScore
      : swing.metrics[selectedMetric]
  }));

  // Find the max value for the chart
  const maxValue = Math.max(...chartData.map(d => d.value), 100);

  // Calculate the improvements
  const improvements = filteredHistory.length > 1
    ? {
      first: selectedMetric === 'overallScore'
        ? filteredHistory[0].overallScore
        : filteredHistory[0].metrics[selectedMetric],
      last: selectedMetric === 'overallScore'
        ? filteredHistory[filteredHistory.length - 1].overallScore
        : filteredHistory[filteredHistory.length - 1].metrics[selectedMetric]
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

        <label htmlFor="club-select" style={{ marginLeft: '20px' }}>Select Club:</label>
        <select
          id="club-select"
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            marginLeft: '10px'
          }}
        >
          {availableClubs.map(club => (
            <option key={club} value={club}>
              {club === 'all' ? 'All Clubs' : club}
            </option>
          ))}
        </select>
      </div>

      <div className="chart-container" style={{ position: 'relative', marginTop: '20px' }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '10px' }}>
          <span>{maxValue}</span>
          <span>{maxValue * 0.75}</span>
          <span>{maxValue * 0.5}</span>
          <span>{maxValue * 0.25}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div style={{ marginLeft: '40px', height: '300px', display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid #ddd' }}>
          {chartData.map((data, index) => (
            <div key={index} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <div
                style={{
                  width: '30px',
                  height: `${(data.value / maxValue) * 100}%`, // Scale to maxValue
                  backgroundColor: '#3498db',
                  marginBottom: '10px',
                  borderRadius: '5px 5px 0 0',
                  position: 'relative',
                  marginTop: 'auto'  // Push bars to the bottom
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
        <h3>Swing History ({filteredHistory.length} swings)</h3>
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '10px'
        }}>
          {[...filteredHistory].reverse().map((swing, index) => (
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
                <strong>{formatDate(swing.recordedDate)}</strong>
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

      {filteredHistory.length > 5 && (
        <div className="insights" style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <h3>Long-term Insights</h3>
          <p>Based on your {filteredHistory.length} recorded swings:</p>
          <ul>
            <li>Your average score is {(filteredHistory.reduce((sum, swing) => sum + swing.overallScore, 0) / filteredHistory.length).toFixed(1)}</li>
            <li>You've improved by {(filteredHistory[filteredHistory.length - 1].overallScore - filteredHistory[0].overallScore).toFixed(1)} points since your first swing</li>
            <li>That's a {((filteredHistory[filteredHistory.length - 1].overallScore - filteredHistory[0].overallScore) / filteredHistory[0].overallScore * 100).toFixed(1)}% improvement!</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SwingTracker;