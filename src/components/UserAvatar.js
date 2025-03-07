// src/components/UserAvatar.js
import React, { useState } from 'react';

const UserAvatar = ({ user, size = 35 }) => {
  const [imageError, setImageError] = useState(false);
  
  // Get first initial from display name or email
  const getInitial = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U'; // Default fallback
  };
  
  // Handle image loading error
  const handleImageError = () => {
    setImageError(true);
  };
  
  // If no photo URL or image failed to load, show initial avatar
  if (!user.photoURL || imageError) {
    return (
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: '#3498db',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: `${size * 0.5}px`,
          border: '2px solid white'
        }}
      >
        {getInitial()}
      </div>
    );
  }
  
  // Otherwise show the profile image
  return (
    <img 
      src={user.photoURL} 
      alt={user.displayName || 'User'} 
      onError={handleImageError}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '2px solid white',
        objectFit: 'cover'
      }}
    />
  );
};

export default UserAvatar;