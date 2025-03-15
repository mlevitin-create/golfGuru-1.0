// src/services/adjustmentCalculator.js
export const calculateAdjustmentFactors = (metricAdjustments, overallAdjustments) => {
    const factors = {
      overall: 0,
      metrics: {}
    };
    
    // Calculate overall score adjustment
    if (overallAdjustments.total >= 5) {
      const highPercentage = overallAdjustments.too_high / overallAdjustments.total;
      const lowPercentage = overallAdjustments.too_low / overallAdjustments.total;
      
      // If significantly more "too high" than "too low", apply negative adjustment
      if (highPercentage > 0.5 && highPercentage > lowPercentage * 1.5) {
        factors.overall = -3;
      } 
      // If significantly more "too low" than "too high", apply positive adjustment
      else if (lowPercentage > 0.5 && lowPercentage > highPercentage * 1.5) {
        factors.overall = 3;
      }
    }
    
    // Calculate metric-specific adjustments
    Object.entries(metricAdjustments).forEach(([metric, counts]) => {
      if (counts.total >= 3) { // Only adjust with sufficient data
        const highPercentage = counts.too_high / counts.total;
        const lowPercentage = counts.too_low / counts.total;
        
        if (highPercentage > 0.5 && highPercentage > lowPercentage * 1.5) {
          factors.metrics[metric] = -4; // More aggressive adjustment for specific metrics
        } else if (lowPercentage > 0.5 && lowPercentage > highPercentage * 1.5) {
          factors.metrics[metric] = 4;
        }
      }
    });
    
    return factors;
  };