import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '../utils/youtubeUtils';

const ReferenceVideoManager = () => {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [processing, setProcessing] = useState(false);

  // Load existing reference videos and metrics
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoading(true);
        
        // Get metrics from metricDetails or Firestore
        const metricsSnapshot = await getDocs(collection(db, 'metrics'));
        const metricsData = {};
        
        metricsSnapshot.forEach(doc => {
          metricsData[doc.id] = doc.data();
        });
        
        // Get reference models
        const referencesSnapshot = await getDocs(collection(db, 'reference_models'));
        
        referencesSnapshot.forEach(doc => {
          if (metricsData[doc.id]) {
            metricsData[doc.id] = {
              ...metricsData[doc.id],
              ...doc.data()
            };
          }
        });
        
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error loading reference data:', error);
        setStatus({ 
          type: 'error', 
          message: 'Failed to load reference data: ' + error.message 
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadReferenceData();
  }, []);

  // Handle YouTube URL update
  const handleUpdateReferenceVideo = async () => {
    if (!selectedMetric) {
      setStatus({ type: 'error', message: 'Please select a metric' });
      return;
    }
    
    if (!isValidYouTubeUrl(youtubeUrl)) {
      setStatus({ type: 'error', message: 'Please enter a valid YouTube URL' });
      return;
    }
    
    setProcessing(true);
    setStatus({ type: 'info', message: 'Processing reference video...' });
    
    try {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      // Update the reference URL in Firestore
      await setDoc(doc(db, 'metrics', selectedMetric), {
        ...metrics[selectedMetric],
        exampleUrl: youtubeUrl,
        embedUrl: embedUrl,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      // Clear any existing analysis
      await deleteDoc(doc(db, 'reference_models', selectedMetric));
      
      // Trigger the analysis process
      // This would call your enhanceMetricDetailsWithReferenceAnalysis function
      // but only for the selected metric
      
      setStatus({ 
        type: 'success', 
        message: `Reference video updated for ${selectedMetric}. Analysis will run in the background.` 
      });
      
      // Update local state
      setMetrics(prev => ({
        ...prev,
        [selectedMetric]: {
          ...prev[selectedMetric],
          exampleUrl: youtubeUrl,
          embedUrl: embedUrl,
          lastUpdated: new Date().toISOString()
        }
      }));
      
      // Clear inputs
      setYoutubeUrl('');
    } catch (error) {
      console.error('Error updating reference video:', error);
      setStatus({ 
        type: 'error', 
        message: 'Failed to update reference video: ' + error.message 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading reference data...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Reference Video Manager</h2>
      
      {status.message && (
        <div 
          className={`p-3 mb-4 rounded ${
            status.type === 'error' ? 'bg-red-100 text-red-800' : 
            status.type === 'success' ? 'bg-green-100 text-green-800' : 
            'bg-blue-100 text-blue-800'
          }`}
        >
          {status.message}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Select Metric:</label>
        <select 
          value={selectedMetric} 
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Select a metric --</option>
          {Object.entries(metrics).map(([key, metric]) => (
            <option key={key} value={key}>
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
            </option>
          ))}
        </select>
      </div>
      
      {selectedMetric && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Current Reference:</h3>
          {metrics[selectedMetric]?.exampleUrl ? (
            <div className="mb-4">
              <a 
                href={metrics[selectedMetric].exampleUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {metrics[selectedMetric].exampleUrl}
              </a>
              
              {metrics[selectedMetric].embedUrl && (
                <div className="mt-2">
                  <div className="aspect-w-16 aspect-h-9 mt-2">
                    <iframe
                      src={metrics[selectedMetric].embedUrl}
                      title={`Reference video for ${selectedMetric}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-48 rounded"
                    ></iframe>
                  </div>
                </div>
              )}
              
              {metrics[selectedMetric].lastAnalyzed && (
                <div className="mt-2 text-sm text-gray-600">
                  Last analyzed: {new Date(metrics[selectedMetric].lastAnalyzed).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-4 text-gray-600">No reference video set</div>
          )}
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              {metrics[selectedMetric]?.exampleUrl ? 'Update' : 'Add'} Reference Video URL:
            </label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full p-2 border rounded mb-2"
            />
            <button
              onClick={handleUpdateReferenceVideo}
              disabled={processing || !youtubeUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Update Reference'}
            </button>
          </div>
          
          {metrics[selectedMetric]?.referenceAnalysis && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Reference Analysis:</h3>
              <div className="border p-4 rounded bg-gray-50">
                <h4 className="font-medium mb-1">Technical Guidelines:</h4>
                <ul className="list-disc pl-5 mb-3">
                  {metrics[selectedMetric].referenceAnalysis.technicalGuidelines.map((guideline, index) => (
                    <li key={index} className="mb-1">{guideline}</li>
                  ))}
                </ul>
                
                <h4 className="font-medium mb-1">Ideal Form:</h4>
                <ul className="list-disc pl-5 mb-3">
                  {metrics[selectedMetric].referenceAnalysis.idealForm.map((item, index) => (
                    <li key={index} className="mb-1">{item}</li>
                  ))}
                </ul>
                
                <h4 className="font-medium mb-1">Common Mistakes:</h4>
                <ul className="list-disc pl-5">
                  {metrics[selectedMetric].referenceAnalysis.commonMistakes.map((mistake, index) => (
                    <li key={index} className="mb-1">{mistake}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="font-bold mb-2">Process All References</h3>
        <button
          onClick={() => {
            // This would trigger your enhanceMetricDetailsWithReferenceAnalysis function
            setStatus({ type: 'info', message: 'Processing all reference videos. This may take several minutes.' });
          }}
          disabled={processing}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Process All Reference Videos
        </button>
        <p className="mt-2 text-sm text-gray-600">
          This will analyze all reference videos to enhance the model's understanding of each swing metric.
          This process may take several minutes.
        </p>
      </div>
    </div>
  );
};

export default ReferenceVideoManager;