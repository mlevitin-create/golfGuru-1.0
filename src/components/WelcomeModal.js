// src/components/WelcomeModal.js
import React from 'react';
import Login from './Login';

const WelcomeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{
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
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="welcome-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2>Welcome to Golf Guru</h2>
          <p>Your personal AI golf coach to help improve your swing</p>
        </div>
        
        <div className="welcome-message" style={{ marginBottom: '20px' }}>
          <p>If you'd like to track your progress over time, please sign in to continue.</p>
          <p>To try out the Golf Guru Swing Analyzer without an account, click "Skip for now".</p>
        </div>
        
        <Login onClose={onClose} allowSkip={true} />
      </div>
    </div>
  );
};

export default WelcomeModal;