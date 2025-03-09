// src/services/firestoreService.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  //limit, 
  serverTimestamp,
  setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';

// Collection name constants
const SWINGS_COLLECTION = 'swings';
const USERS_COLLECTION = 'users';

/**
 * Save swing analysis data to Firestore
 * @param {Object} swingData - The swing analysis data
 * @param {String} userId - The user ID
 * @param {File} videoFile - The original video file
 * @param {Object} metadata - Optional metadata (club, date, etc.)
 * @returns {Promise<Object>} The saved swing data with Firestore ID
 */
const saveSwingAnalysis = async (swingData, userId, videoFile, metadata = null) => {
  try {
    console.log('Starting to save swing analysis to Firestore');
    
    // Create local URL for the video file regardless of storage success
    const localVideoUrl = URL.createObjectURL(videoFile);
    
    // Extract recordedDate from metadata if available
    const recordedDate = metadata?.recordedDate ? 
      new Date(metadata.recordedDate) : 
      (swingData.recordedDate ? new Date(swingData.recordedDate) : new Date());
    
    // Prepare basic swing data with local video URL as fallback
    let swingToSave = {
      ...swingData,
      userId,
      videoUrl: localVideoUrl,  // Use local URL initially
      originalVideoName: videoFile.name,
      recordedDate, // When the swing was actually performed
      created: new Date(), // When the analysis was performed
      updated: new Date(),
      // Flag to indicate this is stored locally only
      _isLocalOnly: true
    };
    
    // Add club data if provided
    if (metadata) {
      if (metadata.clubId) swingToSave.clubId = metadata.clubId;
      if (metadata.clubName) swingToSave.clubName = metadata.clubName;
      if (metadata.clubType) swingToSave.clubType = metadata.clubType;
      if (metadata.outcome) swingToSave.outcome = metadata.outcome;
    }
    
    try {
      // Try to upload to Firebase Storage
      console.log('Uploading video to Firebase Storage...');
      // Ensure we're using the correct path structure that matches the rules
      const videoRef = ref(storage, `swings/${userId}/${Date.now()}_${videoFile.name}`);
      
      try {
        const uploadResult = await uploadBytes(videoRef, videoFile);
        const videoUrl = await getDownloadURL(uploadResult.ref);
        
        console.log('Video uploaded successfully, got URL:', videoUrl);
        
        // Update the video URL with the Firebase Storage URL
        swingToSave.videoUrl = videoUrl;
        swingToSave._isLocalOnly = false;
      } catch (storageError) {
        console.error('Error uploading to Firebase Storage:', storageError);
        console.log('Continuing with local video URL only');
      }
      
      try {
        // Try to save to Firestore
        console.log('Saving swing data to Firestore...');
        
        // Use a try/catch in case Firestore is offline
        try {
          // With this (using the v9 SDK style):
          const testDocRef = doc(db, 'swings', 'test');
          try {
            await getDoc(testDocRef);
            console.log('Firestore connection test successful');
          } catch (connectionError) {
            console.error('Firestore connection test failed:', connectionError);
            throw new Error('Firestore is offline');
          }
          console.log('Firestore connection test successful');
        } catch (connectionError) {
          console.error('Firestore connection test failed:', connectionError);
          throw new Error('Firestore is offline');
        }
        
        const docRef = await addDoc(collection(db, 'swings'), {
          ...swingToSave,
          recordedDate: swingToSave.recordedDate, // Ensure this is stored in Firestore
          created: serverTimestamp(),
          updated: serverTimestamp()
        });
        
        console.log('Swing data saved to Firestore with ID:', docRef.id);
        
        // Try to update user stats, but don't block on failure
        try {
          await updateUserStats(userId);
        } catch (statsError) {
          console.error('Non-critical error updating user stats:', statsError);
        }
        
        return {
          id: docRef.id,
          ...swingToSave
        };
      } catch (firestoreError) {
        console.error('Error saving to Firestore:', firestoreError);
        // Continue with local version if Firestore fails
        console.log('Continuing with local storage only');
        throw firestoreError;
      }
    } catch (error) {
      console.error('Error in Firebase operations:', error);
      // Fall back to local storage
      console.log('Using localStorage fallback for swing data');
      
      // Import and use localStorage service
      const localStorageService = await import('./localStorageService').then(m => m.default);
      const savedLocalSwing = localStorageService.saveSwing({
        ...swingData,
        userId,
        videoUrl: localVideoUrl,
        recordedDate
      });
      
      return savedLocalSwing;
    }
  } catch (finalError) {
    console.error('Final fallback - saving to memory only:', finalError);
    
    // Absolute final fallback - just return the data with a generated ID
    return {
      id: 'memory_' + Date.now(),
      ...swingData,
      userId,
      videoUrl: URL.createObjectURL(videoFile),
      recordedDate: metadata?.recordedDate ? new Date(metadata.recordedDate) : new Date(),
      created: new Date(),
      updated: new Date(),
      _isMemoryOnly: true
    };
  }
};

/**
 * Get all swing analyses for a user
 * @param {String} userId - The user ID
 * @param {Boolean} orderByRecordedDate - If true, order by recorded date instead of analysis date
 * @returns {Promise<Array>} Array of swing analyses
 */
const getUserSwings = async (userId, orderByRecordedDate = true) => {
  try {
    // Create query based on ordering preference
    const q = query(
      collection(db, SWINGS_COLLECTION),
      where('userId', '==', userId),
      orderBy(orderByRecordedDate ? 'recordedDate' : 'created', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to regular Date objects
      created: doc.data().created?.toDate(),
      updated: doc.data().updated?.toDate(),
      recordedDate: doc.data().recordedDate?.toDate() || doc.data().created?.toDate()
    }));
  } catch (error) {
    console.error('Error getting user swings:', error);
    throw error;
  }
};

/**
 * Get a single swing analysis by ID
 * @param {String} swingId - The swing document ID
 * @returns {Promise<Object>} The swing analysis data
 */
const getSwingById = async (swingId) => {
  try {
    const swingDoc = await getDoc(doc(db, SWINGS_COLLECTION, swingId));
    
    if (!swingDoc.exists()) {
      throw new Error('Swing not found');
    }
    
    const data = swingDoc.data();
    
    return {
      id: swingDoc.id,
      ...data,
      created: data.created?.toDate(),
      updated: data.updated?.toDate(),
      recordedDate: data.recordedDate?.toDate() || data.created?.toDate()
    };
  } catch (error) {
    console.error('Error getting swing by ID:', error);
    throw error;
  }
};

/**
 * Delete a swing analysis and its associated video file
 * @param {String} swingId - The swing document ID
 * @param {String} userId - The user ID (for security check)
 * @returns {Promise<Object>} Success status
 */
