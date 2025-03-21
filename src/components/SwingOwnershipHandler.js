// src/components/SwingOwnershipHandler.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component for handling different swing ownership scenarios with optimized storage
 * @param {Object} props 
 * @param {Object} props.swingData - The analyzed swing data
 * @returns {Object} Functions and UI components for ownership handling
 */
const SwingOwnershipHandler = ({ swingData }) => {
  const { currentUser } = useAuth();
  
  // Determine ownership type
  const isUserOwnSwing = swingData?.swingOwnership === 'self';
  const isFriendSwing = swingData?.swingOwnership === 'other';
  const isProSwing = swingData?.swingOwnership === 'pro';
  
  // Render ownership badge
  const renderOwnershipBadge = () => {
    if (isProSwing) {
      return (
        <div style={{
          display: 'inline-block',
          background: '#f0f7ff',
          color: '#1e88e5',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          marginBottom: '10px'
        }}>
          Professional Golfer {swingData.proGolferName ? `- ${swingData.proGolferName}` : ''}
        </div>
      );
    } else if (isFriendSwing) {
      return (
        <div style={{
          display: 'inline-block',
          background: '#f0f4e8',
          color: '#689f38',
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          marginBottom: '10px'
        }}>
          Friend's Swing
        </div>
      );
    }
    
    return null;
  };
  
  // Non-user swing storage message
  const renderStorageMessage = () => {
    if (!currentUser) return null;
    
    if (isFriendSwing || isProSwing) {
      return (
        <div style={{
          background: '#e8f5e9',
          color: '#2e7d32',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px',
          fontSize: '0.9rem'
        }}>
          <strong>Storage optimized:</strong> This {isFriendSwing ? "friend's" : "pro golfer's"} swing analysis is available 
          for reference without consuming your storage space.
        </div>
      );
    }
    
    return null;
  };
  
  // Return interface for use in parent components
  return {
    isUserOwnSwing,
    isFriendSwing,
    isProSwing,
    renderOwnershipBadge,
    renderStorageMessage
  };
};

export default SwingOwnershipHandler;