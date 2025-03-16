// First, create a separate file for the adjustment value calculator
// src/services/adjustmentValueCalculator.js
export const calculateAdjustmentValue = (tooHigh, tooLow, total, maxAdjustment) => {
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