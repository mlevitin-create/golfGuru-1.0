// src/services/feedbackProcessor.js
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateAdjustmentFactors } from './adjustmentCalculator';

export const processFeedbackData = async () => {
  // Get recent feedback (last 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const q = query(
    collection(db, 'analysis_feedback'),
    where('timestamp', '>', Timestamp.fromDate(twoWeeksAgo)),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  // Initialize aggregation objects
  const metricAdjustments = {};
  const overallAdjustments = { too_high: 0, too_low: 0, accurate: 0, total: 0 };
  
  // Process each feedback entry
  snapshot.forEach(doc => {
    const feedback = doc.data();
    
    // Count overall score adjustments
    overallAdjustments[feedback.feedbackType]++;
    overallAdjustments.total++;
    
    // Process metric-specific feedback
    if (feedback.metricFeedback) {
      Object.entries(feedback.metricFeedback).forEach(([metric, opinion]) => {
        if (opinion) { // Only count if feedback was provided
          if (!metricAdjustments[metric]) {
            metricAdjustments[metric] = { too_high: 0, too_low: 0, accurate: 0, total: 0 };
          }
          metricAdjustments[metric][opinion]++;
          metricAdjustments[metric].total++;
        }
      });
    }
  });
  
  // Calculate adjustment factors
  return calculateAdjustmentFactors(metricAdjustments, overallAdjustments);
};