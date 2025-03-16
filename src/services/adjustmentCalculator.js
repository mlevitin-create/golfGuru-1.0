import { calculateAdjustmentValue } from './adjustmentValueCalculator';

/**
 * Calculates adjustment factors based on feedback data
 * @param {Object} metricAdjustments - Aggregated feedback data
 * @returns {Object} Adjustment factors
 */
export const calculateAdjustmentFactors = (metricAdjustments) => {
  const factors = {
    overall: 0,
    metrics: {},
    bySkillLevel: {
      pro: { overall: 0, metrics: {} },
      advanced: { overall: 0, metrics: {} },
      amateur: { overall: 0, metrics: {} },
      beginner: { overall: 0, metrics: {} }
    }
  };

  // Calculate overall score adjustment
  if (metricAdjustments.overall.total >= 5) {
    factors.overall = calculateAdjustmentValue(
      metricAdjustments.overall.too_high,
      metricAdjustments.overall.too_low,
      metricAdjustments.overall.total,
      3 // Max adjustment factor
    );
  }

  // Calculate skill level specific overall adjustments
  Object.keys(metricAdjustments.bySkillLevel).forEach(level => {
    const levelData = metricAdjustments.bySkillLevel[level];
    
    if (levelData.total >= 3) {
      factors.bySkillLevel[level].overall = calculateAdjustmentValue(
        levelData.too_high,
        levelData.too_low,
        levelData.total,
        level === 'pro' ? 2 : 4 // Lower adjustment for pros, higher for others
      );
    }
  });
  
  // Calculate metric-specific adjustments
  Object.entries(metricAdjustments.byMetric).forEach(([metric, counts]) => {
    if (counts.total >= 3) { // Only adjust with sufficient data
      factors.metrics[metric] = calculateAdjustmentValue(
        counts.too_high,
        counts.too_low,
        counts.total,
        4 // More aggressive adjustment for specific metrics
      );
      
      // Calculate skill level specific metric adjustments
      Object.keys(counts.bySkillLevel).forEach(level => {
        const levelData = counts.bySkillLevel[level];
        
        if (levelData.total >= 2) { // Lower threshold for skill-specific
          if (!factors.bySkillLevel[level].metrics) {
            factors.bySkillLevel[level].metrics = {};
          }
          
          factors.bySkillLevel[level].metrics[metric] = calculateAdjustmentValue(
            levelData.too_high,
            levelData.too_low,
            levelData.total,
            level === 'pro' ? 2 : 5 // Lower for pros, higher for others
          );
        }
      });
    }
  });
  
  return factors;
};

export const calculateProAdjustmentFactors = (proFeedback) => {
  const factors = {
    overall: 0,
    metrics: {}
  };

  // Calculate overall score adjustment
  if (proFeedback.overall.total >= 3) {
    factors.overall = calculateAdjustmentValue(
      proFeedback.overall.too_high,
      proFeedback.overall.too_low,
      proFeedback.overall.total,
      2 // Max adjustment factor for pro overall
    );
  }

  // Calculate metric-specific adjustments
  Object.entries(proFeedback.byMetric).forEach(([metric, counts]) => {
    if (counts.total >= 2) {
      factors.metrics[metric] = calculateAdjustmentValue(
        counts.too_high,
        counts.too_low,
        counts.total,
        3 // Max adjustment factor for pro metrics
      );
    }
  });

  return factors;
};