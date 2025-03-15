// src/components/AdminFeedbackPanel.js
import React, { useState } from 'react';
import { runFeedbackProcessing } from '../admin/processFeedback';
import { getAdjustmentFactors } from '../services/adjustmentService';

const AdminFeedbackPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentFactors, setCurrentFactors] = useState(null);
  
  // Load current adjustment factors
  useEffect(() => {
    const loadFactors = async () => {
      const factors = await getAdjustmentFactors();
      setCurrentFactors(factors);
    };
    loadFactors();
  }, []);
  
  const handleProcessFeedback = async () => {
    setLoading(true);
    try {
      const result = await runFeedbackProcessing();
      setResult(result);
      if (result.success) {
        setCurrentFactors(result.adjustmentFactors);
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="card">
      <h2>Feedback Processing Panel</h2>
      
      {currentFactors && (
        <div>
          <h3>Current Adjustment Factors</h3>
          <p>Overall: {currentFactors.overall}</p>
          <h4>Metric Adjustments:</h4>
          <ul>
            {Object.entries(currentFactors.metrics).map(([metric, value]) => (
              <li key={metric}>{metric}: {value}</li>
            ))}
          </ul>
        </div>
      )}
      
      <button 
        onClick={handleProcessFeedback}
        disabled={loading}
        className="button"
      >
        {loading ? 'Processing...' : 'Process Feedback Now'}
      </button>
      
      {result && (
        <div className={result.success ? 'success-message' : 'error-message'}>
          {result.success ? 'Successfully processed feedback!' : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
};