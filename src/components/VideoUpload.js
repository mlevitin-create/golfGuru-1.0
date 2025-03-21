// src/components/VideoUpload.js - Mobile-optimized version
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Improved mobile-friendly video upload component
 */
const VideoUpload = ({ onVideoUpload, onVideoSelect, isAnalyzing, navigateTo }) => {
  const { currentUser } = useAuth();
  const [videoFile, setVideoFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState('file'); // 'file' or 'youtube'
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const videoFileInputRef = useRef(null);

  // Check for mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is a video
    if (!file.type.includes('video/')) {
      setError('Please select a video file');
      setVideoFile(null);
      return;
    }

    // Check file size (limit to 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size too large. Please select a video file under 100MB');
      setVideoFile(null);
      return;
    }

    setVideoFile(file);
    setError(null);
    
    // Call onVideoSelect for the video preview
    if (onVideoSelect) {
      onVideoSelect(file);
    }
  };

  // Handle YouTube URL input
  const handleYoutubeUrlChange = (e) => {
    setYoutubeUrl(e.target.value);
  };

  // YouTube URL validation
  const isValidYoutubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  };

  // Extract YouTube video ID from URL
  const extractYoutubeVideoId = (url) => {
    if (!url) return null;

    // Try various YouTube URL formats
    const regexPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^#\&\?]*).*/,
      /youtube\.com\/shorts\/([^#\&\?]*)/,
      /youtube\.com\/live\/([^#\&\?]*)/
    ];

    for (const pattern of regexPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate based on upload method
    if (uploadMethod === 'file') {
      if (!videoFile) {
        setError('Please select a video file');
        return;
      }

      // For file upload, pass to the onVideoUpload function
      onVideoUpload(videoFile, {
        recordedDate: new Date(),
        swingOwnership: 'self', // Default ownership for file uploads
      });
    } else if (uploadMethod === 'youtube') {
      if (!youtubeUrl.trim() || !isValidYoutubeUrl(youtubeUrl)) {
        setError('Please enter a valid YouTube URL');
        return;
      }

      const videoId = extractYoutubeVideoId(youtubeUrl);
      if (!videoId) {
        setError('Could not extract YouTube video ID. Please check the URL.');
        return;
      }

      // For YouTube, we don't need a file, but pass the URL info
      onVideoUpload(null, {
        recordedDate: new Date(),
        swingOwnership: 'self', // Default ownership for YouTube uploads
        youtubeVideo: {
          url: youtubeUrl,
          videoId: videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}`
        }
      });
    }
  };

  // Clear forms when switching methods
  const switchToFileUpload = () => {
    setUploadMethod('file');
    setYoutubeUrl('');
    setError(null);
  };

  const switchToYoutubeUpload = () => {
    setUploadMethod('youtube');
    setVideoFile(null);
    setError(null);
  };

  // Return to dashboard
  const handleCancel = () => {
    navigateTo('dashboard');
  };

  return (
    <div className="upload-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ 
          fontSize: isMobile ? '1.5rem' : '1.8rem',
          marginBottom: isMobile ? '15px' : '20px'
        }}>
          Upload Swing Video
        </h2>
        
        <p style={{ marginBottom: isMobile ? '15px' : '20px', lineHeight: '1.4' }}>
          Upload a video of your golf swing for AI analysis. 
          You can upload a video file from your device or enter a YouTube URL.
        </p>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '10px 15px', 
            borderRadius: '5px', 
            marginBottom: '15px',
            fontSize: isMobile ? '0.9rem' : '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Upload method selector - Mobile friendly tabs */}
        <div className="upload-method-selector" style={{
          display: 'flex',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <button
            onClick={switchToFileUpload}
            style={{
              flex: 1,
              padding: isMobile ? '10px' : '12px 16px',
              border: 'none',
              backgroundColor: uploadMethod === 'file' ? '#546e47' : '#f8f9fa',
              color: uploadMethod === 'file' ? 'white' : '#333',
              fontWeight: uploadMethod === 'file' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}
          >
            Upload from Device
          </button>
          <button
            onClick={switchToYoutubeUpload}
            style={{
              flex: 1,
              padding: isMobile ? '10px' : '12px 16px',
              border: 'none',
              backgroundColor: uploadMethod === 'youtube' ? '#546e47' : '#f8f9fa',
              color: uploadMethod === 'youtube' ? 'white' : '#333',
              fontWeight: uploadMethod === 'youtube' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: isMobile ? '0.9rem' : '1rem'
            }}
          >
            YouTube Link
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File Upload Option */}
          {uploadMethod === 'file' && (
            <div className="file-upload-section">
              <div 
                className="upload-area" 
                onClick={() => videoFileInputRef.current.click()}
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '10px',
                  padding: isMobile ? '20px 15px' : '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  backgroundColor: videoFile ? '#f0f7e6' : 'white',
                  marginBottom: '20px'
                }}
              >
                <input
                  type="file"
                  ref={videoFileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*"
                  style={{ display: 'none' }}
                />

                <div style={{ marginBottom: '15px' }}>
                  {videoFile ? (
                    <div style={{
                      backgroundColor: '#546e47',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px'
                    }}>
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#f0f0f0',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px'
                    }}>
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#546e47"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    </div>
                  )}
                </div>

                {videoFile ? (
                  <div>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {videoFile.name}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#666' }}>
                      Click to change video
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      Click to select a video
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>
                      Or drag and drop a video file here
                    </p>
                    <p style={{ fontSize: '0.8rem', marginTop: '10px', color: '#888' }}>
                      Supports MP4, MOV, AVI formats (max 100MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* YouTube URL Option */}
          {uploadMethod === 'youtube' && (
            <div className="youtube-section" style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="youtube-url" 
                style={{ 
                  display: 'block', 
                  marginBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                Enter YouTube Video URL
              </label>
              <input
                type="text"
                id="youtube-url"
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  marginBottom: '10px',
                  fontSize: isMobile ? '16px' : 'inherit' // Prevent zoom on mobile
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                You can analyze a swing from YouTube, but only your own uploaded videos will be saved to your account.
              </p>
            </div>
          )}

          {/* Action buttons - Mobile optimized layout */}
          <div className="action-buttons" style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : '15px',
            justifyContent: 'space-between',
            marginTop: '20px'
          }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.9rem' : '1rem',
                flex: isMobile ? 'none' : '1',
                order: isMobile ? 2 : 1
              }}
              disabled={isAnalyzing}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '12px 20px',
                backgroundColor: '#546e47',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '0.9rem' : '1rem',
                flex: isMobile ? 'none' : '2',
                order: isMobile ? 1 : 2
              }}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '10px'
                  }}></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '8px' }}
                  >
                    <path d="M3 17h6l2 4 2-4h6"></path>
                    <path d="M4 13l2 -2"></path>
                    <path d="M20 13l-2 -2"></path>
                    <circle cx="12" cy="9" r="6"></circle>
                    <circle cx="12" cy="9" r="1"></circle>
                  </svg>
                  Analyze Swing
                </>
              )}
            </button>
          </div>
        </form>

        {/* Information section for mobile - Condensed */}
        {isMobile ? (
          <div className="info-section" style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px', 
            marginTop: '25px', 
            fontSize: '0.9rem' 
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>
              Tips for Better Analysis
            </h3>
            <ul style={{ 
              paddingLeft: '20px', 
              margin: '0',
              lineHeight: '1.3'
            }}>
              <li style={{ marginBottom: '5px' }}>Record from a direct side view for best results</li>
              <li style={{ marginBottom: '5px' }}>Ensure good lighting and a clear view of your entire swing</li>
              <li>Try to capture from setup through follow-through</li>
            </ul>
          </div>
        ) : (
          <div className="info-section" style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginTop: '30px' 
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
              Tips for Better Analysis
            </h3>
            <ul style={{ paddingLeft: '20px', margin: '0' }}>
              <li style={{ marginBottom: '8px' }}>Record your swing from a direct side view for the most accurate analysis</li>
              <li style={{ marginBottom: '8px' }}>Ensure good lighting and a clear view of your entire body during the swing</li>
              <li style={{ marginBottom: '8px' }}>Try to capture your entire swing from setup through follow-through</li>
              <li>For club-specific analysis, you can select your club after uploading</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;