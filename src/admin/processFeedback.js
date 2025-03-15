// src/admin/processFeedback.js
import { processFeedbackData } from '../services/feedbackProcessor';
import { saveAdjustmentFactors } from '../services/adjustmentService';

export const runFeedbackProcessing = async () => {
  try {
    // Process all feedback data
    const adjustmentFactors = await processFeedbackData();
    
    // Save the calculated factors
    await saveAdjustmentFactors(adjustmentFactors);
    
    console.log("Successfully processed feedback and updated adjustment factors:", adjustmentFactors);
    return { success: true, adjustmentFactors };
  } catch (error) {
    console.error("Error in feedback processing:", error);
    return { success: false, error: error.message };
  }
};