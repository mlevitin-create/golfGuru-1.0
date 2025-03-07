// src/components/SetupFlow.js
import React, { useState } from 'react';
import ClubBag from './ClubBag';
import { useAuth } from '../contexts/AuthContext';

const SetupFlow = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: currentUser?.displayName || '',
    experience: 'intermediate', // beginner, intermediate, advanced
    playFrequency: 'monthly', // weekly, monthly, occasionally
    handicap: '',
    clubs: []
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleClubSetupComplete = (clubs) => {
    setUserData(prev => ({ ...prev, clubs }));
    handleNextStep();
  };

  const handleNextStep = () => {
    if (step === 3) {
      onComplete(userData);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="setup-step">
            <h2>Welcome to Golf Guru!</h2>
            <p>Let's set up your profile to get the most out of your swing analysis.</p>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Your Name</label>
              <input 
                type="text" 
                id="name"
                name="name"
                value={userData.name}
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
              <label htmlFor="handicap" style={{ display: 'block', marginBottom: '5px' }}>Handicap (optional)</label>
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
            
            <button 
              className="button"
              onClick={handleNextStep}
              style={{ padding: '12px 24px', marginTop: '10px' }}
            >
              Continue
            </button>
          </div>
        );
      
      case 2:
        return (
          <div className="setup-step">
            <ClubBag isFirstTimeSetup={true} onComplete={handleClubSetupComplete} />
          </div>
        );
      
      case 3:
        return (
          <div className="setup-step">
            <h2>You're All Set!</h2>
            <p>Your profile has been created and you're ready to start analyzing your golf swing.</p>
            <p>Upload your first swing video to get started with personalized feedback.</p>
            
            <button 
              className="button"
              onClick={handleNextStep}
              style={{ padding: '12px 24px', marginTop: '20px' }}
            >
              Start Using Golf Guru
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="setup-flow">
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
      
      {renderStep()}
    </div>
  );
};

export default SetupFlow;