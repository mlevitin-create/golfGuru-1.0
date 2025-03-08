// src/components/Navigation.js (modified)
import React from 'react';

const Navigation = ({ currentPage, navigateTo, showProfile = false }) => {
  return (
    <nav className="navigation" style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      padding: '10px 5px'
    }}>
      <div 
        className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => navigateTo('dashboard')}
        style={{ 
          padding: '10px 5px',
          flex: '1 0 auto',
          minWidth: '70px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}
      >
        Dashboard
      </div>
      <div 
        className={`nav-item ${currentPage === 'upload' ? 'active' : ''}`}
        onClick={() => navigateTo('upload')}
        style={{ 
          padding: '10px 5px',
          flex: '1 0 auto',
          minWidth: '70px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}
      >
        Upload
      </div>
      <div 
        className={`nav-item ${currentPage === 'tracker' ? 'active' : ''}`}
        onClick={() => navigateTo('tracker')}
        style={{ 
          padding: '10px 5px',
          flex: '1 0 auto',
          minWidth: '70px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}
      >
        Tracker
      </div>
      <div 
        className={`nav-item ${currentPage === 'comparison' ? 'active' : ''}`}
        onClick={() => navigateTo('comparison')}
        style={{ 
          padding: '10px 5px',
          flex: '1 0 auto',
          minWidth: '70px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}
      >
        Compare
      </div>
      {showProfile && (
        <div 
          className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => navigateTo('profile')}
          style={{ 
            padding: '10px 5px',
            flex: '1 0 auto',
            minWidth: '70px',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}
        >
          Profile
        </div>
      )}
    </nav>
  );
};

export default Navigation;