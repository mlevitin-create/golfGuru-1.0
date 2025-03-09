// src/components/ProgressAnalysis.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';
import clubUtils from '../utils/clubUtils';
import './ProgressAnalysis.css';

const ProgressAnalysis = ({ swingHistory, userClubs }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [swings, setSwings] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'month', 'week'
  const [error, setError] = useState(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let swingsData = swingHistory;
        let clubsData = userClubs;

        // If props weren't provided, fetch from Firestore
        if (!swingsData && currentUser) {
          swingsData = await firestoreService.getUserSwings(currentUser.uid);
        }
        
        if (!clubsData && currentUser) {
          clubsData = await firestoreService.getUserClubs(currentUser.uid);
        }
        
        setSwings(swingsData || []);
        setClubs(clubsData || []);
        
        // Generate analysis
        if (swingsData && swingsData.length > 0) {
          generateAnalysis(swingsData, clubsData, timeRange);
        }
      } catch (err) {
        console.error('Error loading data for progress analysis:', err);
        setError('Failed to load your progress data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, swingHistory, userClubs]);

  // Re-generate analysis when time range changes
  useEffect(() => {
    if (swings.length > 0) {
      generateAnalysis(swings, clubs, timeRange);
    }
  }, [timeRange, swings, clubs]);

  // Generate comprehensive analysis from swings data
  const generateAnalysis = (swingsData, clubsData, range) => {
    // Filter swings by time range
    const now = new Date();
    const filteredSwings = swingsData.filter(swing => {
      const swingDate = new Date(swing.recordedDate);
      if (range === 'week') {
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return swingDate >= weekAgo;
      } else if (range === 'month') {
        // Last 30 days
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return swingDate >= monthAgo;
      }
      // All time
      return true;
    });

    if (filteredSwings.length < 2) {
      setAnalysisData({
        overallProgress: null,
        clubProgress: [],
        metricProgress: {},
        frequentClubs: [],
        insights: ["Need at least 2 swings to generate progress analysis."]
      });
      return;
    }

    // Sort swings chronologically
    const sortedSwings = [...filteredSwings].sort((a, b) => 
      new Date(a.recordedDate) - new Date(b.recordedDate)
    );
    
    // Get first and last swings for comparison
    const firstSwing = sortedSwings[0];
    const lastSwing = sortedSwings[sortedSwings.length - 1];
    
    // Overall progress calculation
    const overallProgress = {
      startScore: firstSwing.overallScore,
      endScore: lastSwing.overallScore,
      change: lastSwing.overallScore - firstSwing.overallScore,
      percentChange: ((lastSwing.overallScore - firstSwing.overallScore) / firstSwing.overallScore) * 100,
      daysElapsed: Math.round((new Date(lastSwing.recordedDate) - new Date(firstSwing.recordedDate)) / (1000 * 60 * 60 * 24)),
      swingCount: sortedSwings.length
    };

    // Club-specific progress
    const clubProgress = [];
    
    // Group swings by club
    const swingsByClub = clubUtils.groupSwingsByClub(sortedSwings);
    
    // Analyze progress for each club with sufficient data
    Object.entries(swingsByClub).forEach(([clubId, clubSwings]) => {
      if (clubSwings.length >= 2) {
        const club = clubsData?.find(c => c.id === clubId);
        const clubFirstSwing = clubSwings[0];
        const clubLastSwing = clubSwings[clubSwings.length - 1];
        
        clubProgress.push({
          clubId,
          clubName: club?.name || clubSwings[0].clubName || 'Unknown Club',
          clubType: club?.type || clubSwings[0].clubType || 'Unknown Type',
          startScore: clubFirstSwing.overallScore,
          endScore: clubLastSwing.overallScore,
          change: clubLastSwing.overallScore - clubFirstSwing.overallScore,
          percentChange: ((clubLastSwing.overallScore - clubFirstSwing.overallScore) / clubFirstSwing.overallScore) * 100,
          swingCount: clubSwings.length
        });
      }
    });
    
    // Sort clubs by most improved
    clubProgress.sort((a, b) => b.change - a.change);
    
    // Metric-specific progress
    const metricProgress = {};
    
    // Only analyze metrics if they exist in the first swing
    if (firstSwing.metrics) {
      Object.keys(firstSwing.metrics).forEach(metric => {
        if (lastSwing.metrics && lastSwing.metrics[metric] !== undefined) {
          metricProgress[metric] = {
            startValue: firstSwing.metrics[metric],
            endValue: lastSwing.metrics[metric],
            change: lastSwing.metrics[metric] - firstSwing.metrics[metric],
            percentChange: ((lastSwing.metrics[metric] - firstSwing.metrics[metric]) / firstSwing.metrics[metric]) * 100
          };
        }
      });
    }
    
    // Sort metrics by most improved (absolute change)
    const sortedMetrics = Object.entries(metricProgress)
      .sort(([, a], [, b]) => Math.abs(b.change) - Math.abs(a.change))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    
    // Find most frequently used clubs
    const clubCounts = {};
    sortedSwings.forEach(swing => {
      if (swing.clubName) {
        clubCounts[swing.clubName] = (clubCounts[swing.clubName] || 0) + 1;
      }
    });
    
    const frequentClubs = Object.entries(clubCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
    
    // Generate specific insights
    const insights = [];
    
    // Overall improvement insight
    if (overallProgress.change > 0) {
      insights.push(
        `Your overall swing has improved by ${overallProgress.change.toFixed(1)} points (${overallProgress.percentChange.toFixed(1)}%) over the past ${overallProgress.daysElapsed} days.`
      );
    } else if (overallProgress.change < 0) {
      insights.push(
        `Your overall swing has declined by ${Math.abs(overallProgress.change).toFixed(1)} points (${Math.abs(overallProgress.percentChange).toFixed(1)}%) over the past ${overallProgress.daysElapsed} days. Consider focusing on fundamentals.`
      );
    } else {
      insights.push(
        `Your overall swing score has remained consistent over the past ${overallProgress.daysElapsed} days.`
      );
    }
    
    // Most improved club insight
    if (clubProgress.length > 0 && clubProgress[0].change > 0) {
      insights.push(
        `Your ${clubProgress[0].clubName} has shown the most improvement with a ${clubProgress[0].change.toFixed(1)} point increase in score.`
      );
    }
    
    // Most declined club insight
    const worstClub = [...clubProgress].sort((a, b) => a.change - b.change)[0];
    if (worstClub && worstClub.change < 0) {
      insights.push(
        `Your ${worstClub.clubName} has declined by ${Math.abs(worstClub.change).toFixed(1)} points and may need extra attention.`
      );
    }
    
    // Most improved metrics insight
    const bestMetricKey = Object.keys(sortedMetrics)[0];
    if (bestMetricKey && sortedMetrics[bestMetricKey].change > 0) {
      const readableMetric = bestMetricKey.replace(/([A-Z])/g, ' $1').toLowerCase();
      insights.push(
        `Your ${readableMetric} has improved the most with a ${sortedMetrics[bestMetricKey].change.toFixed(1)} point increase.`
      );
    }
    
    // Areas needing improvement insight
    const worstMetrics = Object.entries(sortedMetrics)
      .filter(([, value]) => value.change < 0)
      .slice(0, 2);
      
    if (worstMetrics.length > 0) {
      const metricNames = worstMetrics.map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase());
      insights.push(
        `Focus on improving your ${metricNames.join(' and ')} as these areas have declined recently.`
      );
    }
    
    // Practice frequency insight
    if (sortedSwings.length < 5 && overallProgress.daysElapsed > 30) {
      insights.push(
        `Consider practicing more frequently. You've averaged less than one swing analysis per week.`
      );
    }
    
    // Consistency insight
    const scoreStdDev = calculateStandardDeviation(sortedSwings.map(swing => swing.overallScore));
    if (scoreStdDev > 10) {
      insights.push(
        `Your swing performance has been inconsistent (high variability). Work on developing a more consistent swing.`
      );
    } else if (scoreStdDev < 5 && sortedSwings.length > 5) {
      insights.push(
        `You've maintained consistent swing scores, which is excellent for building muscle memory.`
      );
    }
    
    // Correlation analysis
    const correlations = [];
    
    // Club type correlation
    const clubTypeScores = {};
    sortedSwings.forEach(swing => {
      if (swing.clubType) {
        if (!clubTypeScores[swing.clubType]) {
          clubTypeScores[swing.clubType] = [];
        }
        clubTypeScores[swing.clubType].push(swing.overallScore);
      }
    });
    
    Object.entries(clubTypeScores).forEach(([type, scores]) => {
      if (scores.length >= 3) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        correlations.push({
          factor: `Club Type: ${type}`,
          value: avgScore.toFixed(1),
          description: `Average score with ${type.toLowerCase()}s`
        });
      }
    });
    
    // Time of day correlation (if available)
    const timeOfDayScores = {
      morning: [],
      afternoon: [],
      evening: []
    };
    
    sortedSwings.forEach(swing => {
      const date = new Date(swing.recordedDate);
      const hour = date.getHours();
      
      if (hour < 12) {
        timeOfDayScores.morning.push(swing.overallScore);
      } else if (hour < 18) {
        timeOfDayScores.afternoon.push(swing.overallScore);
      } else {
        timeOfDayScores.evening.push(swing.overallScore);
      }
    });
    
    Object.entries(timeOfDayScores).forEach(([timeOfDay, scores]) => {
      if (scores.length >= 3) {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        correlations.push({
          factor: `Time: ${timeOfDay}`,
          value: avgScore.toFixed(1),
          description: `Average score during ${timeOfDay}`
        });
      }
    });
    
    // Find best time to practice
    if (correlations.length > 0) {
      const bestTimeFactor = correlations
        .filter(corr => corr.factor.includes('Time:'))
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))[0];
        
      if (bestTimeFactor) {
        insights.push(
          `Your scores tend to be better during the ${bestTimeFactor.factor.split(':')[1].trim().toLowerCase()}. Consider practicing during this time when possible.`
        );
      }
    }
    
    // Set complete analysis data
    setAnalysisData({
      overallProgress,
      clubProgress,
      metricProgress: sortedMetrics,
      frequentClubs,
      insights,
      correlations
    });
  };
  
  // Helper function to calculate standard deviation
  const calculateStandardDeviation = (values) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((sum, squareDiff) => sum + squareDiff, 0) / values.length;
    return Math.sqrt(variance);
  };
  
  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Analyzing Your Progress...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>Progress Analysis</h2>
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          {error}
        </div>
        <button 
          className="button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysisData || swings.length < 2) {
    return (
      <div className="card">
        <h2>Progress Analysis</h2>
        <p>You need at least 2 recorded swings to generate a progress analysis. Keep practicing!</p>
      </div>
    );
  }

  return (
    <div className="progress-analysis-container">
      <div className="card">
        <h2>Your Golf Progress Analysis</h2>
        <p>Comprehensive analysis of how your golf game has changed over time</p>
        
        {/* Time range selector */}
        <div className="time-range-selector" style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>Time Period:</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setTimeRange('all')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: timeRange === 'all' ? '#3498db' : '#f8f9fa',
                color: timeRange === 'all' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              All Time
            </button>
            <button 
              onClick={() => setTimeRange('month')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: timeRange === 'month' ? '#3498db' : '#f8f9fa',
                color: timeRange === 'month' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Last 30 Days
            </button>
            <button 
              onClick={() => setTimeRange('week')}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: timeRange === 'week' ? '#3498db' : '#f8f9fa',
                color: timeRange === 'week' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Last 7 Days
            </button>
          </div>
        </div>
        
        {/* Overall progress section */}
        <div className="progress-section" style={{ marginBottom: '30px' }}>
          <h3>Overall Progress</h3>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            marginTop: '10px'
          }}>
            <div>
              <p>First Swing: <strong>{formatDate(swings.sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate))[0].recordedDate)}</strong></p>
              <p>Latest Swing: <strong>{formatDate(swings.sort((a, b) => new Date(b.recordedDate) - new Date(a.recordedDate))[0].recordedDate)}</strong></p>
              <p>Days tracked: <strong>{analysisData.overallProgress.daysElapsed}</strong></p>
              <p>Swings analyzed: <strong>{analysisData.overallProgress.swingCount}</strong></p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                backgroundColor: analysisData.overallProgress.change >= 0 ? '#e1f5e1' : '#f5e1e1',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>Score Change</span>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 'bold',
                  color: analysisData.overallProgress.change >= 0 ? '#27ae60' : '#e74c3c'
                }}>
                  {analysisData.overallProgress.change > 0 ? '+' : ''}{analysisData.overallProgress.change.toFixed(1)}
                </div>
                <div style={{ 
                  color: analysisData.overallProgress.change >= 0 ? '#27ae60' : '#e74c3c',
                  fontWeight: 'bold'
                }}>
                  {analysisData.overallProgress.percentChange > 0 ? '+' : ''}{analysisData.overallProgress.percentChange.toFixed(1)}%
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#777' }}>First Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analysisData.overallProgress.startScore.toFixed(1)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#777' }}>Latest Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{analysisData.overallProgress.endScore.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Insights section */}
        <div className="insights-section" style={{ marginBottom: '30px' }}>
          <h3>Insights & Recommendations</h3>
          <div style={{ 
            backgroundColor: '#e1f5fe', 
            padding: '20px', 
            borderRadius: '10px',
            marginTop: '10px'
          }}>
            <ul style={{ paddingLeft: '20px', marginTop: '0' }}>
              {analysisData.insights.map((insight, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>{insight}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Club-specific progress */}
        {analysisData.clubProgress.length > 0 && (
          <div className="club-progress-section" style={{ marginBottom: '30px' }}>
            <h3>Club-by-Club Progress</h3>
            <div style={{ marginTop: '10px' }}>
              {analysisData.clubProgress.map(club => (
                <div 
                  key={club.clubId} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    borderLeft: `5px solid ${club.change >= 0 ? '#27ae60' : '#e74c3c'}`
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{club.clubName}</h4>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{club.clubType} • {club.swingCount} swings</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9rem', color: '#777' }}>First</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{club.startScore.toFixed(1)}</div>
                    </div>
                    <div style={{ marginRight: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.9rem', color: '#777' }}>Latest</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{club.endScore.toFixed(1)}</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center',
                      backgroundColor: club.change >= 0 ? '#e1f5e1' : '#f5e1e1',
                      padding: '8px 15px',
                      borderRadius: '8px',
                      minWidth: '80px'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: club.change >= 0 ? '#27ae60' : '#e74c3c',
                        fontSize: '1.2rem'
                      }}>
                        {club.change > 0 ? '+' : ''}{club.change.toFixed(1)}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem',
                        color: club.change >= 0 ? '#27ae60' : '#e74c3c'
                      }}>
                        {club.percentChange > 0 ? '+' : ''}{club.percentChange.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Metric progress - only show if we have metric data */}
        {Object.keys(analysisData.metricProgress).length > 0 && (
          <div className="metric-progress-section" style={{ marginBottom: '30px' }}>
            <h3>Most Improved Metrics</h3>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '15px',
              marginTop: '10px'
            }}>
              {Object.entries(analysisData.metricProgress)
                .filter(([, metricData]) => metricData.change > 0)
                .slice(0, 4)
                .map(([metric, metricData]) => (
                  <div 
                    key={metric}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '10px',
                      borderLeft: '5px solid #27ae60'
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px 0' }}>{metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#777' }}>First: {metricData.startValue.toFixed(1)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#777' }}>Latest: {metricData.endValue.toFixed(1)}</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center',
                        backgroundColor: '#e1f5e1',
                        padding: '8px 15px',
                        borderRadius: '8px',
                        minWidth: '70px'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: '#27ae60',
                          fontSize: '1.2rem'
                        }}>
                          +{metricData.change.toFixed(1)}
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem',
                          color: '#27ae60'
                        }}>
                          +{metricData.percentChange.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            
            <h3 style={{ marginTop: '30px' }}>Metrics Needing Improvement</h3>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '15px',
              marginTop: '10px'
            }}>
              {Object.entries(analysisData.metricProgress)
                .filter(([, metricData]) => metricData.change < 0)
                .slice(0, 4)
                .map(([metric, metricData]) => (
                  <div 
                    key={metric}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '10px',
                      borderLeft: '5px solid #e74c3c'
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px 0' }}>{metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#777' }}>First: {metricData.startValue.toFixed(1)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#777' }}>Latest: {metricData.endValue.toFixed(1)}</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center',
                        backgroundColor: '#f5e1e1',
                        padding: '8px 15px',
                        borderRadius: '8px',
                        minWidth: '70px'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: '#e74c3c',
                          fontSize: '1.2rem'
                        }}>
                          {metricData.change.toFixed(1)}
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem',
                          color: '#e74c3c'
                        }}>
                          {metricData.percentChange.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Correlations section */}
        {analysisData.correlations && analysisData.correlations.length > 0 && (
          <div className="correlations-section" style={{ marginBottom: '30px' }}>
            <h3>Performance Correlations</h3>
            <p>Factors that correlate with your swing performance</p>
            
            <div style={{ 
              marginTop: '10px',
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '10px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Factor</th>
                    <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #ddd' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.correlations.map((correlation, index) => (
                    <tr key={index}>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid #eee' }}>{correlation.factor}</td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid #eee', textAlign: 'center', fontWeight: 'bold' }}>{correlation.value}</td>
                      <td style={{ padding: '12px 10px', borderBottom: '1px solid #eee' }}>{correlation.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Most used clubs section */}
        {analysisData.frequentClubs && analysisData.frequentClubs.length > 0 && (
          <div className="frequent-clubs-section" style={{ marginBottom: '30px' }}>
            <h3>Most Used Clubs</h3>
            <div style={{ 
              display: 'flex',
              flexWrap: 'wrap',
              gap: '15px',
              marginTop: '10px'
            }}>
              {analysisData.frequentClubs.slice(0, 5).map((club, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '10px',
                    minWidth: '150px',
                    flex: '1'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{club.name}</div>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: '#777',
                    marginTop: '5px' 
                  }}>
                    {club.count} swing{club.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressAnalysis;