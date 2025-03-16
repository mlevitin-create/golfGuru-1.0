import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Add Date.prototype.getWeek method
Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const trackModelImprovement = async () => {
  // Implementation as provided earlier
  // Create a system to track improvement in model accuracy over time
const trackModelImprovement = async () => {
    // Get the last 3 months of feedback data
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const feedbackQuery = query(
      collection(db, 'analysis_feedback'),
      where('timestamp', '>', Timestamp.fromDate(threeMonthsAgo)),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(feedbackQuery);
    
    // Process feedback in chronological order
    const timeSeriesData = [];
    const weeklyAccuracy = {};
    
    snapshot.forEach(doc => {
      const feedback = doc.data();
      const timestamp = feedback.timestamp.toDate();
      const weekKey = `${timestamp.getFullYear()}-${timestamp.getWeek()}`;
      
      if (!weeklyAccuracy[weekKey]) {
        weeklyAccuracy[weekKey] = { accurate: 0, inaccurate: 0 };
      }
      
      if (feedback.feedbackType === 'accurate') {
        weeklyAccuracy[weekKey].accurate++;
      } else {
        weeklyAccuracy[weekKey].inaccurate++;
      }
    });
    
    // Calculate accuracy percentages over time
    Object.entries(weeklyAccuracy).forEach(([weekKey, counts]) => {
      const total = counts.accurate + counts.inaccurate;
      const accuracyRate = total > 0 ? (counts.accurate / total) * 100 : 0;
      
      timeSeriesData.push({
        week: weekKey,
        accuracyRate,
        totalFeedback: total
      });
    });
    
    // Identify trend
    const trend = calculateTrend(timeSeriesData);
    
    return {
      timeSeriesData,
      trend,
      currentAccuracy: timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1].accuracyRate : 0
    };
  };
};

// Helper to calculate trend
const calculateTrend = (timeSeriesData) => {
  if (timeSeriesData.length < 2) return 'neutral';
  
  const start = timeSeriesData[0].accuracyRate;
  const end = timeSeriesData[timeSeriesData.length - 1].accuracyRate;
  const change = end - start;
  
  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
};