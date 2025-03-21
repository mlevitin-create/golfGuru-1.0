import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import { getMetricInfo, getCategoryColor, getScoreColor } from '../utils/swingUtils';


const SwingTracker = ({ swingHistory, setSwingHistory, navigateTo }) => {
  const { currentUser } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState('overallScore');
  const [selectedClub, setSelectedClub] = useState('all');
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'year', 'month'
  const [availableClubs, setAvailableClubs] = useState([]);

  useEffect(() => {
    if (swingHistory) {
      // Filter to only include swings that are the user's own
      const userOwnSwings = swingHistory.filter(swing => swing.swingOwnership === 'self' || !swing.swingOwnership);
      
      // Set available clubs from filtered swings
      const clubs = new Set(userOwnSwings.map(swing => swing.clubName).filter(Boolean));
      setAvailableClubs(['all', ...clubs]);
      
      // Update local state if needed
      if (userOwnSwings.length !== swingHistory.length) {
        console.log(`Filtered out ${swingHistory.length - userOwnSwings.length} swings that weren't the user's own`);
        // If you need to update the complete swing history, uncomment the next line
        // setSwingHistory(userOwnSwings);
      }
    }
  }, [swingHistory]);

  // In SwingTracker component
useEffect(() => {
  const fetchSwings = async () => {
    if (currentUser && (!swingHistory || swingHistory.length === 0)) {
      try {
        const swings = await firestoreService.getUserSwings(currentUser.uid);
        // Only update if we got data and the component is still mounted
        if (swings && swings.length > 0) {
          console.log("Fetched swings for tracker:", swings.length);
          setSwingHistory(swings);
        }
      } catch (error) {
        console.error("Error fetching swings for tracker:", error);
      }
    }
  };

  fetchSwings();
}, [currentUser, swingHistory, setSwingHistory]);

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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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

  // Process and sort history
  const processedHistory = swingHistory.map(swing => ({
    ...swing,
    date: swing.recordedDate instanceof Date ? swing.recordedDate : new Date(swing.recordedDate)
  }));

  const sortedHistory = [...processedHistory].sort((a, b) => a.date - b.date);

  // Filter by time range
  const filterByTimeRange = (history, range) => {
    if (range === 'all') return history;

    const now = new Date();
    const cutoffDate = new Date();

    if (range === 'year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    } else if (range === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    }

    return history.filter(swing => new Date(swing.date) >= cutoffDate);
  };

  // Filter by club and time range
  const filteredHistory = filterByTimeRange(
    selectedClub === 'all'
      ? sortedHistory
      : sortedHistory.filter(swing => swing.clubName === selectedClub),
    timeRange
  );

  // Get all available metrics from the first swing data
  const metrics = [
    { key: 'overallScore', label: 'Overall Score' },
    ...Object.keys(sortedHistory[0].metrics || {}).map(key => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }))
  ];

  // Calculate progress statistics
  const calculateProgress = () => {
    if (filteredHistory.length < 2) return null;

    const firstSwing = filteredHistory[0];
    const lastSwing = filteredHistory[filteredHistory.length - 1];

    const firstValue = selectedMetric === 'overallScore'
      ? firstSwing.overallScore
      : firstSwing.metrics[selectedMetric];

    const lastValue = selectedMetric === 'overallScore'
      ? lastSwing.overallScore
      : lastSwing.metrics[selectedMetric];

    const change = lastValue - firstValue;
    const percentChange = (change / firstValue) * 100;

    const daysElapsed = Math.round(
      (new Date(lastSwing.date) - new Date(firstSwing.date)) / (1000 * 60 * 60 * 24)
    );

    const average = filteredHistory.reduce((sum, swing) => {
      const value = selectedMetric === 'overallScore'
        ? swing.overallScore
        : swing.metrics[selectedMetric];
      return sum + value;
    }, 0) / filteredHistory.length;

    return {
      start: firstValue,
      end: lastValue,
      change,
      percentChange,
      daysElapsed,
      average
    };
  };

  const progress = calculateProgress();

  // Find best and worst scores
  const findExtremeScores = () => {
    if (filteredHistory.length === 0) return { best: null, worst: null };

    let best = { value: -Infinity, date: null };
    let worst = { value: Infinity, date: null };

    filteredHistory.forEach(swing => {
      const value = selectedMetric === 'overallScore'
        ? swing.overallScore
        : swing.metrics[selectedMetric];

      if (value > best.value) {
        best = { value, date: swing.date, swing };
      }

      if (value < worst.value) {
        worst = { value, date: swing.date, swing };
      }
    });

    return { best, worst };
  };

  const { best, worst } = findExtremeScores();

  // Get color based on score value
  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };

  // Get color for change values
  const getChangeColor = (change) => {
    if (change > 0) return '#27ae60'; // Green for improvement
    if (change === 0) return '#3498db'; // Blue for no change
    return '#e74c3c'; // Red for decline
  };
  
  // Calculate milestone improvements (key points in progress)
  const calculateMilestones = () => {
    if (filteredHistory.length < 2) return [];
    
    const milestones = [];
    const valueKey = selectedMetric;
    
    // First recording milestone
    const firstSwing = filteredHistory[0];
    const firstValue = valueKey === 'overallScore' 
      ? firstSwing.overallScore 
      : firstSwing.metrics[valueKey];
    
    milestones.push({
      type: 'first',
      date: firstSwing.date,
      value: firstValue,
      swing: firstSwing,
      color: '#3498db' // Blue for first
    });
    
    // Latest recording milestone
    const lastSwing = filteredHistory[filteredHistory.length - 1];
    const lastValue = valueKey === 'overallScore' 
      ? lastSwing.overallScore 
      : lastSwing.metrics[valueKey];
    
    milestones.push({
      type: 'latest',
      date: lastSwing.date,
      value: lastValue,
      swing: lastSwing,
      color: '#9b59b6' // Purple for latest
    });
    
    // Best score milestone (if different from first/last)
    if (best.value > firstValue && best.value > lastValue) {
      milestones.push({
        type: 'best',
        date: best.date,
        value: best.value,
        swing: best.swing,
        color: '#27ae60' // Green for best
      });
    }
    
    // Worst score milestone (if different from first/last)
    if (worst.value < firstValue && worst.value < lastValue) {
      milestones.push({
        type: 'worst',
        date: worst.date,
        value: worst.value,
        swing: worst.swing,
        color: '#e74c3c' // Red for worst
      });
    }
    
    // Sort by date
    return milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
  };
  
  const milestones = calculateMilestones();
  
  // Calculate progress trend score
  const getTrendIndicator = () => {
    if (!progress) return 'neutral';
    if (progress.change > 5) return 'strong-up';
    if (progress.change > 0) return 'up';
    if (progress.change === 0) return 'neutral';
    if (progress.change > -5) return 'down';
    return 'strong-down';
  };
  
  const trend = getTrendIndicator();
  
  // Trend icons
  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'strong-up':
        return '↑↑';
      case 'up':
        return '↑';
      case 'neutral':
        return '→';
      case 'down':
        return '↓';
      case 'strong-down':
        return '↓↓';
      default:
        return '→';
    }
  };

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

      {/* Filter controls - Redesigned for better usability */}
      <div className="filter-controls" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <label style={{ fontWeight: 'bold', minWidth: '100px' }}>Time Range:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setTimeRange('all')}
              style={{
                padding: '8px 12px',
                backgroundColor: timeRange === 'all' ? '#3498db' : '#f1f1f1',
                color: timeRange === 'all' ? 'white' : '#333',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('year')}
              style={{
                padding: '8px 12px',
                backgroundColor: timeRange === 'year' ? '#3498db' : '#f1f1f1',
                color: timeRange === 'year' ? 'white' : '#333',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Last Year
            </button>
            <button
              onClick={() => setTimeRange('month')}
              style={{
                padding: '8px 12px',
                backgroundColor: timeRange === 'month' ? '#3498db' : '#f1f1f1',
                color: timeRange === 'month' ? 'white' : '#333',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Last Month
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="metric-select" style={{
            minWidth: '100px',
            fontWeight: 'bold'
          }}>
            Select Metric:
          </label>
          <select
            id="metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          >
            {metrics.map(metric => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="club-select" style={{
            minWidth: '100px',
            fontWeight: 'bold'
          }}>
            Select Club:
          </label>
          <select
            id="club-select"
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          >
            {availableClubs.map(club => (
              <option key={club} value={club}>
                {club === 'all' ? 'All Clubs' : club}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Summary Cards */}
      {progress && (
        <div className="progress-summary" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* First Recording Card */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              First Recording
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {progress.start.toFixed(1)}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              {formatDate(filteredHistory[0].date)}
            </div>
          </div>

          {/* Current Value Card */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Latest Recording
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {progress.end.toFixed(1)}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              {formatDate(filteredHistory[filteredHistory.length - 1].date)}
            </div>
          </div>

          {/* Change Card */}
          <div style={{
            backgroundColor: progress.change >= 0 ? '#f0fdf4' : '#fef2f2',
            padding: '15px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Total Change
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: getChangeColor(progress.change)
            }}>
              {progress.change > 0 ? '+' : ''}{progress.change.toFixed(1)}
            </div>
            <div style={{
              fontSize: '13px',
              color: getChangeColor(progress.change),
              marginTop: '5px'
            }}>
              {progress.percentChange > 0 ? '+' : ''}
              {progress.percentChange.toFixed(1)}%
            </div>
          </div>

          {/* Average Card */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
              Average Score
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {progress.average.toFixed(1)}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              Over {filteredHistory.length} swings
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Progress Visualization - Timeline with Milestone Approach */}
      {milestones.length > 1 && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Progress Journey</h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: getChangeColor(progress?.change || 0),
              color: 'white',
              padding: '5px 10px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              <span style={{ marginRight: '5px' }}>{getTrendIcon(trend)}</span>
              <span>
                {trend === 'strong-up' && 'Excellent Progress'}
                {trend === 'up' && 'Improving'}
                {trend === 'neutral' && 'Maintaining'}
                {trend === 'down' && 'Slight Decline'}
                {trend === 'strong-down' && 'Needs Focus'}
              </span>
            </div>
          </div>
          
          {/* Timeline View */}
          <div style={{ position: 'relative', padding: '0 10px' }}>
            {/* Timeline line */}
            <div style={{ 
              position: 'absolute',
              top: '40px',
              left: 0,
              right: 0,
              height: '4px',
              backgroundColor: '#e0e0e0',
              zIndex: 1
            }} />
            
            {/* Milestones */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              position: 'relative',
              zIndex: 2,
              margin: '0 20px' 
            }}>
              {milestones.map((milestone, index) => (
                <div key={index} style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  width: `${100 / milestones.length}%`,
                  maxWidth: '150px'
                }}
                onClick={() => navigateTo('analysis', milestone.swing)}
                >
                  {/* Label above */}
                  <div style={{ 
                    marginBottom: '5px', 
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: milestone.color,
                    textTransform: 'uppercase'
                  }}>
                    {milestone.type}
                  </div>
                  
                  {/* Value label */}
                  <div style={{
                    backgroundColor: milestone.color,
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '15px',
                    fontSize: '14px',
                    marginBottom: '5px',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {milestone.value.toFixed(1)}
                  </div>
                  
                  {/* Milestone point */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: milestone.color,
                    border: '3px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    marginBottom: '10px',
                    zIndex: 3
                  }} />
                  
                  {/* Date below */}
                  <div style={{ fontSize: '12px', textAlign: 'center' }}>
                    {new Date(milestone.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                    <br />
                    {new Date(milestone.date).getFullYear()}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress description */}
            {progress && (
              <div style={{ 
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {progress.change > 0 ? (
                    <>
                      <strong>Fantastic progress!</strong> Your {selectedMetric === 'overallScore' ? 'score' : selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()} 
                      has improved by <span style={{ color: '#27ae60', fontWeight: 'bold' }}>{progress.change.toFixed(1)} points</span> over {progress.daysElapsed} days. 
                      That's a {(progress.change / progress.daysElapsed * 30).toFixed(1)} point improvement per month on average.
                    </>
                  ) : progress.change === 0 ? (
                    <>
                      You're <strong>maintaining consistency</strong> in your {selectedMetric === 'overallScore' ? 'score' : selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()}.
                      Your measurements have stayed at {progress.end.toFixed(1)} over {progress.daysElapsed} days.
                    </>
                  ) : (
                    <>
                      Your {selectedMetric === 'overallScore' ? 'score' : selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()} has 
                      decreased by <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{Math.abs(progress.change).toFixed(1)} points</span> over {progress.daysElapsed} days.
                      Consider focusing on this area in your next practice sessions.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Best & Worst Performances */}
      {best.value !== -Infinity && worst.value !== Infinity && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* Best Performance Card */}
          <div style={{
            backgroundColor: '#eafaf1',
            padding: '15px',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
          onClick={() => navigateTo('analysis', best.swing)}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>
              Best Performance
            </h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
              {best.value.toFixed(1)}
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px' }}>
              <div><strong>Date:</strong> {formatDate(best.date)}</div>
              {best.swing.clubName && (
                <div><strong>Club:</strong> {best.swing.clubName}</div>
              )}
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '13px',
              textAlign: 'right',
              color: '#27ae60'
            }}>
              Click to view
            </div>
          </div>

          {/* Worst Performance Card */}
          <div style={{
            backgroundColor: '#fdf2f8',
            padding: '15px',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
          onClick={() => navigateTo('analysis', worst.swing)}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>
              Needs Improvement
            </h4>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
              {worst.value.toFixed(1)}
            </div>
            <div style={{ marginTop: '10px', fontSize: '13px' }}>
              <div><strong>Date:</strong> {formatDate(worst.date)}</div>
              {worst.swing.clubName && (
                <div><strong>Club:</strong> {worst.swing.clubName}</div>
              )}
            </div>
            <div style={{
              marginTop: '10px',
              fontSize: '13px',
              textAlign: 'right',
              color: '#e74c3c'
            }}>
              Click to view
            </div>
          </div>
        </div>
      )}

      {/* Swing History List */}
      <div className="history-list" style={{ marginTop: '20px' }}>
  <h3>Swing History ({filteredHistory.length} swings)</h3>
  <div style={{
    maxHeight: '350px',
    overflowY: 'auto',
    border: '1px solid #ddd',
    borderRadius: '10px',
    marginTop: '10px'
  }}>
    {[...filteredHistory]
      // Filter to only include the user's own swings
      .filter(swing => swing.swingOwnership === 'self' || !swing.swingOwnership)
      .reverse()
      .map((swing, index, filteredArray) => (
        <div
          key={swing.id || index}
          className="swing-history-item"
          onClick={() => navigateTo('analysis', swing)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 15px',
            borderBottom: index < filteredArray.length - 1 ? '1px solid #ecf0f1' : 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            backgroundColor: '#fff',
            borderRadius: index === 0 ? '10px 10px 0 0' : index === filteredArray.length - 1 ? '0 0 10px 10px' : '0'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
        >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Split date display to show year on separate line */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px' }}>
                    {new Date(swing.recordedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(swing.recordedDate).getFullYear()}
                  </span>
                </div>
                {swing.clubName && (
                  <span style={{
                    fontSize: '12px',
                    color: '#3498db',
                    marginTop: '4px'
                  }}>
                    {swing.clubName}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {selectedMetric === 'overallScore' ? 'Score:' : metrics.find(m => m.key === selectedMetric)?.label + ':'}
                </div>
                <div style={{
                  backgroundColor: getScoreColor(selectedMetric === 'overallScore' ? swing.overallScore : swing.metrics[selectedMetric]),
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '14px'
                }}>
                  {selectedMetric === 'overallScore' ?
                    swing.overallScore.toFixed(1) :
                    swing.metrics[selectedMetric].toFixed(1)}
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
                      fontSize: '16px',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px'
                    }}
                    aria-label="Delete swing"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Long-term Insights - If enough data */}
      {filteredHistory.length > 5 && (
        <div className="insights" style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f0f6fc',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Your Progress Insights</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Average Score</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {(filteredHistory.reduce((sum, swing) => sum +
                  (selectedMetric === 'overallScore' ? swing.overallScore : swing.metrics[selectedMetric]),
                0) / filteredHistory.length).toFixed(1)}
              </div>
            </div>

            {progress && (
              <div style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Improvement Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: getChangeColor(progress.change) }}>
                  {progress.change > 0 ? '+' : ''}
                  {(progress.change / progress.daysElapsed * 30).toFixed(2)} points/month
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Training Sessions</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {filteredHistory.length} sessions
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Key Observations</h4>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {progress && progress.change > 0 && (
                <li style={{ marginBottom: '10px' }}>
                  You've improved by {progress.change.toFixed(1)} points ({progress.percentChange.toFixed(1)}%)
                  in your {selectedMetric === 'overallScore' ? 'overall score' :
                    selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()} since your first recording.
                </li>
              )}
              {progress && progress.change < 0 && (
                <li style={{ marginBottom: '10px' }}>
                  Your {selectedMetric === 'overallScore' ? 'overall score' :
                    selectedMetric.replace(/([A-Z])/g, ' $1').toLowerCase()} has decreased by {Math.abs(progress.change).toFixed(1)} points.
                  Consider focusing on this area during practice.
                </li>
              )}
              {best && worst && best.date > worst.date && (
                <li style={{ marginBottom: '10px' }}>
                  Your most recent performances show improvement, with your best score recorded
                  more recently than your lowest score.
                </li>
              )}
              {best && worst && best.date < worst.date && (
                <li style={{ marginBottom: '10px' }}>
                  Your recent sessions may need additional focus as your lower scores are
                  more recent than your best performances.
                </li>
              )}
              {selectedClub !== 'all' && (
                <li style={{ marginBottom: '10px' }}>
                  You've used your {selectedClub} in {filteredHistory.length} recorded sessions.
                </li>
              )}
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button
              onClick={() => navigateTo('upload')}
              style={{
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                padding: '10px 20px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Record New Swing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwingTracker;