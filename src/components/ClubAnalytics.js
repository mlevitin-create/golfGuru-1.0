// src/components/ClubAnalytics.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import clubUtils from '../utils/clubUtils';

const ClubAnalytics = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [swings, setSwings] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
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
        // Load clubs and swings in parallel
        const [userClubs, userSwings] = await Promise.all([
          firestoreService.getUserClubs(currentUser.uid),
          firestoreService.getUserSwings(currentUser.uid)
        ]);
        
        setClubs(userClubs || []);
        setSwings(userSwings || []);
        
        // Select first club by default if available
        if (userClubs && userClubs.length > 0) {
          setSelectedClubId(userClubs[0].id);
        }
        
        // Generate insights
        const clubInsights = clubUtils.generateClubInsights(userSwings, userClubs);
        setInsights(clubInsights);
        
      } catch (error) {
        console.error('Error loading club data:', error);
        setError('Failed to load your club data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

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

  // Sort swings by date for trend analysis
  const sortedSwings = [...selectedClubSwings].sort((a, b) => new Date(a.date) - new Date(b.date));
  
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
                switch(outcome) {
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
        <p>You haven't set up your clubs yet. Add clubs to your bag to see club-specific analytics.</p>
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
          <div className="progress-chart" style={{ marginTop: '30px' }}>
            <h3>Progress Over Time</h3>
            <div className="chart-container" style={{ position: 'relative', height: '250px', marginTop: '15px' }}>
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
                {sortedSwings.map((swing, index) => {
                  const date = new Date(swing.date);
                  const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
                  
                  return (
                    <div key={index} style={{ 
                      flex: '1', 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      height: '100%' 
                    }}>
                      <div 
                        style={{ 
                          width: '30px', 
                          height: `${(swing.overallScore / 100) * 100}%`, 
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
                          {swing.overallScore}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem' }}>{formattedDate}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubAnalytics;