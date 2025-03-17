import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp, batch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';
import { analyzeReferenceVideo } from './referenceAnalysisService';

/**
 * Initialize the metrics collection with base information
 * Call this once when setting up your database
 */
export const initializeMetricsCollection = async () => {
  try {
    const metrics = {
      backswing: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8,
        weighting: "5.88%"
      },
      hipRotation: {
        title: "Hip Rotation",
        description: "How your hips rotate throughout the swing",
        category: "Body",
        difficulty: 6,
        weighting: "5.88%"
      },
      // Add other metrics...
    };
    
    // Create a batch operation
    const batchOp = writeBatch(db);
    
    // Add each metric to the batch
    Object.entries(metrics).forEach(([key, data]) => {
      const docRef = doc(db, 'metrics', key);
      batchOp.set(docRef, data);
    });
    
    // Commit the batch
    await batchOp.commit();
    console.log("Base metrics initialized in database");
    return true;
  } catch (error) {
    console.error("Error initializing metrics collection:", error);
    throw error;
  }
};

/**
 * Add or update a reference video for a metric
 * @param {string} metricKey - The metric key (e.g., 'hipRotation')
 * @param {string} youtubeUrl - The YouTube URL to use as reference
 * @returns {Promise<Object>} Updated metric data
 */
export const setReferenceVideo = async (metricKey, youtubeUrl) => {
  try {
    // Extract YouTube video ID
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Get the embed URL
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    // Update the metric document with the reference video URL
    await setDoc(doc(db, 'metrics', metricKey), {
      exampleUrl: youtubeUrl,
      embedUrl: embedUrl,
      youtubeVideoId: videoId,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    console.log(`Reference video for ${metricKey} updated successfully`);
    
    // Get the updated document
    const updatedDoc = await getDoc(doc(db, 'metrics', metricKey));
    return updatedDoc.data();
  } catch (error) {
    console.error(`Error setting reference video for ${metricKey}:`, error);
    throw error;
  }
};

/**
 * Process a reference video for analysis
 * @param {string} metricKey - The metric key
 * @returns {Promise<Object>} The analysis result
 */
export const processReferenceVideo = async (metricKey) => {
  try {
    // Get the metric info with the reference video URL
    const metricRef = doc(db, 'metrics', metricKey);
    const metricSnap = await getDoc(metricRef);
    
    if (!metricSnap.exists() || !metricSnap.data().exampleUrl) {
      throw new Error(`No reference video found for ${metricKey}`);
    }
    
    const metricData = metricSnap.data();
    console.log(`Processing reference video for ${metricKey}: ${metricData.exampleUrl}`);
    
    // Use referenceAnalysisService to analyze the video
    const analysis = await analyzeReferenceVideo(metricKey, metricData.exampleUrl);
    
    console.log(`Reference video for ${metricKey} processed successfully`);
    return analysis;
  } catch (error) {
    console.error(`Error processing reference video for ${metricKey}:`, error);
    throw error;
  }
};

/**
 * Get all metrics with their reference videos
 * @returns {Promise<Object>} All metrics
 */
export const getAllMetrics = async () => {
  try {
    const metricsSnapshot = await getDocs(collection(db, 'metrics'));
    const metricsData = {};
    
    metricsSnapshot.forEach(doc => {
      metricsData[doc.id] = doc.data();
    });
    
    return metricsData;
  } catch (error) {
    console.error('Error getting all metrics:', error);
    throw error;
  }
};

export default {
  initializeMetricsCollection,
  setReferenceVideo,
  processReferenceVideo,
  getAllMetrics
};