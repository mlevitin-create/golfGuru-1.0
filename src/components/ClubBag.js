// src/components/ClubBag.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

// Default clubs that most golfers would have
const DEFAULT_CLUBS = [
  { id: 'driver', name: 'Driver', type: 'Wood', confidence: 5, distance: 230 },
  { id: '3-wood', name: '3 Wood', type: 'Wood', confidence: 5, distance: 210 },
  { id: '5-wood', name: '5 Wood', type: 'Wood', confidence: 5, distance: 195 },
  { id: '4-iron', name: '4 Iron', type: 'Iron', confidence: 5, distance: 180 },
  { id: '5-iron', name: '5 Iron', type: 'Iron', confidence: 5, distance: 170 },
  { id: '6-iron', name: '6 Iron', type: 'Iron', confidence: 5, distance: 160 },
  { id: '7-iron', name: '7 Iron', type: 'Iron', confidence: 5, distance: 150 },
  { id: '8-iron', name: '8 Iron', type: 'Iron', confidence: 5, distance: 140 },
  { id: '9-iron', name: '9 Iron', type: 'Iron', confidence: 5, distance: 130 },
  { id: 'pw', name: 'Pitching Wedge', type: 'Wedge', confidence: 5, distance: 120 },
  { id: 'sw', name: 'Sand Wedge', type: 'Wedge', confidence: 5, distance: 100 },
  { id: 'lw', name: 'Lob Wedge', type: 'Wedge', confidence: 5, distance: 80 },
  { id: 'putter', name: 'Putter', type: 'Putter', confidence: 5, distance: 0 }
];

// Additional clubs that can be added
const ADDITIONAL_CLUBS = [
  { id: '2-iron', name: '2 Iron', type: 'Iron', confidence: 5, distance: 200 },
  { id: '3-iron', name: '3 Iron', type: 'Iron', confidence: 5, distance: 190 },
  { id: '3-hybrid', name: '3 Hybrid', type: 'Hybrid', confidence: 5, distance: 190 },
  { id: '4-hybrid', name: '4 Hybrid', type: 'Hybrid', confidence: 5, distance: 180 },
  { id: '5-hybrid', name: '5 Hybrid', type: 'Hybrid', confidence: 5, distance: 170 },
  { id: 'gw', name: 'Gap Wedge', type: 'Wedge', confidence: 5, distance: 110 },
  { id: '60-degree', name: '60° Wedge', type: 'Wedge', confidence: 5, distance: 70 },
  { id: '7-wood', name: '7 Wood', type: 'Wood', confidence: 5, distance: 180 },
];

