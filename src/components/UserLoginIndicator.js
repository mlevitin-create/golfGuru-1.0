// src/components/UserLoginIndicator.js
import React from 'react';

/**
 * Component to show login status in the corner of the page
 * @param {Object} props
 * @param {boolean} props.isLoggedIn - Whether user is logged in
 * @param {Function} props.onProfileClick - Function to navigate to profile
 * @returns {JSX.Element}
 */
const UserLoginIndicator = ({ isLoggedIn, onProfileClick }) => {
  const handleLogin = () => {
    // Dispatch a custom event that App.js listens for
    window.dispatchEvent(new Event('openLoginModal'));
  };

  return (
    <div style={{
      position: 'absolute',
      top: '15px',
      right: '15px',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      {isLoggedIn ? (
        <button
          onClick={onProfileClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f2f2f0',
            color: '#546e47',
            border: '1px solid #546e47',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginRight: '5px' }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          My Profile
        </button>
      ) : (
        <button
          onClick={handleLogin}
          style={{
            backgroundColor: '#546e47',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Sign In
        </button>
      )}
    </div>
  );
};

export default UserLoginIndicator;