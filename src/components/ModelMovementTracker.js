import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const ModelImprovementTracker = () => {
  const [accuracyData, setAccuracyData] = useState([]);
  const [metricAccuracy, setMetricAccuracy] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'all'

  useEffect(() => {
    const fetchAccuracyData = async () => {
      setLoading(true);
      try {
        // Set time range for query
        const timeLimit = new Date();
        if (timeRange === 'week') {
          timeLimit.setDate(timeLimit.getDate() - 7);
        } else if (timeRange === 'month') {
          timeLimit.setMonth(timeLimit.getMonth() - 1);
        } else {
          timeLimit.setFullYear(timeLimit.getFullYear() - 1); // Default to 1 year for 'all'
        }

        // Query feedback collection
        const feedbackQuery = query(
          collection(db, 'analysis_feedback'),
          where('timestamp', '>', Timestamp.fromDate(timeLimit)),
          orderBy('timestamp', 'asc')
        );

        const snapshot = await getDocs(feedbackQuery);
        
        // Process data for overall accuracy trend
        const weeklyAccuracy = {};
        const metricFeedback = {};
        
        snapshot.forEach(doc => {
          const feedback = doc.data();
          const timestamp = feedback.timestamp.toDate();
          const weekKey = `${timestamp.getFullYear()}-${Math.floor(timestamp.getMonth() / 3 + 1)}Q`; // Quarterly
          
          // Track accuracy by week (or quarter)
          if (!weeklyAccuracy[weekKey]) {
            weeklyAccuracy[weekKey] = { accurate: 0, inaccurate: 0 };
          }
          
          if (feedback.feedbackType === 'accurate') {
            weeklyAccuracy[weekKey].accurate++;
          } else {
            weeklyAccuracy[weekKey].inaccurate++;
          }
          
          // Track metric-specific accuracy
          if (feedback.metricFeedback) {
            Object.entries(feedback.metricFeedback).forEach(([metric, opinion]) => {
              if (!metricFeedback[metric]) {
                metricFeedback[metric] = { accurate: 0, inaccurate: 0 };
              }
              
              if (opinion === 'accurate') {
                metricFeedback[metric].accurate++;
              } else if (opinion === 'too_high' || opinion === 'too_low') {
                metricFeedback[metric].inaccurate++;
              }
            });
          }
        });
        
        // Convert weekly data to chart format
        const chartData = Object.entries(weeklyAccuracy).map(([week, counts]) => {
          const total = counts.accurate + counts.inaccurate;
          const accuracyRate = total > 0 ? (counts.accurate / total) * 100 : 0;
          
          return {
            week,
            accuracyRate: Math.round(accuracyRate * 10) / 10,
            totalFeedback: total
          };
        });
        
        // Calculate metric accuracy percentages
        const metricAccuracyData = {};
        Object.entries(metricFeedback).forEach(([metric, counts]) => {
          const total = counts.accurate + counts.inaccurate;
          if (total >= 3) { // Only include metrics with enough feedback
            metricAccuracyData[metric] = {
              accuracyRate: Math.round((counts.accurate / total) * 1000) / 10,
              totalFeedback: total
            };
          }
        });
        
        // Sort chart data by week
        chartData.sort((a, b) => {
          return a.week.localeCompare(b.week);
        });
        
        setAccuracyData(chartData);
        setMetricAccuracy(metricAccuracyData);
      } catch (error) {
        console.error('Error fetching accuracy data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccuracyData();
  }, [timeRange]);
  
  // Calculate current accuracy and trend
  const getCurrentAccuracy = () => {
    if (accuracyData.length === 0) return { rate: 0, trend: 'neutral' };
    
    const currentRate = accuracyData[accuracyData.length - 1].accuracyRate;
    
    // Calculate trend
    let trend = 'neutral';
    if (accuracyData.length >= 2) {
      const firstRate = accuracyData[0].accuracyRate;
      const diff = currentRate - firstRate;
      
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'declining';
    }
    
    return { rate: currentRate, trend };
  };
  
  const { rate, trend } = getCurrentAccuracy();
  
  // Get trend color
  const getTrendColor = (trend) => {
    switch(trend) {
      case 'improving': return '#10b981';
      case 'declining': return '#ef4444';
      default: return '#3b82f6';
    }
  };
  
  if (loading) {
    return <div className="p-4">Loading model improvement data...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Model Improvement Tracking</h2>
      
      <div className="mb-4">
        <label className="mr-2 font-medium">Time Range:</label>
        <div className="inline-flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              timeRange === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 text-sm font-medium ${
              timeRange === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border-t border-b border-gray-300`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              timeRange === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } border border-gray-300`}
          >
            All Time
          </button>
        </div>
      </div>
      
      {/* Current Accuracy Card */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Current Analysis Accuracy</h3>
            <p className="text-gray-500">Based on user feedback</p>
          </div>
          <div className={`text-3xl font-bold text-${getTrendColor(trend)}`}>
            {rate.toFixed(1)}%
            <span className="ml-2 text-lg">
              {trend === 'improving' && '↑'}
              {trend === 'declining' && '↓'}
              {trend === 'neutral' && '→'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Accuracy Chart */}
      {accuracyData.length > 1 ? (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Accuracy Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={accuracyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Accuracy Rate']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracyRate" 
                  stroke="#3b82f6" 
                  activeDot={{ r: 8 }} 
                  name="Accuracy Rate (%)" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 border rounded-lg text-center">
          Not enough historical data to display accuracy trend
        </div>
      )}
      
      {/* Metric-specific Accuracy */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Metric-Specific Accuracy</h3>
        
        {Object.keys(metricAccuracy).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metric
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accuracy
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(metricAccuracy)
                  .sort(([, a], [, b]) => b.accuracyRate - a.accuracyRate)
                  .map(([metric, data]) => (
                    <tr key={metric}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${
                                data.accuracyRate >= 80 ? 'bg-green-500' :
                                data.accuracyRate >= 60 ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`} 
                              style={{ width: `${Math.min(100, data.accuracyRate)}%` }}
                            ></div>
                          </div>
                          <span>{data.accuracyRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.totalFeedback}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border rounded-lg text-center">
            Not enough feedback data to display metric-specific accuracy
          </div>
        )}
      </div>
      
      <div className="mt-6 p-4 border rounded-lg bg-blue-50">
        <h3 className="font-medium mb-2">How to Improve Model Accuracy</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Add high-quality reference videos for each swing metric</li>
          <li>Process reference videos to extract detailed technical guidelines</li>
          <li>Encourage user feedback on swing analysis</li>
          <li>Review metrics with low accuracy and update their reference videos</li>
          <li>Periodically reprocess all reference videos as the AI model improves</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelImprovementTracker;