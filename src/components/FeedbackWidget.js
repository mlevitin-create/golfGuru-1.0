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
  const [isProSwing, setIsProSwing] = useState(false);
  const [skillLevel, setSkillLevel] = useState('amateur');
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [adjustmentPriority, setAdjustmentPriority] = useState('as-needed');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null); // Reset error state before trying
    
    try {
      const success = await collectAnalysisFeedback(
        swingData, 
        feedback, 
        metricFeedback,
        {
          isProSwing,
          skillLevel,
          confidenceLevel,
          adjustmentPriority,
          additionalNotes
        }
      );
      
      if (success) {
        // Successfully saved feedback
        if (onFeedbackGiven) {
          onFeedbackGiven();
        }
        setShowForm(false);
      } else {
        // API returned false but didn't throw an error
        setSubmitError("Couldn't save feedback. Please try again later.");
        // Keep the form open so user can see the error
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      
      // Provide user-friendly error messages based on error type
      if (error.name === "FirebaseError" && error.message.includes("permission")) {
        setSubmitError("Authentication required. Please sign in to submit feedback.");
      } else {
        setSubmitError(`Error saving feedback: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
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
            <option value="form_issue">Form Issue</option>
            <option value="pacing_issue">Pacing Issue</option>
            <option value="not_helpful">Not Helpful</option>
          </select>
      </div>
      
      {/* Golfer Skill Level Section */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={isProSwing}
              onChange={(e) => setIsProSwing(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            This is a professional golfer's swing
          </label>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Golfer skill level:</label>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
          >
            <option value="pro">Professional</option>
            <option value="advanced">Advanced (0-5 handicap)</option>
            <option value="amateur">Intermediate (6-15 handicap)</option>
            <option value="beginner">Beginner (16+ handicap)</option>
          </select>
        </div>
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
      
      {/* Toggle for advanced options */}
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#3498db', 
            padding: '0', 
            fontSize: '0.9rem', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          <span style={{ marginRight: '5px' }}>{showAdvancedOptions ? '▼' : '►'}</span>
          {showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
        </button>
      </div>
      
      {/* Advanced options */}
      {showAdvancedOptions && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Your confidence in this feedback:</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={confidenceLevel} 
                onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                style={{ flex: '1', marginRight: '10px' }}
              />
              <span>{confidenceLevel} / 5</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
              {confidenceLevel === 1 && "Not very confident"}
              {confidenceLevel === 2 && "Somewhat confident"}
              {confidenceLevel === 3 && "Moderately confident"}
              {confidenceLevel === 4 && "Very confident"}
              {confidenceLevel === 5 && "Extremely confident"}
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Apply adjustments based on this feedback:</label>
            <select
              value={adjustmentPriority}
              onChange={(e) => setAdjustmentPriority(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
            >
              <option value="as-needed">Only when needed (recommended)</option>
              <option value="always">Always apply</option>
              <option value="never">Never apply</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Additional notes:</label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other observations about the analysis..."
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', height: '80px', resize: 'vertical' }}
            />
          </div>
        </div>
      )}
      
      {/* Error message display */}
      {submitError && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          fontSize: '0.9rem'
        }}>
          {submitError}
        </div>
      )}
      
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