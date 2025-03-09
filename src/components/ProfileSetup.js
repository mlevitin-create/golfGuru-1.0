import React, { useState } from 'react';
import DateSelector from './DateSelector';

// Component for profile setup that includes historical swing settings
const ProfileSetup = ({ onComplete, currentUserData = {} }) => {
  const [profileData, setProfileData] = useState({
    name: currentUserData.name || '',
    experience: currentUserData.experience || 'intermediate',
    playFrequency: currentUserData.playFrequency || 'monthly',
    handicap: currentUserData.handicap || '',
    allowHistoricalSwings: currentUserData.allowHistoricalSwings !== false // Default to true
  });
  
  const [defaultSwingDate, setDefaultSwingDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle date change
  const handleDateChange = (date) => {
    setDefaultSwingDate(date);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Include the default swing date in the profile data
    const completeData = {
      ...profileData,
      defaultSwingDate: defaultSwingDate,
      setupCompleted: true
    };
    
    // Call the onComplete callback
    onComplete(completeData);
  };

  return (
    <div className="profile-setup">
      <h2>Complete Your Profile</h2>
      <p>Set up your profile to get the most out of Golf Guru</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Name</label>
          <input 
            type="text" 
            id="name"
            name="name"
            value={profileData.name}
            onChange={handleInputChange}
            placeholder="Your name"
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
            placeholder="Your handicap"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          />
        </div>
        
        {/* Historical Swings Section */}
        <div className="historical-swings-section" style={{ 
          marginTop: '25px', 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '10px' }}>Historical Swing Tracking</h3>
          
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
          
          {profileData.allowHistoricalSwings && (
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Default Date for Historical Swings:</label>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                When uploading older videos, we'll suggest this date as the starting point. You can adjust it for each upload.
              </p>
              
              <DateSelector 
                initialDate={defaultSwingDate}
                onDateChange={handleDateChange}
                extractFromFile={false}
              />
            </div>
          )}
        </div>
        
        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button 
            type="submit"
            className="button"
            disabled={isSubmitting}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Complete Setup'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSetup;