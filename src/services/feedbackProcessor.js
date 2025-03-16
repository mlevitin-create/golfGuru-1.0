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
  
  // Initialize aggregation objects with separate tracking by skill level
  const metricAdjustments = {
    overall: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
    bySkillLevel: {
      pro: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
      advanced: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
      amateur: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
      beginner: { too_high: 0, too_low: 0, accurate: 0, total: 0 }
    },
    byMetric: {}
  };
  
  // Process each feedback entry
  snapshot.forEach(doc => {
    const feedback = doc.data();
    
    // Skip feedback entries that explicitly opt out of adjustment
    if (feedback.adjustmentPriority === 'never') {
      console.log("Skipping feedback with adjustmentPriority=never");
      return;
    }
    
    // Weight feedback by confidence level (1-5)
    const confidenceWeight = feedback.confidenceLevel || 3;
    
    // Determine skill level category
    const skillLevel = feedback.skillLevel || (feedback.isProSwing ? 'pro' : 'amateur');
    
    // Count overall score adjustments - apply confidence weighting
    for (let i = 0; i < confidenceWeight; i++) {
      // Overall stats
      metricAdjustments.overall[feedback.feedbackType]++;
      metricAdjustments.overall.total++;
      
      // Skill level specific stats
      if (metricAdjustments.bySkillLevel[skillLevel]) {
        metricAdjustments.bySkillLevel[skillLevel][feedback.feedbackType]++;
        metricAdjustments.bySkillLevel[skillLevel].total++;
      }
    }
    
    // Process metric-specific feedback
    if (feedback.metricFeedback) {
      Object.entries(feedback.metricFeedback).forEach(([metric, opinion]) => {
        if (opinion) { // Only count if feedback was provided
          if (!metricAdjustments.byMetric[metric]) {
            metricAdjustments.byMetric[metric] = { 
              too_high: 0, 
              too_low: 0, 
              accurate: 0, 
              total: 0,
              bySkillLevel: {
                pro: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
                advanced: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
                amateur: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
                beginner: { too_high: 0, too_low: 0, accurate: 0, total: 0 }
              }
            };
          }
          
          // Apply confidence weighting to metrics too
          for (let i = 0; i < confidenceWeight; i++) {
            // Overall metric stats
            metricAdjustments.byMetric[metric][opinion]++;
            metricAdjustments.byMetric[metric].total++;
            
            // Skill level specific metric stats
            if (metricAdjustments.byMetric[metric].bySkillLevel[skillLevel]) {
              metricAdjustments.byMetric[metric].bySkillLevel[skillLevel][opinion]++;
              metricAdjustments.byMetric[metric].bySkillLevel[skillLevel].total++;
            }
          }
        }
      });
    }
  });
  
  // Generate adjustment factors based on the aggregated data
  return calculateAdjustmentFactors(metricAdjustments);
};