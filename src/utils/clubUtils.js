// src/utils/clubUtils.js

/**
 * Group swing data by club type
 * @param {Array} swings - Array of swing data objects
 * @returns {Object} Grouped data by club type
 */
export const groupSwingsByClubType = (swings) => {
    const groupedData = swings.reduce((acc, swing) => {
      if (!swing.clubType) return acc;
      
      if (!acc[swing.clubType]) {
        acc[swing.clubType] = [];
      }
      
      acc[swing.clubType].push(swing);
      return acc;
    }, {});
    
    return groupedData;
  };
  
  /**
   * Group swing data by specific club
   * @param {Array} swings - Array of swing data objects
   * @returns {Object} Grouped data by club ID
   */
  export const groupSwingsByClub = (swings) => {
    const groupedData = swings.reduce((acc, swing) => {
      if (!swing.clubId) return acc;
      
      if (!acc[swing.clubId]) {
        acc[swing.clubId] = [];
      }
      
      acc[swing.clubId].push(swing);
      return acc;
    }, {});
    
    return groupedData;
  };
  
  /**
   * Calculate average metrics for a club or club type
   * @param {Array} swings - Array of swing data for a specific club or club type
   * @returns {Object} Average metrics
   */
  export const calculateClubAverages = (swings) => {
    if (!swings || swings.length === 0) return null;
    
    // Initialize averages object with all metrics
    const sampleMetrics = swings[0].metrics || {};
    const totals = {
      overallScore: 0,
      ...Object.keys(sampleMetrics).reduce((acc, key) => {
        acc[key] = 0;
        return acc;
      }, {})
    };
    
    // Sum up all metric values
    swings.forEach(swing => {
      totals.overallScore += swing.overallScore || 0;
      
      if (swing.metrics) {
        Object.keys(swing.metrics).forEach(key => {
          totals[key] += swing.metrics[key] || 0;
        });
      }
    });
    
    // Calculate averages
    const count = swings.length;
    const averages = {
      overallScore: (totals.overallScore / count).toFixed(1),
      metrics: {}
    };
    
    Object.keys(sampleMetrics).forEach(key => {
      averages.metrics[key] = (totals[key] / count).toFixed(1);
    });
    
    return averages;
  };
  
  /**
   * Count swing outcomes by club
   * @param {Array} swings - Array of swing data objects
   * @returns {Object} Counted outcomes by club ID
   */
  export const countOutcomesByClub = (swings) => {
    const outcomes = {};
    
    swings.forEach(swing => {
      if (!swing.clubId || !swing.outcome) return;
      
      if (!outcomes[swing.clubId]) {
        outcomes[swing.clubId] = {};
      }
      
      if (!outcomes[swing.clubId][swing.outcome]) {
        outcomes[swing.clubId][swing.outcome] = 0;
      }
      
      outcomes[swing.clubId][swing.outcome]++;
    });
    
    return outcomes;
  };
  
  /**
   * Generate club-specific insights based on swing data
   * @param {Array} swings - Array of swing data objects
   * @param {Array} clubs - Array of user's clubs
   * @returns {Object} Club insights
   */
  export const generateClubInsights = (swings, clubs) => {
    if (!swings || swings.length === 0 || !clubs || clubs.length === 0) {
      return {};
    }
    
    const insights = {};
    const swingsByClub = groupSwingsByClub(swings);
    
    // Process each club that has swing data
    clubs.forEach(club => {
      const clubSwings = swingsByClub[club.id] || [];
      
      if (clubSwings.length < 2) return; // Need at least 2 swings for meaningful insights
      
      const averages = calculateClubAverages(clubSwings);
      const outcomes = clubSwings.reduce((acc, swing) => {
        if (swing.outcome) {
          acc[swing.outcome] = (acc[swing.outcome] || 0) + 1;
        }
        return acc;
      }, {});
      
      // Sort clubSwings by date to analyze trends
      const sortedSwings = [...clubSwings].sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstSwing = sortedSwings[0];
      const lastSwing = sortedSwings[sortedSwings.length - 1];
      
      // Calculate improvement
      const scoreImprovement = lastSwing.overallScore - firstSwing.overallScore;
      
      // Find most improved metric
      const metricImprovements = {};
      Object.keys(lastSwing.metrics || {}).forEach(key => {
        if (firstSwing.metrics && firstSwing.metrics[key] !== undefined) {
          metricImprovements[key] = lastSwing.metrics[key] - firstSwing.metrics[key];
        }
      });
      
      const sortedMetrics = Object.entries(metricImprovements)
        .sort(([, a], [, b]) => b - a)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
      
      // Generate insights text
      const mostCommonOutcome = Object.entries(outcomes)
        .sort(([, a], [, b]) => b - a)
        .shift();
      
      const insightTexts = [];
      
      // Overall improvement insight
      if (scoreImprovement > 5) {
        insightTexts.push(`Your ${club.name} swing has improved by ${scoreImprovement.toFixed(1)} points overall.`);
      } else if (scoreImprovement < -5) {
        insightTexts.push(`Your ${club.name} swing has declined by ${Math.abs(scoreImprovement).toFixed(1)} points. Focus on fundamentals.`);
      } else {
        insightTexts.push(`Your ${club.name} swing is consistent with minimal change over time.`);
      }
      
      // Most improved metric insight
      const [topMetricKey, topMetricValue] = Object.entries(sortedMetrics)[0] || ['', 0];
      if (topMetricValue > 10) {
        const readableMetric = topMetricKey.replace(/([A-Z])/g, ' $1').toLowerCase();
        insightTexts.push(`You've significantly improved your ${readableMetric} with this club.`);
      }
      
      // Outcome insight
      if (mostCommonOutcome) {
        const [outcomeType, outcomeCount] = mostCommonOutcome;
        const outcomePercentage = Math.round((outcomeCount / clubSwings.length) * 100);
        
        if (outcomeType === 'straight' && outcomePercentage > 50) {
          insightTexts.push(`This is one of your most reliable clubs with ${outcomePercentage}% straight shots.`);
        } else if (outcomeType !== 'straight' && outcomePercentage > 40) {
          insightTexts.push(`You tend to hit ${outcomeType} shots (${outcomePercentage}%) with this club.`);
        }
      }
      
      insights[club.id] = {
        numberOfSwings: clubSwings.length,
        averageScore: averages.overallScore,
        scoreImprovement,
        mostCommonOutcome: mostCommonOutcome ? mostCommonOutcome[0] : null,
        insights: insightTexts
      };
    });
    
    return insights;
  };
  
  export default {
    groupSwingsByClubType,
    groupSwingsByClub,
    calculateClubAverages,
    countOutcomesByClub,
    generateClubInsights
  };