const deleteSwing = async (swingId, userId) => {
  try {
    console.log('Attempting to delete swing with ID:', swingId);
    
    // Try multiple approaches to find the swing document
    let swingData = null;
    let docId = null;
    
    // First try direct document lookup
    try {
      const directDoc = await getDoc(doc(db, SWINGS_COLLECTION, swingId));
      if (directDoc.exists()) {
        swingData = directDoc.data();
        docId = swingId;
        console.log('Found swing using direct document ID');
      }
    } catch (directError) {
      console.log('Direct document lookup failed, trying query:', directError);
    }
    
    // If direct lookup fails, try querying by the field with the provided ID
    if (!swingData) {
      try {
        const q = query(
          collection(db, SWINGS_COLLECTION),
          where('userId', '==', userId),
          where('id', '==', swingId)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          swingData = doc.data();
          docId = doc.id;
          console.log('Found swing using query by id field:', docId);
        }
      } catch (queryError) {
        console.log('Query by id field failed:', queryError);
      }
    }
    
    // If both approaches fail, try querying all user swings
    if (!swingData) {
      try {
        const userSwingsQuery = query(
          collection(db, SWINGS_COLLECTION),
          where('userId', '==', userId)
        );
        
        const allSwings = await getDocs(userSwingsQuery);
        console.log(`Found ${allSwings.size} swings for user`);
        
        // Check each document
        allSwings.forEach(doc => {
          const data = doc.data();
          console.log(`Checking swing with ID ${doc.id}, data:`, data);
          if (doc.id === swingId || (data.id && data.id === swingId)) {
            swingData = data;
            docId = doc.id;
            console.log('Found matching swing:', docId);
          }
        });
      } catch (allSwingsError) {
        console.error('Error querying all user swings:', allSwingsError);
      }
    }
    
    if (!swingData || !docId) {
      console.error('Swing document not found after multiple attempts');
      throw new Error('Swing not found');
    }
    
    // Security check - ensure the user owns this swing
    if (swingData.userId !== userId) {
      console.error('User does not own this swing');
      throw new Error('Unauthorized access');
    }
    
    // Delete from Firestore
    await deleteDoc(doc(db, SWINGS_COLLECTION, docId));
    console.log('Swing document deleted successfully:', docId);
    
    // Attempt to delete the video file from Storage
    let storageDeleteAttempted = false;
    let storageDeleteSuccess = false;
    
    // Try using videoUrl if available
    if (swingData.videoUrl && swingData.videoUrl.includes('firebasestorage.googleapis.com')) {
      storageDeleteAttempted = true;
      try {
        // Extract storage path from URL
        const videoUrlObj = new URL(swingData.videoUrl);
        const storagePath = decodeURIComponent(videoUrlObj.pathname.split('/o/')[1]?.split('?')[0]);
        
        if (storagePath) {
          console.log('Deleting video from storage using URL path:', storagePath);
          const videoRef = ref(storage, storagePath);
          await deleteObject(videoRef);
          console.log('Video deleted from storage successfully');
          storageDeleteSuccess = true;
        }
      } catch (storageError) {
        console.error('Error deleting video using URL:', storageError);
      }
    }
    
    // Try using videoStoragePath if available and previous attempt failed
    if (!storageDeleteSuccess && swingData.videoStoragePath) {
      storageDeleteAttempted = true;
      try {
        console.log('Deleting video using direct storage path:', swingData.videoStoragePath);
        const videoRef = ref(storage, swingData.videoStoragePath);
        await deleteObject(videoRef);
        console.log('Video deleted from storage successfully');
        storageDeleteSuccess = true;
      } catch (pathError) {
        console.error('Error deleting video using direct path:', pathError);
      }
    }
    
    // Try a constructed path based on userId and timestamp
    if (!storageDeleteSuccess && swingData.created) {
      storageDeleteAttempted = true;
      try {
        // Construct a path based on the pattern used in saveSwingAnalysis
        let timestamp;
        if (swingData.created.toDate) {
          timestamp = swingData.created.toDate().getTime();
        } else if (swingData.created.seconds) {
          timestamp = swingData.created.seconds * 1000;
        } else if (swingData.created instanceof Date) {
          timestamp = swingData.created.getTime();
        } else {
          timestamp = new Date(swingData.created).getTime();
        }
        
        if (swingData.originalVideoName && timestamp) {
          const constructedPath = `swings/${userId}/${timestamp}_${swingData.originalVideoName}`;
          console.log('Trying constructed path:', constructedPath);
          const videoRef = ref(storage, constructedPath);
          await deleteObject(videoRef);
          console.log('Video deleted from storage using constructed path');
          storageDeleteSuccess = true;
        }
      } catch (constructError) {
        console.error('Error deleting video using constructed path:', constructError);
      }
    }
    
    if (storageDeleteAttempted && !storageDeleteSuccess) {
      console.warn('Attempted to delete video from storage but failed');
      return { success: true, warning: 'Swing deleted but video file removal failed' };
    } else if (!storageDeleteAttempted) {
      console.log('No storage delete attempted - no suitable video URL or path found');
    }
    
    // Try to update user stats after deletion
    try {
      await updateUserStats(userId);
    } catch (statsError) {
      console.error('Non-critical error updating user stats after deletion:', statsError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteSwing function:', error);
    throw error;
  }
};

/**
 * Calculate consecutive days of practice
 * @param {Array} swings - Array of swings with effectiveDate property
 * @returns {number} Number of consecutive days practiced up to today
 */
const calculateConsecutiveDays = (swings) => {
  if (!swings || swings.length === 0) return 0;
  
  // Get unique dates (normalized to day precision, no time)
  const uniqueDates = new Set();
  swings.forEach(swing => {
    const date = swing.effectiveDate;
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    uniqueDates.add(normalizedDate.getTime());
  });
  
  const sortedDates = Array.from(uniqueDates)
    .map(timestamp => new Date(timestamp))
    .sort((a, b) => b - a); // Sort in descending order (newest first)
  
  // Check if most recent swing is today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If most recent date isn't today, return 0
  if (sortedDates.length === 0 || sortedDates[0].getTime() !== today.getTime()) return 0;
  
  let consecutiveDays = 1; // Start with today
  
  // Count consecutive days
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = sortedDates[i];
    const nextDate = sortedDates[i+1];
    
    const oneDayBefore = new Date(currentDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    if (oneDayBefore.getTime() === nextDate.getTime()) {
      // This is the previous consecutive day
      consecutiveDays++;
    } else {
      // Streak is broken
      break;
    }
  }
  
  return consecutiveDays;
};

/**
 * Update user statistics in Firestore
 * @param {String} userId - The user ID
 * @returns {Promise<void>}
 */
const updateUserStats = async (userId) => {
  try {
    // Get count of user's swings
    const q = query(
      collection(db, SWINGS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const swingCount = querySnapshot.size;
    
    // Calculate average score
    let totalScore = 0;
    let latestScore = 0;
    let earliestScore = 0;
    
    const swings = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        // Prioritize recordedDate over created date for historical tracking
        const effectiveDate = data.recordedDate?.toDate() || data.created?.toDate() || new Date();
        return {
          ...data,
          effectiveDate
        };
      })
      .sort((a, b) => a.effectiveDate - b.effectiveDate);
    
    if (swings.length > 0) {
      swings.forEach(swing => {
        totalScore += swing.overallScore;
      });
      
      earliestScore = swings[0].overallScore;
      latestScore = swings[swings.length - 1].overallScore;
    }
    
    const averageScore = swingCount > 0 ? totalScore / swingCount : 0;
    const improvement = swingCount > 1 ? latestScore - earliestScore : 0;

    // Calculate club usage statistics
    const clubUsage = {};
    const outcomes = {};
    
    swings.forEach(swing => {
      // Count club usage
      if (swing.clubName) {
        clubUsage[swing.clubName] = (clubUsage[swing.clubName] || 0) + 1;
      }
      
      // Count outcomes
      if (swing.outcome) {
        outcomes[swing.outcome] = (outcomes[swing.outcome] || 0) + 1;
      }
    });
    
    // Calculate consecutive days streak
    const consecutiveDays = calculateConsecutiveDays(swings);
    
    // Get or create user stats document
    const userStatsRef = doc(db, USERS_COLLECTION, userId);
    const userStatsDoc = await getDoc(userStatsRef);
    
    if (userStatsDoc.exists()) {
      await updateDoc(userStatsRef, {
        swingCount,
        averageScore,
        improvement,
        improvementPercentage: earliestScore > 0 ? (improvement / earliestScore) * 100 : 0,
        clubUsage,
        outcomes,
        consecutiveDays,
        updated: serverTimestamp()
      });
    } else {
      // Create new user stats document
      await setDoc(userStatsRef, {
        userId,
        swingCount,
        averageScore,
        improvement,
        improvementPercentage: 0,
        clubUsage,
        outcomes,
        consecutiveDays,
        created: serverTimestamp(),
        updated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    // Don't throw here to prevent blocking the main operation
  }
};

/**
 * Get user statistics
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async (userId) => {
  try {
    const userStatsDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    
    if (!userStatsDoc.exists()) {
      // No stats yet, calculate them now
      await updateUserStats(userId);
      const freshStats = await getDoc(doc(db, USERS_COLLECTION, userId));
      
      if (!freshStats.exists()) {
        return {
          swingCount: 0,
          averageScore: 0,
          improvement: 0,
          improvementPercentage: 0,
          clubUsage: {},
          outcomes: {},
          consecutiveDays: 0
        };
      }
      
      return {
        ...freshStats.data(),
        created: freshStats.data().created?.toDate(),
        updated: freshStats.data().updated?.toDate()
      };
    }
    
    return {
      ...userStatsDoc.data(),
      created: userStatsDoc.data().created?.toDate(),
      updated: userStatsDoc.data().updated?.toDate()
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

/**
 * Get user's clubs from Firestore
 * @param {String} userId - The user ID
 * @returns {Promise<Array>} Array of club objects
 */
const getUserClubs = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists() && docSnap.data().clubs) {
      return docSnap.data().clubs;
    }
    return [];
  } catch (error) {
    console.error('Error getting user clubs:', error);
    throw error;
  }
};

/**
 * Save user's clubs to Firestore
 * @param {String} userId - The user ID
 * @param {Array} clubs - Array of club objects
 * @returns {Promise<boolean>} Success status
 */
const saveUserClubs = async (userId, clubs) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      // Update existing user document
      await updateDoc(userDocRef, { 
        clubs,
        updated: serverTimestamp()
      });
    } else {
      // Create new user document
      await setDoc(userDocRef, { 
        clubs,
        created: serverTimestamp(),
        updated: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error saving user clubs:', error);
    throw error;
  }
};

/**
 * Get club-specific swing data for a user
 * @param {String} userId - The user ID
 * @param {String} clubId - The club ID
 * @param {Boolean} orderByRecordedDate - If true, order by recorded date instead of analysis date
 * @returns {Promise<Array>} Array of swing data for the specified club
 */
const getClubSwingData = async (userId, clubId, orderByRecordedDate = true) => {
  try {
    const swingsRef = collection(db, SWINGS_COLLECTION);
    const q = query(
      swingsRef, 
      where('userId', '==', userId),
      where('clubId', '==', clubId),
      orderBy(orderByRecordedDate ? 'recordedDate' : 'created', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const swings = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      swings.push({
        id: doc.id,
        ...data,
        created: data.created?.toDate(), // Convert Firestore timestamp to JS Date
        updated: data.updated?.toDate(),
        recordedDate: data.recordedDate?.toDate() || data.created?.toDate()
      });
    });
    
    return swings;
  } catch (error) {
    console.error('Error getting club swing data:', error);
    throw error;
  }
};

/**
 * Get or create user profile data
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User profile data
 */
const getUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        created: data.created?.toDate(),
        updated: data.updated?.toDate(),
        // Convert recordedDate if present
        defaultSwingDate: data.defaultSwingDate?.toDate?.() || data.defaultSwingDate,
        // Ensure allowHistoricalSwings has a default value
        allowHistoricalSwings: data.allowHistoricalSwings !== false
      };
    }
    
    // No profile exists yet
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Save user profile data
 * @param {String} userId - The user ID
 * @param {Object} profileData - The profile data to save
 * @returns {Promise<Object>} Updated profile data
 */
