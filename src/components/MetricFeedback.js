import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import { getMetricInfo } from '../utils/swingUtils';

const MetricFeedbackComponent = ({ metricKey, metricValue, swingData, onFeedbackGiven }) => {
  const [feedbackType, setFeedbackType] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get metric display info
  const metricInfo = getMetricInfo(metricKey);
  const metricName = metricInfo.title || metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  const handleSubmit = async () => {
    if (!feedbackType) return;
    setSubmitting(true);

    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      
      // Create the feedback document
      const feedbackData = {
        timestamp: serverTimestamp(),
        userId,
        swingId: swingData?.id || null,
        metricKey,
        metricValue,
        feedbackType,
        confidenceLevel,
        feedbackNote,
        overallScore: swingData?.overallScore,
        referenceVideoUsed: true, // Flag to indicate this uses reference-based scoring
      };
      
      // Add to the metric-specific feedback collection
      await setDoc(doc(db, 'metric_feedback', `${metricKey}_${Date.now()}`), feedbackData);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setExpanded(false);
        if (onFeedbackGiven) onFeedbackGiven(metricKey, feedbackType);
      }, 2000);
    } catch (error) {
      console.error('Error saving metric feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
        Thank you for your feedback on {metricName}!
      </div>
    );
  }

  return (
    <div className="mt-2 mb-3 border border-gray-200 rounded-md overflow-hidden">
      <div 
        className="flex justify-between items-center p-2 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-medium text-sm">How accurate is this {metricName} score?</span>
        <button className="text-gray-500 focus:outline-none">
          {expanded ? '−' : '+'}
        </button>
      </div>
      
      {expanded && (
        <div className="p-3 bg-white">
          <div className="mb-3">
            <div className="flex space-x-2 mb-2">
              <button
                type="button"
                onClick={() => setFeedbackType('accurate')}
                className={`px-3 py-1 text-xs rounded-full ${
                  feedbackType === 'accurate' 
                    ? 'bg-green-100 text-green-800 border-green-300' 
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                } border`}
              >
                Accurate
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('too_high')}
                className={`px-3 py-1 text-xs rounded-full ${
                  feedbackType === 'too_high' 
                    ? 'bg-red-100 text-red-800 border-red-300' 
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                } border`}
              >
                Too High
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('too_low')}
                className={`px-3 py-1 text-xs rounded-full ${
                  feedbackType === 'too_low' 
                    ? 'bg-blue-100 text-blue-800 border-blue-300' 
                    : 'bg-gray-100 text-gray-800 border-gray-200'
                } border`}
              >
                Too Low
              </button>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-xs text-gray-700 mb-1">Your confidence (optional):</label>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={confidenceLevel} 
              onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="block text-xs text-gray-700 mb-1">Additional notes (optional):</label>
            <textarea
              rows="2"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Why do you think this score is inaccurate?"
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!feedbackType || submitting}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricFeedbackComponent;