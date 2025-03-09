// src/components/MobileNavDropdown.js
import React, { useState } from 'react';

const MobileNavDropdown = ({ currentPage, navigateTo, showProfile = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleNavigate = (page) => {
    navigateTo(page);
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
    <div className="mobile-nav-dropdown">
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
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
              backgroundColor: currentPage === 'dashboard' ? '#f0f0f0' : 'transparent',
              borderBottom: '1px solid #eee'
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
              backgroundColor: currentPage === 'upload' ? '#f0f0f0' : 'transparent',
              borderBottom: '1px solid #eee'
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
              backgroundColor: currentPage === 'tracker' ? '#f0f0f0' : 'transparent',
              borderBottom: '1px solid #eee'
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
              backgroundColor: currentPage === 'comparison' ? '#f0f0f0' : 'transparent',
              borderBottom: '1px solid #eee'
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
                backgroundColor: '#f0f0f0',
                borderBottom: '1px solid #eee'
              }}
            >
              Swing Analysis
            </div>
          )}
          {showProfile && (
            <div 
              className={`dropdown-item ${currentPage === 'profile' ? 'active' : ''}`}
              onClick={() => handleNavigate('profile')}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: currentPage === 'profile' ? '#f0f0f0' : 'transparent'
              }}
            >
              My Profile
            </div>
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
    </div>
  );
};

export default MobileNavDropdown;