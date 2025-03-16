// src/services/adjustmentCalculator.js
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

/**
 * Calculate adjustment value based on feedback distribution
 * @param {number} tooHigh - Count of "too high" feedback
 * @param {number} tooLow - Count of "too low" feedback
 * @param {number} total - Total feedback count
 * @param {number} maxAdjustment - Maximum adjustment factor
 * @returns {number} The calculated adjustment value
 */
const calculateAdjustmentValue = (tooHigh, tooLow, total, maxAdjustment) => {
  const highPercentage = tooHigh / total;
  const lowPercentage = tooLow / total;
  
  // No adjustment if feedback is balanced
  if (Math.abs(highPercentage - lowPercentage) < 0.2) {
    return 0;
  }
  
  // If significantly more "too high" than "too low", apply negative adjustment
  if (highPercentage > 0.5 && highPercentage > lowPercentage * 1.5) {
    // Scale the adjustment based on the strength of the feedback
    const adjustmentStrength = Math.min(1, (highPercentage - 0.5) * 2);
    return -Math.round(maxAdjustment * adjustmentStrength);
  } 
  // If significantly more "too low" than "too high", apply positive adjustment
  else if (lowPercentage > 0.5 && lowPercentage > highPercentage * 1.5) {
    // Scale the adjustment based on the strength of the feedback
    const adjustmentStrength = Math.min(1, (lowPercentage - 0.5) * 2);
    return Math.round(maxAdjustment * adjustmentStrength);
  }
  
  // Default case - no significant trend
  return 0;
};