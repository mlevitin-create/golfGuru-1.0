// src/components/AdminFeedbackPanel.js
import React, { useState, useEffect } from 'react';
import { runFeedbackProcessing } from '../admin/processFeedback';
import { getAdjustmentFactors } from '../services/adjustmentService';
import { trackModelImprovement } from '../services/modelAnalytics'; // Import is already present, but good practice to include it again for clarity when highlighting changes

const AdminFeedbackPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentFactors, setCurrentFactors] = useState(null);
  const [modelAnalytics, setModelAnalytics] = useState(null); // Add state for model analytics

  // Load current adjustment factors
  useEffect(() => {
    const loadFactors = async () => {
      try {
        const factors = await getAdjustmentFactors();
        setCurrentFactors(factors);
      } catch (error) {
        console.error('Error loading adjustment factors:', error);
      }
    };

    loadFactors();
  }, []);

  // Updated handleProcessFeedback function
  const handleProcessFeedback = async () => {
    setLoading(true);
    try {
      const result = await runFeedbackProcessing();
      setResult(result);
      if (result.success) {
        setCurrentFactors(result.adjustmentFactors);
        if (result.modelAnalytics) {
          setModelAnalytics(result.modelAnalytics);
        }
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
            {Object.entries(currentFactors.metrics || {}).map(([metric, value]) => (
              <li key={metric}>{metric}: {value}</li>
            ))}
            {Object.keys(currentFactors.metrics || {}).length === 0 && (
              <li>No metric-specific adjustments found</li>
            )}
          </ul>
        </div>
      )}


      <button
        onClick={handleProcessFeedback}
        disabled={loading}
        className="button"
        style={{ marginTop: '20px' }}
      >
        {loading ? 'Processing...' : 'Process Feedback Now'}
      </button>

      {result && (
        <div
          style={{
            padding: '15px',
            marginTop: '20px',
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            color: result.success ? '#155724' : '#721c24',
            borderRadius: '5px'
          }}
        >
          {result.success
            ? (result.skipped
              ? 'Skipped processing (was done recently)'
              : 'Successfully processed feedback!')
            : `Error: ${result.error}`
          }

        </div>
      )}

      {/* Display Model Analytics */}
      {modelAnalytics && (
        <div style={{
          padding: '15px',
          marginTop: '20px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <h3>Model Analytics</h3>
          <p><strong>Current Accuracy Rate:</strong> {modelAnalytics.currentAccuracy.toFixed(1)}%</p>
          <p><strong>Trend:</strong> {modelAnalytics.trend}</p>
          {/* You could add a chart here to visualize the timeSeriesData */}
        </div>
      )}
    </div>
  );
};

export default AdminFeedbackPanel;