// src/components/VideoUpload.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isValidYouTubeUrl, extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtubeUtils';
import ShotDetailsCollector from './ShotDetailsCollector';
import videoUrlManager from '../utils/VideoUrlManager';
import UserLoginIndicator from './UserLoginIndicator';

const VideoUpload = ({ onVideoUpload, onVideoSelect, isAnalyzing, navigateTo }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('upload'); // 'upload', 'shotDetails'
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeVideo, setYoutubeVideo] = useState(null);
  const [error, setError] = useState(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    try {
      // Store the file for use in shot details
      setVideoFile(file);
      
      // If using the preview mode, pass to onVideoSelect
      if (onVideoSelect) {
        onVideoSelect(file);
      } else {
        // Move to shot details collection
        setStep('shotDetails');
      }
    } catch (error) {
      console.error('Error processing video:', error);
      setError('Error processing video file. Please try again.');
    }
  };

  // Handle YouTube URL submission
  const handleYoutubeSubmit = (e) => {
    e.preventDefault();
    
    if (!videoUrl) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    if (!isValidYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    
    // Extract video ID
    const videoId = extractYouTubeVideoId(videoUrl);
    const embedUrl = getYouTubeEmbedUrl(videoId);
    
    // Set YouTube video data
    setYoutubeVideo({
      videoId,
      embedUrl,
      url: videoUrl
    });
    
    // Move to shot details
    setStep('shotDetails');
  };

  // Handle drag and drop events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDropActive) setIsDropActive(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }
    
    try {
      // Store file for shot details
      setVideoFile(file);
      
      // If preview mode, use onVideoSelect
      if (onVideoSelect) {
        onVideoSelect(file);
      } else {
        // Move to shot details
        setStep('shotDetails');
      }
    } catch (error) {
      console.error('Error processing video:', error);
      setError('Error processing video file. Please try again.');
    }
  };

  // Handle shot details completion
  const handleShotDetailsComplete = (shotDetails) => {
    // Check if user wants to set up clubs
    if (shotDetails.setupClubs) {
      navigateTo('profile', { setupClubs: true });
      return;
    }
    
    // Start analysis with collected details
    onVideoUpload(videoFile, shotDetails);
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // Clear state and temporary resources
      if (videoFile) {
        setVideoFile(null);
      }
    };
  }, []);

  // Render upload step
  const renderUploadStep = () => (
    <div className="upload-step">
      <h2>Upload Your Swing</h2>
      <p>Upload a video of your golf swing for AI analysis</p>
      
      {/* Drag and drop area */}
      <div 
        className={`upload-area ${isDropActive ? 'active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ 
          background: isDropActive ? '#f0f7ff' : 'white',
          borderColor: isDropActive ? '#3498db' : '#ccc',
          position: 'relative'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="video/*"
          style={{ display: 'none' }}
        />
        
        {/* Cloud Upload Icon */}
        <div style={{ marginBottom: '15px' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
          Upload or drag video here
        </p>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#777' }}>
          MP4, MOV, and other video formats supported
        </p>
      </div>
      
      <div className="upload-divider" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        margin: '30px 0',
        color: '#999'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        <span style={{ padding: '0 15px', fontSize: '0.9rem' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
      </div>
      
      {/* YouTube URL input */}
      <form onSubmit={handleYoutubeSubmit} style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Enter YouTube URL</h3>
        <div style={{ display: 'flex' }}>
          <input 
            type="text" 
            value={videoUrl} 
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: '4px 0 0 4px',
              border: '1px solid #ddd',
              borderRight: 'none'
            }}
          />
          <button 
            type="submit" 
            className="button"
            style={{ 
              borderRadius: '0 4px 4px 0',
            }}
          >
            Analyze
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="video-upload-container" style={{ position: 'relative' }}>
      {/* Login status indicator */}
      <UserLoginIndicator 
        isLoggedIn={!!currentUser} 
        onProfileClick={() => navigateTo('profile')} 
      />
      
      {/* Error message if any */}
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px' 
        }}>
          {error}
        </div>
      )}
      
      {/* Loading overlay when analyzing */}
      {isAnalyzing && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <div className="spinner"></div>
          <h3 style={{ marginTop: '20px' }}>Analyzing Your Swing</h3>
          <p>This may take a few moments...</p>
        </div>
      )}
      
      {/* Render current step */}
      {step === 'upload' && renderUploadStep()}
      
      {/* Shot details collection step */}
      {step === 'shotDetails' && (
        <ShotDetailsCollector
          videoFile={videoFile}
          youtubeVideo={youtubeVideo}
          onComplete={handleShotDetailsComplete}
          onBack={() => setStep('upload')}
          isProcessing={isAnalyzing}
        />
      )}
    </div>
  );
};

export default VideoUpload;