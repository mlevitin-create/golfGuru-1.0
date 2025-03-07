// src/components/WelcomeModal.js
import React from 'react';
import Login from './Login';

const WelcomeModal = ({ onClose, onSetup }) => {
  return (
    <>
      <div className="welcome-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>Welcome to Golf Guru</h2>
        <p>Your personal AI golf coach to help improve your swing</p>
      </div>
      
      <div className="welcome-message" style={{ marginBottom: '20px' }}>
        <p>If you'd like to track your progress over time, please sign in to continue.</p>
        <p>To try out the Golf Guru Swing Analyzer without an account, click "Skip for now".</p>
      </div>
      
      <Login onClose={onClose} allowSkip={true} />
    </>
  );
};

export default WelcomeModal;