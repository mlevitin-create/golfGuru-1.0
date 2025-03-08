// src/components/VideoUpload.js
import React, { useState, useRef, useEffect } from 'react';
import ClubSelector from './ClubSelector';

const VideoUpload = ({ onVideoUpload, isAnalyzing, navigateTo }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [showClubSelector, setShowClubSelector] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Generate thumbnail from video file
  const generateThumbnail = (videoFile) => {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    const fileUrl = URL.createObjectURL(videoFile);
    videoElement.src = fileUrl;
    
    // When video data is loaded, create thumbnail
    videoElement.onloadeddata = () => {
      console.log('Video loaded, seeking to thumbnail position');
      // Seek to 1 second or 1/4 through the video, whichever is less
      videoElement.currentTime = 1;
    };
    
    // Once we've seeked to the right place, capture the frame
    videoElement.onseeked = () => {
      console.log('Video seeked, generating thumbnail');
      const canvas = document.createElement('canvas');
      // Set canvas dimensions to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Create thumbnail URL from canvas
      try {
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        console.log('Thumbnail generated successfully');
        setThumbnailUrl(thumbnailUrl);
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        // If thumbnail generation fails, we'll still have the video element
      }
      
      // Clean up object URL
      URL.revokeObjectURL(fileUrl);
    };
    
    // Handle errors
    videoElement.onerror = (err) => {
      console.error('Error loading video for thumbnail:', err);
      URL.revokeObjectURL(fileUrl);
    };
    
    // Explicitly trigger load
    videoElement.load();
  };

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
    
    // No size limit check - removed as requested

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setThumbnailUrl(null); // Clear previous thumbnail
    
    // Generate thumbnail for the video
    generateThumbnail(file);
    
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

  // Handle playing the video when thumbnail is clicked
  const handleThumbnailClick = () => {
    if (videoRef.current) {
      videoRef.current.style.display = 'block';
      videoRef.current.play();
    }
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
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px',
          fontSize: '0.95rem'
        }}>
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
        style={{
          border: '2px dashed #bdc3c7',
          borderRadius: '10px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          margin: '20px 0',
          minHeight: '150px', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
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
            <p>Tap to select a video</p>
            <p className="small" style={{ fontSize: '0.8rem', color: '#95a5a6' }}>or drag and drop (on desktop)</p>
          </>
        ) : (
          // Updated video container with thumbnail option
          <div className="video-container" style={{ maxWidth: '300px', margin: '0 auto', width: '100%' }}>
            {thumbnailUrl ? (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <img 
                  src={thumbnailUrl} 
                  alt="Video preview" 
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={handleThumbnailClick}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5V19L19 12L8 5Z" fill="white" />
                  </svg>
                </div>
              </div>
            ) : (
              <div style={{
                width: '100%',
                height: '200px',
                backgroundColor: '#f1f1f1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div className="spinner" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '4px solid rgba(0, 0, 0, 0.1)',
                  borderTopColor: '#3498db',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            )}
            <video 
              ref={videoRef}
              src={previewUrl} 
              controls 
              width="100%" 
              style={{ 
                borderRadius: '8px', 
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                display: thumbnailUrl ? 'none' : 'block', // Hide initially if we have a thumbnail
                marginTop: '10px'
              }}
            />
          </div>
        )}
      </div>
      
      {/* Desktop tips - hidden on mobile */}
      <div className="upload-tips" style={{ 
        display: 'none',
        '@media (min-width: 768px)': {
          display: 'block'
        }
      }}>
        <h3>Tips for best results:</h3>
        <ul>
          <li>Record in good lighting</li>
          <li>Get a clear view of your full swing</li>
          <li>Try to record from a side angle (front-on or down-the-line)</li>
          <li>Keep the camera steady</li>
          <li>Make sure your entire body and club are visible throughout the swing</li>
        </ul>
      </div>
      
      {/* Mobile-friendly tips with expandable details */}
      <div className="upload-tips-mobile" style={{ 
        marginTop: '15px', 
        textAlign: 'center'
      }}>
        <details>
          <summary style={{ fontWeight: 'bold', cursor: 'pointer', padding: '10px 0' }}>
            Tips for best results
          </summary>
          <ul style={{ textAlign: 'left', paddingLeft: '20px', marginTop: '10px' }}>
            <li>Good lighting & steady camera</li>
            <li>Side angle view</li>
            <li>Show full body & club</li>
          </ul>
        </details>
      </div>
      
      {selectedFile && (
        <div className="selected-file-info" style={{ margin: '15px 0', fontSize: '0.9rem' }}>
          <p><strong>Selected File:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
      
      <button 
        className="button" 
        onClick={handleAnalyzeClick}
        disabled={!selectedFile || isAnalyzing}
        style={{
          padding: '12px 24px',
          width: '100%',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: '#3498db',
          color: 'white',
          fontWeight: 'bold',
          cursor: !selectedFile || isAnalyzing ? 'not-allowed' : 'pointer',
          opacity: !selectedFile || isAnalyzing ? 0.7 : 1
        }}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Swing'}
      </button>
      
      {/* Enhanced loading indicator */}
      {isAnalyzing && (
        <div className="analyzing-indicator" style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{
            margin: '0 auto 15px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '5px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: '#3498db',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h3 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>Analyzing your swing with AI...</h3>
          <p style={{ fontSize: '0.9rem' }}>This process may take 30-60 seconds depending on video size.</p>
          <p style={{ fontSize: '0.9rem' }}>Please don't close this window during analysis.</p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;