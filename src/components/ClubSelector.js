// src/components/ClubSelector.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firestoreService from '../services/firestoreService';

const SHOT_OUTCOMES = [
  { id: 'straight', label: 'Straight' },
  { id: 'fade', label: 'Fade/Slice' },
  { id: 'draw', label: 'Draw/Hook' },
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'thin', label: 'Thin/Topped' },
  { id: 'fat', label: 'Fat/Chunked' },
  { id: 'shank', label: 'Shank' }
];

const ClubSelector = ({ onContinue, onSkip }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [error, setError] = useState(null);

  // Load user's clubs
  useEffect(() => {
    const loadUserClubs = async () => {
      setLoading(true);
      try {
        if (currentUser) {
          const userClubs = await firestoreService.getUserClubs(currentUser.uid);
          setClubs(userClubs || []);
        } else {
          // For non-authenticated users, we'll use empty array
          setClubs([]);
        }
      } catch (error) {
        console.error('Error loading clubs:', error);
        setError('Failed to load your clubs. You can still continue without selecting one.');
      } finally {
        setLoading(false);
      }
    };

    loadUserClubs();
  }, [currentUser]);

  const handleContinue = () => {
    // Set loading state to true
    setLoading(true);
    
    // If no club is selected, just skip
    if (!selectedClubId) {
      onSkip();
      return;
    }

    const selectedClub = clubs.find(club => club.id === selectedClubId);
    
    onContinue({
      clubId: selectedClubId,
      clubName: selectedClub.name,
      clubType: selectedClub.type,
      outcome: selectedOutcome || null
    });
  };

  // Group clubs by type for organized rendering
  const groupedClubs = clubs.reduce((acc, club) => {
    if (!acc[club.type]) {
      acc[club.type] = [];
    }
    acc[club.type].push(club);
    return acc;
  }, {});

  // Order club types in a logical sequence
  const orderedClubTypes = ['Wood', 'Hybrid', 'Iron', 'Wedge', 'Putter', 'Other'];
  
  // Sort club groups
  const sortedClubGroups = Object.keys(groupedClubs)
    .sort((a, b) => {
      return orderedClubTypes.indexOf(a) - orderedClubTypes.indexOf(b);
    });

  if (loading && !clubs.length) {
    return (
      <div className="card">
        <h2>Loading...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Shot Details</h2>
      <p>Tell us which club you used and the outcome of your shot (optional)</p>
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {error}
        </div>
      )}
      
      {clubs.length === 0 ? (
        <div style={{ backgroundColor: '#e2f3f5', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <p>You haven't set up your clubs yet. You can continue without selecting a club or set up your clubs in your profile.</p>
          <button 
            className="button"
            onClick={() => onSkip('setup-clubs')} // Indicating we want to set up clubs
            style={{ marginTop: '10px' }}
          >
            Set Up My Clubs
          </button>
        </div>
      ) : (
        <>
          <div className="club-selection" style={{ marginBottom: '20px' }}>
            <label htmlFor="club-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Which club did you use?
            </label>
            
            <select 
              id="club-select"
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              disabled={loading}
            >
              <option value="">-- Select a club --</option>
              
              {sortedClubGroups.map(type => (
                <optgroup key={type} label={type}>
                  {groupedClubs[type]
                    .sort((a, b) => {
                      // Custom sorting logic for each club type
                      if (type === 'Iron' || type === 'Wood') {
                        // Extract numbers from names for numerical sorting
                        const numA = parseInt(a.name.match(/\d+/) || '0', 10);
                        const numB = parseInt(b.name.match(/\d+/) || '0', 10);
                        return numA - numB;
                      }
                      return a.name.localeCompare(b.name);
                    })
                    .map(club => (
                      <option key={club.id} value={club.id}>
                        {club.name} ({club.distance} yards)
                      </option>
                    ))
                  }
                </optgroup>
              ))}
            </select>
          </div>
        </>
      )}
      
      <div className="outcome-selection" style={{ marginBottom: '20px' }}>
        <label htmlFor="outcome-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          What was the shot outcome? (optional)
        </label>
        
        <select 
          id="outcome-select"
          value={selectedOutcome}
          onChange={(e) => setSelectedOutcome(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          disabled={loading}
        >
          <option value="">-- Select an outcome --</option>
          {SHOT_OUTCOMES.map(outcome => (
            <option key={outcome.id} value={outcome.id}>
              {outcome.label}
            </option>
          ))}
        </select>
      </div>
      
      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button 
          className="button"
          onClick={onSkip}
          disabled={loading}
          style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
        >
          Skip
        </button>
        <button 
          className="button"
          onClick={handleContinue}
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          {loading ? 'Processing...' : 'Continue'}
        </button>
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div className="spinner" style={{ 
            margin: '0 auto 15px',
            width: '40px',
            height: '40px',
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderLeftColor: '#3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ fontWeight: 'bold' }}>Analyzing your swing...</p>
          <p>This may take a moment. Please don't close this window.</p>
        </div>
      )}
    </div>
  );
};

export default ClubSelector;