// src/components/FeedbackWidget.js
import React, { useState } from 'react';
import { collectAnalysisFeedback } from '../services/geminiService';

/**
 * Component for collecting user feedback on swing analysis
 * @param {Object} swingData - The swing analysis data
 * @param {Function} onFeedbackGiven - Callback when feedback is submitted
 * @returns {JSX.Element} Feedback component
 */
const FeedbackWidget = ({ swingData, onFeedbackGiven }) => {
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState('accurate');
  const [metricFeedback, setMetricFeedback] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setSubmitting(true);
    const success = await collectAnalysisFeedback(swingData, feedback, metricFeedback);
    setSubmitting(false);
    if (success && onFeedbackGiven) {
      onFeedbackGiven();
    }
    setShowForm(false);
  };
  
  if (!showForm) {
    return (
      <button 
        onClick={() => setShowForm(true)}
        style={{ padding: '8px 12px', fontSize: '0.9rem', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
      >
        How accurate was this analysis?
      </button>
    );
  }
  
  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h4 style={{ marginTop: 0 }}>Help Improve the Analysis</h4>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Overall score accuracy:</label>
        <select 
          value={feedback} 
          onChange={(e) => setFeedback(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
        >
          <option value="accurate">Accurate</option>
          <option value="too_high">Too High</option>
          <option value="too_low">Too Low</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <p style={{ margin: '0 0 10px 0' }}>Specific metrics feedback (optional):</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {swingData && swingData.metrics && Object.entries(swingData.metrics).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '3px', fontSize: '0.9rem' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} ({value}):
              </label>
              <select
                value={metricFeedback[key] || ''}
                onChange={(e) => setMetricFeedback({...metricFeedback, [key]: e.target.value})}
                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', fontSize: '0.9rem' }}
              >
                <option value="">Select...</option>
                <option value="accurate">Accurate</option>
                <option value="too_high">Too High</option>
                <option value="too_low">Too Low</option>
              </select>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button 
          onClick={() => setShowForm(false)}
          style={{ padding: '8px 16px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          style={{ 
            padding: '8px 16px', 
            background: '#3498db', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackWidget;