// src/components/ClubAnalytics.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import clubUtils from '../utils/clubUtils';
// 6. SIXTH: Update ClubAnalytics.js similarly
import { getMetricInfo, getCategoryColor, getScoreColor } from '../utils/swingUtils';

const ClubAnalytics = ({ userClubs, swingHistory }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [swings, setSwings] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('overallScore'); // Default metric
  const [insights, setInsights] = useState({});
  const [error, setError] = useState(null);

  // Load user's clubs and swings
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use passed props if available, otherwise fetch
        const userClubsData = userClubs || await firestoreService.getUserClubs(currentUser.uid);
        const userSwingsData = swingHistory || await firestoreService.getUserSwings(currentUser.uid);

        setClubs(userClubsData || []);
        setSwings(userSwingsData || []);

        // Select first club by default if available
        if (userClubsData && userClubsData.length > 0) {
          setSelectedClubId(userClubsData[0].id);
        }

        // Generate insights
        const clubInsights = clubUtils.generateClubInsights(userSwingsData, userClubsData);
        setInsights(clubInsights);

      } catch (error) {
        console.error('Error loading club data:', error);
        setError('Failed to load your club data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, userClubs, swingHistory]); // Listen for prop changes

  // Group clubs by type for dropdown
  const groupedClubs = clubs.reduce((acc, club) => {
    if (!acc[club.type]) {
      acc[club.type] = [];
    }
    acc[club.type].push(club);
    return acc;
  }, {});

  // Order club types in a logical sequence
  const orderedClubTypes = ['Wood', 'Hybrid', 'Iron', 'Wedge', 'Putter', 'Other'];

  // Sort club groups
  const sortedClubGroups = Object.keys(groupedClubs)
    .sort((a, b) => {
      return orderedClubTypes.indexOf(a) - orderedClubTypes.indexOf(b);
    });

  // Get swings for selected club
  const selectedClubSwings = swings.filter(swing => swing.clubId === selectedClubId);

  // Group swings by outcome if available
  const outcomeData = selectedClubSwings.reduce((acc, swing) => {
    if (swing.outcome) {
      acc[swing.outcome] = (acc[swing.outcome] || 0) + 1;
    }
    return acc;
  }, {});

  // Sort swings by recordedDate for trend analysis
  const sortedSwings = [...selectedClubSwings].sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate));

  // Calculate club averages
  const clubAverages = clubUtils.calculateClubAverages(selectedClubSwings);

  // Render function for the outcome chart
  const renderOutcomeChart = (outcomes) => {
    const totalCount = Object.values(outcomes).reduce((sum, count) => sum + count, 0);

    return (
      <div className="outcome-chart" style={{ marginTop: '20px' }}>
        <h3>Shot Outcomes</h3>
        {Object.keys(outcomes).length === 0 ? (
          <p>No outcome data available for this club</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(outcomes)
              .sort(([, a], [, b]) => b - a)
              .map(([outcome, count]) => {
                const percentage = Math.round((count / totalCount) * 100);

                // Choose color based on outcome type
                let color;
                switch (outcome) {
                  case 'straight': color = '#27ae60'; break; // green
                  case 'fade': color = '#3498db'; break; // blue
                  case 'draw': color = '#9b59b6'; break; // purple
                  case 'push': color = '#f39c12'; break; // orange
                  case 'pull': color = '#e67e22'; break; // dark orange
                  case 'thin': color = '#e74c3c'; break; // red
                  case 'fat': color = '#c0392b'; break; // dark red
                  case 'shank': color = '#7f8c8d'; break; // gray
                  default: color = '#95a5a6'; // light gray
                }

                return (
                  <div key={outcome} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{outcome.charAt(0).toUpperCase() + outcome.slice(1)}</span>
                      <span>{percentage}% ({count})</span>
                    </div>
                    <div style={{ height: '20px', backgroundColor: '#f1f1f1', borderRadius: '10px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: color,
                          borderRadius: '10px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // Extract available metrics from the first swing (if available)
  const availableMetrics = sortedSwings.length > 0 && sortedSwings[0].metrics
    ? Object.keys(sortedSwings[0].metrics)
    : [];

  // Prepare data for the progress chart
  const progressChartData = sortedSwings.map(swing => ({
    date: new Date(swing.recordedDate).toLocaleDateString(), // Format date as needed
    value: selectedMetric === 'overallScore' ? swing.overallScore : swing.metrics[selectedMetric]
  }));

    // Find the maximum value for scaling the chart
    const maxValue = Math.max(...progressChartData.map(data => data.value), 100);

  if (loading) {
    return (
      <div className="card">
        <h2>Loading club analytics...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="card">
        <h2>Club Performance</h2>
        <p>Please sign in to view your club performance analytics.</p>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="card">
        <h2>Club Performance</h2>
        <p>You haven't set up your clubs yet. Visit the "My Clubs" tab to customize your club bag.</p>
        <button 
          className="button"
          onClick={() => currentUser ? window.location.hash = "#clubs" : null}
          style={{ marginTop: '10px' }}
        >
          Go to My Clubs
        </button>
      </div>
    );
  }

  if (selectedClubSwings.length === 0) {
    return (
      <div className="card">
        <h2>Club Performance</h2>

        <div className="club-selection" style={{ marginBottom: '20px' }}>
          <label htmlFor="club-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select a Club:
          </label>

          <select
            id="club-select"
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          >
            {sortedClubGroups.map(type => (
              <optgroup key={type} label={type}>
                {groupedClubs[type]
                  .sort((a, b) => {
                    // Custom sorting logic for each club type
                    if (type === 'Iron' || type === 'Wood') {
                      // Extract numbers from names for numerical sorting
                      const numA = parseInt(a.name.match(/\d+/) || '0', 10);
                      const numB = parseInt(b.name.match(/\d+/) || '0', 10);
                      return numA - numB;
                    }
                    return a.name.localeCompare(b.name);
                  })
                  .map(club => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.distance} yards)
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <p>No swing data available for this club. Upload and analyze swings with this club to see performance analytics.</p>
      </div>
    );
  }

  // Get the selected club object
  const selectedClub = clubs.find(club => club.id === selectedClubId);
  const clubInsights = insights[selectedClubId] || {};

  return (
    <div className="card">
      <h2>Club Performance Analytics</h2>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      <div className="club-selection" style={{ marginBottom: '20px' }}>
        <label htmlFor="club-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Select a Club:
        </label>

        <select
          id="club-select"
          value={selectedClubId}
          onChange={(e) => setSelectedClubId(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        >
          {sortedClubGroups.map(type => (
            <optgroup key={type} label={type}>
              {groupedClubs[type]
                .sort((a, b) => {
                  // Custom sorting logic for each club type
                  if (type === 'Iron' || type === 'Wood') {
                    // Extract numbers from names for numerical sorting
                    const numA = parseInt(a.name.match(/\d+/) || '0', 10);
                    const numB = parseInt(b.name.match(/\d+/) || '0', 10);
                    return numA - numB;
                  }
                  return a.name.localeCompare(b.name);
                })
                .map(club => (
                  <option key={club.id} value={club.id}>
                    {club.name} ({club.distance} yards)
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="club-details" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ flex: '1' }}>
          <h3>{selectedClub.name}</h3>
          <p><strong>Type:</strong> {selectedClub.type}</p>
          <p><strong>Confidence:</strong> {selectedClub.confidence}/10</p>
          <p><strong>Typical Distance:</strong> {selectedClub.distance} yards</p>
        </div>
        <div style={{ flex: '1', textAlign: 'center' }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#3498db',
            marginBottom: '5px'
          }}>
            {clubAverages?.overallScore || 'N/A'}
          </div>
          <p>Average Score</p>
          <p><strong>{selectedClubSwings.length}</strong> swing{selectedClubSwings.length !== 1 ? 's' : ''} analyzed</p>
        </div>
      </div>

      {clubInsights.insights && clubInsights.insights.length > 0 && (
        <div className="club-insights" style={{
          padding: '15px',
          backgroundColor: '#e2f3f5',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h3>Insights</h3>
          <ul>
            {clubInsights.insights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="analytics-section">
        <div className="metrics-overview" style={{ marginBottom: '30px' }}>
          <h3>Swing Metrics</h3>

          {clubAverages && clubAverages.metrics && (
            <div className="metrics-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '15px',
              marginTop: '15px'
            }}>
              {Object.entries(clubAverages.metrics).map(([key, value]) => {
                const metricName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return (
                  <div key={key} className="metric-card" style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '5px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3498db' }}>{value}</div>
                    <div>{metricName}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outcome Chart */}
        {renderOutcomeChart(outcomeData)}

        {/* Progress Chart */}
        {sortedSwings.length >= 2 && (
          // Improved Progress Over Time chart
          <div className="progress-chart" style={{ marginTop: '30px' }}>
            <h3>Progress Over Time</h3>

            {/* Metric Selection Dropdown */}
            <div className="metric-selector" style={{ marginBottom: '15px' }}>
              <label htmlFor="metric-select" style={{ marginRight: '10px' }}>Select Metric:</label>
              <select
                id="metric-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="overallScore">Overall Score</option>
                {availableMetrics.map(metric => (
                  <option key={metric} value={metric}>{metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</option>
                ))}
              </select>
            </div>

            {/* Responsive chart container */}
            <div className="chart-container" style={{ 
              position: 'relative', 
              height: '300px',
              marginTop: '15px',
              overflowX: 'auto', // Allow horizontal scrolling on mobile if needed
              paddingBottom: '20px' // Space for dates
            }}>
              {/* Y-axis labels - fixed on the left */}
              <div style={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                bottom: '20px', 
                width: '40px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                borderRight: '1px solid #eee',
                paddingRight: '5px'
              }}>
                <span style={{ fontSize: '12px', color: '#666' }}>100</span>
                <span style={{ fontSize: '12px', color: '#666' }}>75</span>
                <span style={{ fontSize: '12px', color: '#666' }}>50</span>
                <span style={{ fontSize: '12px', color: '#666' }}>25</span>
                <span style={{ fontSize: '12px', color: '#666' }}>0</span>
              </div>

              {/* Chart grid lines for better readability */}
              <div style={{ 
                position: 'absolute', 
                left: '40px', 
                right: 0, 
                top: 0, 
                bottom: '20px',
                pointerEvents: 'none'
              }}>
                {[0, 25, 50, 75, 100].map((value, index) => (
                  <div key={index} style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${value}%`,
                    borderBottom: '1px dashed #eee',
                    height: 1
                  }} />
                ))}
              </div>

              {/* Chart area with flex display for bars */}
              <div style={{ 
                marginLeft: '40px', 
                height: 'calc(100% - 20px)', 
                display: 'flex',
                alignItems: 'flex-end',
                minWidth: `${Math.max(350, progressChartData.length * 80)}px` // Ensure minimum width
              }}>
                {progressChartData.map((data, index) => {
                  const barHeight = (data.value / 100) * 100; // Calculate bar height percentage
                  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <div key={index} style={{
                      flex: '1',
                      minWidth: '60px', // Minimum width for each bar
                      maxWidth: '120px', // Maximum width to prevent too-wide bars
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      position: 'relative',
                      padding: '0 5px'
                    }}>
                      {/* Score label above bar */}
                      <div style={{
                        position: 'absolute',
                        top: `calc(${100 - barHeight}% - 25px)`,
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#3498db'
                      }}>
                        {data.value}
                      </div>
                      
                      {/* The bar itself */}
                      <div style={{
                        width: '70%',
                        height: `${barHeight}%`,
                        backgroundColor: '#3498db',
                        borderRadius: '4px 4px 0 0',
                        position: 'relative',
                        marginTop: 'auto', // Align to bottom
                        transition: 'height 0.5s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }} />
                      
                      {/* Date label below */}
                      <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        fontSize: '11px',
                        fontWeight: 'normal',
                        color: '#666',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        {formattedDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend and explanation */}
            <div style={{ 
              marginTop: '30px', 
              fontSize: '13px', 
              color: '#666', 
              textAlign: 'center' 
            }}>
              This chart shows your progress over time for the selected metric.
              {progressChartData.length > 0 && 
                (progressChartData[progressChartData.length-1].value - progressChartData[0].value > 0 ? 
                  ` You've improved by ${(progressChartData[progressChartData.length-1].value - progressChartData[0].value).toFixed(1)} points!` : 
                  '')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubAnalytics;