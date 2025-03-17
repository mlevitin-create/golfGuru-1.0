import axios from 'axios';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  setDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { getAdjustmentFactors } from './adjustmentService';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';

// Note: You should store your API key in an environment variable (.env file)
// Create a .env file at the root of your project with:
// REACT_APP_GEMINI_API_KEY=your_api_key_here

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent';

// Flag to control whether we use real API or mock data
const USE_MOCK_DATA = false; // Set to false to try real API

/**
 * Create a unique signature for a video file to track repeated analyses
 * @param {File} videoFile - The video file
 * @returns {string} A unique identifier based on file properties
 */
const createVideoSignature = (videoFile) => {
  return `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
};

// Add this function
// In geminiService.js
/**
 * Apply feedback-based adjustments to analysis results
 * @param {Object} analysisData - The analysis data to adjust
 * @returns {Object} The adjusted analysis data
 */
const applyFeedbackAdjustments = async (analysisData) => {
  try {
    // For debug - log original scores
    console.log("Before adjustments - Overall:", analysisData.overallScore, "Metrics:", Object.keys(analysisData.metrics).map(k => `${k}:${analysisData.metrics[k]}`).join(', '));
    
    // KEEP EXISTING CODE for ownership-based adjustments
    // Handle ownership-based adjustments first
    const swingOwnership = analysisData.swingOwnership || 'self'; // Default to self
    const proGolferName = analysisData.proGolferName || null;
    const isUnknownPro = analysisData.isUnknownPro || false;
    
    // Apply pro golfer adjustments if applicable
    // if (swingOwnership === 'pro' || isUnknownPro) {
    //   // Keep your existing pro boost code
    //   console.log(`Professional golfer detected (${proGolferName || 'unknown pro'}), applying score boost`);
      
    //   // Store original score for logging
    //   const originalScore = analysisData.overallScore;
      
    //   // Boost the overall score for pro golfers - increased boost
    //   analysisData.overallScore = Math.min(99, Math.max(85, originalScore + 20));
      
    //   // Boost key metrics - increased boost
    //   Object.entries(analysisData.metrics).forEach(([key, value]) => {
    //     // Higher boost for core mechanics, less for mental aspects
    //     const boostAmount = ['backswing', 'swingBack', 'swingForward', 'shallowing', 'impactPosition'].includes(key)
    //       ? 18 // Core mechanics get bigger boost
    //       : 12; // Other metrics get standard boost
  
    //     // Apply a curve to boost higher scores more
    //     const scoreFactor = value / 100; // Scale from 0 to 1
    //     const curvedBoost = Math.round(boostAmount * scoreFactor);
    //     analysisData.metrics[key] = Math.min(99, Math.max(80, value + curvedBoost));
    //   });
      
    //   console.log(`Adjusted pro golfer score from ${originalScore} to ${analysisData.overallScore}`);
    //   return analysisData;
    // }
    
    // CONTINUE WITH EXISTING CODE for unauthenticated user handling
    
    // KEEP EXISTING CODE for retrieving adjustment factors
    try {
      // Get the latest adjustment factors
      const adjustmentFactors = await getAdjustmentFactors();
      console.log("Retrieved adjustment factors:", adjustmentFactors);
      
      // Apply overall adjustment if available
      if (adjustmentFactors && adjustmentFactors.overall && adjustmentFactors.overall !== 0) {
        const originalScore = analysisData.overallScore;
        analysisData.overallScore = Math.min(100, Math.max(0, 
          analysisData.overallScore + adjustmentFactors.overall
        ));
        console.log(`Applied overall adjustment: ${adjustmentFactors.overall}, changed score from ${originalScore} to ${analysisData.overallScore}`);
      }
      
      // Apply metric-specific adjustments if available
      if (adjustmentFactors && adjustmentFactors.metrics) {
        Object.entries(analysisData.metrics).forEach(([metric, value]) => {
          if (adjustmentFactors.metrics[metric]) {
            const originalValue = value;
            analysisData.metrics[metric] = Math.min(100, Math.max(0, 
              value + adjustmentFactors.metrics[metric]
            ));
            console.log(`Applied ${metric} adjustment: ${adjustmentFactors.metrics[metric]}, changed value from ${originalValue} to ${analysisData.metrics[metric]}`);
          }
        });
      }
      
      // NEW: Apply correlated metric adjustments
      if (adjustmentFactors && adjustmentFactors.metrics) {
        analysisData = applyCorrelatedAdjustments(analysisData, adjustmentFactors);
        console.log("Applied correlated metric adjustments");
      }
      
      // Recalculate overall score with adjusted metrics
      if (adjustmentFactors && adjustmentFactors.metrics && Object.keys(adjustmentFactors.metrics).length > 0) {
        const originalScore = analysisData.overallScore;
        analysisData.overallScore = calculateWeightedOverallScore(analysisData.metrics);
        console.log(`Recalculated overall score based on adjusted metrics: ${originalScore} -> ${analysisData.overallScore}`);
      }
      
      // NEW ADDITION: Final score redistribution to break clustering
      analysisData = redistributeScores(analysisData);
      console.log(`Final score after redistribution: ${analysisData.overallScore}`);
      
    } catch (firestoreError) {
      // KEEP EXISTING ERROR HANDLING
    }
    
    // After all adjustments, log the final scores
    console.log("After adjustments - Overall:", analysisData.overallScore, "Metrics:", Object.keys(analysisData.metrics).map(k => `${k}:${analysisData.metrics[k]}`).join(', '));
    
    return analysisData;
  } catch (error) {
    console.error("Error applying feedback adjustments:", error);
    // Return the original data if adjustment fails
    return analysisData;
  }
};

/**
 * Check if the given analysis data needs adjustments
 * @param {Object} analysisData - The analysis data
 * @returns {Promise<boolean>} Whether adjustments are needed
 */
const needsAdjustment = async (analysisData) => {
  try {
    // Get adjustment preferences for this specific user if available
    const userPreferences = await getUserAdjustmentPreferences(analysisData.userId);
    
    // First check explicit preferences
    if (userPreferences?.adjustmentPriority === 'never') {
      console.log("User has disabled adjustments");
      return false;
    }
    
    if (userPreferences?.adjustmentPriority === 'always') {
      console.log("User has enabled adjustments for all swings");
      return true;
    }
    
    // For as-needed (default), check for issues that require adjustment
    
    // Pro golfer detection - generally don't need adjustments unless there's a clear issue
    if (isLikelyProGolferSwing(analysisData)) {
      // Only apply adjustments to pro swings if there's a severe issue
      const hasIssue = hasScoreClustering(analysisData.metrics) || 
                      hasUnrealisticScores(analysisData, 'pro');
      
      if (!hasIssue) {
        console.log("Pro golfer swing detected, no adjustments needed");
        return false;
      }
    }
    
    // Amateur golfers - check for common scoring issues
    
    // Check for score clustering (too many similar scores)
    if (hasScoreClustering(analysisData.metrics)) {
      console.log("Score clustering detected, adjustment needed");
      return true;
    }
    
    // Check for unrealistic scores
    if (hasUnrealisticScores(analysisData, userPreferences?.skillLevel || 'amateur')) {
      console.log("Unrealistic scores detected for skill level, adjustment needed");
      return true;
    }
    
    // No issues detected that require adjustment
    console.log("No adjustment needed, scores appear realistic");
    return false;
  } catch (error) {
    console.error("Error in needsAdjustment:", error);
    // Default to being conservative with adjustments
    return false;
  }
};

/**
 * Detect if the swing is likely from a pro golfer
 * @param {Object} analysisData - The analysis data
 * @returns {boolean} Whether it's likely a pro swing
 */
const isLikelyProGolferSwing = (analysisData) => {
  // Check for high overall score
  const hasHighOverallScore = analysisData.overallScore >= 80;

  // Check for multiple high metric scores
  const highMetricsCount = Object.values(analysisData.metrics)
      .filter(score => score >= 90).length;

  // Check for very low scores
  const lowScoresCount = Object.values(analysisData.metrics)
      .filter(score => score < 70).length;

  // Check for extremely high individual metrics
  const hasExtremeMetric = Object.values(analysisData.metrics)
      .some(score => score >= 95);

  // A pro swing will typically have multiple high metrics, no very low scores, or extremely high metrics
  return (hasHighOverallScore && highMetricsCount >= 2 && lowScoresCount === 0) || highMetricsCount >= 4 || hasExtremeMetric;
};

/**
 * Detect if this is likely a video of a pro golfer
 * @param {Object} analysisData - The analysis data
 * @returns {boolean} Whether it's likely a pro golfer video
 */
const isLikelyProGolferVideo = (analysisData) => {
  // Pro golfer names to check in URL
  const proGolferNames = [
    'mcilroy', 'woods', 'tiger', 'spieth', 'koepka', 'rahm', 
    'scheffler', 'dechambeau', 'hovland', 'thomas', 'johnson',
    'morikawa', 'finau', 'scott', 'rose', 'garcia', 'fowler'
  ];
  
  // Check if the URL contains a pro golfer name
  const hasProNameInUrl = analysisData.videoUrl && 
    proGolferNames.some(name => analysisData.videoUrl.toLowerCase().includes(name));
  
  // Also check if it's a YouTube swing and has pro-level scores
  const isYouTubeWithHighScores = analysisData.isYouTubeVideo && (
    analysisData.overallScore >= 85 || 
    Object.values(analysisData.metrics).some(score => score >= 90)
  );
  
  return hasProNameInUrl || isYouTubeWithHighScores;
};

/**
 * Check if the metrics show score clustering
 * @param {Object} metrics - The metrics object
 * @returns {boolean} Whether score clustering is detected
 */
const hasScoreClustering = (metrics) => {
  const values = Object.values(metrics);
  
  // Need at least several metrics to detect clustering
  if (values.length < 4) return false;
  
  // Calculate average and standard deviation
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Calculate variance
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  
  // Calculate standard deviation
  const stdDev = Math.sqrt(variance);
  
  // Check if standard deviation is too low (clustered scores)
  // Most real swings should have more variation between metrics
  return stdDev < 8;
};

/**
 * Check if the analysis has unrealistic scores for the golfer's level
 * @param {Object} analysisData - The analysis data
 * @param {string} skillLevel - The golfer's skill level
 * @returns {boolean} Whether unrealistic scores are detected
 */
const hasUnrealisticScores = (analysisData, skillLevel) => {
  const scores = Object.values(analysisData.metrics);
  
  // Expected score ranges by skill level
  const expectedRanges = {
    'pro': { min: 70, max: 99, avg: 85 },
    'advanced': { min: 60, max: 95, avg: 75 },
    'amateur': { min: 40, max: 85, avg: 65 },
    'beginner': { min: 30, max: 75, avg: 55 }
  };
  
  const range = expectedRanges[skillLevel] || expectedRanges.amateur;
  
  // Calculate the average score
  const average = scores.reduce((sum, val) => sum + val, 0) / scores.length;
  
  // Count metrics that are outside the expected range
  const outsideRangeCount = scores.filter(score => 
    score > range.max || score < range.min
  ).length;
  
  // Calculate how far the average is from the expected average
  const avgDifference = Math.abs(average - range.avg);
  
  // If the average is too far from expected or too many metrics are outside range
  return avgDifference > 15 || (outsideRangeCount / scores.length) > 0.4;
};

/**
 * Apply specialized adjustments for pro golfer swings
 * @param {Object} analysisData - The analysis data
 * @returns {Object} The adjusted analysis data
 */
const applyProGolferAdjustments = (analysisData) => {
  // Store original score for logging
  const originalScore = analysisData.overallScore;
  
  // Boost the overall score for pro golfers
  analysisData.overallScore = Math.min(99, Math.max(85, originalScore + 10));
  
  // Boost key metrics
  Object.entries(analysisData.metrics).forEach(([key, value]) => {
    // Higher boost for core mechanics, less for mental aspects
    const boostAmount = ['backswing', 'swingBack', 'swingForward', 'shallowing', 'impactPosition'].includes(key) 
      ? 10 // Core mechanics get bigger boost
      : 5; // Other metrics get standard boost
      
    analysisData.metrics[key] = Math.min(99, Math.max(80, value + boostAmount));
  });
  
  console.log(`Adjusted pro golfer score from ${originalScore} to ${analysisData.overallScore}`);
  return analysisData;
};

/**
 * Apply minimal variation to prevent identical scores on reupload
 * @param {Object} analysisData - The analysis data
 * @returns {Object} The adjusted analysis data
 */
const applyMinimalVariation = (analysisData) => {
  // Add a small random variation to prevent identical scores on reupload
  const variation = Math.random() * 2 - 1; // Random value between -1 and +1
  analysisData.overallScore = Math.min(100, Math.max(0, analysisData.overallScore + variation));
  analysisData.overallScore = Math.round(analysisData.overallScore);
  
  return analysisData;
};

/**
 * Correct score clustering in metrics
 * @param {Object} analysisData - The analysis data
 * @returns {Object} The adjusted analysis data
 */
const correctScoreClustering = (analysisData) => {
  const metricValues = Object.values(analysisData.metrics);
  
  // Calculate average and standard deviation
  const avgScore = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
  const stdDev = Math.sqrt(
    metricValues.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / metricValues.length
  );
  
  console.log(`Metrics avg: ${avgScore.toFixed(1)}, stdDev: ${stdDev.toFixed(1)}`);
  
  // For skill levels, target different standard deviations
  const isPotentialPro = avgScore > 80;
  const targetStdDev = isPotentialPro ? 5 : 12; // Less variance for pros, more for amateurs
  
  // If standard deviation is too low, scores are too clustered
  if (stdDev < 8 && metricValues.length > 3) {
    console.log("Detected low variance in scores, applying normalization");
    
    // Find min and max values
    const minVal = Math.min(...metricValues);
    const maxVal = Math.max(...metricValues);
    const range = maxVal - minVal;
    
    // If the range is too small, spread the scores out
    if (range < 20) {
      const stretchFactor = targetStdDev / Math.max(1, stdDev);
      
      // Apply a spread to each metric while maintaining the overall average
      Object.keys(analysisData.metrics).forEach(key => {
        // Center the value around the mean
        const centered = analysisData.metrics[key] - avgScore;
        // Stretch it out
        const stretched = centered * stretchFactor;
        // Recenter around the original mean and round
        analysisData.metrics[key] = Math.round(avgScore + stretched);
        // Ensure it's within bounds
        analysisData.metrics[key] = Math.min(100, Math.max(0, analysisData.metrics[key]));
      });
      
      // Recalculate overall score based on adjusted metrics
      analysisData.overallScore = calculateWeightedOverallScore(analysisData.metrics);
    }
  }
  
  return analysisData;
};

/**
 * Check if overall adjustment should be applied
 * @param {Object} analysisData - The analysis data
 * @param {Object} adjustmentFactors - The adjustment factors
 * @returns {boolean} Whether to apply overall adjustment
 */
const shouldApplyOverallAdjustment = (analysisData, adjustmentFactors) => {
  // Skip if no adjustment factor available
  if (!adjustmentFactors || adjustmentFactors.overall === 0) {
    return false;
  }
  
  // For pros, only apply small adjustments if needed
  if (isLikelyProGolferSwing(analysisData)) {
    return Math.abs(adjustmentFactors.overall) <= 3;
  }
  
  // For regular swings, check if the adjustment makes sense
  // (e.g., don't push an already high score much higher)
  const wouldMakeUnrealistic = 
    (analysisData.overallScore > 85 && adjustmentFactors.overall > 0) || 
    (analysisData.overallScore < 40 && adjustmentFactors.overall < 0);
  
  return !wouldMakeUnrealistic;
};

/**
 * Check if metric-specific adjustments should be applied
 * @param {Object} analysisData - The analysis data
 * @param {Object} adjustmentFactors - The adjustment factors
 * @returns {boolean} Whether to apply metric adjustments
 */
const shouldApplyMetricAdjustments = (analysisData, adjustmentFactors) => {
  return adjustmentFactors && 
         adjustmentFactors.metrics && 
         Object.keys(adjustmentFactors.metrics).length > 0;
};

/**
 * Check if a specific metric needs adjustment
 * @param {string} metric - The metric name
 * @param {number} value - The current metric value
 * @param {Object} analysisData - The full analysis data
 * @returns {boolean} Whether the metric needs adjustment
 */
const needsMetricAdjustment = (metric, value, analysisData) => {
  // Don't adjust unreasonably high scores for pros
  if (isLikelyProGolferSwing(analysisData) && value > 90) {
    return false;
  }
  
  // Don't make already low scores even lower or high scores even higher
  if (value < 35 || value > 95) {
    return false;
  }
  
  // Default to true for metrics in the common problem range (65-80)
  return value >= 65 && value <= 80;
};

/**
 * Get user adjustment preferences
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User adjustment preferences
 */
const getUserAdjustmentPreferences = async (userId) => {
  if (!userId) return null;
  
  try {
    // Get the user's profile document
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    // Return preference data
    return {
      adjustmentPriority: userData.adjustmentPriority || 'as-needed',
      skillLevel: userData.skillLevel || 'amateur'
    };
  } catch (error) {
    console.error("Error getting user adjustment preferences:", error);
    return null;
  }
};

/**
 * Check if this video has been analyzed before and ensure consistency
 * @param {Object} analysisData - The current analysis results
 * @param {File} videoFile - The video file being analyzed
 * @returns {Object} Adjusted analysis data for consistency
 */
const ensureConsistentAnalysis = (analysisData, videoFile) => {
  try {
    // Create a signature for this specific video file
    const videoSignature = createVideoSignature(videoFile);
    
    // Check if we've analyzed this video before
    const previousAnalysesJson = localStorage.getItem(`golf_analysis_${videoSignature}`);
    
    if (previousAnalysesJson) {
      // We've seen this video before
      const previousAnalyses = JSON.parse(previousAnalysesJson);
      console.log(`Found ${previousAnalyses.length} previous analyses for this video`);
      
      if (previousAnalyses.length > 0) {
        // Get the most recent previous analysis
        const lastAnalysis = previousAnalyses[previousAnalyses.length - 1];
        
        // Check for significant differences
        const overallDiff = Math.abs(analysisData.overallScore - lastAnalysis.overallScore);
        
        if (overallDiff > 8) {
          console.log(`Detected inconsistency in scoring. Previous: ${lastAnalysis.overallScore}, Current: ${analysisData.overallScore}`);
          
          // Blend the scores to make them more consistent
          // (70% current, 30% previous for more stability)
          analysisData.overallScore = Math.round(
            (0.7 * analysisData.overallScore) + (0.3 * lastAnalysis.overallScore)
          );
          
          // Also blend metrics that show significant differences
          Object.keys(analysisData.metrics).forEach(key => {
            if (lastAnalysis.metrics && lastAnalysis.metrics[key] !== undefined) {
              const metricDiff = Math.abs(analysisData.metrics[key] - lastAnalysis.metrics[key]);
              
              if (metricDiff > 10) {
                analysisData.metrics[key] = Math.round(
                  (0.7 * analysisData.metrics[key]) + (0.3 * lastAnalysis.metrics[key])
                );
              }
            }
          });
          
          console.log(`Adjusted overall score for consistency: ${analysisData.overallScore}`);
        }
      }
      
      // Add this new analysis to the history (limited to last 3)
      previousAnalyses.push({
        timestamp: new Date().toISOString(),
        overallScore: analysisData.overallScore,
        metrics: {...analysisData.metrics}
      });
      
      // Keep only the most recent 3 analyses to prevent storage bloat
      if (previousAnalyses.length > 3) {
        previousAnalyses.shift();
      }
      
      // Save updated history
      localStorage.setItem(`golf_analysis_${videoSignature}`, JSON.stringify(previousAnalyses));
      
    } else {
      // First time seeing this video, start a history
      const newHistory = [{
        timestamp: new Date().toISOString(),
        overallScore: analysisData.overallScore,
        metrics: {...analysisData.metrics}
      }];
      
      localStorage.setItem(`golf_analysis_${videoSignature}`, JSON.stringify(newHistory));
    }
    
    return analysisData;
    
  } catch (error) {
    // If anything goes wrong, just return the original data
    console.error("Error in consistency tracking:", error);
    return analysisData;
  }
};

/**
 * Calculate a more accurate overall score based on weighted metrics
 * @param {Object} metrics - Object containing metric scores
 * @returns {number} Weighted overall score
 */
const calculateWeightedOverallScore = (metrics) => {
  // These weights are based on the Swing Recipe categories
  const weights = {
    // Setup (20%)
    stance: 0.07,
    grip: 0.07,
    ballPosition: 0.06,
    
    // Swing (50%)
    backswing: 0.10,
    swingBack: 0.10,
    swingForward: 0.15,
    shallowing: 0.15,
    impactPosition: 0.15,
    
    // Body (20%)
    hipRotation: 0.08,
    pacing: 0.04,
    stiffness: 0.04,
    headPosition: 0.04,
    shoulderPosition: 0.04,
    armPosition: 0.04,
    followThrough: 0.04,
    
    // Mental (10%)
    confidence: 0.05,
    focus: 0.05
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(metrics).forEach(([key, value]) => {
    if (weights[key]) {
      weightedSum += value * weights[key];
      totalWeight += weights[key];
    } else {
      // For metrics not in our predefined weights, use a default weight
      weightedSum += value * 0.05;
      totalWeight += 0.05;
    }
  });
  
  // Normalize if we don't have all metrics
  if (totalWeight > 0 && totalWeight < 1) {
    weightedSum = weightedSum / totalWeight;
  }
  
  // Round to nearest integer
  return Math.round(weightedSum);
};

// Modify the normalizeAndValidateScores function to include our new calculation
const normalizeAndValidateScores = (analysisData) => {
  // First ensure overall score is within 0-100 range and rounded
  analysisData.overallScore = Math.min(100, Math.max(0, Math.round(analysisData.overallScore)));

  // Get all metric values
  const metricValues = Object.values(analysisData.metrics);

  // Calculate average and standard deviation
  const avgScore = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
  const stdDev = Math.sqrt(
      metricValues.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / metricValues.length
  );

  console.log(`Metrics avg: ${avgScore.toFixed(1)}, stdDev: ${stdDev.toFixed(1)}`);

  // CRUCIAL CHANGE: Increase variance more aggressively to break out of 70s clustering
  let targetStdDev = 12; // Default target
  if (analysisData.overallScore >= 80) { // Adjust target for potential pro swings
      targetStdDev = 8;
  }

  if (stdDev < 10 && metricValues.length > 3) {
      console.log("Detected low variance in scores, applying stronger normalization");

      // Find min and max values
      const minVal = Math.min(...metricValues);
      const maxVal = Math.max(...metricValues);
      const range = maxVal - minVal;

      // If range is too small, apply more aggressive stretching
      if (range < 25) { // Increased from 20 to 25
          const stretchFactor = targetStdDev / Math.max(1, stdDev);

          // Apply a larger spread to each metric
          Object.keys(analysisData.metrics).forEach(key => {
              // Center the value around the mean
              const centered = analysisData.metrics[key] - avgScore;
              // Apply stronger stretch factor
              const stretched = centered * stretchFactor * 1.3; // 30% more stretching
              // Recenter around the original mean and round
              analysisData.metrics[key] = Math.round(avgScore + stretched);
              // Ensure it's within bounds
              analysisData.metrics[key] = Math.min(100, Math.max(0, analysisData.metrics[key]));
          });
      }
  }

  // CRUCIAL CHANGE: Add explicit score redistribution to fix clustering
  return redistributeScores(analysisData);
};

/**
 * Redistributes scores to create clearer separation between skill levels
 */
// Greatly simplified redistributeScores function
const redistributeScores = (analysisData) => {
  // Only handle extreme outliers
  if (analysisData.overallScore > 95) {
    analysisData.overallScore = 95; // Cap maximum
  } else if (analysisData.overallScore < 30) {
    analysisData.overallScore = 30; // Set minimum
  }
  
  // Ensure overall score is somewhat in line with metrics average
  const metricsAvg = Object.values(analysisData.metrics).reduce((sum, val) => sum + val, 0) / 
                     Object.keys(analysisData.metrics).length;
  
  // If overall score is drastically different from metrics average, nudge it slightly
  if (Math.abs(analysisData.overallScore - metricsAvg) > 15) {
    analysisData.overallScore = Math.round(0.7 * analysisData.overallScore + 0.3 * metricsAvg);
  }
  
  return analysisData;
};

/**
 * Determines if a swing is likely from a pro golfer based on metrics
 */
const determineIfPotentialPro = (analysisData) => {
  // Check for explicit pro labeling
  if (analysisData.swingOwnership === 'pro' || analysisData.isUnknownPro) {
    return true;
  }
  
  // Check for very high overall score
  if (analysisData.overallScore >= 90) {
    return true;
  }
  
  // Before returning from applyFeedbackAdjustments
// Calculate metrics average for score alignment and pro detection
const metricValues = Object.values(analysisData.metrics);
const metricsAvg = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;

// If overall score is significantly lower than metrics average, apply gentle adjustment
if (metricsAvg - analysisData.overallScore > 10) {
  const oldScore = analysisData.overallScore;
  // Gentle adjustment - 80% original, 20% metrics average
  analysisData.overallScore = Math.round(0.8 * analysisData.overallScore + 0.2 * metricsAvg);
  console.log(`Minor score alignment: ${oldScore} → ${analysisData.overallScore} (metrics avg: ${metricsAvg})`);
}

// Return the adjusted analysis data
return analysisData;
};

/**
 * Apply adjustments to correlated metrics that typically move together
 */
const applyCorrelatedAdjustments = (analysisData, adjustments) => {
  // Define groups of related metrics
  const correlationGroups = {
    backswingGroup: ['backswing', 'swingBack', 'clubTrajectoryBackswing'],
    downswingGroup: ['swingForward', 'clubTrajectoryForswing', 'shallowing'],
    bodyGroup: ['hipRotation', 'followThrough', 'shoulderPosition', 'armPosition'],
    setupGroup: ['stance', 'grip', 'ballPosition'],
    mentalGroup: ['confidence', 'focus']
  };
  
  // For each group, find the average adjustment
  Object.values(correlationGroups).forEach(group => {
    // Find metrics in this group that have adjustments
    const adjustedMetricsInGroup = group.filter(metric => 
      adjustments.metrics && adjustments.metrics[metric]
    );
    
    if (adjustedMetricsInGroup.length > 0) {
      // Calculate average adjustment
      const totalAdjustment = adjustedMetricsInGroup.reduce((sum, metric) => 
        sum + adjustments.metrics[metric], 0
      );
      const avgAdjustment = Math.round(totalAdjustment / adjustedMetricsInGroup.length);
      
      // Apply partial adjustment to other metrics in group
      group.forEach(metric => {
        // Skip metrics already adjusted
        if (!adjustments.metrics || !adjustments.metrics[metric]) {
          // Only adjust if the metric exists in analysisData
          if (analysisData.metrics && analysisData.metrics[metric] !== undefined) {
            // Apply 40% of the group average adjustment
            const partialAdjustment = Math.round(avgAdjustment * 0.4);
            analysisData.metrics[metric] += partialAdjustment;
            
            // Keep within bounds
            analysisData.metrics[metric] = Math.min(100, Math.max(0, analysisData.metrics[metric]));
          }
        }
      });
    }
  });
  
  return analysisData;
};

/**
 * Analyzes a golf swing using either a video file or YouTube URL
 * @param {File|null} videoFile - The video file to analyze (null if using YouTube)
 * @param {Object} metadata - Additional metadata including YouTube video info if applicable
 * @returns {Promise} Promise that resolves to the analysis results
 */
const analyzeGolfSwing = async (videoFile, metadata = null) => {
  // Determine if this is a YouTube analysis.  CRITICAL CHANGE HERE:
  const isYouTubeAnalysis = !videoFile && metadata?.youtubeVideo?.videoId;
  console.log("videoFile:", videoFile); // Log the value of videoFile
  console.log("metadata:", metadata);    // Log the entire metadata object

  if (USE_MOCK_DATA) {
      console.log('Using mock data instead of real API');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return createMockAnalysis(videoFile, metadata);
  }

    try {
        if (!API_KEY) {
            console.error('Gemini API key is not configured');
            return createMockAnalysis(videoFile, metadata);
        }

        // Load reference models for metrics
        let referenceModels = {};
        try {
          const referenceModelsSnapshot = await getDocs(collection(db, 'reference_models'));
          referenceModelsSnapshot.forEach(doc => {
            referenceModels[doc.id] = doc.data();
          });
          console.log(`Loaded ${Object.keys(referenceModels).length} reference models`);
        } catch (error) {
          console.error('Error loading reference models:', error);
          // Continue even if reference models couldn't be loaded
        }
        let clubInfo = "";
        if (metadata?.clubName) {
            clubInfo = `\n\nThis swing was performed with a ${metadata.clubName}. Take this into account in your analysis.`;
        }
        

        const promptText = 
`* You are a PGA Master Professional with 30 years of experience coaching elite golfers, specializing in biomechanics and swing analysis.
* You are using high-speed video to assess a player's single golf swing.
* Analyze the golf swing video in detail and provide a comprehensive assessment.
* Remember this is a single swing and may not represent their entire game.

* **Overall Swing Score (0-100):**
    * Holistic assessment, NOT a simple average.
    * Consider how effectively the components work together.
    * Base it on proper form, mechanics, kinematic sequence (legs, hips, torso, arms, club), and potential for consistent, powerful ball-striking.
    * The score should reflect the swing itself, not the player's handicap.
    * **95-100:** Elite/Tour-Level Swing. Virtually flawless mechanics, optimal sequencing, and exceptional power generation.
    * **88-94:** Exceptional Swing. Mechanically sound with only extremely minor deviations.
    * **80-87:** Very Good Swing. Solid fundamentals with a few minor, identifiable areas for improvement.
    * **70-79:** Competent Swing. Functional mechanics, but with noticeable flaws.
    * **60-69:** Developing Swing. Some correct elements, but significant issues.
    * **50-59:** Inconsistent Swing. Major flaws in multiple areas.
    * **Below 50:** Beginner Swing. Fundamental issues.

2. Score each of the following metrics from 0-100 using these specific criteria:

   - backswing: Evaluate the takeaway, wrist position, and backswing plane. How does this affect the swing's potential power and accuracy?
     * 90+: Perfect takeaway, ideal wrist cock, on-plane movement
     * 70-89: Good fundamentals with minor flaws in plane or wrist position
     * 50-69: Functional but with clear issues in takeaway or plane
     * <50: Significant flaws causing compensations

   - stance: Assess foot position, width, weight distribution, and posture. How does this stance support balance and power generation?
     * 90+: Perfect athletic posture, ideal width and alignment
     * 70-89: Good posture with minor alignment or width issues
     * 50-69: Basic posture established but with noticeable flaws
     * <50: Poor posture affecting the entire swing

   - grip: Evaluate hand placement, pressure, and wrist position. How does the grip influence clubface control and swing path?
     * 90+: Textbook grip with ideal pressure and hand placement
     * 70-89: Functional grip with minor issues in hand position
     * 50-69: Basic grip established but with pressure or placement issues
     * <50: Fundamentally flawed grip requiring rebuilding

   - swingBack: Rate the rotation, plane, and position at the top. Does this position maximize power and set up a good downswing?
     * 90+: Perfect rotation with ideal club position at the top
     * 70-89: Good rotation with minor plane issues
     * 50-69: Functional but with restricted turn or off-plane issues
     * <50: Severely restricted or off-plane

   - swingForward: Evaluate the downswing path, transition, and follow through. Does the downswing sequence efficiently transfer energy to the ball?
     * 90+: Perfect sequencing and path through impact
     * 70-89: Good sequencing with minor path issues
     * 50-69: Basic sequencing but with timing or path issues
     * <50: Poor sequencing with major path flaws

   - hipRotation: Assess the hip turn both in backswing and through impact. How does hip rotation contribute to power and swing speed?
     * 90+: Perfect hip loading and explosive rotation through impact
     * 70-89: Good rotation with minor timing or restriction issues
     * 50-69: Basic rotation but with clear restrictions
     * <50: Minimal hip involvement

   - swingSpeed: Rate the tempo and acceleration through the ball. Is the swing speed appropriate for the club and does it indicate efficient power transfer?
     * 90+: Perfect tempo with ideal acceleration through impact
     * 70-89: Good tempo with minor acceleration issues
     * 50-69: Inconsistent tempo affecting clubhead speed
     * <50: Poor tempo with deceleration issues

   - shallowing: Evaluate club path and shaft position in the downswing. Does the shallowing action promote optimal contact?
     * 90+: Perfect shallowing with ideal shaft plane
     * 70-89: Good shallowing with minor steepness issues
     * 50-69: Inconsistent shallowing with occasional steepness
     * <50: Consistently steep or incorrect shallowing

   - pacing: Rate the overall rhythm and timing of the swing. Does the rhythm support consistent and powerful swings?
     * 90+: Perfect rhythm throughout with ideal transitions
     * 70-89: Good rhythm with minor timing issues
     * 50-69: Functional but with rushed or slow segments
     * <50: Disjointed or poorly timed

   - confidence: Assess the decisiveness and commitment to the swing. Is the golfer confident and committed to the swing?
     * 90+: Complete commitment with precise setup routine
     * 70-89: Good commitment with occasional hesitation
     * 50-69: Basic commitment but with visible uncertainty
     * <50: Tentative throughout

   - focus: Evaluate setup routine and swing execution. Is the golfer focused and attentive throughout the swing?
     * 90+: Laser focus throughout with perfect routine
     * 70-89: Good focus with minor lapses
     * 50-69: Basic focus but with visible distractions
     * <50: Unfocused or inconsistent attention

3. Provide three specific, actionable recommendations for improvement.${clubInfo}

IMPORTANT INSTRUCTIONS:
- Be precise and discriminating in your scoring. AVOID defaulting to the 70-75 range for all metrics.
- Each metric should show appropriate variance based on skill level.
- The overall score should NOT be a simple average of the metrics.
- Focus on what you actually observe, not what you assume might be happening.
- Maintain consistency in how you evaluate similar swings.
- Evaluate the kinematic sequence (legs, hips, torso, arms, club) and how efficiently the golfer transfers energy.
- For pro-level swings, look for a wide backswing, lag in the downswing, a square clubface at impact, and a balanced follow-through. Pro swings often exhibit high clubhead speed, minimal energy leaks, and efficient power transfer.
- If the video is unclear, note "Video unclear" but provide as much analysis as possible.
- A driver swing should have a wider arc and a shallower angle of attack than a wedge swing. Evaluate if the swing mechanics are appropriate for the club being used.
- Do not assume the skill level of the golfer. Focus only on the mechanics of the swing in the video.
- Analyze this *single* golf swing. Do not evaluate the golfer's consistency over multiple swings.

Format your response ONLY as a valid JSON object with this exact structure:
{
  "overallScore": 75,
  "metrics": {
    "backswing": 70,
    "stance": 80,
    "grip": 75,
    "swingBack": 65,
    "swingForward": 70,
    "hipRotation": 60,
    "swingSpeed": 75,
    "shallowing": 65,
    "pacing": 80,
    "confidence": 85,
    "focus": 80
  },
  "recommendations": [
    "Keep your left arm straighter during the backswing",
    "Rotate your hips more aggressively through impact",
    "Maintain a more consistent tempo throughout your swing"
  ]
}`;

        // Build enhanced prompt using reference models if available
        let enhancedPromptText = promptText;
        
        if (Object.keys(referenceModels).length > 0) {
          let referenceSection = "\n\n* Use these professional reference guidelines for scoring specific metrics:";
          
          Object.entries(referenceModels).forEach(([metricKey, modelData]) => {
            if (modelData.referenceAnalysis) {
              const analysis = modelData.referenceAnalysis;
              
              referenceSection += `\n\n* ${metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} (0-100):`;
              referenceSection += `\n  * Technical Guidelines: ${analysis.technicalGuidelines.slice(0, 3).join('; ')}`;
              referenceSection += `\n  * Ideal Form: ${analysis.idealForm.slice(0, 2).join('; ')}`;
              referenceSection += `\n  * Common Mistakes: ${analysis.commonMistakes.slice(0, 2).join('; ')}`;
              
              if (analysis.scoringRubric) {
                referenceSection += `\n  * Scoring Criteria:`;
                referenceSection += `\n    * 90+: ${analysis.scoringRubric['90+']}`;
                referenceSection += `\n    * 70-89: ${analysis.scoringRubric['70-89']}`;
                referenceSection += `\n    * 50-69: ${analysis.scoringRubric['50-69']}`;
                referenceSection += `\n    * <50: ${analysis.scoringRubric['<50']}`;
              }
            }
          });
          
          enhancedPromptText += referenceSection;
        }

        let payload;

        if (isYouTubeAnalysis) {
            console.log('Starting YouTube video analysis:', metadata.youtubeVideo.videoId);
            console.log('File details: YouTube video');
             if (!metadata || !metadata.youtubeVideo || !metadata.youtubeVideo.videoId) {
                console.error('YouTube metadata is missing or incomplete');
                return createMockAnalysis(videoFile, metadata);
            }
            payload = {
                contents: [
                    {
                        parts: [
                            { text: enhancedPromptText },
                            {
                                fileData: {
                                    mimeType: "video/*",
                                    fileUri: `https://youtu.be/${metadata.youtubeVideo.videoId}`, // Correct URL format
                                },
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 2048
                }
            };

        } else {
            if (!videoFile) {
                console.error('No video file provided and not a YouTube video');
                return createMockAnalysis(null, metadata);
            }

            console.log('Starting file video analysis, file type:', videoFile.type);
            console.log('File details:', {
                name: videoFile.name,
                type: videoFile.type,
                size: `${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`,
                lastModified: new Date(videoFile.lastModified).toISOString()
            });

            let base64Video;
            try {
                base64Video = await fileToBase64(videoFile);
                console.log('Successfully converted video to base64');
            } catch (error) {
                console.error('Error converting file to base64:', error);
                return createMockAnalysis(videoFile, metadata);
            }

            const base64Data = base64Video.split('base64,')[1];
            if (!base64Data) {
                console.error('Failed to extract base64 data from video');
                return createMockAnalysis(videoFile, metadata);
            }

            payload = {
                contents: [
                    {
                        parts: [
                            { text: enhancedPromptText },
                            {
                                inlineData: {
                                    mimeType: videoFile.type,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 2048
                }
            };
        }

        console.log('Sending request to Gemini API...');

        try {
            const response = await axios.post(
                `${API_URL}?key=${API_KEY}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            console.log('Received response from Gemini API');

            if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
                console.error('Invalid API response structure:', response.data);
                return createMockAnalysis(videoFile, metadata);
            }

            const textResponse = response.data.candidates[0].content.parts[0].text;
            if (!textResponse) {
                console.error('No text in API response');
                return createMockAnalysis(videoFile, metadata);
            }

            console.log('Parsing response text to JSON...');

            let analysisData;
            try {
                try {
                    analysisData = JSON.parse(textResponse);
                } catch (e) {
                    const jsonStart = textResponse.indexOf('{');
                    const jsonEnd = textResponse.lastIndexOf('}') + 1;

                    if (jsonStart === -1 || jsonEnd <= jsonStart) {
                        console.error('No valid JSON found in response');
                        console.error('Raw response:', textResponse);
                        return createMockAnalysis(videoFile, metadata);
                    }

                    const jsonString = textResponse.substring(jsonStart, jsonEnd);
                    analysisData = JSON.parse(jsonString);
                }

                if (!analysisData.overallScore || !analysisData.metrics || !analysisData.recommendations) {
                    console.error('Parsed data missing required fields:', analysisData);
                    return createMockAnalysis(videoFile, metadata);
                }

                if (videoFile) {
                    analysisData = normalizeAndValidateScores(analysisData);
                    analysisData = ensureConsistentAnalysis(analysisData, videoFile);
                } else {
                  // For YouTube videos, just normalize the scores
                  analysisData = normalizeAndValidateScores(analysisData);
                }

                // INSERT THE NEW CALL HERE - right after all other score processing
                analysisData = await applyFeedbackAdjustments(analysisData);


                if (!Array.isArray(analysisData.recommendations) || analysisData.recommendations.length < 1) {
                    analysisData.recommendations = [
                        "Work on your overall swing mechanics",
                        "Practice your timing and rhythm",
                        "Focus on maintaining proper form throughout your swing"
                    ];
                } else if (analysisData.recommendations.length > 3) {
                    analysisData.recommendations = analysisData.recommendations.slice(0, 3);
                }

                console.log('Successfully parsed analysis data');
            } catch (error) {
                console.error('Error parsing API response:', error);
                console.error('Raw response text:', textResponse);
                return createMockAnalysis(videoFile, metadata);
            }


            const recordedDate = metadata?.recordedDate || new Date();

            let finalAnalysis = {
                ...analysisData,
                id: Date.now().toString(),
                date: new Date().toISOString(),
                recordedDate: recordedDate instanceof Date ? recordedDate.toISOString() : recordedDate,
                clubName: metadata?.clubName || null,
                clubId: metadata?.clubId || null,
                clubType: metadata?.clubType || null,
                outcome: metadata?.outcome || null
            };

            if (isYouTubeAnalysis) {
                finalAnalysis = {
                    ...finalAnalysis,
                    videoUrl: metadata.youtubeVideo.embedUrl, // Use embed URL
                    youtubeVideoId: metadata.youtubeVideo.videoId,
                    isYouTubeVideo: true
                };
            } else {
                finalAnalysis.videoUrl = URL.createObjectURL(videoFile);
            }
            return finalAnalysis;

        } catch (error) {
            console.error('Error in API request:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);

            if (error.response?.data?.error?.message?.includes('size') ||
                error.response?.status === 413) {
                console.error('The API rejected the file due to size limitations');
            }

            return createMockAnalysis(videoFile, metadata);
        }
    } catch (error) {
        console.error('Unexpected error in analyzeGolfSwing:', error);
        return createMockAnalysis(videoFile, metadata);
    }
};

// Fix for createMockAnalysis function in geminiService.js
// Add a mockResult object

/**
 * Create mock analysis data that handles both file and YouTube inputs
 * @param {File|null} videoFile - The video file or null for YouTube
 * @param {Object} metadata - Additional metadata including YouTube info if applicable
 * @returns {Object} Mock analysis data
 */
const createMockAnalysis = (videoFile, metadata = null) => {
  console.log('Generating mock analysis data');
  
  // Determine if this is a YouTube analysis
  const isYouTubeAnalysis = !videoFile && metadata?.youtubeVideo;
    console.log('Is YouTube Analysis:', isYouTubeAnalysis);
    console.log('VideoFile:', videoFile);
    console.log('Metadata:', JSON.stringify(metadata));

  // Extract date information from metadata if available
  const recordedDate = metadata?.recordedDate || new Date();

  // Generate a base skill level that will inform all metrics
  // Using a normal distribution centered around different values based on club type
  let baseSkillLevel = 65; // Default baseline
  
  // Adjust baseline based on club type if available
  if (metadata?.clubType) {
    switch(metadata.clubType) {
      case 'Wood':
        // Woods are typically harder, so lower baseline
        baseSkillLevel = 60 + (Math.random() * 10 - 5);
        break;
      case 'Iron':
        // Irons are middle difficulty
        baseSkillLevel = 65 + (Math.random() * 10 - 5);
        break;
      case 'Wedge':
        // Short game might be better for amateurs
        baseSkillLevel = 68 + (Math.random() * 10 - 5);
        break;
      case 'Putter':
        // Putting can vary widely
        baseSkillLevel = 70 + (Math.random() * 16 - 8);
        break;
      default:
        baseSkillLevel = 65 + (Math.random() * 10 - 5);
    }
  }
  
  // Create realistic variations between metrics
  // Define metric groups that should be correlated
  const metricGroups = {
    setup: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['stance', 'grip', 'ballPosition'] },
    swing: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['backswing', 'swingBack', 'swingForward', 'shallowing'] },
    body: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['hipRotation', 'pacing', 'followThrough', 'headPosition', 'shoulderPosition', 'armPosition'] },
    mental: { base: baseSkillLevel + (Math.random() * 14 - 7), metrics: ['confidence', 'focus'] }
  };
  
  // Generate each metric with appropriate variation
  const metrics = {};
  
  // Process each group
  Object.entries(metricGroups).forEach(([groupName, group]) => {
    const groupBase = group.base;
    
    // Add individual metrics with realistic variance
    group.metrics.forEach(metric => {
      // Create plausible variance within the group
      // Bigger variance for mental factors, smaller for physical ones
      const variance = groupName === 'mental' ? 12 : 8;
      
      // Generate score with BoxMuller to create a normal distribution
      let u1 = Math.random();
      let u2 = Math.random();
      let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      let metricScore = Math.round(groupBase + z0 * (variance / 3)); // 3 sigma
      
      // Ensure within bounds
      metrics[metric] = Math.max(30, Math.min(95, metricScore));
    });
  });
  
  // If some key metrics are missing, add them with default values
  const essentialMetrics = ['backswing', 'stance', 'grip', 'swingBack', 'swingForward', 
                           'hipRotation', 'swingSpeed', 'shallowing', 'pacing', 'confidence', 'focus'];
  
  essentialMetrics.forEach(metric => {
    if (!metrics[metric]) {
      metrics[metric] = Math.max(30, Math.min(95, Math.round(baseSkillLevel + (Math.random() * 20 - 10))));
    }
  });
  
  // Special cases based on club type
  if (metadata?.clubType === 'Wood') {
    // Woods typically need more clubhead speed and proper shallowing
    metrics.swingSpeed = Math.min(95, metrics.swingSpeed + Math.floor(Math.random() * 8));
    metrics.shallowing = Math.max(30, metrics.shallowing - Math.floor(Math.random() * 10));
  } else if (metadata?.clubType === 'Iron') {
    // Irons need good impact position
    metrics.swingForward = Math.min(95, metrics.swingForward + Math.floor(Math.random() * 5));
  } else if (metadata?.clubType === 'Wedge') {
    // Wedges need good wrist control
    metrics.grip = Math.min(95, metrics.grip + Math.floor(Math.random() * 7));
  } else if (metadata?.clubType === 'Putter') {
    // Putting is more about mental and pace
    metrics.pacing = Math.min(95, metrics.pacing + Math.floor(Math.random() * 10));
    metrics.focus = Math.min(95, metrics.focus + Math.floor(Math.random() * 10));
  }
  
  // Generate realistic overall score with appropriate weighting
  // Not just an average but weighted toward the more important aspects
  const overallScore = calculateWeightedOverallScore ? 
    calculateWeightedOverallScore(metrics) :
    Math.round(Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length);
  
  // Default recommendations if generateRecommendations is not defined
  const defaultRecommendations = [
    "Focus on a slower, more controlled takeaway",
    "Keep your left arm straighter during the backswing",
    "Work on maintaining your spine angle throughout the swing"
  ];
  
  // Generate recommendations based on low metrics if possible
  let recommendations = defaultRecommendations;
  
  // Create sorted list of metrics by score
  const sortedMetrics = Object.entries(metrics).sort((a, b) => a[1] - b[1]);
  
  // Take lowest metrics for recommendations
  const lowestMetrics = sortedMetrics.slice(0, 3);
  
  // Map of recommendation templates by metric
  const recommendationTemplates = {
    backswing: [
      "Focus on a slower, more controlled takeaway",
      "Keep your left arm straighter during the backswing",
      "Work on proper wrist hinge in your backswing"
    ],
    stance: [
      "Widen your stance slightly for better balance",
      "Adjust your posture to be more athletic at address",
      "Work on proper weight distribution in your stance"
    ],
    grip: [
      "Check your grip pressure - avoid gripping too tightly",
      "Ensure your hands work together as a unit during the swing",
      "Position your hands slightly ahead of the ball at address"
    ],
    swingBack: [
      "Focus on a full shoulder turn in your backswing",
      "Maintain your spine angle during the backswing",
      "Work on getting the club in the correct position at the top"
    ],
    swingForward: [
      "Start your downswing with your lower body",
      "Work on proper weight transfer to your lead side",
      "Focus on rotating through impact with your body"
    ],
    hipRotation: [
      "Increase your hip turn in the backswing",
      "Work on clearing your hips through impact",
      "Practice proper hip-shoulder separation"
    ],
    swingSpeed: [
      "Develop a smoother tempo for more consistent speed",
      "Work on maintaining acceleration through impact",
      "Practice swinging at 80% effort for better control"
    ],
    shallowing: [
      "Focus on dropping the club into the slot on the downswing",
      "Avoid casting the club from the top",
      "Work on the proper sequence to shallow the club"
    ],
    pacing: [
      "Develop a consistent pre-shot routine",
      "Count to establish a consistent tempo",
      "Practice with a metronome to develop rhythm"
    ],
    focus: [
      "Establish a consistent pre-shot routine",
      "Stay focused on your target throughout the swing",
      "Practice mindfulness techniques to improve focus"
    ],
    confidence: [
      "Commit fully to each shot before you swing",
      "Visualize the shot you want to hit before addressing the ball",
      "Practice positive self-talk during your round"
    ]
  };
  
  // Try to generate recommendations from templates
  try {
    recommendations = lowestMetrics.map(([metric]) => {
      const templates = recommendationTemplates[metric] || defaultRecommendations;
      return templates[Math.floor(Math.random() * templates.length)];
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    recommendations = defaultRecommendations;
  }

  // Create the mockResult object
  const mockResult = {
    id: Date.now().toString(),
    date: new Date().toISOString(), // Analysis date (now)
    recordedDate: recordedDate instanceof Date ? recordedDate.toISOString() : recordedDate,
    overallScore: Math.round(overallScore), // Ensure it's an integer
    metrics,
    recommendations,
    clubName: metadata?.clubName || null,
    clubId: metadata?.clubId || null,
    clubType: metadata?.clubType || null,
    outcome: metadata?.outcome || null,
    _isMockData: true // Flag to indicate this is mock data
  };

  if (isYouTubeAnalysis) {
    return {
      ...mockResult,
      videoUrl: metadata.youtubeVideo.embedUrl,
      youtubeVideoId: metadata.youtubeVideo.videoId,
      isYouTubeVideo: true
    };
  } else {
    return {
      ...mockResult,
      videoUrl: videoFile ? URL.createObjectURL(videoFile) : null
    };
  }
};

/**
 * Gets the appropriate adjustment context for a swing analysis
 * @param {Object} analysisData - The analysis data being adjusted
 * @returns {Promise<Object>} Context object for adjustment decisions
 */
const getAdjustmentContext = async (analysisData) => {
  try {
    // Default context
    const defaultContext = {
      isProSwing: isLikelyProGolferSwing(analysisData),
      skillLevel: 'amateur',
      adjustmentPriority: 'as-needed',
      confidenceLevel: 3,
      
      // Check if this is a YouTube swing
      isYouTubeVideo: analysisData.isYouTubeVideo || false,
      
      // Generate video signature for identifying repeat analyses
      videoSignature: analysisData.youtubeVideoId || generateVideoSignature(analysisData)
    };
    
    // For unauthenticated users, return the default context
    if (!auth.currentUser) {
      return defaultContext;
    }
    
    // For authenticated users, check if we have previous feedback for this specific swing
    try {
      // Query for feedback on this specific swing
      const swingFeedbackQuery = query(
        collection(db, 'analysis_feedback'),
        where('userId', '==', auth.currentUser.uid),
        where('videoSignature', '==', defaultContext.videoSignature),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const swingFeedback = await getDocs(swingFeedbackQuery);
      
      if (!swingFeedback.empty) {
        // Found feedback for this specific swing
        const feedbackData = swingFeedback.docs[0].data();
        
        // Use feedback-specific settings
        return {
          ...defaultContext,
          isProSwing: feedbackData.isProSwing || defaultContext.isProSwing,
          skillLevel: feedbackData.skillLevel || defaultContext.skillLevel,
          adjustmentPriority: feedbackData.adjustmentPriority || defaultContext.adjustmentPriority,
          confidenceLevel: feedbackData.confidenceLevel || defaultContext.confidenceLevel,
          
          // Flag to indicate we have specific feedback for this swing
          hasSpecificFeedback: true
        };
      }
      
      // If no specific feedback, check user preferences
      const userPrefs = await getUserAdjustmentPreferences(auth.currentUser.uid);
      
      if (userPrefs) {
        return {
          ...defaultContext,
          ...userPrefs
        };
      }
    } catch (error) {
      console.error("Error fetching feedback for context:", error);
      // Continue with default context on error
    }
    
    return defaultContext;
  } catch (error) {
    console.error("Error in getAdjustmentContext:", error);
    // Return a default context on error
    return {
      isProSwing: false,
      skillLevel: 'amateur',
      adjustmentPriority: 'as-needed',
      confidenceLevel: 3,
      isYouTubeVideo: analysisData.isYouTubeVideo || false
    };
  }
};

/**
 * Convert a file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Promise that resolves to the base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Collect user feedback on swing analysis to improve the model
 * @param {Object} swingData - The swing analysis data
 * @param {String} feedbackType - 'accurate', 'too_high', 'too_low'
 * @param {Object} metricFeedback - Feedback on specific metrics
 * @param {Object} additionalFeedback - Additional feedback data
 * @returns {Promise<boolean>} Success status
 */
const collectAnalysisFeedback = async (swingData, feedbackType, metricFeedback = {}, additionalFeedback = {}) => {
  if (!swingData) return false;
  
  try {
    // Create feedback document
    const feedbackData = {
      timestamp: serverTimestamp(),
      swingId: swingData.id || null,
      userId: auth.currentUser ? auth.currentUser.uid : null,
      feedbackType, // 'accurate', 'too_high', 'too_low'
      overallScore: swingData.overallScore,
      originalMetrics: {...swingData.metrics},
      metricFeedback, // e.g. { backswing: 'too_high', grip: 'accurate' }
      clubType: swingData.clubType || null,
      clubName: swingData.clubName || null,
      
      // New fields for enhanced feedback
      isProSwing: additionalFeedback.isProSwing || false,
      skillLevel: additionalFeedback.skillLevel || 'amateur',
      confidenceLevel: additionalFeedback.confidenceLevel || 3,
      adjustmentPriority: additionalFeedback.adjustmentPriority || 'as-needed',
      additionalNotes: additionalFeedback.additionalNotes || '',
      
      modelVersion: 'gemini-2.0-flash-exp', // Track which model version was used
      
      // Additional metadata that might help with adjustments
      submittedAt: new Date().toISOString(),
      isYouTubeVideo: swingData.isYouTubeVideo || false,
      videoSignature: swingData.youtubeVideoId || generateVideoSignature(swingData)
    };

    if (!auth.currentUser && !swingData._isLocalOnly) {
      console.log('Cannot save feedback for unauthenticated users');
      return true; // Pretend success but don't actually try to save
    }
    
    // Store in Firestore
    await addDoc(collection(db, 'analysis_feedback'), feedbackData);
    console.log('Feedback saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving feedback:', error);
    return false;
  }
};

/**
 * Generate a unique signature for a video to identify it
 * @param {Object} swingData - The swing data with video information
 * @returns {string} A unique signature for the video
 */
const generateVideoSignature = (swingData) => {
  // For file uploads, use basic metadata
  if (swingData.videoUrl && !swingData.isYouTubeVideo) {
    // Create a hash from available data
    const videoInfo = [
      swingData.overallScore,
      Object.entries(swingData.metrics).map(([k, v]) => `${k}:${v}`).join('|'),
      swingData.date,
      swingData.recordedDate
    ].join('_');
    
    return `video_${hashString(videoInfo)}`;
  }
  
  // Return a default signature
  return `swing_${Date.now()}`;
};

/**
 * Simple string hashing function
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// New function to enhance the metricDetails with analysis from reference videos
const enhanceMetricDetailsWithReferenceAnalysis = async () => {
  // For each metric in metricDetails
  for (const [metricKey, metricInfo] of Object.entries(metricDetails)) {
    if (metricInfo.exampleUrl) {
      try {
        console.log(`Analyzing reference video for ${metricKey}: ${metricInfo.exampleUrl}`);
        
        // Extract YouTube video ID
        const videoId = extractYouTubeVideoId(metricInfo.exampleUrl);
        
        if (!videoId) {
          console.error(`Invalid YouTube URL for ${metricKey}`);
          continue;
        }
        
        // Create payload for analysis request
        const payload = {
          // Similar to your existing API call but more specialized
          contents: [{
            parts: [
              { 
                text: `Analyze this specific golf instructional video focusing ONLY on ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()}. 
                Extract key technical points, ideal form indicators, common mistakes, and coaching cues.
                Provide detailed analysis of what perfect technique looks like for this specific aspect.`
              },
              {
                fileData: {
                  mimeType: "video/*",
                  fileUri: `https://youtu.be/${videoId}`,
                }
              }
            ]
          }]
        };
        
        // Call the AI API
        const response = await axios.post(
          `${API_URL}?key=${API_KEY}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000
          }
        );
        
        // Process and store the analysis
        const analysis = processReferenceVideoAnalysis(response.data, metricKey);
        
        // Update metricDetails with enhanced information
        metricDetails[metricKey] = {
          ...metricInfo,
          referenceAnalysis: analysis,
          lastAnalyzed: new Date().toISOString()
        };
        
        // Store in Firestore for future use
        await setDoc(doc(db, 'reference_models', metricKey), {
          ...metricDetails[metricKey],
          updatedAt: serverTimestamp()
        });
        
        console.log(`Successfully enhanced reference data for ${metricKey}`);
      } catch (error) {
        console.error(`Error analyzing reference video for ${metricKey}:`, error);
      }
    }
  }
  
  return metricDetails;
};

// ADD THESE FUNCTIONS (Implementations from Solution Part 1)
const extractTechnicalGuidelines = (textResponse) => {
  // Example logic (adjust to your API response format):
  const match = textResponse.match(/Technical Guidelines:\s*([\s\S]*?)(?:\n\n|\Z)/);
  if (match) {
    return match[1].split(';').map(s => s.trim()).filter(s => s); // Split and trim
  }
  return [];
};

const extractIdealForm = (textResponse) => {
  // Example logic (adjust to your API response format):
  const match = textResponse.match(/Ideal Form:\s*([\s\S]*?)(?:\n\n|\Z)/);
    if (match) {
        return match[1].split(';').map(item => item.trim()).filter(item => item); // Split by ';', trim, and filter out empty strings.
    }
    return [];
};

const extractCommonMistakes = (textResponse) => {
  // Example logic (adjust to your API response format):
  const match = textResponse.match(/Common Mistakes:\s*([\s\S]*?)(?:\n\n|\Z)/);
    if (match) {
        return match[1].split(';').map(item => item.trim()).filter(item => item); // Split by ';', trim, and filter out empty strings.
    }
    return [];
};

const extractCoachingCues = (textResponse) => {
  // Example logic (adjust to your API response format):
  const match = textResponse.match(/Coaching Cues:\s*([\s\S]*?)(?:\n\n|\Z)/);
  if (match) {
        return match[1].split(';').map(item => item.trim()).filter(item => item); // Split by ';', trim, and filter out empty strings.
    }
    return [];
};

const generateScoringRubric = (textResponse, metricKey) => {
  // Example logic (adjust to your API response format):
    const rubric = {};
    const regex = /(\d+\+?)\s*[:-]\s*([\s\S]*?)(?:\n\n|\Z)/g;
    let match;

    while ((match = regex.exec(textResponse)) !== null) {
        rubric[match[1]] = match[2].trim();
    }

    return rubric;
};
// Process the AI's analysis of the reference video
const processReferenceVideoAnalysis = (responseData, metricKey) => {
  try {
    // Extract the text from the response
    const textResponse = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('No text in API response');
      return null;
    }
    
    // Structure the analysis for use in future evaluations
    return {
      technicalGuidelines: extractTechnicalGuidelines(textResponse),
      idealForm: extractIdealForm(textResponse),
      commonMistakes: extractCommonMistakes(textResponse),
      coachingCues: extractCoachingCues(textResponse),
      scoringRubric: generateScoringRubric(textResponse, metricKey)
    };
  } catch (error) {
    console.error('Error processing reference video analysis:', error);
    return null;
  }
};

// Enhanced metric descriptions and prompts from the Swing Recipe document
// Update to metricDetails object in geminiService.js

const metricDetails = {
  confidence: {
    category: "Mental",
    weighting: "5.88%",
    difficulty: 7,
    description: "This is focused on the mental side of the game. Confidence is key to not be phased by the pressure of the game, being able to stick to your fundamentals and not get in your head after a bad shot.",
    exampleUrl: "https://www.youtube.com/watch?v=y95_Us_qCpQ"
  },
  focus: {
    category: "Mental",
    weighting: "5.88%",
    difficulty: 4,
    description: "This is also focused on the mental side of the game. This is the ability to hone in on where you want to hit your shot and your concentration on the ball. Staying focused means you aren't bouncing your eyes around but remain focused on the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=SLbeLgQls_4"
  },
  stiffness: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 5,
    description: "Your ability to remove tension from your body during your swing. You don't want to be too tight or else it will limit your body from being able to swing properly. But you also don't want your body to be too loose or else you will sacrifice other fundamentals of your swing.",
    exampleUrl: "https://www.youtube.com/watch?v=trOLRAPi07M"
  },
  stance: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 2,
    description: "This is the proper set up before your swing. You want to be the right distance between you and the ball. This includes your feet around shoulder width apart with your club at roughly a 45 degree angle and your hands lined up underneath your head.",
    exampleUrl: "https://www.youtube.com/watch?v=P4d5TjzEgtk"
  },
  grip: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 3,
    description: "You should be using an interlocking golf grip instead of holding the club like a baseball bat. This will create a consistent swing and keep the club and your hands from rotating too much during your swing.",
    exampleUrl: "https://www.youtube.com/watch?v=nd6y-5nInHQ"
  },
  ballPosition: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 1,
    description: "You want to stand the right distance from the ball as you set up to take your shot. This should be so the club is at roughly a 45 degree angle from the ball and that the ball is positioned different based on the club you are using - a driver should have the ball closer to your lead foot while a short range club will have the ball more in between your feet. You also need to stand closer to the ball with short range clubs compared to a driver/long range clubs where you stand further away.",
    exampleUrl: "https://www.youtube.com/watch?v=UdZfTKBfGho"
  },
  clubTrajectoryBackswing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 8,
    description: "The path and position of the club during the backswing phase. This involves the takeaway, wrist position, and backswing plane.",
    exampleUrl: "https://www.youtube.com/watch?v=oszzApkv54s"
  },
  clubTrajectoryForswing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 8,
    description: "The path and position of the club during the forward swing phase, as you begin to swing towards the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=ASH-gJXbMSU" // Added example URL
  },
  swingSpeed: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 7,
    description: "The velocity and acceleration of the club throughout the swing, particularly at impact.",
    exampleUrl: "https://www.youtube.com/watch?v=vZ5pMtD2wKQ" // Added example URL
  },
  shallowing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 9,
    description: "How well the club 'shallows' or drops into the correct path during the downswing.",
    exampleUrl: "https://www.youtube.com/watch?v=V2PtvBiYWNM" // Added example URL
  },
  impactPosition: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 10,
    description: "The position and angle of the club at the moment of impact with the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=gXD-uxUloos" // Added example URL
  },
  hipRotation: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "How effectively the hips rotate during the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=iEyIDzGjyRE" // Added example URL
  },
  pacing: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The overall rhythm and timing of your swing to ensure proper technique.",
    exampleUrl: "https://www.youtube.com/watch?v=AzdeJrIdkU4" // Added example URL
  },
  followThrough: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The completion of the swing after impact with the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=o9H0T_n2KIQ" // Added example URL
  },
  headPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The position and stability of your head throughout the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=y_PNrUtxSxE" // Added example URL
  },
  shoulderPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The position and movement of your shoulders through the swing.",
    exampleUrl: "https://www.youtube.com/watch?v=dhOvT8cXp_c" // Added example URL
  },
  armPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The proper positioning of your arms throughout the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=ASoOQdQJ4m0" // Added example URL
  }
};

// Map from our code's metric keys to the swing recipe metrics
// Enhanced metric key mapping to ensure all metrics are properly mapped
const metricKeyMapping = {
  // Current mappings
  backswing: "clubTrajectoryBackswing",
  swingBack: "clubTrajectoryBackswing",
  swingForward: "clubTrajectoryForswing",
  
  // Additional mappings for consistency
  hipRotation: "hipRotation",
  swingSpeed: "swingSpeed",
  shallowing: "shallowing",
  pacing: "pacing",
  confidence: "confidence",
  focus: "focus",
  stance: "stance",
  grip: "grip",
  shoulderPosition: "shoulderPosition",
  armPosition: "armPosition",
  headPosition: "headPosition",
  followThrough: "followThrough",
  impactPosition: "impactPosition",
  ballPosition: "ballPosition",
  stiffness: "stiffness"
};


/**
 * Enhanced metric insights generator that uses the Swing Recipe information
 * @param {Object} swingData - The complete swing analysis data
 * @param {string} metricKey - The specific metric to generate insights for
 * @returns {Promise<Object>} Detailed insights for the metric
 */
const generateMetricInsights = async (swingData, metricKey) => {
  try {
    // Sanitize and validate input
    if (!swingData || !metricKey) {
      console.error('Invalid input: Missing swingData or metricKey');
      return getDefaultInsights(metricKey);
    }

    // Check for video source priority:
    // 1. _temporaryVideoUrl - created specifically for analysis of non-user swings
    // 2. regular videoUrl - for user's own swings or YouTube videos
    // 3. video reference from DOM - if passed in the enhanced swing data
    const videoUrl = swingData._temporaryVideoUrl || swingData.videoUrl;

    // Determine if this is a YouTube video
    const isYouTubeVideo = swingData.isYouTubeVideo || 
                           (videoUrl && videoUrl.includes('youtube.com'));
    
    // Log the video URL being used
    console.log(`Using video URL for analysis: ${isYouTubeVideo ? 'YouTube' : (videoUrl || 'None')}`);

    // Ensure the metric value is a number and within 0-100 range
    const metricValue = Number(swingData.metrics[metricKey] || 0);
    const safeMetricValue = Math.max(0, Math.min(100, metricValue));

    // Check if video URL exists and is valid
    const hasVideo = Boolean(videoUrl) && videoUrl !== 'non-user-swing';
    console.log('Video URL available:', hasVideo);

    // Get the swing recipe metric key if available
    const swingRecipeKey = metricKeyMapping[metricKey] || metricKey;
    
    // Get detailed information about this metric from our swing recipe
    const metricInfo = metricDetails[swingRecipeKey] || null;
    const metricDescription = metricInfo?.description || getGenericMetricDescription(metricKey);
    const metricCategory = metricInfo?.category || "Unknown";
    const metricDifficulty = metricInfo?.difficulty || 5;
    const metricWeight = metricInfo?.weighting || "5.88%";
    const exampleUrl = metricInfo?.exampleUrl || null;

    // Try to fetch the video as base64 if available
    // Try to fetch the video as base64 if available
    let base64Video;
    if (hasVideo && !isYouTubeVideo) {
      try {
        // Only try to fetch video if it's not YouTube
        const response = await fetch(videoUrl);
        const videoBlob = await response.blob();
        base64Video = await blobToBase64(videoBlob);
        console.log('Successfully converted video to base64');
      } catch (error) {
        console.error('Error converting video to base64:', error);
        console.log('Falling back to score-based analysis without video');
        
        // Check if this is a non-user swing without authentication
        const isUnauthenticatedFriendSwing = swingData._isLocalOnly && 
                                           (swingData.swingOwnership === 'other' || 
                                            swingData.swingOwnership === 'pro');
        
        // If this is an unauthenticated user viewing a friend's swing, add adoption messaging
        if (isUnauthenticatedFriendSwing) {
          const defaultInsights = getDefaultInsights(metricKey);
          
          // Add account creation prompt to default insights
          const accountPrompt = [
            "For AI-powered deep dive analysis of your friend's swings, please create your own account.",
            "Sign up to unlock advanced video-based metric insights and save your progress!"
          ];
          
          // Add this prompt to various sections of insights
          return {
            ...defaultInsights,
            technicalBreakdown: [
              ...accountPrompt,
              ...defaultInsights.technicalBreakdown
            ],
            recommendations: [
              ...accountPrompt,
              ...defaultInsights.recommendations
            ]
          };
        }
      }
    } else if (isYouTubeVideo) {
      console.log('YouTube video detected - using URL-based analysis instead of video content');
      // For YouTube videos, we'll rely on the prompt without video content
    }

    // Rest of the function remains the same...
    // ... 
    // (Format prompt, send to API, process response, etc.)

    // Format the metric name for better readability
    const metricName = metricKey.replace(/([A-Z])/g, ' $1').toLowerCase();

    // Create the content for the coaching prompt
    let coachingPrompt = `You are the most renowned golf coach and instructor in the world. You know how to adjust your recommendations based on the type of player and how good they are as a golfer.`;
    
    if (metricInfo) {
      coachingPrompt += `\n\nYou're analyzing the "${metricName}" aspect of the swing, which is categorized as a "${metricCategory}" element with a difficulty rating of ${metricDifficulty}/10 and represents ${metricWeight} of the overall swing.`;
      coachingPrompt += `\n\n${metricDescription}`;
    }

    if (exampleUrl) {
      coachingPrompt += `\n\nAn example of how to provide guidance on this is available at ${exampleUrl}, but you should also draw from your extensive knowledge of golf technique.`;
    }

    // Prepare the complete prompt with specific guidance for the selected metric
    const promptContent = {
      coachingPrompt: coachingPrompt,
      metric: {
          name: metricName,
          score: safeMetricValue,
          description: metricDescription,
          category: metricCategory,
          difficulty: metricDifficulty,
          weighting: metricWeight
      },
      instructions: [
          "Analyze this specific aspect of the golf swing",
          "Provide technically accurate feedback based on the score and video if available",
          "Identify specific strengths and weaknesses related to this aspect of the swing",
          "Give actionable recommendations that directly address what you observe",
          "Provide recommendations that talk about tips as well as how the swing should feel",
          "If the video is unclear for this metric, state 'Video unclear' in the JSON response."
      ],
      outputFormat: {
          metricName: "string",
          score: "number (0-100)",
          tone: "string (excellent/good/needs improvement/poor)",
          goodAspects: "array of strings with specific observations",
          improvementAreas: "array of strings with specific observations",
          technicalBreakdown: "array of strings describing technical aspects",
          recommendations: "array of strings with actionable advice",
          feelTips: "array of strings explaining how correct execution should feel"
      }
  };

  // Prepare payload for API request
  const payload = {
      contents: [{
          parts: [{
              text: `You are a PGA Master Professional with 30 years of experience coaching elite golfers. Analyze this golf swing ${isYouTubeVideo ? 'from YouTube' : (hasVideo ? 'video' : 'data')} as a professional golf coach, focusing specifically on the ${metricName} aspect of the swing for a golfer whose skill level you should assume based on the score:

Coaching Context: ${JSON.stringify(promptContent, null, 2)}
${isYouTubeVideo ? `\nYouTube Video URL: ${videoUrl}` : ''}

Please provide a detailed, professional analysis following these guidelines:
1.  Focus ONLY on the ${metricName} aspect of the swing
2.  Infer the golfer's likely skill level from the provided score for this metric. Tailor your feedback accordingly (e.g., more basic advice for lower scores, more advanced for higher scores).
3.  Identify specific strengths related to ${metricName}
4.  Identify specific weaknesses related to ${metricName}
5.  Provide actionable, technically sound recommendations
6.  Include tips on how the correct execution should feel
7.  Use clear, concise language that a golfer would understand
8.  If the video quality is poor or the swing is unclear for this specific metric, include "Video unclear" in the relevant section of the JSON response (e.g., in improvementAreas or technicalBreakdown).
9.  Strictly adhere to the JSON output format

Your response should be a valid JSON object that can be directly parsed.`
          }]
      }]
  };

  // Add video if available
  if (base64Video && !isYouTubeVideo) {
    const base64Data = base64Video.split('base64,')[1];
    if (base64Data) {
      payload.contents[0].parts.push({
        inlineData: {
          mimeType: "video/mp4",
          data: base64Data
        }
      });
    }
  }

  // Set generation config
  payload.generationConfig = {
    temperature: 0.5, // Lower temperature for more consistent, focused responses
    maxOutputTokens: 1024
  };

  // Add comprehensive logging
  console.log('Sending metric analysis request for:', metricKey);
  
  // Make the API request
  try {
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 45000 // Increased timeout for video processing
      }
    );

    // Parse the response
    const extractInsights = (responseData) => {
      try {
        // Get candidates from response
        const candidates = responseData?.candidates;
        if (!candidates || candidates.length === 0) {
          console.error('No candidates in response');
          return getDefaultInsights(metricKey);
        }

        // Get text from response
        const textResponse = candidates[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          console.error('No text in response');
          return getDefaultInsights(metricKey);
        }

        // Try to extract JSON
        let jsonText = textResponse;

        // Try to find JSON in markdown code blocks
        const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        // If no code block, try to extract JSON object directly
        if (!jsonMatch) {
          const jsonStartIndex = textResponse.indexOf('{');
          const jsonEndIndex = textResponse.lastIndexOf('}') + 1;
          if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
            jsonText = textResponse.substring(jsonStartIndex, jsonEndIndex);
          }
        }

        // Parse the JSON
        let insights;
        try {
          insights = JSON.parse(jsonText);
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          console.error("Raw JSON text:", jsonText);
          return getDefaultInsights(metricKey);
        }

        // Validate insights structure
        if (!insights.goodAspects || !insights.improvementAreas || 
            !insights.technicalBreakdown || !insights.recommendations) {
          console.error('Invalid insights structure:', insights);
          return getDefaultInsights(metricKey);
        }

        return insights;
      } catch (parseError) {
        console.error('Parsing error:', parseError);
        return getDefaultInsights(metricKey);
      }
    };

    // Extract and return insights
    return extractInsights(response.data);
  } catch (error) {
    console.error('Error in API request for metric insights:', error);
    // In case of error, return default insights WITH swing data
    return getDefaultInsights(metricKey, swingData);
  }

} catch (error) {
  // Log error details
  console.error('Error in generateMetricInsights:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    responseData: error.response?.data,
    responseStatus: error.response?.status
  });

  // Return default insights on any error
  const defaultInsights = getDefaultInsights(metricKey);
  
  // Check if this is a non-user swing without authentication
  const isUnauthenticatedFriendSwing = swingData._isLocalOnly && 
                                     (swingData.swingOwnership === 'other' || 
                                      swingData.swingOwnership === 'pro');
  
  // If this is an unauthenticated user viewing a friend's swing, add adoption messaging
  if (isUnauthenticatedFriendSwing) {
    // Add account creation prompt to default insights
    const accountPrompt = [
      "For AI-powered deep dive analysis of your friend's swings, please create your own account.",
      "Sign up to unlock advanced video-based metric insights and save your progress!"
    ];
    
    // Add this prompt to various sections of insights
    return {
      ...defaultInsights,
      technicalBreakdown: [
        ...accountPrompt,
        ...defaultInsights.technicalBreakdown
      ],
      recommendations: [
        ...accountPrompt,
        ...defaultInsights.recommendations
      ]
    };
  }
  
  return getDefaultInsights(metricKey, swingData);
}
};

// Helper function to convert Blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper function for generic metric descriptions when specific one isn't available
const getGenericMetricDescription = (metricKey) => {
  const descriptions = {
    backswing: "The backswing involves the takeaway, wrist position, arm extension, and rotation. A proper backswing sets up the rest of the swing.",
    stance: "Stance includes foot position, width, weight distribution, posture, and alignment relative to the target line.",
    grip: "Grip examines hand placement, pressure, wrist position, and proper interlocking or overlapping technique.",
    swingBack: "This evaluates the rotation, plane, wrist hinge, and position at the top of the backswing.",
    swingForward: "The downswing path, transition, acceleration, and follow-through make up this metric.",
    hipRotation: "Hip rotation assesses proper turn during backswing and clearing through impact.",
    swingSpeed: "Tempo, rhythm, and acceleration through the ball are key elements of swing speed.",
    shallowing: "Shallowing examines how the club drops into the proper path during the downswing.",
    pacing: "Overall rhythm and timing throughout the entire swing motion.",
    confidence: "How decisive and committed the golfer appears in their swing.",
    focus: "Setup routine and execution concentration throughout the swing."
  };
  
  return descriptions[metricKey] || `The ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} aspect of the golf swing.`;
};

/**
 * Provide improved default insights for a metric by leveraging the Swing Recipe details
 * Modified to add account promotion for non-user swings
 * @param {string} metricKey - The metric key
 * @param {Object} swingData - Optional swing data to check ownership
 * @returns {Object} Default insights object with metric-specific content
 */
