// src/components/Dashboard.js - Mobile-optimized version
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [localSwingHistory, setLocalSwingHistory] = useState(swingHistory || []);
  const [localStats, setLocalStats] = useState(userStats || {});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Check if screen is mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Force fetch data if not provided through props
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser && (!swingHistory || swingHistory.length === 0)) {
        setLoading(true);
        try {
          // Get all user swings
          const swings = await firestoreService.getUserSwings(currentUser.uid);
          setLocalSwingHistory(swings || []);
          
          // Get user stats
          const stats = await firestoreService.getUserStats(currentUser.uid);
          setLocalStats(stats || {});
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserData();
  }, [currentUser, swingHistory]);
  
  // Calculate stats for display from most accurate source
  const hasHistory = localSwingHistory && localSwingHistory.length > 0;
  
  // Use stats from Firestore if available, otherwise calculate from swing history
  const stats = {
    totalSwings: localStats?.totalSwings || localSwingHistory.length || 0,
    averageScore: localStats?.averageScore || 
      (hasHistory 
        ? parseFloat((localSwingHistory.reduce((sum, swing) => sum + swing.overallScore, 0) / localSwingHistory.length).toFixed(1)) 
        : 0),
    lastScore: hasHistory ? Math.round(localSwingHistory[0]?.overallScore) : 0,
    improvement: localStats?.improvement || 
      (hasHistory && localSwingHistory.length > 1 
        ? Math.round(localSwingHistory[0].overallScore - localSwingHistory[localSwingHistory.length - 1].overallScore) 
        : 0)
  };

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '20px', color: '#546e47' }}>Loading your swing data...</p>
      </div>
    );
  }

  // If no history, show onboarding
  if (!hasHistory) {
    return (
      <div className="dashboard-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: '#546e47',
          fontSize: isMobile ? '2rem' : '2.5rem',
          fontWeight: '400',
          marginBottom: '20px',
          fontFamily: 'serif'
        }}>Welcome to Swing AI</h1>
        
        <p style={{
          fontSize: '1.1rem',
          color: '#555',
          marginBottom: '30px'
        }}>
          Upload your first swing to get personalized AI analysis and start tracking your progress.
        </p>
        
        <button
          onClick={() => navigateTo('upload')}
          style={{
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            padding: '15px 30px',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px rgba(84, 110, 71, 0.2)',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginRight: '10px' }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload Your First Swing
        </button>
      </div>
    );
  }

  // Main dashboard for users with history - MOBILE OPTIMIZED
  return (
    <div className="dashboard-container" style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: isMobile ? '10px' : '20px'
    }}>
      <h1 style={{
        color: '#546e47',
        fontSize: isMobile ? '2rem' : '2.5rem',
        fontWeight: '400',
        marginBottom: isMobile ? '15px' : '30px',
        fontFamily: 'serif',
        textAlign: 'center'
      }}>
        Swing AI
      </h1>
      
      {/* New Upload Button at the top */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: isMobile ? '20px' : '30px'
      }}>
        <button
          onClick={() => navigateTo('upload')}
          style={{
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 25px',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(84, 110, 71, 0.2)',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginRight: '8px' }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload New Swing
        </button>
      </div>

      {/* Dashboard Content - MOBILE OPTIMIZED with responsive layout */}
      <div className="dashboard-content" style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '20px',
        alignItems: 'flex-start',
      }}>
        {/* Stats display - For mobile, we'll show this first */}
        <div className="stats-display" style={{
          width: isMobile ? '100%' : 'auto',
          flex: isMobile ? 'none' : '1',
          order: isMobile ? 1 : 2
        }}>
          {/* Stats cards - Grid for mobile */}
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: isMobile ? '20px' : '10px'
          }}>
            <div className="stat-card" style={{
              padding: isMobile ? '12px' : '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              display: isMobile ? 'flex' : 'block',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontSize: isMobile ? '2rem' : '3rem', 
                fontWeight: '500', 
                color: '#333' 
              }}>
                {stats.totalSwings}
              </div>
              <div style={{ fontSize: '1rem', color: '#555' }}>
                Swings
              </div>
            </div>
            
            <div className="stat-card" style={{
              padding: isMobile ? '12px' : '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              display: isMobile ? 'flex' : 'block',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontSize: isMobile ? '2rem' : '3rem',
                fontWeight: '500', 
                color: '#333' 
              }}>
                {stats.averageScore.toFixed(1)}
              </div>
              <div style={{ fontSize: '1rem', color: '#555' }}>
                Avg Score
              </div>
            </div>
            
            <div className="stat-card" style={{
              padding: isMobile ? '12px' : '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              display: isMobile ? 'flex' : 'block',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontSize: isMobile ? '2rem' : '3rem',
                fontWeight: '500', 
                color: '#333' 
              }}>
                {stats.lastScore}
              </div>
              <div style={{ fontSize: '1rem', color: '#555' }}>
                Last Score
              </div>
            </div>
            
            <div className="stat-card" style={{
              padding: isMobile ? '12px' : '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              display: isMobile ? 'flex' : 'block',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontSize: isMobile ? '2rem' : '3rem',
                fontWeight: '500', 
                color: stats.improvement >= 0 ? '#27ae60' : '#e74c3c'
              }}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement}
              </div>
              <div style={{ fontSize: '1rem', color: '#555' }}>
                Improvement
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs - For mobile, we'll show this second */}
        <div className="tabs-container" style={{
          width: isMobile ? '100%' : '175px',
          marginRight: isMobile ? '0' : '20px',
          order: isMobile ? 2 : 1
        }}>
          {/* Mobile-friendly tab buttons */}
          <button 
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{
              backgroundColor: activeTab === 'stats' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'stats' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: isMobile ? '10px 15px' : '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              marginBottom: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeTab === 'stats' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#546e47'
                }}></div>
              )}
            </div>
            STATS
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
            style={{
              backgroundColor: activeTab === 'trends' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'trends' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: isMobile ? '10px 15px' : '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              marginBottom: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeTab === 'trends' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#546e47'
                }}></div>
              )}
            </div>
            TRENDS
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
            style={{
              backgroundColor: activeTab === 'compare' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'compare' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: isMobile ? '10px 15px' : '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              marginBottom: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeTab === 'compare' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#546e47'
                }}></div>
              )}
            </div>
            COMPARE
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
            style={{
              backgroundColor: activeTab === 'recent' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'recent' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: isMobile ? '10px 15px' : '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              marginBottom: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeTab === 'recent' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#546e47'
                }}></div>
              )}
            </div>
            RECENT
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'social' ? 'active' : ''}`}
            onClick={() => setActiveTab('social')}
            style={{
              backgroundColor: activeTab === 'social' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'social' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: isMobile ? '10px 15px' : '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : 'auto',
              marginBottom: '8px'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'white',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {activeTab === 'social' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#546e47'
                }}></div>
              )}
            </div>
            SOCIAL
          </button>
        </div>
      </div>
      
      {/* Recent swings preview - Mobile-friendly layout */}
      {localSwingHistory.length > 0 && (
        <div style={{
          width: '100%',
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            fontSize: isMobile ? '1.2rem' : '1.4rem',
            margin: '0 0 15px 0' 
          }}>
            Recent Swings
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {localSwingHistory.slice(0, 3).map((swing, index) => (
              <div 
                key={index}
                onClick={() => navigateTo('analysis', { swingData: swing })}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: isMobile ? '12px' : '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#333' }}>
                    {new Date(swing.recordedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  {swing.clubName && (
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      {swing.clubName}
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: getScoreColor(swing.overallScore),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}>
                    {Math.round(swing.overallScore)}
                  </div>
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#ccc" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            ))}
          </div>
          
          {localSwingHistory.length > 3 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '15px',
              marginBottom: '10px' 
            }}>
              <button
                onClick={() => navigateTo('profile', { activeTab: 'progress' })}
                style={{
                  backgroundColor: 'transparent',
                  color: '#546e47',
                  border: 'none',
                  padding: '5px 10px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textDecoration: 'underline'
                }}
              >
                View all {localSwingHistory.length} swings →
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Bottom Navigation - Mobile-friendly */}
      <div className="dashboard-nav" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px',
        border: '1px solid #ddd',
        borderRadius: '50px',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => navigateTo('upload')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: isMobile ? '12px 0' : '15px 0',
            flex: '1',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          UPLOAD
        </button>
        
        <button
          style={{
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            padding: isMobile ? '12px 0' : '15px 0',
            flex: '1',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          DASHBOARD
        </button>
        
        <button
          onClick={() => navigateTo('comparison')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: isMobile ? '12px 0' : '15px 0',
            flex: '1',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          CADDIE
        </button>
        
        <button
          onClick={() => navigateTo('profile')}
          style={{
            backgroundColor: 'white',
            color: '#546e47',
            border: 'none',
            padding: isMobile ? '12px 0' : '15px 0',
            flex: '1',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          PROFILE
        </button>
      </div>
      
      {/* Copyright */}
      <div style={{
        textAlign: 'right',
        marginTop: '20px',
        fontSize: '0.8rem',
        color: '#999'
      }}>
        © {new Date().getFullYear()}
      </div>
    </div>
  );
};

// Helper function to get color based on score
const getScoreColor = (score) => {
  if (score >= 80) return '#27ae60'; // Green for good
  if (score >= 60) return '#f39c12'; // Orange for average
  return '#e74c3c'; // Red for needs improvement
};

export default Dashboard;