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
  import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { db, storage } from '../firebase/firebase';
  
  // Collection name constants
  const SWINGS_COLLECTION = 'swings';
  const USERS_COLLECTION = 'users';
  
  /**
   * Save swing analysis data to Firestore
   * @param {Object} swingData - The swing analysis data
   * @param {String} userId - The user ID
   * @param {File} videoFile - The original video file
   * @returns {Promise<Object>} The saved swing data with Firestore ID
   */
  const saveSwingAnalysis = async (swingData, userId, videoFile) => {
    try {
      // First upload the video to Firebase Storage
      const videoRef = ref(storage, `swings/${userId}/${Date.now()}_${videoFile.name}`);
      const uploadResult = await uploadBytes(videoRef, videoFile);
      const videoUrl = await getDownloadURL(uploadResult.ref);
  
      // Prepare the swing data with the video URL and user ID
      const swingToSave = {
        ...swingData,
        userId,
        videoUrl,
        originalVideoName: videoFile.name,
        created: serverTimestamp(),
        updated: serverTimestamp()
      };
  
      // Save to Firestore
      const docRef = await addDoc(collection(db, SWINGS_COLLECTION), swingToSave);
      
      // Update user's swing count in a separate collection (for quick stats)
      await updateUserStats(userId);
      
      return {
        id: docRef.id,
        ...swingToSave
      };
    } catch (error) {
      console.error('Error saving swing analysis:', error);
      throw error;
    }
  };
  
  /**
   * Get all swing analyses for a user
   * @param {String} userId - The user ID
   * @returns {Promise<Array>} Array of swing analyses
   */
  const getUserSwings = async (userId) => {
    try {
      const q = query(
        collection(db, SWINGS_COLLECTION),
        where('userId', '==', userId),
        orderBy('created', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to regular Date objects
        created: doc.data().created?.toDate(),
        updated: doc.data().updated?.toDate()
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
      
      return {
        id: swingDoc.id,
        ...swingDoc.data(),
        created: swingDoc.data().created?.toDate(),
        updated: swingDoc.data().updated?.toDate()
      };
    } catch (error) {
      console.error('Error getting swing by ID:', error);
      throw error;
    }
  };
  
  /**
   * Delete a swing analysis
   * @param {String} swingId - The swing document ID
   * @param {String} userId - The user ID (for security check)
   * @returns {Promise<void>}
   */
  const deleteSwing = async (swingId, userId) => {
    try {
      // First get the swing to check ownership and get the video URL
      const swingDoc = await getDoc(doc(db, SWINGS_COLLECTION, swingId));
      
      if (!swingDoc.exists()) {
        throw new Error('Swing not found');
      }
      
      const swingData = swingDoc.data();
      
      // Security check - ensure the user owns this swing
      if (swingData.userId !== userId) {
        throw new Error('Unauthorized access to swing data');
      }
      
      // Delete the document from Firestore
      await deleteDoc(doc(db, SWINGS_COLLECTION, swingId));
      
      // Note: For simplicity, we're not deleting the video from storage
      // In a production app, you might want to delete the video file as well
      
      // Update user stats
      await updateUserStats(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting swing:', error);
      throw error;
    }
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
        .map(doc => ({
          ...doc.data(),
          created: doc.data().created?.toDate() || new Date()
        }))
        .sort((a, b) => a.created - b.created);
      
      if (swings.length > 0) {
        swings.forEach(swing => {
          totalScore += swing.overallScore;
        });
        
        earliestScore = swings[0].overallScore;
        latestScore = swings[swings.length - 1].overallScore;
      }
      
      const averageScore = swingCount > 0 ? totalScore / swingCount : 0;
      const improvement = swingCount > 1 ? latestScore - earliestScore : 0;
      
      // Get or create user stats document
      const userStatsRef = doc(db, USERS_COLLECTION, userId);
      const userStatsDoc = await getDoc(userStatsRef);
      
      if (userStatsDoc.exists()) {
        await updateDoc(userStatsRef, {
          swingCount,
          averageScore,
          improvement,
          improvementPercentage: earliestScore > 0 ? (improvement / earliestScore) * 100 : 0,
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
            improvementPercentage: 0
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
  
  export default {
    saveSwingAnalysis,
    getUserSwings,
    getSwingById,
    deleteSwing,
    getUserStats
  };