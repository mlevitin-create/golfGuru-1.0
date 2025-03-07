// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClubBag from './ClubBag';
import ClubAnalytics from './ClubAnalytics';
import firestoreService from '../services/firestoreService';

const UserProfile = ({ navigateTo, userStats, userClubs, setUserClubs, setupClubsTab = false }) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(setupClubsTab ? 'clubs' : 'profile');
  const [userData, setUserData] = useState({
    name: currentUser?.displayName || '',
    experience: 'intermediate',
    playFrequency: 'monthly',
    handicap: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        setLoading(true);
        try {
          const profile = await firestoreService.getUserProfile(currentUser.uid);
          if (profile) {
            setUserData({
              name: profile.name || currentUser.displayName || '',
              experience: profile.experience || 'intermediate',
              playFrequency: profile.playFrequency || 'monthly',
              handicap: profile.handicap || ''
            });
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setError('Failed to load your profile. Please refresh the page.');
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserProfile();
  }, [currentUser]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  // Save profile changes
  const saveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await firestoreService.saveUserProfile(currentUser.uid, {
        ...userData,
        updatedAt: new Date()
      });
      
      // Display success message or update UI
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigateTo('dashboard');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  // Handle club update completion
  const handleClubUpdateComplete = (updatedClubs) => {
    setUserClubs(updatedClubs);
    setActiveTab('profile'); // Go back to profile tab after updating clubs
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Loading profile...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!currentUser) {
    return (
      <div className="card">
        <h2>Profile</h2>
        <p>Please sign in to view and manage your profile.</p>
        <button 
          className="button" 
          onClick={() => window.dispatchEvent(new Event('openLoginModal'))}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Profile Tabs */}
      <div className="profile-tabs" style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <div 
          className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'profile' ? '2px solid #3498db' : 'none'
          }}
        >
          Profile
        </div>
        <div 
          className={`profile-tab ${activeTab === 'clubs' ? 'active' : ''}`}
          onClick={() => setActiveTab('clubs')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'clubs' ? '2px solid #3498db' : 'none'
          }}
        >
          My Clubs
        </div>
        <div 
          className={`profile-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '2px solid #3498db' : 'none'
          }}
        >
          Club Analytics
        </div>
        <div 
          className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: activeTab === 'stats' ? '2px solid #3498db' : 'none'
          }}
        >
          Stats
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div className="card">
          <h2>My Profile</h2>
          
          {error && (
            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
              {error}
            </div>
          )}
          
          <div className="user-info" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <img 
              src={currentUser.photoURL || '/default-avatar.png'} 
              alt="Profile"
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                marginRight: '20px',
                border: '3px solid #3498db'
              }}
            />
            <div>
              <h3>{currentUser.displayName || 'Golfer'}</h3>
              <p>{currentUser.email}</p>
              <p>Joined: {new Date(currentUser.metadata.creationTime).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="profile-form">
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Display Name</label>
              <input 
                type="text" 
                id="name"
                name="name"
                value={userData.name}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="experience" style={{ display: 'block', marginBottom: '5px' }}>Golf Experience</label>
              <select 
                id="experience"
                name="experience"
                value={userData.experience}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="beginner">Beginner (Less than 2 years)</option>
                <option value="intermediate">Intermediate (2-5 years)</option>
                <option value="advanced">Advanced (5+ years)</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="playFrequency" style={{ display: 'block', marginBottom: '5px' }}>How often do you play?</label>
              <select 
                id="playFrequency"
                name="playFrequency"
                value={userData.playFrequency}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="weekly">Weekly or more</option>
                <option value="monthly">A few times per month</option>
                <option value="occasionally">Occasionally</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="handicap" style={{ display: 'block', marginBottom: '5px' }}>Handicap</label>
              <input 
                type="text" 
                id="handicap"
                name="handicap"
                value={userData.handicap}
                onChange={handleInputChange}
                placeholder="Enter your handicap"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div className="button-group" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button 
                className="button" 
                onClick={saveProfile}
                disabled={saving}
                style={{ padding: '10px 20px' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              
              <button 
                className="button" 
                onClick={handleLogout}
                style={{ padding: '10px 20px', backgroundColor: '#e74c3c' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'clubs' && (
        <ClubBag onComplete={handleClubUpdateComplete} />
      )}
      
      {activeTab === 'analytics' && (
        <ClubAnalytics />
      )}
      
      {activeTab === 'stats' && (
        <div className="card">
          <h2>My Golf Stats</h2>
          
          {userStats ? (
            <div className="stats-container">
              <div className="stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                <div className="stat-card" style={{ flex: '1', minWidth: '200px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h3>Swing Analysis</h3>
                  <p><strong>Total Swings Analyzed:</strong> {userStats.totalSwings || 0}</p>
                  <p><strong>Average Score:</strong> {userStats.averageScore ? userStats.averageScore.toFixed(1) : 'N/A'}/100</p>
                  <p><strong>Best Score:</strong> {userStats.bestScore || 'N/A'}/100</p>
                </div>
                
                <div className="stat-card" style={{ flex: '1', minWidth: '200px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h3>Club Usage</h3>
                  {userStats.clubUsage && Object.keys(userStats.clubUsage).length > 0 ? (
                    <ul style={{ paddingLeft: '20px' }}>
                      {Object.entries(userStats.clubUsage)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([club, count]) => (
                          <li key={club}>{club}: {count} swings</li>
                        ))}
                    </ul>
                  ) : (
                    <p>No club usage data available</p>
                  )}
                </div>
              </div>
              
              <div className="stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                <div className="stat-card" style={{ flex: '1', minWidth: '200px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h3>Swing Outcomes</h3>
                  {userStats.outcomes && Object.keys(userStats.outcomes).length > 0 ? (
                    <ul style={{ paddingLeft: '20px' }}>
                      {Object.entries(userStats.outcomes)
                        .sort((a, b) => b[1] - a[1])
                        .map(([outcome, count]) => (
                          <li key={outcome}>{outcome.charAt(0).toUpperCase() + outcome.slice(1)}: {count} times</li>
                        ))}
                    </ul>
                  ) : (
                    <p>No outcome data available</p>
                  )}
                </div>
                
                <div className="stat-card" style={{ flex: '1', minWidth: '200px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h3>Most Improved Areas</h3>
                  {userStats.improvements && Object.keys(userStats.improvements).length > 0 ? (
                    <ul style={{ paddingLeft: '20px' }}>
                      {Object.entries(userStats.improvements)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([area, value]) => (
                          <li key={area}>{area.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: +{value.toFixed(1)} points</li>
                        ))}
                    </ul>
                  ) : (
                    <p>Need at least 5 swing analyses to calculate improvements</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p>No stats available yet. Upload and analyze more swings to see your statistics.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;