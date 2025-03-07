// src/services/localStorageService.js
// Fallback service that uses browser localStorage when Firestore isn't available

const STORAGE_KEY = 'golfguru_swings';

// Get all swings from localStorage
const getSwings = () => {
  try {
    const swingsJson = localStorage.getItem(STORAGE_KEY);
    return swingsJson ? JSON.parse(swingsJson) : [];
  } catch (error) {
    console.error('Error getting swings from localStorage:', error);
    return [];
  }
};

// Save a swing to localStorage
const saveSwing = (swingData) => {
  try {
    const swings = getSwings();
    const newSwing = {
      ...swingData,
      id: `local_${Date.now()}`,
      date: new Date().toISOString(),
      _isLocal: true
    };
    
    swings.unshift(newSwing); // Add to beginning of array
    localStorage.setItem(STORAGE_KEY, JSON.stringify(swings));
    
    return newSwing;
  } catch (error) {
    console.error('Error saving swing to localStorage:', error);
    throw error;
  }
};

export default {
  getSwings,
  saveSwing
};