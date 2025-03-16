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
  limit, 
  serverTimestamp,
  setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';

// Collection name constants
const SWINGS_COLLECTION = 'swings';
const USERS_COLLECTION = 'users';

/**
 * Upload a video file to Firebase Storage
 * @param {String} userId - The user ID
 * @param {File} videoFile - The video file to upload
 * @returns {Promise<String>} The video URL
 */
const uploadVideo = async (userId, videoFile) => {
  try {
    // Create a reference to the file in Firebase Storage
    const videoRef = ref(storage, `swings/${userId}/${Date.now()}_${videoFile.name}`);
    
    // Upload the file
    const uploadResult = await uploadBytes(videoRef, videoFile);
    
    // Get the download URL
    const videoUrl = await getDownloadURL(uploadResult.ref);
    
    return videoUrl;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

/**
 * Save a swing analysis to Firestore
 * @param {Object} analysisData - The swing analysis data
 * @param {string} userId - The user ID
 * @param {File} videoFile - The video file (null for YouTube videos)
 * @param {Object} metadata - Additional metadata (club, date, YouTube info, ownership, etc.)
 * @returns {Promise<Object>} The saved swing data with ID
 */
const saveSwingAnalysis = async (analysisData, userId, videoFile, metadata = null) => {
  try {
    let videoUrl;
    
    // Determine if this is a YouTube video or file upload
    const isYouTubeAnalysis = !videoFile && metadata?.youtubeVideo;
    
    if (isYouTubeAnalysis) {
      // For YouTube videos, use the embed URL directly
      videoUrl = metadata.youtubeVideo.embedUrl;
      console.log('Using YouTube video URL:', videoUrl);
    } else {
      // For regular file uploads, upload to storage
      console.log('Uploading video file to storage');
      videoUrl = await uploadVideo(userId, videoFile);
    }
    
    // Prepare data for Firestore with recorded date
    // Note: We separate analysis date from recorded date
    const recordedDate = metadata?.recordedDate ? 
      new Date(metadata.recordedDate) : 
      (analysisData.recordedDate ? new Date(analysisData.recordedDate) : new Date());
    
    // Extract ownership data from metadata
    const swingOwnership = metadata?.swingOwnership || 'self'; // Default to self if not specified
    const proGolferName = metadata?.proGolferName || null;
    const isUnknownPro = metadata?.isUnknownPro || false;
    
    // Create Firestore document
    const swingData = {
      ...analysisData,
      userId,
      videoUrl,
      date: new Date(), // When the analysis was performed
      recordedDate, // When the swing was actually recorded
      clubId: metadata?.clubId || analysisData.clubId || null,
      clubName: metadata?.clubName || analysisData.clubName || null,
      clubType: metadata?.clubType || analysisData.clubType || null,
      outcome: metadata?.outcome || analysisData.outcome || null,
      
      // Add ownership data
      swingOwnership,
      proGolferName,
      isUnknownPro,
      
      createdAt: serverTimestamp()
    };
    
    // Add YouTube-specific properties if this is a YouTube video
    if (isYouTubeAnalysis) {
      swingData.isYouTubeVideo = true;
      swingData.youtubeVideoId = metadata.youtubeVideo.videoId;
    }
    
    // Remove client-specific properties
    delete swingData._isMockData;
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'swings'), swingData);
    
    // Update user stats after adding new swing
    await updateUserStats(userId);
    
    // Return saved data with the document ID
    return {
      ...swingData,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error saving swing analysis:', error);
    throw error;
  }
};

/**
 * Get a user's swings from Firestore
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} The user's swings
 */
const getUserSwings = async (userId) => {
  try {
    // Query swings collection, ordered by recorded date (not analysis date)
    const q = query(
      collection(db, 'swings'), 
      where('userId', '==', userId),
      orderBy('recordedDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const swings = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert timestamps to Date objects
      const formattedData = {
        ...data,
        id: doc.id,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        recordedDate: data.recordedDate?.toDate ? data.recordedDate.toDate() : new Date(data.recordedDate),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      };
      
      swings.push(formattedData);
    });
    
    return swings;
  } catch (error) {
    console.error('Error getting user swings:', error);
    throw error;
  }
};

/**
 * Get a single swing analysis by ID
 * @param {String} swingId - The swing ID
 * @returns {Promise<Object>} The swing analysis
 */
const getSwingById = async (swingId) => {
  try {
    const docSnap = await getDoc(doc(db, SWINGS_COLLECTION, swingId));
    
    if (!docSnap.exists()) {
      throw new Error('Swing not found');
    }
    
    const data = docSnap.data();
    
    // Convert timestamps to Date objects
    return {
      ...data,
      id: docSnap.id,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
      recordedDate: data.recordedDate?.toDate ? data.recordedDate.toDate() : new Date(data.recordedDate),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    };
  } catch (error) {
    console.error('Error getting swing by ID:', error);
    throw error;
  }
};

/**
 * Delete a swing analysis
 * @param {String} swingId - The swing ID
 * @param {String} userId - The user ID (for security check)
 * @returns {Promise<void>}
 */
const deleteSwing = async (swingId, userId) => {
  try {
    // Get the swing document first to check ownership and get video URL
    const swingDoc = await getDoc(doc(db, SWINGS_COLLECTION, swingId));
    
    if (!swingDoc.exists()) {
      throw new Error('Swing not found');
    }
    
    const swingData = swingDoc.data();
    
    // Security check - ensure the user owns this swing
    if (swingData.userId !== userId) {
      throw new Error('Unauthorized access');
    }
    
    // Try to delete the video file if URL exists
    if (swingData.videoUrl) {
      try {
        // Extract the storage path from the URL
        const url = new URL(swingData.videoUrl);
        const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
        
        // Create a reference to the file
        const videoRef = ref(storage, path);
        
        // Delete the file
        await deleteObject(videoRef);
      } catch (videoError) {
        console.error('Error deleting video file:', videoError);
        // Continue with document deletion even if video delete fails
      }
    }
    
    // Delete the swing document
    await deleteDoc(doc(db, SWINGS_COLLECTION, swingId));
    
    // Update user stats
    await updateUserStats(userId);
  } catch (error) {
    console.error('Error deleting swing:', error);
    throw error;
  }
};

/**
 * Calculate consecutive days of practice
 * @param {Array} swings - Sorted array of user swings
 * @returns {number} Number of consecutive days
 */
const calculateConsecutiveDays = (swings) => {
  if (!swings || swings.length === 0) return 0;
  
  // Use recorded dates, not analysis dates
  const dates = swings.map(swing => {
    const date = swing.recordedDate instanceof Date ? 
      swing.recordedDate : new Date(swing.recordedDate);
    
    // Normalize to day only (no time)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  });
  
  // Get unique dates (in case of multiple swings per day)
  const uniqueDates = [...new Set(dates.map(date => date.getTime()))];
  uniqueDates.sort((a, b) => b - a); // Descending order (most recent first)
  
  // Convert back to Date objects
  const sortedDates = uniqueDates.map(timestamp => new Date(timestamp));
  
  let streak = 1; // Start with today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If most recent swing is not today, no current streak
  if (sortedDates.length === 0 || sortedDates[0].getTime() !== today.getTime()) {
    return 0;
  }
  
  // Count consecutive days
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = sortedDates[i];
    const nextDate = sortedDates[i + 1];
    
    // Calculate difference in days
    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // Days are consecutive
      streak++;
    } else {
      // Break in streak
      break;
    }
  }
  
  return streak;
};

/**
 * Update user statistics
 * @param {String} userId - The user ID
 * @returns {Promise<void>}
 */
const updateUserStats = async (userId) => {
  try {
    // Get all user swings
    const swings = await getUserSwings(userId);
    
    if (!swings || swings.length === 0) {
      // No swings, no stats to update
      return;
    }
    
    // Sort swings by recorded date
    const sortedSwings = [...swings].sort((a, b) => {
      const dateA = a.recordedDate instanceof Date ? a.recordedDate : new Date(a.recordedDate);
      const dateB = b.recordedDate instanceof Date ? b.recordedDate : new Date(b.recordedDate);
      return dateA - dateB;
    });
    
    // Calculate basic stats
    const totalSwings = swings.length;
    const scores = swings.map(swing => swing.overallScore);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalSwings;
    const bestScore = Math.max(...scores);
    
    // Calculate improvement (first swing vs last swing)
    const firstSwing = sortedSwings[0];
    const lastSwing = sortedSwings[sortedSwings.length - 1];
    const overallImprovement = lastSwing.overallScore - firstSwing.overallScore;
    
    // Club usage statistics
    const clubUsage = {};
    swings.forEach(swing => {
      if (swing.clubName) {
        clubUsage[swing.clubName] = (clubUsage[swing.clubName] || 0) + 1;
      }
    });
    
    // Shot outcome statistics
    const outcomes = {};
    swings.forEach(swing => {
      if (swing.outcome) {
        outcomes[swing.outcome] = (outcomes[swing.outcome] || 0) + 1;
      }
    });
    
    // Calculate metric-specific improvements
    const improvements = {};
    if (sortedSwings.length >= 5) {
      Object.keys(firstSwing.metrics).forEach(key => {
        if (lastSwing.metrics && lastSwing.metrics[key] !== undefined) {
          improvements[key] = lastSwing.metrics[key] - firstSwing.metrics[key];
        }
      });
    }
    
    // Calculate practice streak
    const consecutiveDays = calculateConsecutiveDays(sortedSwings);
    
    // Create or update user stats document
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    const statsData = {
      totalSwings,
      averageScore,
      bestScore,
      improvement: overallImprovement,
      clubUsage,
      outcomes,
      improvements,
      consecutiveDays,
      updated: serverTimestamp()
    };
    
    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userDocRef, statsData);
    } else {
      // Create new document
      await setDoc(userDocRef, {
        ...statsData,
        created: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    // Don't throw the error to avoid disrupting the main flow
  }
};

/**
 * Get user statistics
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Try to calculate stats first
      await updateUserStats(userId);
      
      // Check again
      const updatedDoc = await getDoc(userDocRef);
      if (!updatedDoc.exists()) {
        return null;
      }
      
      const data = updatedDoc.data();
      return {
        ...data,
        created: data.created?.toDate?.() || data.created,
        updated: data.updated?.toDate?.() || data.updated
      };
    }
    
    const data = userDoc.data();
    return {
      ...data,
      created: data.created?.toDate?.() || data.created,
      updated: data.updated?.toDate?.() || data.updated
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

/**
 * Get user's clubs
 * @param {String} userId - The user ID
 * @returns {Promise<Array>} Array of club objects
 */
const getUserClubs = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists() || !userDoc.data().clubs) {
      return [];
    }
    
    return userDoc.data().clubs;
  } catch (error) {
    console.error('Error getting user clubs:', error);
    throw error;
  }
};

