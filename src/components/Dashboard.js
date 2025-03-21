// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const Dashboard = ({ swingHistory, navigateTo, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [localSwingHistory, setLocalSwingHistory] = useState(swingHistory || []);
  const [localStats, setLocalStats] = useState(userStats || {});
  
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
        ? Math.round(localSwingHistory[0].overallScore - localSwingHistory[1].overallScore) 
        : 0)
  };

  // Render appropriate content based on active tab
  const renderTabContent = () => {
    switch(activeTab) {
      case 'stats':
        return (
          <div className="stats-content">
            {/* Stats content would go here */}
            <p>Detailed statistics about your swings will appear here.</p>
          </div>
        );
      case 'trends':
        return (
          <div className="trends-content">
            {/* Trends content would go here */}
            <p>Performance trends over time will appear here.</p>
          </div>
        );
      case 'compare':
        return (
          <div className="compare-content">
            {/* Compare content would go here */}
            <p>Compare your swings with others or against your past performance.</p>
          </div>
        );
      case 'recent':
        return (
          <div className="recent-content">
            {/* Recent swings would go here */}
            <p>Your most recent swing analyses will appear here.</p>
          </div>
        );
      case 'social':
        return (
          <div className="social-content">
            {/* Social content would go here */}
            <p>Connect with other golfers and share your progress.</p>
          </div>
        );
      default:
        return (
          <div className="stats-content">
            <p>Select a tab to view your swing data.</p>
          </div>
        );
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(84, 110, 71, 0.1)',
          borderRadius: '50%',
          borderLeft: '4px solid #546e47',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#546e47' }}>Loading your swing data...</p>
      </div>
    );
  }

  // If no history, show onboarding
  if (!hasHistory) {
    console.log("No swing history found:", localSwingHistory);
    
    return (
      <div className="dashboard-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: '#546e47',
          fontSize: '2.5rem',
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
            boxShadow: '0 4px 6px rgba(84, 110, 71, 0.2)'
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

  console.log("Displaying dashboard with data:", { stats, swings: localSwingHistory.length });

  // Main dashboard for users with history
  return (
    <div className="dashboard-container" style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{
        color: '#546e47',
        fontSize: '2.5rem',
        fontWeight: '400',
        marginBottom: '30px',
        fontFamily: 'serif',
        textAlign: 'center'
      }}>
        Swing AI
      </h1>

      <div className="dashboard-content" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '40px',
        alignItems: 'stretch',
      }}>
        {/* Left side - Navigation tabs */}
        <div className="tabs-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          flex: '1',
          maxWidth: '200px'
        }}>
          <button 
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{
              backgroundColor: activeTab === 'stats' ? '#546e47' : '#d1d7cd',
              color: activeTab === 'stats' ? 'white' : '#555',
              border: 'none',
              borderRadius: '50px',
              padding: '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
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
              padding: '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
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
              padding: '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
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
              padding: '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
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
              padding: '15px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            SOCIAL
          </button>
        </div>
        
        {/* Right side - Stats display */}
        <div className="stats-display" style={{
          flex: '2',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px'
        }}>
          {/* Stats cards */}
          <div className="stat-card" style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '20px'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '500', color: '#333' }}>
              {stats.totalSwings}
            </div>
            <div style={{ fontSize: '1rem', color: '#555' }}>
              Uploaded Swings
            </div>
          </div>
          
          <div className="stat-card" style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '20px'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '500', color: '#333' }}>
              {stats.averageScore.toFixed(1)}
            </div>
            <div style={{ fontSize: '1rem', color: '#555' }}>
              Average Score
            </div>
          </div>
          
          <div className="stat-card" style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '20px'
          }}>
            <div style={{ fontSize: '3rem', fontWeight: '500', color: '#333' }}>
              {stats.lastScore}
            </div>
            <div style={{ fontSize: '1rem', color: '#555' }}>
              Last Score
            </div>
          </div>
          
          <div className="stat-card" style={{
            borderBottom: '1px solid #ddd',
            paddingBottom: '20px'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '500', 
              color: stats.improvement >= 0 ? '#27ae60' : '#e74c3c'
            }}>
              {stats.improvement > 0 ? '+' : ''}{stats.improvement}%
            </div>
            <div style={{ fontSize: '1rem', color: '#555' }}>
              Improvement
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <div className="dashboard-nav" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '40px',
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
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
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
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
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
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
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
            padding: '15px 0',
            flex: '1',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          MY BAG
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

export default Dashboard;