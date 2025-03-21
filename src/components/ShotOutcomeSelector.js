import React from 'react';

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

const ShotOutcomeSelector = ({ selectedOutcome, onOutcomeChange, disabled = false }) => {
  return (
    <div className="outcome-selection" style={{ marginBottom: '20px' }}>
      <label htmlFor="outcome-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        What was the shot outcome? <span style={{ fontWeight: 'normal', color: '#666' }}>(optional)</span>
      </label>
      
      <select 
        id="outcome-select"
        value={selectedOutcome || ''}
        onChange={(e) => onOutcomeChange(e.target.value)}
        style={{ 
          width: '100%', 
          padding: '10px', 
          borderRadius: '5px', 
          border: '1px solid #ddd',
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        disabled={disabled}
      >
        <option value="">-- Select an outcome --</option>
        {SHOT_OUTCOMES.map(outcome => (
          <option key={outcome.id} value={outcome.id}>
            {outcome.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ShotOutcomeSelector;