const saveUserProfile = async (userId, profileData) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userDocRef);
    
    // Process dates in profile data
    const processedData = { ...profileData };
    
    if (processedData.defaultSwingDate) {
      // Ensure defaultSwingDate is a Date object for Firestore
      processedData.defaultSwingDate = 
        processedData.defaultSwingDate instanceof Date 
          ? processedData.defaultSwingDate 
          : new Date(processedData.defaultSwingDate);
    }
    
    if (docSnap.exists()) {
      // Update existing profile
      await updateDoc(userDocRef, {
        ...processedData,
        updated: serverTimestamp()
      });
    } else {
      // Create new profile
      await setDoc(userDocRef, {
        ...processedData,
        created: serverTimestamp(),
        updated: serverTimestamp()
      });
    }
    
    return {
      ...processedData,
      updated: new Date()
    };
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

/**
 * Get a user's data
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User data
 */
const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        created: data.created?.toDate(),
        updated: data.updated?.toDate(),
        // Convert any date fields
        defaultSwingDate: data.defaultSwingDate?.toDate?.() || data.defaultSwingDate,
        // Set default values for optional fields
        allowHistoricalSwings: data.allowHistoricalSwings !== false
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Get user swings grouped by date
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} Object with dates as keys and arrays of swings as values
 */
const getSwingsByDate = async (userId) => {
  try {
    // Get all user swings
    const swings = await getUserSwings(userId, true); // Order by recordedDate
    
    // Group by date (ignoring time)
    const swingsByDate = {};
    swings.forEach(swing => {
      const recordedDate = swing.recordedDate instanceof Date ? 
        swing.recordedDate : new Date(swing.recordedDate);
      
      const dateKey = recordedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!swingsByDate[dateKey]) {
        swingsByDate[dateKey] = [];
      }
      
      swingsByDate[dateKey].push(swing);
    });
    
    return swingsByDate;
  } catch (error) {
    console.error('Error getting swings by date:', error);
    throw error;
  }
};

// Export all functions
export default {
  saveSwingAnalysis,
  getUserSwings,
  getSwingById,
  deleteSwing,
  getUserStats,
  getUserClubs,
  saveUserClubs,
  getClubSwingData,
  getUserProfile,
  saveUserProfile,
  getUserData,
  getSwingsByDate
};