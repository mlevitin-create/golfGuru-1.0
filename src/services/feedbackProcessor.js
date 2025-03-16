import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateAdjustmentFactors, calculateProAdjustmentFactors } from './adjustmentCalculator'; 

// Create a more impactful feedback system that adapts to the amount of feedback collected
const calculateFeedbackImpact = (feedback, currentAdjustments) => {
  // Base impact factors
  let impactFactors = {
    confidenceWeight: {
      1: 0.5,  // Low confidence
      2: 0.8,
      3: 1.0,  // Medium confidence
      4: 1.5,
      5: 2.0   // High confidence
    },
    skillLevelWeight: {
      pro: 2.0,       // Pro input highly valued
      advanced: 1.5,  
      amateur: 1.0,   // Standard weight
      beginner: 0.8   // Slightly lower weight
    },
    feedbackTypeWeight: {
      too_high: 1.5,  // Higher weight for this type of feedback
      too_low: 1.3,
      accurate: 0.5   // Lower weight for "accurate" feedback
    },
    adjustmentScaling: {
      low: 0.8,      // Few feedbacks → conservative adjustments
      medium: 1.0,    // Moderate feedback → standard adjustments
      high: 1.2      // Many feedbacks → aggressive adjustments
    }
  };
  
  // Determine adjustment scaling based on amount of feedback
  let adjustmentScale = 'low';
  if (feedback.total >= 20) adjustmentScale = 'high';
  else if (feedback.total >= 10) adjustmentScale = 'medium';
  
  // Calculate final impact factor
  const confidenceImpact = impactFactors.confidenceWeight[feedback.confidenceLevel || 3];
  const skillImpact = impactFactors.skillLevelWeight[feedback.skillLevel || 'amateur'];
  const typeImpact = impactFactors.feedbackTypeWeight[feedback.feedbackType];
  const scaleImpact = impactFactors.adjustmentScaling[adjustmentScale];
  
  return confidenceImpact * skillImpact * typeImpact * scaleImpact;
};

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