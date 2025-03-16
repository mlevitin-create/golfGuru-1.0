import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const createReferenceModel = async () => {
    // Create a reference database of professional swing characteristics
    const createReferenceModel = async () => {
        // Query all swings marked as professional with high confidence feedback
        const proSwingsQuery = query(
        collection(db, 'analysis_feedback'),
        where('isProSwing', '==', true),
        where('confidenceLevel', '>=', 4),
        orderBy('timestamp', 'desc')
        );
        
        const proSwings = await getDocs(proSwingsQuery);
        
        // Create a statistical model of what "good" looks like for each metric
        const referenceModel = {
        metrics: {},
        overallScore: { mean: 0, stdDev: 0, min: 100, max: 0 }
        };
        
        // Process pro swing data
        let totalOverallScore = 0;
        let overallScoreCount = 0;
        let overallScores = [];
        
        proSwings.forEach(doc => {
        const data = doc.data();
        totalOverallScore += data.overallScore;
        overallScoreCount++;
        overallScores.push(data.overallScore);
        
        // Process each metric
        Object.entries(data.originalMetrics).forEach(([metric, value]) => {
            if (!referenceModel.metrics[metric]) {
            referenceModel.metrics[metric] = { values: [], mean: 0, stdDev: 0, min: 100, max: 0 };
            }
            referenceModel.metrics[metric].values.push(value);
        });
        });
        
        // Calculate statistical properties
        if (overallScoreCount > 0) {
        referenceModel.overallScore.mean = totalOverallScore / overallScoreCount;
        referenceModel.overallScore.min = Math.min(...overallScores);
        referenceModel.overallScore.max = Math.max(...overallScores);
        referenceModel.overallScore.stdDev = calculateStandardDeviation(overallScores);
        }
        
        // Process each metric's statistics
        Object.keys(referenceModel.metrics).forEach(metric => {
        const values = referenceModel.metrics[metric].values;
        if (values.length > 0) {
            referenceModel.metrics[metric].mean = values.reduce((a, b) => a + b, 0) / values.length;
            referenceModel.metrics[metric].min = Math.min(...values);
            referenceModel.metrics[metric].max = Math.max(...values);
            referenceModel.metrics[metric].stdDev = calculateStandardDeviation(values);
            delete referenceModel.metrics[metric].values; // Remove raw values to save space
        }
        });
        
        return referenceModel;
    };
  };
  
  export const createProAnchorPoints = async () => {
   // Create pro swing anchor points
    const createProAnchorPoints = async () => {
        // Get highly-rated pro swings from feedback
        const proQuery = query(
        collection(db, 'analysis_feedback'),
        where('isProSwing', '==', true),
        where('feedbackType', '==', 'accurate'),
        where('confidenceLevel', '>=', 4)
        );
        
        const proSwings = await getDocs(proQuery);
        
        // Create metric-specific anchor points
        const anchorPoints = {};
        
        proSwings.forEach(doc => {
        const feedback = doc.data();
        
        // For each metric, record "gold standard" values
        Object.entries(feedback.originalMetrics).forEach(([metric, value]) => {
            if (!anchorPoints[metric]) {
            anchorPoints[metric] = [];
            }
            
            // Only include values above a certain threshold
            if (value >= 80) {
            anchorPoints[metric].push(value);
            }
        });
        });
        
        // Calculate reference values
        Object.keys(anchorPoints).forEach(metric => {
        if (anchorPoints[metric].length > 0) {
            // Sort values
            anchorPoints[metric].sort((a, b) => a - b);
            
            // Calculate percentiles
            const len = anchorPoints[metric].length;
            anchorPoints[metric] = {
            min: anchorPoints[metric][0],
            p25: anchorPoints[metric][Math.floor(len * 0.25)],
            median: anchorPoints[metric][Math.floor(len * 0.5)],
            p75: anchorPoints[metric][Math.floor(len * 0.75)],
            max: anchorPoints[metric][len - 1],
            count: len
            };
        }
        });
        
        return anchorPoints;
    };
  };
  
  // Helper function
  export const calculateStandardDeviation = (values) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };