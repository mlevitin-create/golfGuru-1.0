// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ClubBag from './ClubBag';
import ClubAnalytics from './ClubAnalytics';
import ProgressAnalysis from './ProgressAnalysis'; // Import the new component
import firestoreService from '../services/firestoreService';
import DateSelector from './DateSelector';

const UserProfile = ({ navigateTo, userStats, userClubs, setUserClubs, setupClubsTab = false, pageParams }) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState({
    name: currentUser?.displayName || '',
    experience: 'intermediate',
    playFrequency: 'monthly',
    handicap: '',
    allowHistoricalSwings: true  // Default to true for existing users
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [swingHistory, setSwingHistory] = useState([]);

  // Set the active tab based on incoming parameters
  // Set the active tab based on incoming parameters
  useEffect(() => {
    console.log("Received page params:", pageParams);
    console.log("Setup clubs tab:", setupClubsTab);

    if (setupClubsTab) {
      setActiveTab('clubs');
    } else if (pageParams && pageParams.activeTab) {
      console.log("Setting active tab to:", pageParams.activeTab);
      setActiveTab(pageParams.activeTab);
    } else if (window.location.hash === "#clubs") {
      // Handle direct navigation to clubs tab via URL hash
      setActiveTab('clubs');
    }
  }, [setupClubsTab, pageParams]);

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        setLoading(true);
        try {
          // Get user profile
          const profile = await firestoreService.getUserProfile(currentUser.uid);
          if (profile) {
            setUserData({
              name: profile.name || currentUser.displayName || '',
              experience: profile.experience || 'intermediate',
              playFrequency: profile.playFrequency || 'monthly',
              handicap: profile.handicap || ''
            });
          }

          // Get swing history for stats
          const swings = await firestoreService.getUserSwings(currentUser.uid);
          setSwingHistory(swings || []);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setError('Failed to load your profile. Please refresh the page.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [currentUser]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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
      {/* Profile Tabs - Added new Progress tab */}
      <div className="profile-tabs">
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
          className={`profile-tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            borderBottom: activeTab === 'progress' ? '2px solid #3498db' : 'none'
          }}
        >
          Progress Analysis
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
            <div className="form-group" style={{
              marginTop: '25px',
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: '0', marginBottom: '10px' }}>Historical Swing Tracking</h3>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="allowHistoricalSwings"
                    checked={userData.allowHistoricalSwings !== false}
                    onChange={handleInputChange}
                    style={{ marginRight: '10px' }}
                  />
                  Allow tracking of historical swings with custom dates
                </label>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
                  Enable this to upload and analyze videos from past practice sessions with their original recording dates.
                </p>
              </div>
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
        <div className="card">
          <h2>Club Analytics</h2>
          {userClubs && userClubs.length > 0 ? (
            <div className="club-analytics-content">
              <p>This section provides analytics on your club performance based on your swing history.</p>
              {/* Render ClubAnalytics component and pass necessary data */}
              <ClubAnalytics userClubs={userClubs} swingHistory={swingHistory} />
            </div>
          ) : (
            <div className="no-clubs-message">
              <p>You don't have any clubs set up yet. Go to the "My Clubs" tab to add your clubs.</p>
              <button
                className="button"
                onClick={() => setActiveTab('clubs')}
                style={{ marginTop: '10px' }}
              >
                Set Up My Clubs
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Progress Analysis Tab */}
      {activeTab === 'progress' && (
        <ProgressAnalysis swingHistory={swingHistory} userClubs={userClubs} />
      )}

      {activeTab === 'stats' && (
        <div className="card">
          <h2>My Golf Stats</h2>

          {userStats ? (
            <div className="stats-container">
              <div className="stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
                <div className="stat-card" style={{ flex: '1', minWidth: '200px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h3>Swing Analysis</h3>
                  <p><strong>Total Swings Analyzed:</strong> {swingHistory.length || 0}</p>
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
              <button
                className="button"
                onClick={() => navigateTo('upload')}
                style={{ marginTop: '15px' }}
              >
                Upload Swing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;