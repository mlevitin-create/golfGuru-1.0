// src/components/VideoUpload.js
import React, { useState, useRef, useEffect } from 'react';
import ClubSelector from './ClubSelector';
import DateSelector from './DateSelector';
import SwingOwnershipSelector from './SwingOwnershipSelector';
import { extractVideoCreationDate } from '../utils/videoMetadata';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '../utils/youtubeUtils';

const VideoUpload = ({ onVideoUpload, isAnalyzing, navigateTo }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [showClubSelector, setShowClubSelector] = useState(false);
  const [showOwnershipSelector, setShowOwnershipSelector] = useState(false);
  const [ownershipData, setOwnershipData] = useState(null);
  const [error, setError] = useState(null);
  const [swingDate, setSwingDate] = useState(new Date());
  const [fileDate, setFileDate] = useState(null);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  
  // YouTube integration
  const [isUsingYouTube, setIsUsingYouTube] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState(null);
  const [youtubeVideoData, setYoutubeVideoData] = useState(null);

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
  const handleFile = async (file) => {
    // Check if the file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setThumbnailUrl(null); // Clear previous thumbnail
    
    // Extract date from file if possible
    try {
      const extractedDate = await extractVideoCreationDate(file);
      setFileDate(extractedDate);
      setSwingDate(extractedDate);
      setShowDateSelector(true);
    } catch (error) {
      console.error('Error extracting date from video:', error);
      setFileDate(null);
      setSwingDate(new Date());
      setShowDateSelector(true);
    }
    
    // Generate thumbnail for the video
    generateThumbnail(file);
    
    setError(null);
    setIsUsingYouTube(false);
    setYoutubeUrl('');
    setYoutubeVideoData(null);
  };

  // Generate a thumbnail from the video file
  const generateThumbnail = (file) => {
    const videoElement = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    videoElement.onloadedmetadata = () => {
      // Set current time to 1 second or 25% through the video, whichever is less
      const seekTime = Math.min(1, videoElement.duration * 0.25);
      videoElement.currentTime = seekTime;
    };
    
    videoElement.onseeked = () => {
      // When the video has seeked to the desired time, capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      try {
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnailUrl(thumbnailUrl);
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        setThumbnailUrl(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    videoElement.onerror = (err) => {
      console.error('Error loading video for thumbnail:', err);
      URL.revokeObjectURL(objectUrl);
      setThumbnailUrl(null);
    };
    
    videoElement.src = objectUrl;
    videoElement.load();
  };

  // Handle analyze button click
  const handleAnalyzeClick = () => {
    if (!((selectedFile && !isUsingYouTube) || (youtubeVideoData && isUsingYouTube))) {
      setError('Please select a video or preview a YouTube video first');
      return;
    }

    // First show the ownership selector
    setShowOwnershipSelector(true);
  };

  // Handle YouTube URL input change
  const handleYoutubeUrlChange = (e) => {
    setYoutubeUrl(e.target.value);
    setYoutubeError(null);
  };

  // Handle YouTube preview button click
  const handleYouTubePreview = () => {
    if (!youtubeUrl.trim()) {
      setYoutubeError('Please enter a YouTube URL');
      return;
    }
    
    // Validate YouTube URL
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setYoutubeError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return;
    }
    
    // Create YouTube video data
    const embedUrl = getYouTubeEmbedUrl(videoId);
    const thumbnail = getYouTubeThumbnailUrl(videoId);
    
    setYoutubeVideoData({ videoId, embedUrl });
    setThumbnailUrl(thumbnail);
    setPreviewUrl(embedUrl);
    setShowDateSelector(true);
    setYoutubeError(null);
  };

  // Handle thumbnail click to play video
  const handleThumbnailClick = () => {
    if (videoRef.current) {
      setThumbnailUrl(null);
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  };

  // Handle click on upload area
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Handle ownership selection completion
  const handleOwnershipComplete = (data) => {
    // Save ownership data
    setOwnershipData(data);
    setShowOwnershipSelector(false);
    
    // Then show club selector
    setShowClubSelector(true);
  };

  // Handle ownership selection back button
  const handleOwnershipBack = () => {
    setShowOwnershipSelector(false);
  };

  // Handle club selection continuation
  const handleClubContinue = (clubData) => {
    const metadata = {
      recordedDate: swingDate,
      ...(isUsingYouTube && youtubeVideoData ? { youtubeVideo: youtubeVideoData } : {}),
      ...clubData,
      ...ownershipData
    };
    
    onVideoUpload(isUsingYouTube ? null : selectedFile, metadata);
  };

  // Handle skipping club selection
  const handleClubSkip = (nextAction) => {
    if (nextAction === 'setup-clubs') {
      navigateTo('profile', { setupClubs: true });
      return;
    }

    const metadata = {
      recordedDate: swingDate,
      ...(isUsingYouTube && youtubeVideoData ? { youtubeVideo: youtubeVideoData } : {}),
      ...ownershipData
    };

    onVideoUpload(isUsingYouTube ? null : selectedFile, metadata);
  };

  // Handle date change
  const handleDateChange = (date) => {
    setSwingDate(date);
  };

  // Toggle between file upload and YouTube
  const toggleUploadType = (useYoutube) => {
    setIsUsingYouTube(useYoutube);
    
    // Reset data when switching modes
    if (useYoutube) {
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      setYoutubeUrl('');
      setYoutubeVideoData(null);
    }
    
    setThumbnailUrl(null);
    setError(null);
    setYoutubeError(null);
  };

  // If ownership selector is shown, render it
  if (showOwnershipSelector) {
    return (
      <SwingOwnershipSelector 
        onContinue={handleOwnershipComplete}
        onBack={handleOwnershipBack}
      />
    );
  }

  // If club selector is shown, render it
  if (showClubSelector) {
    return (
      <div className="card">
        <h2>Swing Details</h2>
        
        {/* Date Selector */}
        <DateSelector 
          initialDate={fileDate || swingDate}
          onDateChange={handleDateChange}
          extractFromFile={!!fileDate}
        />
        
        {/* Club Selector */}
        <ClubSelector 
          onContinue={handleClubContinue} 
          onSkip={handleClubSkip} 
        />
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Upload Your Swing Video</h2>
      <p>Upload a video of your golf swing or paste a YouTube URL for AI analysis</p>
      
      {/* Upload Type Selector */}
      <div className="upload-options" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => toggleUploadType(false)}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: !isUsingYouTube ? '#3498db' : '#f1f1f1',
              color: !isUsingYouTube ? 'white' : '#333',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Upload Video
          </button>
          <button
            type="button"
            onClick={() => toggleUploadType(true)}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: isUsingYouTube ? '#3498db' : '#f1f1f1',
              color: isUsingYouTube ? 'white' : '#333',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            YouTube Link
          </button>
        </div>
      </div>
      
      {/* Error Messages */}
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
      
      {youtubeError && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px',
          fontSize: '0.95rem'
        }}>
          {youtubeError}
        </div>
      )}
      
      {isUsingYouTube ? (
        /* YouTube URL Input */
        <div className="youtube-input" style={{ marginBottom: '20px' }}>
          <label htmlFor="youtube-url" style={{ display: 'block', marginBottom: '5px' }}>
            YouTube Video URL:
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              type="text"
              id="youtube-url"
              value={youtubeUrl}
              onChange={handleYoutubeUrlChange}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ddd'
              }}
            />
            <button
              type="button"
              onClick={handleYouTubePreview}
              disabled={!youtubeUrl.trim()}
              style={{
                padding: '10px 15px',
                backgroundColor: youtubeUrl.trim() ? '#3498db' : '#f1f1f1',
                color: youtubeUrl.trim() ? 'white' : '#999',
                border: 'none',
                borderRadius: '5px',
                cursor: youtubeUrl.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Preview
            </button>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
            Paste a YouTube URL of a golf swing. Works with regular videos, shorts, and embedded links.
          </p>
          
          {/* YouTube Preview */}
          {previewUrl && isUsingYouTube && (
            <div style={{ marginTop: '15px' }}>
              <h3>Video Preview</h3>
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
                      onClick={handleThumbnailClick}
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
                    position: 'relative',
                    paddingBottom: '56.25%', // 16:9 aspect ratio
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}>
                    <iframe
                      src={previewUrl}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px'
                      }}
                    ></iframe>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* File Upload Area */
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
            // Video container with thumbnail option
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
                    onClick={handleThumbnailClick}
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
      )}
      
      {/* Date Selector (visible when file is selected or YouTube is previewed) */}
      {showDateSelector && (previewUrl || thumbnailUrl) && (
        <DateSelector 
          initialDate={fileDate || new Date()}
          onDateChange={handleDateChange}
          extractFromFile={!!fileDate}
        />
      )}
      
      {/* Upload tips */}
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
            <li>For YouTube videos, ensure the swing is clearly visible</li>
          </ul>
        </details>
      </div>
      
      {selectedFile && (
        <div className="selected-file-info" style={{ margin: '15px 0', fontSize: '0.9rem' }}>
          <p><strong>Selected File:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}
      
      {youtubeVideoData && (
        <div className="youtube-info" style={{ margin: '15px 0', fontSize: '0.9rem' }}>
          <p><strong>YouTube Video:</strong> Ready for analysis</p>
          <p><strong>Video ID:</strong> {youtubeVideoData.videoId}</p>
        </div>
      )}
      
      <button 
        className="button" 
        onClick={handleAnalyzeClick}
        disabled={!((selectedFile && !isUsingYouTube) || (youtubeVideoData && isUsingYouTube)) || isAnalyzing}
        style={{
          padding: '12px 24px',
          width: '100%',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: '#3498db',
          color: 'white',
          fontWeight: 'bold',
          cursor: !((selectedFile && !isUsingYouTube) || (youtubeVideoData && isUsingYouTube)) || isAnalyzing ? 'not-allowed' : 'pointer',
          opacity: !((selectedFile && !isUsingYouTube) || (youtubeVideoData && isUsingYouTube)) || isAnalyzing ? 0.7 : 1
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
            border: '5px solid rgba(0,0,0,0.1)',
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