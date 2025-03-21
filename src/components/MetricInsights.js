// src/components/MetricInsights.js
import React from 'react';
import { metricInsightsGenerator } from '../services/geminiService';
import './SwingAnalysis.css';

/**
 * Component to display detailed insights for a specific swing metric
 * @param {Object} props
 * @param {string} props.metricKey - The metric key (e.g., 'backswing')
 * @param {Object} props.insights - The insights data for this metric
 * @param {boolean} props.isLoading - Whether insights are being loaded
 * @param {Function} props.getScoreColor - Function to get color based on score
 * @param {number} props.score - The score value for this metric
 * @param {Function} props.toggleSection - Function to toggle section expansion
 * @param {Function} props.isSectionExpanded - Function to check if section is expanded
 * @param {Object} props.swingData - The full swing data object
 */
const MetricInsights = ({
  metricKey,
  insights,
  isLoading,
  getScoreColor,
  score,
  toggleSection,
  isSectionExpanded,
  swingData
}) => {
  // Function to get default insights if API fails
  const getDefaultInsights = () => {
    return metricInsightsGenerator.getDefaultInsights(metricKey, swingData);
  };
  
  // Use either provided insights or defaults
  const safeInsights = insights || getDefaultInsights();
  
  // Render category header with toggle
  const renderSectionHeader = (title, sectionKey) => (
    <div 
      className="section-header" 
      onClick={() => toggleSection(sectionKey)}
    >
      <h4>{title}</h4>
      <button className="toggle-button">
        {isSectionExpanded(sectionKey) ? '−' : '+'}
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="metric-insights insights-loading">
        <p>Generating detailed insights...</p>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="metric-insights">
      {/* Good aspects section */}
      <div className="goodAspects">
        {renderSectionHeader(`What You're Doing Well`, 'goodAspects')}
        {isSectionExpanded('goodAspects') && (
          <ul>
            {safeInsights.goodAspects.map((item, index) => (
              <li key={`good-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Improvement areas section */}
      <div className="improvementAreas">
        {renderSectionHeader('Areas for Improvement', 'improvementAreas')}
        {isSectionExpanded('improvementAreas') && (
          <ul>
            {safeInsights.improvementAreas.map((item, index) => (
              <li key={`improve-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Technical breakdown section */}
      <div className="technicalBreakdown">
        {renderSectionHeader('Technical Breakdown', 'technicalBreakdown')}
        {isSectionExpanded('technicalBreakdown') && (
          <ul>
            {safeInsights.technicalBreakdown.map((item, index) => (
              <li key={`tech-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Recommendations section */}
      <div className="recommendations">
        {renderSectionHeader('Recommendations', 'recommendations')}
        {isSectionExpanded('recommendations') && (
          <ul>
            {safeInsights.recommendations.map((item, index) => (
              <li key={`rec-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Feel tips section */}
      {safeInsights.feelTips && safeInsights.feelTips.length > 0 && (
        <div className="feel-tips">
          <h4>Feel Tips</h4>
          <ul>
            {safeInsights.feelTips.map((tip, index) => (
              <li key={`feel-${index}`}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MetricInsights;