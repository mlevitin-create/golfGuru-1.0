// src/components/SwingOwnershipSelector.js
import React, { useState } from 'react';

/**
 * Component to select who is in the uploaded swing video
 * @param {function} onContinue - Function to call with ownership data when continuing
 * @param {function} onBack - Function to go back to previous step
 * @returns {JSX.Element}
 */
const SwingOwnershipSelector = ({ onContinue, onBack }) => {
  const [ownership, setOwnership] = useState('self');
  const [proName, setProName] = useState('');
  const [isOtherPro, setIsOtherPro] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = () => {
    // Validate pro name if professional is selected
    if (ownership === 'pro' && !proName.trim() && !isOtherPro) {
      setError('Please enter the professional golfer\'s name or select "Other pro golfer"');
      return;
    }

    // Clear any errors
    setError(null);

    // Prepare data for the parent component
    const ownershipData = {
      swingOwnership: ownership,
      proGolferName: ownership === 'pro' && !isOtherPro ? proName.trim() : null,
      isUnknownPro: ownership === 'pro' && isOtherPro
    };

    // Call the continue callback with the ownership data
    onContinue(ownershipData);
  };

  return (
    <div className="card">
      <h2>Who is in this swing video?</h2>
      <p>This helps us apply the right analysis approach to the swing</p>

      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      <div className="ownership-options" style={{ marginBottom: '20px' }}>
        <div 
          className={`ownership-option ${ownership === 'self' ? 'selected' : ''}`}
          onClick={() => setOwnership('self')}
          style={{
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${ownership === 'self' ? '#3498db' : '#ddd'}`,
            backgroundColor: ownership === 'self' ? '#f0f7ff' : '#fff',
            marginBottom: '10px',
            cursor: 'pointer'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="radio"
              name="ownership"
              value="self"
              checked={ownership === 'self'}
              onChange={() => setOwnership('self')}
              style={{ marginRight: '10px' }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>Me (my own swing)</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>
                This is a video of my golf swing
              </div>
            </div>
          </label>
        </div>

        <div 
          className={`ownership-option ${ownership === 'other' ? 'selected' : ''}`}
          onClick={() => setOwnership('other')}
          style={{
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${ownership === 'other' ? '#3498db' : '#ddd'}`,
            backgroundColor: ownership === 'other' ? '#f0f7ff' : '#fff',
            marginBottom: '10px',
            cursor: 'pointer'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="radio"
              name="ownership"
              value="other"
              checked={ownership === 'other'}
              onChange={() => setOwnership('other')}
              style={{ marginRight: '10px' }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>A friend or student</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>
                This is someone else's swing (not a pro golfer)
              </div>
            </div>
          </label>
        </div>

        <div 
          className={`ownership-option ${ownership === 'pro' ? 'selected' : ''}`}
          onClick={() => setOwnership('pro')}
          style={{
            padding: '15px',
            borderRadius: '8px',
            border: `2px solid ${ownership === 'pro' ? '#3498db' : '#ddd'}`,
            backgroundColor: ownership === 'pro' ? '#f0f7ff' : '#fff',
            marginBottom: '10px',
            cursor: 'pointer'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
              type="radio"
              name="ownership"
              value="pro"
              checked={ownership === 'pro'}
              onChange={() => setOwnership('pro')}
              style={{ marginRight: '10px' }}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>A professional golfer</div>
              <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>
                This is a professional golfer's swing
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Pro golfer name input (only shown if "pro" is selected) */}
      {ownership === 'pro' && (
        <div className="pro-golfer-details" style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="pro-name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Professional Golfer's Name:
            </label>
            <input
              id="pro-name"
              type="text"
              value={proName}
              onChange={(e) => setProName(e.target.value)}
              disabled={isOtherPro}
              placeholder="e.g., Tiger Woods, Rory McIlroy"
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '5px', 
                border: '1px solid #ddd',
                opacity: isOtherPro ? 0.7 : 1
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isOtherPro}
                onChange={() => setIsOtherPro(!isOtherPro)}
                style={{ marginRight: '10px' }}
              />
              Other pro golfer / Name unknown
            </label>
          </div>
        </div>
      )}

      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          className="button"
          style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="button"
          style={{ padding: '10px 20px' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SwingOwnershipSelector;