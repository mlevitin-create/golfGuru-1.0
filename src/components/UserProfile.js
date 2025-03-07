// src/components/UserProfile.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = ({ navigateTo }) => {
  const { currentUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigateTo('dashboard');
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="card">
      <div 
        className="user-profile-header" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}
      >
        <img 
          src={currentUser.photoURL || '/default-avatar.png'} 
          alt="Profile" 
          style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            marginRight: '15px',
            border: '2px solid #3498db'
          }} 
        />
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>{currentUser.displayName}</h2>
          <p style={{ margin: '0', color: '#666' }}>{currentUser.email}</p>
        </div>
      </div>

      <div className="profile-stats">
        <h3>Your Golf Profile</h3>
        <div 
          className="stats-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '15px', 
            marginBottom: '20px' 
          }}
        >
          <div className="stat-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h4>Swing Analyses</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>12</p>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h4>Practice Days</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>8</p>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h4>Average Score</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>72.5</p>
          </div>
          <div className="stat-card" style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h4>Improvement</h4>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#27ae60' }}>+12.3%</p>
          </div>
        </div>
      </div>

      <div className="profile-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          className="button" 
          onClick={() => navigateTo('tracker')}
          style={{ flex: 1 }}
        >
          View Progress
        </button>
        <button 
          className="button" 
          onClick={() => navigateTo('upload')}
          style={{ flex: 1 }}
        >
          Add New Swing
        </button>
        <button 
          className="button" 
          onClick={handleLogout}
          style={{ 
            flex: 1, 
            backgroundColor: '#e74c3c',
            opacity: isLoggingOut ? 0.7 : 1
          }}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;