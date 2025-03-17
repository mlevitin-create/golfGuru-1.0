// src/admin/AdminPage.js
import React, { useState, useEffect } from 'react';
import ReferenceVideoManager from '../components/ReferenceVideoManager';
import ModelImprovementTracker from '../components/ModelImprovementTracker';
import AdminFeedbackPanel from '../components/AdminFeedbackPanel';
import AdminAccessCheck from '../components/AdminAccessCheck';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('feedback');
  const [initializing, setInitializing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [processingResults, setProcessingResults] = useState(null);

  // This is the comprehensive metrics data with reference videos from the document
  const metricsData = {
    confidence: {
      title: "Confidence",
      description: "This is focused on the mental side of the game. Confidence is key to not be phased by the pressure of the game, being able to stick to your fundamentals and not get in your head after a bad shot.",
      category: "Mental",
      difficulty: 7,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=y95_Us_qCpQ"
    },
    focus: {
      title: "Focus",
      description: "This is also focused on the mental side of the game. This is the ability to hone in on where you want to hit your shot and your concentration on the ball. Staying focused means you aren't bouncing your eyes around but remain focused on the ball.",
      category: "Mental",
      difficulty: 4,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=SLbeLgQls_4"
    },
    stiffness: {
      title: "Stiffness",
      description: "Your ability to remove tension from your body during your swing. You don't want to be too tight or else it will limit your body from being able to swing properly. But you also don't want your body to be too loose or else you will sacrifice other fundamentals of your swing.",
      category: "Body",
      difficulty: 5,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=trOLRAPi07M"
    },
    stance: {
      title: "Setup Stance",
      description: "This is the proper set up before your swing. You want to be the right distance between you and the ball. This includes your feet around shoulder width apart with your club at roughly a 45 degree angle and your hands lined up underneath your head.",
      category: "Setup",
      difficulty: 2,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=P4d5TjzEgtk"
    },
    grip: {
      title: "Grip",
      description: "You should be using an interlocking golf grip instead of holding the club like a baseball bat. This will create a consistent swing and keep the club and your hands from rotating too much during your swing.",
      category: "Setup",
      difficulty: 3,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=nd6y-5nInHQ"
    },
    ballPosition: {
      title: "Ball Position",
      description: "You want to stand the right distance from the ball as you set up to take your shot. This should be so the club is at roughly a 45 degree angle from the ball and that the ball is positioned different based on the club you are using - a driver should have the ball closer to your lead foot while a short range club will have the ball more in between your feet.",
      category: "Setup",
      difficulty: 1,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=UdZfTKBfGho"
    },
    backswing: {
      title: "Backswing",
      description: "Your takeaway and club position during the backswing phase.",
      category: "Club",
      difficulty: 8,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=oszzApkv54s"
    },
    swingForward: {
      title: "Forward Swing",
      description: "The path and position of the club during the forward swing phase, as you begin to swing towards the ball.",
      category: "Club",
      difficulty: 8,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=xia6slsDGd4"
    },
    swingSpeed: {
      title: "Swing Speed",
      description: "Finding the way to maximize your swing speed where you are able to stay in control but still generate enough power to increase distance.",
      category: "Club",
      difficulty: 7,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=FSDH0DXWP7M"
    },
    shallowing: {
      title: "Shallowing",
      description: "How well the club 'shallows' or drops into the correct path during the downswing.",
      category: "Club",
      difficulty: 9,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=OaeUTaBo6hw"
    },
    impactPosition: {
      title: "Impact Position",
      description: "The position and angle of the club at the moment of impact with the ball.",
      category: "Club",
      difficulty: 10,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=Wu7jMcPK2yM"
    },
    hipRotation: {
      title: "Hip Rotation",
      description: "How your hips rotate throughout the swing.",
      category: "Body",
      difficulty: 6,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=p_HZJ2u0TIo&t=2s"
    },
    pacing: {
      title: "Tempo & Rhythm",
      description: "The overall rhythm and timing of your swing to ensure proper technique.",
      category: "Body",
      difficulty: 6,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=t8npyrOQ9Os"
    },
    followThrough: {
      title: "Follow Through",
      description: "The completion of the swing after impact with the ball.",
      category: "Body",
      difficulty: 4,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=kf0v-iCntNo"
    },
    headPosition: {
      title: "Head Position",
      description: "The position and stability of your head throughout the entire swing.",
      category: "Body",
      difficulty: 4,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=CsDhFI0A8-Y"
    },
    shoulderPosition: {
      title: "Shoulder Position",
      description: "The position and movement of your shoulders through the swing.",
      category: "Body",
      difficulty: 6,
      weighting: "5.88%",
      exampleUrl: "https://www.youtube.com/watch?v=OCuK7nWvHt0"
    },
    armPosition: {
      title: "Arm Position",
      description: "The proper positioning of your arms throughout the entire swing.",
      category: "Body",
      difficulty: 6,
      weighting: "5.88%",
      exampleUrl: "https://youtu.be/ToDcjnxouQU"
    }
  };

  // Function to initialize metrics collection with YouTube references
  const handleInitializeMetrics = async () => {
    try {
      setInitializing(true);
      setMessage({ type: 'info', text: 'Initializing metrics collection with YouTube references...' });
      
      console.log("Starting metrics initialization with YouTube references...");
      const batchOp = writeBatch(db);
      
      // Add each metric to the batch with processed video info
      Object.entries(metricsData).forEach(([key, data]) => {
        const videoId = extractYouTubeVideoId(data.exampleUrl);
        const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        
        const docRef = doc(db, 'metrics', key);
        batchOp.set(docRef, {
          ...data,
          embedUrl,
          youtubeVideoId: videoId,
          initialized: new Date().toISOString()
        });
        console.log(`Added ${key} to batch with reference: ${data.exampleUrl}`);
      });
      
      // Commit the batch
      await batchOp.commit();
      console.log("All metrics initialized successfully with YouTube references");
      
      setMessage({ 
        type: 'success', 
        text: `Successfully initialized ${Object.keys(metricsData).length} metrics with YouTube references!` 
      });
    } catch (error) {
      console.error('Error initializing metrics:', error);
      setMessage({ 
        type: 'error', 
        text: `Error: ${error.message}` 
      });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <AdminAccessCheck>
      <div className="admin-page p-4">
        <h1 className="text-2xl font-bold mb-4">Golf Guru Admin Dashboard</h1>
        
        {/* Tabs navigation */}
        <div className="flex border-b mb-4">
          <button 
            className={`px-4 py-2 ${activeTab === 'feedback' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback Analysis
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'references' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('references')}
          >
            Reference Videos
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'metrics' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Model Metrics
          </button>
        </div>
        
        {/* Display messages in all tabs */}
        {message.text && (
          <div className={`p-3 mb-4 rounded ${
            message.type === 'error' ? 'bg-red-100 text-red-800' : 
            message.type === 'success' ? 'bg-green-100 text-green-800' : 
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}
        
        {/* Content based on active tab */}
        {activeTab === 'feedback' && (
          <section>
            <h2 className="text-xl font-bold mb-2">Feedback Analysis</h2>
            <AdminFeedbackPanel />
          </section>
        )}
        
        {activeTab === 'references' && (
          <section>
            <h2 className="text-xl font-bold mb-2">Reference Video Management</h2>
            
            {/* Initialization buttons */}
            <div className="mb-6 p-4 bg-gray-50 border rounded">
              <h3 className="font-medium mb-2">Database Initialization</h3>
              <button 
                onClick={handleInitializeMetrics}
                disabled={initializing}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 mr-2"
              >
                {initializing ? 'Initializing...' : 'Initialize Metrics with YouTube References'}
              </button>
              
              <p className="mt-2 text-sm text-gray-600">
                This will create all metrics in Firestore with the YouTube references from your document.
                Only use this button when setting up the app for the first time or if you need to reset the metrics.
              </p>
            </div>
            
            <ReferenceVideoManager />
          </section>
        )}
        
        {activeTab === 'metrics' && (
          <section>
            <h2 className="text-xl font-bold mb-2">Model Performance Tracking</h2>
            <ModelImprovementTracker />
          </section>
        )}
      </div>
    </AdminAccessCheck>
  );
};

export default AdminPage;