/**
 * Save user's clubs
 * @param {String} userId - The user ID
 * @param {Array} clubs - Array of club objects
 * @returns {Promise<void>}
 */
const saveUserClubs = async (userId, clubs) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userDocRef, {
        clubs,
        updated: serverTimestamp()
      });
    } else {
      // Create new document
      await setDoc(userDocRef, {
        clubs,
        created: serverTimestamp(),
        updated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving user clubs:', error);
    throw error;
  }
};

/**
 * Get user profile
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User profile
 */
const getUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    return {
      ...data,
      created: data.created?.toDate?.() || data.created,
      updated: data.updated?.toDate?.() || data.updated,
      defaultSwingDate: data.defaultSwingDate?.toDate?.() || data.defaultSwingDate,
      allowHistoricalSwings: data.allowHistoricalSwings !== false // Default to true
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Save user profile
 * @param {String} userId - The user ID
 * @param {Object} profileData - User profile data
 * @returns {Promise<void>}
 */
const saveUserProfile = async (userId, profileData) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    // Process dates in profile data
    const processedData = { ...profileData };
    
    if (processedData.defaultSwingDate) {
      // Ensure defaultSwingDate is a Date object for Firestore
      processedData.defaultSwingDate = 
        processedData.defaultSwingDate instanceof Date 
          ? processedData.defaultSwingDate 
          : new Date(processedData.defaultSwingDate);
    }
    
    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userDocRef, {
        ...processedData,
        updated: serverTimestamp()
      });
    } else {
      // Create new document
      await setDoc(userDocRef, {
        ...processedData,
        created: serverTimestamp(),
        updated: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

/**
 * Get user data
 * @param {String} userId - The user ID
 * @returns {Promise<Object>} User data
 */
const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    return {
      ...data,
      created: data.created?.toDate?.() || data.created,
      updated: data.updated?.toDate?.() || data.updated
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Get club-specific swing data
 * @param {String} userId - The user ID
 * @param {String} clubId - The club ID
 * @returns {Promise<Array>} Array of swing data for the specified club
 */
const getClubSwingData = async (userId, clubId) => {
  try {
    const q = query(
      collection(db, SWINGS_COLLECTION),
      where('userId', '==', userId),
      where('clubId', '==', clubId),
      orderBy('recordedDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const swings = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      swings.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate?.() || data.date,
        recordedDate: data.recordedDate?.toDate?.() || data.recordedDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });
    
    return swings;
  } catch (error) {
    console.error('Error getting club swing data:', error);
    throw error;
  }
};

// Export all functions
export default {
  saveSwingAnalysis,
  getUserSwings,
  getSwingById,
  deleteSwing,
  updateUserStats,
  getUserStats,
  getUserClubs,
  saveUserClubs,
  getUserProfile,
  saveUserProfile,
  getUserData,
  getClubSwingData
};