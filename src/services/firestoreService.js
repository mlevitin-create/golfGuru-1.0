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
   * Save swing analysis data to Firestore
   * @param {Object} swingData - The swing analysis data
   * @param {String} userId - The user ID
   * @param {File} videoFile - The original video file
   * @returns {Promise<Object>} The saved swing data with Firestore ID
   */

    const saveSwingAnalysis = async (swingData, userId, videoFile) => {
      try {
        console.log('Starting to save swing analysis to Firestore');
        
        // Create local URL for the video file regardless of storage success
        const localVideoUrl = URL.createObjectURL(videoFile);
        
        // Prepare basic swing data with local video URL as fallback
        let swingToSave = {
          ...swingData,
          userId,
          videoUrl: localVideoUrl,  // Use local URL initially
          originalVideoName: videoFile.name,
          created: new Date(),
          updated: new Date(),
          // Flag to indicate this is stored locally only
          _isLocalOnly: true
        };
        
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
            videoUrl: localVideoUrl
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
          created: new Date(),
          updated: new Date(),
          _isMemoryOnly: true
        };
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
      console.log('Attempting to delete swing with ID:', swingId);
      
      // First, find the parent document that contains our swing
      const swingsQuery = query(
        collection(db, 'swings'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(swingsQuery);
      if (querySnapshot.empty) {
        console.error('No swing documents found for this user');
        throw new Error('No swing data found for this user');
      }
      
      // Log all found documents for debugging
      console.log('Found swing documents:');
      let targetDoc = null;
      
      querySnapshot.forEach(doc => {
        console.log(`Document ID: ${doc.id}, data:`, doc.data());
        
        // Check if this document contains the swing we want to delete
        if (doc.id === swingId || (doc.data().id && doc.data().id === swingId)) {
          targetDoc = doc;
        }
      });
      
      if (!targetDoc) {
        console.error(`Could not find the swing with ID ${swingId}`);
        throw new Error('Swing not found');
      }
      
      // Delete the found document
      console.log(`Deleting document with ID: ${targetDoc.id}`);
      await deleteDoc(doc(db, 'swings', targetDoc.id));
      
      // Try to delete associated video if it exists
      try {
        const data = targetDoc.data();
        if (data.videoUrl && data.videoUrl.includes('firebasestorage.googleapis.com')) {
          // Extract storage path from URL
          const videoUrlObj = new URL(data.videoUrl);
          const storagePath = decodeURIComponent(videoUrlObj.pathname.split('/o/')[1]?.split('?')[0]);
          
          if (storagePath) {
            console.log('Deleting video from storage:', storagePath);
            const videoRef = ref(storage, storagePath);
            await deleteObject(videoRef);
            console.log('Video deleted from storage');
          }
        }
      } catch (storageError) {
        console.error('Error deleting video file:', storageError);
        // Continue even if video deletion fails
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in deleteSwing function:', error);
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