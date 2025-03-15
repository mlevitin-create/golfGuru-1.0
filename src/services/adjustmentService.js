// src/services/adjustmentService.js
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

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