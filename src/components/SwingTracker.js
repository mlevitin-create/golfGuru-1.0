import React, { useState } from 'react';

const SwingTracker = ({ swingHistory }) => {
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

  // Sort history by date
  const sortedHistory = [...swingHistory].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  // Get all available metrics from the first swing data
  const metrics = [
    { key: 'overallScore', label: 'Overall Score' },
    ...Object.keys(sortedHistory[0].metrics).map(key => ({
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
        <h3>Swing History</h3>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '10px'
        }}>
          {sortedHistory.reverse().map((swing, index) => (
            <div key={index} className="swing-history-item">
              <div>
                <strong>{new Date(swing.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</strong>
              </div>
              <div>
                Score: <span style={{ fontWeight: 'bold' }}>{swing.overallScore}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SwingTracker;