// In MobileNavDropdown.js
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

const MobileNavDropdown = ({ currentPage, navigateTo, showProfile = false, pageParams }) => {
  const { currentUser, isAdmin } = useAuth();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Only check admin status if user is logged in
    if (currentUser) {
      const checkAdmin = async () => {
        const admin = await isAdmin(currentUser.uid);
        setIsAdminUser(admin);
      };
      
      checkAdmin();
    }
  }, [currentUser, isAdmin]);
  
  const handleNavigate = (page, params = null) => {
    navigateTo(page, params);
    setIsOpen(false);
  };
  
  // Map of page names to display names
  const pageNames = {
    'dashboard': 'Dashboard',
    'upload': 'Upload Swing',
    'tracker': 'Tracker',
    'comparison': 'Pro Comparison',
    'profile': 'Profile',
    'analysis': 'Swing Analysis'
  };

  return (
    <div className="mobile-nav-dropdown" style={{ position: 'relative', zIndex: 100 }}>
      {/* Dropdown toggle button */}
      <button 
        className="dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '1rem',
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <span>{pageNames[currentPage] || 'Navigate'}</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease'
          }}
        >
          <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            zIndex: 5,
            marginTop: '-1px'
          }}
        >
          <div 
            className={`dropdown-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'dashboard' ? '#f0f7ff' : 'transparent',
              borderBottom: '1px solid #eee',
              color: '#333',
              fontWeight: currentPage === 'dashboard' ? 'bold' : 'normal'
            }}
          >
            Dashboard
          </div>
          <div 
            className={`dropdown-item ${currentPage === 'upload' ? 'active' : ''}`}
            onClick={() => handleNavigate('upload')}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'upload' ? '#f0f7ff' : 'transparent',
              borderBottom: '1px solid #eee',
              color: '#333',
              fontWeight: currentPage === 'upload' ? 'bold' : 'normal'
            }}
          >
            Upload Swing
          </div>
          <div 
            className={`dropdown-item ${currentPage === 'tracker' ? 'active' : ''}`}
            onClick={() => handleNavigate('tracker')}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'tracker' ? '#f0f7ff' : 'transparent',
              borderBottom: '1px solid #eee',
              color: '#333',
              fontWeight: currentPage === 'tracker' ? 'bold' : 'normal'
            }}
          >
            Progress Tracker
          </div>
          <div 
            className={`dropdown-item ${currentPage === 'comparison' ? 'active' : ''}`}
            onClick={() => handleNavigate('comparison')}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: currentPage === 'comparison' ? '#f0f7ff' : 'transparent',
              borderBottom: '1px solid #eee',
              color: '#333',
              fontWeight: currentPage === 'comparison' ? 'bold' : 'normal'
            }}
          >
            Pro Comparison
          </div>
          {currentPage === 'analysis' && (
            <div 
              className="dropdown-item active"
              onClick={() => handleNavigate('analysis')}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: '#f0f7ff',
                borderBottom: '1px solid #eee',
                color: '#333',
                fontWeight: 'bold'
              }}
            >
              Swing Analysis
            </div>
          )}
          {showProfile && (
            <>
              <div 
                className={`dropdown-item ${currentPage === 'profile' && (!pageParams || !pageParams.activeTab) ? 'active' : ''}`}
                onClick={() => handleNavigate('profile')}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: currentPage === 'profile' && (!pageParams || !pageParams.activeTab) ? '#f0f7ff' : 'transparent',
                  borderBottom: '1px solid #eee',
                  color: '#333',
                  fontWeight: currentPage === 'profile' && (!pageParams || !pageParams.activeTab) ? 'bold' : 'normal'
                }}
              >
                My Profile
              </div>
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '8px 8px 8px 16px',
                borderBottom: '1px solid #eee',
                color: '#666',
                fontSize: '0.85rem',
                fontWeight: 'bold'
              }}>
                Profile Sections
              </div>
              <div 
                className="dropdown-item"
                onClick={() => handleNavigate('profile', { setupClubs: false, activeTab: 'stats' })}
                style={{
                  padding: '12px 16px 12px 24px',
                  cursor: 'pointer',
                  backgroundColor: currentPage === 'profile' && pageParams && pageParams.activeTab === 'stats' ? '#f0f7ff' : 'transparent',
                  borderBottom: '1px solid #eee',
                  color: '#333',
                  fontWeight: currentPage === 'profile' && pageParams && pageParams.activeTab === 'stats' ? 'bold' : 'normal'
                }}
              >
                Stats
              </div>
              <div 
                className="dropdown-item"
                onClick={() => handleNavigate('profile', { setupClubs: false, activeTab: 'clubs' })}
                style={{
                  padding: '12px 16px 12px 24px',
                  cursor: 'pointer',
                  backgroundColor: currentPage === 'profile' && pageParams && pageParams.activeTab === 'clubs' ? '#f0f7ff' : 'transparent',
                  borderBottom: '1px solid #eee',
                  color: '#333',
                  fontWeight: currentPage === 'profile' && pageParams && pageParams.activeTab === 'clubs' ? 'bold' : 'normal'
                }}
              >
                My Clubs
              </div>
              <div 
                className="dropdown-item"
                onClick={() => handleNavigate('profile', { setupClubs: false, activeTab: 'analytics' })}
                style={{
                  padding: '12px 16px 12px 24px',
                  cursor: 'pointer',
                  backgroundColor: currentPage === 'profile' && pageParams && pageParams.activeTab === 'analytics' ? '#f0f7ff' : 'transparent',
                  color: '#333',
                  fontWeight: currentPage === 'profile' && pageParams && pageParams.activeTab === 'analytics' ? 'bold' : 'normal'
                }}
              >
                Club Analytics
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Backdrop to close the dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="dropdown-backdrop"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1
          }}
        />
      )}
      {isAdminUser && (
        <div 
          className={`dropdown-item ${currentPage === 'admin' ? 'active' : ''}`}
          onClick={() => handleNavigate('admin')}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            backgroundColor: currentPage === 'admin' ? '#f0f7ff' : 'transparent',
            borderBottom: '1px solid #eee',
            color: '#333',
            fontWeight: currentPage === 'admin' ? 'bold' : 'normal'
          }}
        >
          Admin Panel
        </div>
      )}
    </div>
  );
};

export default MobileNavDropdown;