const getDefaultInsights = (metricKey, swingData = null) => {
  // Get the swing recipe metric key if available
  const swingRecipeKey = metricKeyMapping[metricKey] || metricKey;

  // Get detailed information about this metric from our swing recipe
  const metricInfo = metricDetails[swingRecipeKey];

  // Check if this is a non-user swing
  const isNonUserSwing = swingData && swingData.swingOwnership !== 'self';
  
  // Create account promotion message
  const accountPrompt = [
    "For full AI-powered analysis of this swing, please create your own account.",
    "Sign up to unlock advanced video-based metric insights and save your progress!"
  ];

  // Base default structure
  const baseDefaults = {
      goodAspects: [],
      improvementAreas: [],
      technicalBreakdown: [],
      recommendations: [],
      feelTips: []
  };

  // If we have specific information from the Swing Recipe, use it
  if (metricInfo) {
      const insights = {
          goodAspects: [
              `Good ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} is crucial for a consistent swing.`,
              `This is a ${metricInfo.category} element with a difficulty rating of ${metricInfo.difficulty}/10.`
          ],
          improvementAreas: [
              `${metricInfo.description}.`,
              `This element represents ${metricInfo.weighting} of your overall swing score.`
          ],
          technicalBreakdown: [
              `${metricInfo.description}.`,
              `This is categorized as a "${metricInfo.category}" element in golf technique.`
          ],
          recommendations: [
              `Focus on improving this aspect through dedicated practice.`,
              `Consider working with a professional instructor on this specific element.`,
              metricInfo.exampleUrl ? `Watch instructional videos like ${metricInfo.exampleUrl} to visualize proper form.` : `Watch instructional videos focusing on this aspect of your swing to visualize proper form.`
          ],
          feelTips: [
              `When executed correctly, this element should feel natural and controlled.`,
              `Focus on building muscle memory through repetitive practice.`
          ]
      };
      
      // Add account promotion for non-user swings
      if (isNonUserSwing) {
          insights.technicalBreakdown = [...accountPrompt, ...insights.technicalBreakdown];
          insights.recommendations = [...accountPrompt, ...insights.recommendations];
      }
      
      return insights;
  }

  // Metric-specific defaults for common metrics not in the Swing Recipe
  const metricDefaults = {
      backswing: {
          goodAspects: [
              "Maintaining a straight left arm during the backswing helps create width and power.",
              "Proper shoulder turn creates torque for a more powerful downswing."
          ],
          improvementAreas: [
              "Focus on keeping the club on plane throughout the backswing.",
              "Watch for over-rotation which can lead to inconsistent contact."
          ],
          technicalBreakdown: [
              "The backswing starts with a one-piece takeaway.",
              "The wrists should hinge naturally as the club reaches parallel to the ground.",
              "Proper rotation involves turning the shoulders while maintaining spine angle."
          ],
          recommendations: [
              "Practice the 'L' position drill to improve your takeaway and club position.",
              "Work on maintaining your spine angle during the shoulder turn.",
              "Use alignment sticks to ensure proper swing plane."
          ],
          feelTips: [
              "The backswing should feel wide and controlled, not rushed.",
              "Focus on feeling your weight shift slightly to your trail side.",
              "Your hands should feel light with natural wrist hinge."
          ]
      },
      stance: {
          goodAspects: [
              "A stable stance provides a solid foundation for the swing.",
              "Proper width allows for balance and weight transfer."
          ],
          improvementAreas: [
              "Check your alignment to ensure you're aimed at your target.",
              "Adjust your ball position based on the club you're using."
          ],
          technicalBreakdown: [
              "Stance width should be approximately shoulder-width apart.",
              "Weight distribution should be balanced at address.",
              "Posture should be athletic with a slight bend at the hips."
          ],
          recommendations: [
              "Practice setting up to a target line with alignment sticks.",
              "Use a mirror to check your posture and alignment.",
              "Experiment with different stance widths to find what feels most stable."
          ],
          feelTips: [
              "Feel grounded and balanced in your stance.",
              "Feel your weight evenly distributed between your feet.",
              "Feel a slight tension in your core to support your swing."
          ]
      },
      grip: {
          goodAspects: [
              "A proper grip promotes clubface control.",
              "Consistent grip pressure prevents excessive tension."
          ],
          improvementAreas: [
              "Check your grip type (interlocking, overlapping, 10-finger) to ensure it's suitable for you.",
              "Avoid a grip that's too weak or too strong."
          ],
          technicalBreakdown: [
              "The grip should be placed primarily in the fingers of the lead hand.",
              "Grip pressure should be light to medium.",
              "The 'V' formed by the thumb and forefinger of the lead hand should point towards your right shoulder (for a right-handed golfer)."
          ],
          recommendations: [
              "Use a training grip aid to develop proper hand placement.",
              "Practice gripping the club in front of a mirror.",
              "Experiment with different grip pressures to find what feels most comfortable and effective."
          ],
          feelTips: [
              "Feel the club in your fingers, not your palms.",
              "Feel a connection between your hands and arms.",
              "Feel relaxed and in control of the club."
          ]
      },
      swingBack: {
          goodAspects: [
              "A full shoulder turn allows for maximum power generation.",
              "Maintaining spine angle during the backswing promotes consistency."
          ],
          improvementAreas: [
              "Avoid swaying or lifting during the backswing.",
              "Ensure the club stays on plane as you rotate."
          ],
          technicalBreakdown: [
              "The swing back is a rotation of the body around the spine.",
              "The club should move away from the ball as a unit with the shoulders and arms.",
              "The wrists will naturally hinge as the swing progresses."
          ],
          recommendations: [
              "Practice with a mirror to monitor your shoulder turn and spine angle.",
              "Use a golf swing trainer to guide your swing path.",
              "Film your swing from different angles to identify areas for improvement."
          ],
          feelTips: [
              "Feel your weight shifting to your trail side.",
              "Feel your core muscles engage as you rotate.",
              "Feel a stretch in your torso as you reach the top of the swing."
          ]
      },
      swingForward: {
          goodAspects: [
              "Starting the downswing with the lower body promotes proper sequencing.",
              "Efficient weight transfer leads to increased power and accuracy."
          ],
          improvementAreas: [
              "Avoid casting the club from the top of the swing.",
              "Ensure you're rotating through impact, not just swinging your arms."
          ],
          technicalBreakdown: [
              "The downswing is initiated by the hips rotating towards the target.",
              "Weight is transferred from the trail foot to the lead foot.",
              "The arms and club follow the body's rotation."
          ],
          recommendations: [
              "Practice drills that emphasize lower body initiation of the downswing.",
              "Use a weighted ball to feel proper weight transfer.",
              "Focus on rotating your belt buckle towards the target through impact."
          ],
          feelTips: [
              "Feel your weight shifting forward as you start the downswing.",
              "Feel your hips leading the way through impact.",
              "Feel your body rotating around your spine."
          ]
      },
      hipRotation: {
          goodAspects: [
              "Proper hip rotation generates power and speed.",
              "Rotation in the backswing loads energy for the downswing."
          ],
          improvementAreas: [
              "Avoid early extension, which restricts hip rotation.",
              "Ensure you're rotating your hips, not swaying them."
          ],
          technicalBreakdown: [
              "Hip rotation involves turning the hips both in the backswing and through impact.",
              "The hips should rotate around a relatively stable spine.",
              "Hip rotation contributes to both power and clubhead speed."
          ],
          recommendations: [
              "Practice drills that isolate hip rotation.",
              "Use a resistance band to feel the muscles involved in hip rotation.",
              "Focus on feeling your hips lead the transition from backswing to downswing."
          ],
          feelTips: [
              "Feel your hips turning away from the target in the backswing.",
              "Feel your hips clearing out of the way as you swing through impact.",
              "Feel the power generated from your hip rotation."
          ]
      },
      swingSpeed: {
          goodAspects: [
              "A smooth and consistent tempo promotes accuracy.",
              "Proper acceleration through impact maximizes clubhead speed."
          ],
          improvementAreas: [
              "Avoid rushing the swing, which can lead to loss of control.",
              "Ensure you're accelerating through the ball, not decelerating."
          ],
          technicalBreakdown: [
              "Swing speed is influenced by tempo, rhythm, and acceleration.",
              "Proper sequencing of the swing contributes to efficient power transfer and increased speed.",
              "Clubhead speed is the speed of the club at the moment of impact."
          ],
          recommendations: [
              "Practice with a metronome to develop a consistent tempo.",
              "Focus on maintaining acceleration through the impact zone.",
              "Experiment with different swing thoughts to find what helps you generate more speed."
          ],
          feelTips: [
              "Feel a smooth and rhythmic flow throughout the swing.",
              "Feel the clubhead accelerating through impact.",
              "Feel the power generated from your body rotation and weight transfer."
          ]
      },
      shallowing: {
          goodAspects: [
              "Proper shallowing promotes a good angle of attack.",
              "Shallowing helps to avoid coming over the top."
          ],
          improvementAreas: [
              "Avoid an overly steep downswing, which can lead to fat shots and slices.",
              "Ensure the club is approaching the ball from the inside."
          ],
          technicalBreakdown: [
              "Shallowing refers to the angle of the club shaft in the downswing.",
              "A shallower angle of attack is generally preferred for driver swings.",
              "Shallowing is influenced by body rotation and wrist action."
          ],
          recommendations: [
              "Practice drills that promote an inside-out swing path.",
              "Use a training aid to help you feel the proper shallowing motion.",
              "Focus on feeling the club dropping into the slot in the downswing."
          ],
          feelTips: [
              "Feel the club moving more around your body in the downswing.",
              "Feel your right elbow (for a right-handed golfer) tucking in towards your body.",
              "Feel the clubhead approaching the ball from the inside."
          ]
      },
      pacing: {
          goodAspects: [
              "A consistent pre-shot routine promotes focus and consistency.",
              "Good rhythm throughout the swing leads to better timing."
          ],
          improvementAreas: [
              "Avoid rushing your pre-shot routine.",
              "Ensure your swing has a smooth and deliberate flow."
          ],
          technicalBreakdown: [
              "Pacing refers to the timing and rhythm of the swing.",
              "A consistent pre-shot routine helps to establish a good rhythm.",
              "Tempo is the speed of the swing, while rhythm is the flow and timing of the different parts of the swing."
          ],
          recommendations: [
              "Develop a consistent pre-shot routine and stick to it.",
              "Count to yourself during your swing to help maintain a good tempo.",
              "Practice with a metronome to develop a consistent rhythm."
          ],
          feelTips: [
              "Feel a smooth and deliberate flow throughout your swing.",
              "Feel your body moving in a coordinated sequence.",
              "Feel relaxed and in control of your swing."
          ]
      },
      focus: {
          goodAspects: [
              "A consistent pre-shot routine helps to maintain focus.",
              "Focusing on the target promotes accuracy."
          ],
          improvementAreas: [
              "Avoid distractions during your pre-shot routine and swing.",
              "Stay focused on the task at hand."
          ],
          technicalBreakdown: [
              "Focus is the ability to concentrate on the task at hand.",
              "A consistent pre-shot routine can help to improve focus.",
              "Visualizing the shot before you hit it can also aid in focus."
          ],
          recommendations: [
              "Develop a consistent pre-shot routine and stick to it.",
              "Practice mindfulness techniques to improve focus.",
              "Eliminate distractions during your practice sessions and rounds."
          ],
          feelTips: [
              "Feel your attention focused on the target.",
              "Feel present in the moment and engaged in the task.",
              "Feel confident and committed to your swing."
          ]
      },
      confidence: {
          goodAspects: [
              "A confident approach can lead to better performance.",
              "Positive self-talk can boost confidence."
          ],
          improvementAreas: [
              "Avoid negative self-talk, which can hinder performance.",
              "Focus on your strengths and learn from your mistakes."
          ],
          technicalBreakdown: [
              "Confidence is a belief in your own abilities.",
              "Positive self-talk and visualization can help to build confidence.",
              "Consistent practice and preparation can also contribute to confidence."
          ],
          recommendations: [
              "Focus on your successes and learn from your mistakes.",
              "Practice positive self-talk and visualization techniques.",
              "Set realistic goals and celebrate your achievements."
          ],
          feelTips: [
              "Feel confident and in control of your swing.",
              "Feel a sense of trust in your abilities.",
              "Feel positive and optimistic about your game."
          ]
      }
      // Other metric defaults as needed...
  };

  // If we have defaults for this metric, use them, otherwise use generic
  if (metricDefaults[metricKey]) {
      const defaults = {
          ...baseDefaults,
          ...metricDefaults[metricKey]
      };
      
      // Add account promotion for non-user swings
      if (isNonUserSwing) {
          defaults.technicalBreakdown = [...accountPrompt, ...defaults.technicalBreakdown];
          defaults.recommendations = [...accountPrompt, ...defaults.recommendations];
      }
      
      return defaults;
  }

  // Generic defaults if metric not found anywhere
  const genericDefaults = {
      goodAspects: [
          "Work with a golf professional for personalized analysis.",
          "Record your swing regularly to track progress."
      ],
      improvementAreas: [
          "Focus on fundamentals like grip, stance, and posture.",
          "Break down the swing into components for targeted practice."
      ],
      technicalBreakdown: [
          "The golf swing is a complex motion requiring coordination of multiple body parts.",
          "Proper sequencing from ground up creates efficient power.",
          "Balance and tempo are fundamental to consistency."
      ],
      recommendations: [
          "Work with a PGA teaching professional for personalized instruction.",
          "Practice with purpose, focusing on specific aspects rather than just hitting balls.",
          "Use video analysis to identify and address specific issues."
      ],
      feelTips: [
          "A good swing should feel balanced and rhythmic.",
          "Focus on feeling connected throughout the swing.",
          "The correct motion will feel effortless, not forced."
      ]
  };
  
  // Add account promotion for non-user swings
  if (isNonUserSwing) {
      genericDefaults.technicalBreakdown = [...accountPrompt, ...genericDefaults.technicalBreakdown];
      genericDefaults.recommendations = [...accountPrompt, ...genericDefaults.recommendations];
  }
  
  return genericDefaults;
};

// Export the main function
export default { analyzeGolfSwing, createMockAnalysis };

// Export additional utilities
export const metricInsightsGenerator = {
  generateMetricInsights,
  getDefaultInsights
};

// Export the collectAnalysisFeedback function but not the React component
export { collectAnalysisFeedback };