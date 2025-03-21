// src/components/HomePage.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserLoginIndicator from './UserLoginIndicator';

/**
 * New home page component with modern design
 * @param {Object} props
 * @param {Function} props.navigateTo - Navigation function
 * @param {Array} props.swingHistory - User's swing history
 * @param {Object} props.userStats - User statistics
 * @param {Array} props.userClubs - User's club information
 * @returns {JSX.Element}
 */
const HomePage = ({ navigateTo, swingHistory, userStats, userClubs }) => {
  const { currentUser } = useAuth();
  
  // Get recent swings for display
  const recentSwings = swingHistory.slice(0, 3);
  
  // Check if user has any data
  const hasData = swingHistory.length > 0;
  
  return (
    <div className="home-page-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '80vh',
      position: 'relative'
    }}>
      {/* Login status indicator in the top right */}
      <UserLoginIndicator 
        isLoggedIn={!!currentUser} 
        onProfileClick={() => navigateTo('profile')} 
      />
      
      {/* Main title */}
      <h1 style={{ 
        fontSize: '4rem', 
        color: '#546e47', 
        fontWeight: '400',
        marginBottom: '10px',
        fontFamily: 'serif'
      }}>
        Swing AI
      </h1>
      
      {/* Subtitle */}
      <p style={{ 
        fontSize: '1.5rem', 
        color: '#546e47', 
        marginBottom: '40px',
        fontFamily: 'serif',
        fontWeight: '400',
        maxWidth: '600px'
      }}>
        Improving your golf swing using next-gen AI
      </p>
      
      {/* Main action buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '60px',
        width: '100%',
        maxWidth: '300px'
      }}>
        <button
          onClick={() => navigateTo('upload')}
          style={{
            width: '100%',
            padding: '15px 0',
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            fontSize: '1.1rem',
            fontWeight: '500',
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
          Upload Swing
        </button>
        
        {hasData && (
          <button
            onClick={() => navigateTo('tracker')}
            style={{
              width: '100%',
              padding: '15px 0',
              backgroundColor: 'white',
              color: '#546e47',
              border: '1px solid #546e47',
              borderRadius: '30px',
              fontSize: '1.1rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            View My Progress
          </button>
        )}
      </div>
      
      {/* Feature highlights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '30px',
        width: '100%',
        maxWidth: '1000px',
        marginBottom: '60px',
        padding: '0 20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '30px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            backgroundColor: 'rgba(84, 110, 71, 0.1)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px auto'
          }}>
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#546e47" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </div>
          <h3 style={{ color: '#546e47', fontSize: '1.3rem', margin: '0 0 10px 0' }}>
            AI Analysis
          </h3>
          <p style={{ color: '#555', margin: 0, fontSize: '0.95rem' }}>
            Get detailed breakdown of your swing mechanics with actionable insights.
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '30px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            backgroundColor: 'rgba(84, 110, 71, 0.1)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px auto'
          }}>
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#546e47" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <h3 style={{ color: '#546e47', fontSize: '1.3rem', margin: '0 0 10px 0' }}>
            Progress Tracking
          </h3>
          <p style={{ color: '#555', margin: 0, fontSize: '0.95rem' }}>
            Monitor improvements in your golf swing over time with detailed metrics.
          </p>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '30px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            backgroundColor: 'rgba(84, 110, 71, 0.1)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 15px auto'
          }}>
            <svg 
              width="30" 
              height="30" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#546e47" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <h3 style={{ color: '#546e47', fontSize: '1.3rem', margin: '0 0 10px 0' }}>
            Pro Comparisons
          </h3>
          <p style={{ color: '#555', margin: 0, fontSize: '0.95rem' }}>
            Compare your technique with tour professionals to refine your swing.
          </p>
        </div>
      </div>
      
      {/* Recent swings preview (if available) */}
      {recentSwings.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '600px',
          marginBottom: '40px'
        }}>
          <h3 style={{ 
            color: '#546e47', 
            fontSize: '1.4rem', 
            margin: '0 0 20px 0',
            textAlign: 'center'
          }}>
            Your Recent Swings
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {recentSwings.map((swing, index) => (
              <div 
                key={index}
                onClick={() => navigateTo('analysis', { swingData: swing })}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                }}
              >
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#333' }}>
                    {new Date(swing.recordedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
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
                  gap: '15px'
                }}>
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    backgroundColor: getScoreColor(swing.overallScore),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
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
          
          {swingHistory.length > 3 && (
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                onClick={() => navigateTo('tracker')}
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
                View all {swingHistory.length} swings →
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Footer */}
      <hr className="footer-line" />
      <div className="footer-text">
        <span>© {new Date().getFullYear()} Swing AI</span>
        <span>Powered by AI</span>
      </div>
    </div>
  );
};

// Helper function to determine color based on score
const getScoreColor = (score) => {
  if (score >= 80) return '#27ae60'; // Green for good
  if (score >= 60) return '#f39c12'; // Orange for average
  return '#e74c3c'; // Red for needs improvement
};

export default HomePage;