import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getMetricInfo, getScoreColor } from '../utils/swingUtils';

const SwingComparisonComponent = ({ metricKey, userValue, swingData }) => {
  const [referenceData, setReferenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  
  // Get the metric info for display
  const metricInfo = getMetricInfo(metricKey);
  const metricName = metricInfo.title || metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoading(true);
        
        // Try to fetch reference data from Firestore
        const docRef = doc(db, 'reference_models', metricKey);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setReferenceData(docSnap.data());
        } else {
          console.log(`No reference data found for ${metricKey}`);
        }
      } catch (error) {
        console.error(`Error loading reference data for ${metricKey}:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    loadReferenceData();
  }, [metricKey]);
  
  if (loading) {
    return <div className="text-sm text-gray-400">Loading comparison data...</div>;
  }
  
  if (!referenceData || !referenceData.referenceAnalysis) {
    return (
      <div className="text-sm text-gray-500">
        <button 
          onClick={() => setShowComparison(!showComparison)}
          className="text-blue-600 hover:underline focus:outline-none text-sm"
        >
          {showComparison ? 'Hide reference info' : 'Show reference info'}
        </button>
        
        {showComparison && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
            <p><strong>Reference:</strong> {metricInfo.description}</p>
            <p className="mt-1"><strong>Difficulty:</strong> {metricInfo.difficulty}/10</p>
            <p className="mt-1"><strong>Category:</strong> {metricInfo.category}</p>
            {metricInfo.exampleUrl && (
              <p className="mt-2">
                <a 
                  href={metricInfo.exampleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Watch reference video
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="mt-1">
      <button 
        onClick={() => setShowComparison(!showComparison)}
        className="text-blue-600 hover:underline focus:outline-none text-sm"
      >
        {showComparison ? 'Hide comparison' : 'Compare with reference'}
      </button>
      
      {showComparison && (
        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
          <h4 className="font-medium text-sm">{metricName} Comparison</h4>
          
          <div className="mt-2 flex space-x-2">
            <div className="w-1/2 p-2 bg-white rounded shadow-sm">
              <div className="text-xs font-medium mb-1">Your Technique</div>
              <div 
                className="text-2xl font-bold" 
                style={{ color: getScoreColor(userValue) }}
              >
                {userValue}
              </div>
              
              {/* Specific user feedback based on score ranges */}
              <div className="mt-2 text-xs">
                {userValue >= 85 ? (
                  <div className="text-green-600">Excellent technique!</div>
                ) : userValue >= 70 ? (
                  <div className="text-blue-600">Good technique</div>
                ) : userValue >= 50 ? (
                  <div className="text-yellow-600">Developing technique</div>
                ) : (
                  <div className="text-red-600">Needs improvement</div>
                )}
              </div>
            </div>
            
            <div className="w-1/2 p-2 bg-white rounded shadow-sm">
              <div className="text-xs font-medium mb-1">Reference Standard</div>
              <div className="text-xs">
                {referenceData.referenceAnalysis.idealForm[0]}
              </div>
              
              {metricInfo.exampleUrl && (
                <div className="mt-2">
                  <a 
                    href={metricInfo.exampleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Watch reference video
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {/* Scoring criteria from reference */}
          <div className="mt-3">
            <div className="text-xs font-medium mb-1">Scoring Criteria:</div>
            <ul className="text-xs list-disc pl-5 space-y-1">
              {referenceData.referenceAnalysis.scoringRubric && (
                <li>90+: {referenceData.referenceAnalysis.scoringRubric['90+'] || 'Perfect technique'}</li>
              )}
              {referenceData.referenceAnalysis.scoringRubric && (
                <li>70-89: {referenceData.referenceAnalysis.scoringRubric['70-89'] || 'Good technique with minor flaws'}</li>
              )}
              {referenceData.referenceAnalysis.scoringRubric && (
                <li>50-69: {referenceData.referenceAnalysis.scoringRubric['50-69'] || 'Developing technique with clear issues'}</li>
              )}
              {referenceData.referenceAnalysis.scoringRubric && (
                <li>&lt;50: {referenceData.referenceAnalysis.scoringRubric['<50'] || 'Significant flaws requiring attention'}</li>
              )}
            </ul>
          </div>
          
          {/* Key improvement tips from reference */}
          {userValue < 85 && referenceData.referenceAnalysis.commonMistakes && (
            <div className="mt-3">
              <div className="text-xs font-medium mb-1">Key Focus Area:</div>
              <div className="text-xs">
                {referenceData.referenceAnalysis.commonMistakes[0]}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwingComparisonComponent;