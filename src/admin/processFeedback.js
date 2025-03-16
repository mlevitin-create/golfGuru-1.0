// src/admin/processFeedback.js
import { processFeedbackData } from '../services/feedbackProcessor';
import { saveAdjustmentFactors } from '../services/adjustmentService';
import { trackModelImprovement } from '../services/modelAnalytics';

// Then update the runFeedbackProcessing function to include analytics
export const runFeedbackProcessing = async () => {
  try {
    // Process all feedback data
    const adjustmentFactors = await processFeedbackData();
    
    // Save the calculated factors
    await saveAdjustmentFactors(adjustmentFactors);
    
    // Track model improvement over time
    const improvementAnalytics = await trackModelImprovement();
    
    console.log("Successfully processed feedback and updated adjustment factors:", adjustmentFactors);
    console.log("Model improvement analytics:", improvementAnalytics);
    
    return { 
      success: true, 
      adjustmentFactors,
      modelAnalytics: improvementAnalytics
    };
  } catch (error) {
    console.error("Error in feedback processing:", error);
    return { success: false, error: error.message };
  }
};