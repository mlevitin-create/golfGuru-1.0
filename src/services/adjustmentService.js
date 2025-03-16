import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { calculateAdjustmentFactors } from './adjustmentCalculator';
import { processFeedbackData } from './feedbackProcessor';

// Export the processFeedbackData function so it can be used by other modules
export { processFeedbackData };

export const saveAdjustmentFactors = async (factors) => {
  await setDoc(doc(db, 'system', 'adjustment_factors'), {
    factors,
    updatedAt: new Date()
  });
};

export const getAdjustmentFactors = async () => {
  const docSnap = await getDoc(doc(db, 'system', 'adjustment_factors'));
  if (docSnap.exists()) {
    return docSnap.data().factors;
  }
  return { overall: 0, metrics: {} }; // Default when no adjustments exist
};

export const autoProcessFeedback = async () => {
    try {
      // Check when feedback was last processed
      const systemDocRef = doc(db, 'system', 'feedback_processing');
      const systemDoc = await getDoc(systemDocRef);
      
      const lastProcessed = systemDoc.exists() ? systemDoc.data().lastProcessed.toDate() : new Date(0);
      const now = new Date();
      const hoursSinceLastProcess = (now - lastProcessed) / (1000 * 60 * 60);
      
      // Only process if it's been at least 6 hours since last processing
      if (hoursSinceLastProcess >= 6) {
        console.log('Processing feedback automatically...');
        
        // Process the feedback using the existing function
        const adjustmentFactors = await processFeedbackData();
        
        // Save the calculated factors
        await saveAdjustmentFactors(adjustmentFactors);
        
        // Update the last processed timestamp
        await setDoc(systemDocRef, {
          lastProcessed: serverTimestamp(),
          adjustmentFactors
        });
        
        console.log('Automatic feedback processing complete');
        return { success: true, adjustmentFactors };
      } else {
        console.log(`Skipping feedback processing (last run ${hoursSinceLastProcess.toFixed(1)} hours ago)`);
        return { success: true, skipped: true };
      }
    } catch (error) {
      console.error('Error in auto processing feedback:', error);
      return { success: false, error: error.message };
    }
  };