const ClubBag = ({ isFirstTimeSetup = false, onComplete }) => {
  const { currentUser } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [customClubName, setCustomClubName] = useState('');
  const [customClubType, setCustomClubType] = useState('Iron');

  // Load clubs from Firestore if the user is authenticated
  useEffect(() => {
    const loadClubs = async () => {
      setLoading(true);
      try {
        if (currentUser) {
          // Try to fetch clubs from Firestore
          const userClubs = await firestoreService.getUserClubs(currentUser.uid);
          
          if (userClubs && userClubs.length > 0) {
            setClubs(userClubs);
          } else if (isFirstTimeSetup) {
            // If first time and no clubs, use default set
            setClubs(DEFAULT_CLUBS);
          } else {
            // If returning user with no clubs, use empty array
            setClubs([]);
          }
        } else if (isFirstTimeSetup) {
          // For non-authenticated users during first setup
          setClubs(DEFAULT_CLUBS);
        }
        
        // Update available clubs
        updateAvailableClubs();
      } catch (error) {
        console.error('Error loading clubs:', error);
        setError('Failed to load your clubs. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadClubs();
  }, [currentUser, isFirstTimeSetup]);

  // Update available clubs that are not in the user's bag
  const updateAvailableClubs = () => {
    const clubIds = clubs.map(club => club.id);
    const filtered = ADDITIONAL_CLUBS.filter(club => !clubIds.includes(club.id));
    setAvailableClubs(filtered);
  };

  // Save clubs to Firestore
  const saveClubs = async () => {
    if (!currentUser) {
      if (isFirstTimeSetup && onComplete) {
        // For non-authenticated users during first-time setup
        // We'll just pass the clubs to the parent component
        onComplete(clubs);
      }
      return;
    }

    setSaving(true);
    try {
      await firestoreService.saveUserClubs(currentUser.uid, clubs);
      if (onComplete) {
        onComplete(clubs);
      }
    } catch (error) {
      console.error('Error saving clubs:', error);
      setError('Failed to save your clubs. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Add a club to the bag
  const addClub = (club) => {
    setClubs(prev => [...prev, club]);
    setAvailableClubs(prev => prev.filter(c => c.id !== club.id));
    setSelectedClub(null);
  };

  // Add a custom club to the bag
  const addCustomClub = () => {
    if (!customClubName.trim()) return;
    
    const customId = customClubName.toLowerCase().replace(/\s+/g, '-');
    const newClub = {
      id: `custom-${customId}-${Date.now()}`,
      name: customClubName,
      type: customClubType,
      confidence: 5,
      distance: 0
    };
    
    setClubs(prev => [...prev, newClub]);
    setCustomClubName('');
    setShowAddClubModal(false);
  };

  // Remove a club from the bag
  const removeClub = (clubId) => {
    const removedClub = clubs.find(c => c.id === clubId);
    setClubs(prev => prev.filter(c => c.id !== clubId));
    
    // If it's a standard club, add it back to available clubs
    const isStandardClub = [...DEFAULT_CLUBS, ...ADDITIONAL_CLUBS].some(c => c.id === clubId);
    if (isStandardClub && removedClub) {
      setAvailableClubs(prev => [...prev, removedClub]);
    }
  };

  // Update a club's properties
  const updateClub = (clubId, field, value) => {
    setClubs(prev => prev.map(club => 
      club.id === clubId 
        ? { ...club, [field]: field === 'distance' ? parseInt(value, 10) || 0 : value }
        : club
    ));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="card">
        <h2>Loading your clubs...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>What's In My Bag</h2>
      <p>Manage your clubs, set your confidence level, and record your typical distances</p>
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {error}
        </div>
      )}
      
      {/* Club List */}
      <div className="club-list">
        <div className="club-list-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
          <div style={{ flex: '2' }}>Club</div>
          <div style={{ flex: '1', textAlign: 'center' }}>Type</div>
          <div style={{ flex: '2', textAlign: 'center' }}>Confidence (1-10)</div>
          <div style={{ flex: '2', textAlign: 'center' }}>Distance (yards)</div>
          <div style={{ flex: '1', textAlign: 'center' }}>Remove</div>
        </div>
        
        {clubs.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p>No clubs in your bag yet. Add some clubs to get started!</p>
          </div>
        ) : (
          clubs.map(club => (
            <div key={club.id} className="club-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ flex: '2' }}>{club.name}</div>
              <div style={{ flex: '1', textAlign: 'center' }}>{club.type}</div>
              <div style={{ flex: '2', textAlign: 'center' }}>
                <select 
                  value={club.confidence}
                  onChange={(e) => updateClub(club.id, 'confidence', parseInt(e.target.value, 10))}
                  style={{ width: '60px', padding: '5px' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '2', textAlign: 'center' }}>
                <input 
                  type="number" 
                  value={club.distance}
                  onChange={(e) => updateClub(club.id, 'distance', e.target.value)}
                  style={{ width: '60px', padding: '5px' }}
                />
              </div>
              <div style={{ flex: '1', textAlign: 'center' }}>
                <button 
                  onClick={() => removeClub(club.id)}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1rem' }}
                  aria-label={`Remove ${club.name}`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add Club Section */}
      <div className="add-club-section" style={{ marginTop: '20px' }}>
        <h3>Add Clubs</h3>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <select 
            value={selectedClub ? selectedClub.id : ''}
            onChange={(e) => {
              const selected = availableClubs.find(c => c.id === e.target.value);
              setSelectedClub(selected || null);
            }}
            style={{ flex: '1', padding: '8px' }}
          >
            <option value="">-- Select a club --</option>
            {availableClubs.map(club => (
              <option key={club.id} value={club.id}>
                {club.name} ({club.type})
              </option>
            ))}
          </select>
          
          <button 
            className="button"
            onClick={() => selectedClub && addClub(selectedClub)}
            disabled={!selectedClub}
            style={{ padding: '8px 16px' }}
          >
            Add Club
          </button>
          
          <button 
            className="button"
            onClick={() => setShowAddClubModal(true)}
            style={{ padding: '8px 16px' }}
          >
            Add Custom Club
          </button>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="save-section" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="button"
          onClick={saveClubs}
          disabled={saving}
          style={{ padding: '12px 24px' }}
        >
          {saving ? 'Saving...' : isFirstTimeSetup ? 'Continue' : 'Save Changes'}
        </button>
      </div>
      
      {/* Custom Club Modal */}
      {showAddClubModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3>Add Custom Club</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="custom-club-name" style={{ display: 'block', marginBottom: '5px' }}>Club Name:</label>
              <input 
                type="text" 
                id="custom-club-name"
                value={customClubName}
                onChange={(e) => setCustomClubName(e.target.value)}
                placeholder="e.g., 60° Wedge, 3 Hybrid"
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="custom-club-type" style={{ display: 'block', marginBottom: '5px' }}>Club Type:</label>
              <select 
                id="custom-club-type"
                value={customClubType}
                onChange={(e) => setCustomClubType(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="Wood">Wood</option>
                <option value="Iron">Iron</option>
                <option value="Wedge">Wedge</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Putter">Putter</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowAddClubModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={addCustomClub}
                disabled={!customClubName.trim()}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: !customClubName.trim() ? '#95a5a6' : '#3498db', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px', 
                  cursor: !customClubName.trim() ? 'not-allowed' : 'pointer' 
                }}
              >
                Add Club
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubBag;