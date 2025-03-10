// src/components/ProfileSetupModal.js
import React, { useState } from 'react';
import DateSelector from './DateSelector';
import ClubBag from './ClubBag';
import firestoreService from '../services/firestoreService';

const ProfileSetupModal = ({ onClose, currentUser, currentUserData = {} }) => {
  const [step, setStep] = useState(1);
  const [profileData, setProfileData] = useState({
    name: currentUserData.name || currentUser?.displayName || '',
    experience: currentUserData.experience || 'intermediate',
    playFrequency: currentUserData.playFrequency || 'monthly',
    handicap: currentUserData.handicap || '',
    allowHistoricalSwings: currentUserData.allowHistoricalSwings !== false, // Default to true
  });
  
  const [useDefaultClubs, setUseDefaultClubs] = useState(true);
  const [clubs, setClubs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
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

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle next step button
  const handleNextStep = async () => {
    if (step === 3) {
      // Complete profile setup
      handleComplete();
    } else {
      setStep(prev => prev + 1);
    }
  };

  // Handle back button
  const handleBackStep = () => {
    setStep(prev => prev - 1);
  };

  // Handle club setup completion
  const handleClubSetupComplete = (updatedClubs) => {
    setClubs(updatedClubs);
    setStep(3); // Move to the final step
  };

  // Handle complete button
  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Save profile data to Firestore
      await firestoreService.saveUserProfile(currentUser.uid, {
        ...profileData,
        setupCompleted: true,
        updatedAt: new Date()
      });
      
      // Save clubs data to Firestore
      if (useDefaultClubs) {
        await firestoreService.saveUserClubs(currentUser.uid, DEFAULT_CLUBS);
      } else {
        await firestoreService.saveUserClubs(currentUser.uid, clubs);
      }
      
      // Clear the profile setup flag
      localStorage.removeItem('needsProfileSetup');
      
      // Close the modal
      onClose();
    } catch (err) {
      console.error('Error saving profile data:', err);
      setError('Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render profile details step
  const renderProfileStep = () => (
    <div className="profile-step">
      <h2>Tell us about yourself</h2>
      
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Your Name</label>
        <input 
          type="text" 
          id="name"
          name="name"
          value={profileData.name}
          onChange={handleInputChange}
          placeholder="Enter your name"
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="experience" style={{ display: 'block', marginBottom: '5px' }}>Golf Experience</label>
        <select 
          id="experience"
          name="experience"
          value={profileData.experience}
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
          value={profileData.playFrequency}
          onChange={handleInputChange}
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        >
          <option value="weekly">Weekly or more</option>
          <option value="monthly">A few times per month</option>
          <option value="occasionally">Occasionally</option>
        </select>
      </div>
      
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="handicap" style={{ display: 'block', marginBottom: '5px' }}>Handicap (optional)</label>
        <input 
          type="text" 
          id="handicap"
          name="handicap"
          value={profileData.handicap}
          onChange={handleInputChange}
          placeholder="Enter your handicap"
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            name="allowHistoricalSwings"
            checked={profileData.allowHistoricalSwings}
            onChange={handleInputChange}
            style={{ marginRight: '10px' }}
          />
          Allow tracking of historical swings with custom dates
        </label>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px', marginLeft: '25px' }}>
          Enable this to upload and analyze videos from past practice sessions with their original recording dates.
        </p>
      </div>
      
      <div className="button-group" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          className="button" 
          onClick={onClose}
          style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
        >
          Cancel
        </button>
        <button 
          className="button" 
          onClick={handleNextStep}
          style={{ padding: '10px 20px' }}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Render club setup step
  const renderClubStep = () => (
    <div className="club-step">
      <h2>Set Up Your Golf Bag</h2>
      
      <div className="club-options" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
          <input 
            type="radio" 
            name="clubSetup" 
            checked={useDefaultClubs} 
            onChange={() => setUseDefaultClubs(true)}
            style={{ marginRight: '10px' }}
          />
          Use default club set
        </label>
        <p style={{ fontSize: '0.9rem', color: '#666', marginLeft: '25px', marginBottom: '15px' }}>
          We'll set up a standard set of clubs for you based on common distances. You can customize this later.
        </p>
        
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="radio" 
            name="clubSetup" 
            checked={!useDefaultClubs} 
            onChange={() => setUseDefaultClubs(false)}
            style={{ marginRight: '10px' }}
          />
          Customize my clubs now
        </label>
        <p style={{ fontSize: '0.9rem', color: '#666', marginLeft: '25px' }}>
          Take a few minutes to set up your exact clubs with your typical distances.
        </p>
      </div>
      
      {!useDefaultClubs && (
        <ClubBag isFirstTimeSetup={true} onComplete={handleClubSetupComplete} />
      )}
      
      {useDefaultClubs && (
        <div className="default-clubs-preview" style={{ marginBottom: '20px' }}>
          <h3>Default Club Set</h3>
          <p>This is the standard set of clubs we'll set up for you:</p>
          
          <div style={{ height: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '5px', padding: '10px', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Club</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #ddd' }}>Distance (yards)</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_CLUBS.map(club => (
                  <tr key={club.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{club.name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{club.type}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{club.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="button-group" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <button 
              className="button" 
              onClick={handleBackStep}
              style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
            >
              Back
            </button>
            <button 
              className="button" 
              onClick={handleNextStep}
              style={{ padding: '10px 20px' }}
            >
              Accept Default Clubs
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render completion step
  const renderCompletionStep = () => (
    <div className="completion-step">
      <h2>You're All Set!</h2>
      
      <div style={{ padding: '20px', backgroundColor: '#e1f5fe', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '15px' }}>
          Your profile has been created and your golf bag has been set up.
        </p>
        <p>
          You're now ready to start analyzing your golf swing with Golf Guru!
        </p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>What's Next?</h3>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Upload your first swing video for AI analysis</li>
          <li>Track your progress over time</li>
          <li>Compare your swing with pro golfers</li>
          <li>Get personalized recommendations to improve your game</li>
        </ul>
      </div>
      
      <div className="button-group" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
        <button 
          className="button" 
          onClick={handleBackStep}
          style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
        >
          Back
        </button>
        <button 
          className="button" 
          onClick={handleComplete}
          disabled={saving}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#27ae60', 
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Finishing Setup...' : 'Start Using Golf Guru'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginTop: '15px' 
        }}>
          {error}
        </div>
      )}
    </div>
  );

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="setup-progress" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
      {[1, 2, 3].map((stepNumber) => (
        <div 
          key={stepNumber}
          className={`step-indicator ${step >= stepNumber ? 'active' : ''}`}
          style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '50%', 
            backgroundColor: step >= stepNumber ? '#3498db' : '#ddd',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 5px',
            position: 'relative'
          }}
        >
          {stepNumber}
          {stepNumber < 3 && (
            <div style={{ 
              position: 'absolute', 
              right: '-20px', 
              top: '50%', 
              height: '2px', 
              width: '30px', 
              backgroundColor: step > stepNumber ? '#3498db' : '#ddd',
              transform: 'translateY(-50%)'
            }} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="profile-setup-modal">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Set Up Your Golf Guru Profile</h2>
      </div>
      
      {renderStepIndicator()}
      
      {step === 1 && renderProfileStep()}
      {step === 2 && renderClubStep()}
      {step === 3 && renderCompletionStep()}
    </div>
  );
};

export default ProfileSetupModal;