// src/components/VideoUpload.js
import React, { useState, useRef } from 'react';
import ClubSelector from './ClubSelector';

const VideoUpload = ({ onVideoUpload, isAnalyzing, navigateTo }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showClubSelector, setShowClubSelector] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process the selected file
  const handleFile = (file) => {
    // Check if the file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }
    
    // Check file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB in bytes
    if (file.size > maxSize) {
      setError(`File size exceeds the maximum limit (15MB). Please upload a smaller video or compress this one.`);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  // Handle button click
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Handle analyze button click
  const handleAnalyzeClick = () => {
    if (!selectedFile) {
      setError('Please select a video first');
      return;
    }
    
    // Show club selector before analyzing
    setShowClubSelector(true);
  };

  // Handle club selection continuation
  const handleClubContinue = (clubData) => {
    onVideoUpload(selectedFile, clubData);
  };

  // Handle skipping club selection
  const handleClubSkip = (nextAction) => {
    if (nextAction === 'setup-clubs') {
      // Navigate to the club setup page
      navigateTo('profile', { setupClubs: true });
    } else {
      // Continue with analysis without club data
      onVideoUpload(selectedFile);
    }
  };

  // If club selector is shown, render it
  if (showClubSelector) {
    return (
      <ClubSelector 
        onContinue={handleClubContinue} 
        onSkip={handleClubSkip} 
      />
    );
  }

  return (
    <div className="card">
      <h2>Upload Your Swing Video</h2>
      <p>Upload a video of your golf swing for AI analysis</p>
      
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          {error}
        </div>
      )}
      
      <div 
        className={`upload-area ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleChange}
          accept="video/*"
          style={{ display: 'none' }}
        />
        
        {!previewUrl ? (
          <>
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>Drag and drop a video file here, or click to select</p>
            <p className="small">Supported formats: MP4, MOV, AVI</p>
          </>
        ) : (
          <div className="video-container">
            <video 
              src={previewUrl} 
              controls 
              width="100%"
            />
          </div>
        )}
      </div>
      
      <div className="upload-tips">
        <h3>Tips for best results:</h3>
        <ul>
          <li>Record in good lighting</li>
          <li>Get a clear view of your full swing</li>
          <li>Try to record from a side angle (front-on or down-the-line)</li>
          <li>Keep the camera steady</li>
          <li>Make sure your entire body and club are visible throughout the swing</li>
        </ul>
      </div>
      
      {selectedFile && (
        <div className="selected-file-info">
          <p><strong>Selected File:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
      
      <button 
        className="button" 
        onClick={handleAnalyzeClick}
        disabled={!selectedFile || isAnalyzing}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Swing'}
      </button>
      
      {isAnalyzing && (
        <div className="analyzing-indicator">
          <div className="spinner"></div>
          <p>Analyzing your swing with AI...</p>
          <p>This may take a moment</p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;