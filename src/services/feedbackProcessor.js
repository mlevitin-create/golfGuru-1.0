import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateAdjustmentFactors, calculateProAdjustmentFactors } from './adjustmentCalculator'; 

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
    byMetric: {},
    proFeedback: { // New section for pro feedback
      overall: { too_high: 0, too_low: 0, accurate: 0, total: 0 },
      byMetric: {}
    }
  };

  // Process each feedback entry
  snapshot.forEach(doc => {
    const feedback = doc.data();

    // Skip feedback entries that explicitly opt out of adjustment
    if (feedback.adjustmentPriority === 'never') {
      console.log("Skipping feedback with adjustmentPriority=never");
      return;
    }

    // Weight feedback by confidence level (1-5) AND skill level
    const confidenceWeight = feedback.confidenceLevel || 3;
    let skillLevelWeight = 1;

    // Determine skill level category
    const skillLevel = feedback.skillLevel || (feedback.isProSwing ? 'pro' : 'amateur');

    // Amateurs and beginners get slightly more weight
    if (skillLevel === 'amateur' || skillLevel === 'beginner') {
      skillLevelWeight = 1.2;
    }

    // Combined weight
    const feedbackWeight = confidenceWeight * skillLevelWeight;

    // Enhanced feedback processing
    let overallFeedbackType = feedback.feedbackType;
    if (feedback.feedbackType === 'form_issue' || feedback.feedbackType === 'pacing_issue' || feedback.feedbackType === 'not_helpful') {
      overallFeedbackType = 'too_low'; // Treat these as generally negative
    }

    // Count overall score adjustments - apply combined weighting
    for (let i = 0; i < feedbackWeight; i++) {
      // Overall stats
      metricAdjustments.overall[overallFeedbackType]++;
      metricAdjustments.overall.total++;

      // Skill level specific stats
      if (metricAdjustments.bySkillLevel[skillLevel]) {
        metricAdjustments.bySkillLevel[skillLevel][overallFeedbackType]++;
        metricAdjustments.bySkillLevel[skillLevel].total++;
      }
    }

    // Process metric-specific feedback
    if (feedback.metricFeedback) {
      Object.entries(feedback.metricFeedback).forEach(([metric, opinion]) => {
        if (opinion) { // Only count if feedback was provided
          // Enhanced metric feedback processing
          let metricOpinion = opinion;
          if (opinion === 'form_issue' || opinion === 'pacing_issue' || opinion === 'not_helpful') {
            metricOpinion = 'too_low'; // Treat these as generally negative
          }

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

          // Apply combined weighting to metrics too
          for (let i = 0; i < feedbackWeight; i++) {
            // Overall metric stats
            metricAdjustments.byMetric[metric][metricOpinion]++;
            metricAdjustments.byMetric[metric].total++;

            // Skill level specific metric stats
            if (metricAdjustments.byMetric[metric].bySkillLevel[skillLevel]) {
              metricAdjustments.byMetric[metric].bySkillLevel[skillLevel][metricOpinion]++;
              metricAdjustments.byMetric[metric].bySkillLevel[skillLevel].total++;
            }
          }
        }
      });
    }

    // Pro feedback aggregation
    if (feedback.isProSwing) {
      metricAdjustments.proFeedback.overall[feedback.feedbackType]++;
      metricAdjustments.proFeedback.overall.total++;

      // Process metric-specific feedback for pro swings
      if (feedback.metricFeedback) {
        Object.entries(feedback.metricFeedback).forEach(([metric, opinion]) => {
          if (opinion) {
            if (!metricAdjustments.proFeedback.byMetric[metric]) {
              metricAdjustments.proFeedback.byMetric[metric] = { too_high: 0, too_low: 0, accurate: 0, total: 0 };
            }
            metricAdjustments.proFeedback.byMetric[metric][opinion]++;
            metricAdjustments.proFeedback.byMetric[metric].total++; // Fixed: Added 'metric' before .total
          }
        });
      }
    }
  });

  // Generate adjustment factors based on the aggregated data
  const adjustmentFactors = calculateAdjustmentFactors(metricAdjustments);

  // Pro-specific adjustment factors
  const proAdjustmentFactors = calculateProAdjustmentFactors(metricAdjustments.proFeedback);

  return { ...adjustmentFactors, pro: proAdjustmentFactors };
};