import React, { useState, useRef } from 'react';

const VideoUpload = ({ onVideoUpload, isAnalyzing, error }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
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
      alert('Please upload a video file');
      return;
    }
    
    // Check file size (10MB limit for Gemini API)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB. Please upload a smaller video or compress this one.`);
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Handle button click
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Handle submit
  const handleSubmit = () => {
    if (!selectedFile) {
      alert('Please select a video first');
      return;
    }
    
    onVideoUpload(selectedFile);
  };

  return (
    <div className="card">
      <h2>Upload Your Swing Video</h2>
      <p>Upload a video of your golf swing for AI analysis</p>
      
      {error && (
        <div className="error-message" style={{ 
          color: '#e74c3c', 
          backgroundColor: '#fceaea', 
          padding: '10px', 
          borderRadius: '5px',
          marginBottom: '15px',
          border: '1px solid #e74c3c'
        }}>
          <strong>Error:</strong> {error}
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
            <p className="small">Supported formats: MP4, MOV, AVI (max 10MB)</p>
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
          <li>Try to record from a side angle</li>
          <li>Keep the camera steady</li>
          <li>Keep videos short (2-5 seconds) and under 10MB</li>
          <li>Use MP4 format when possible</li>
        </ul>
      </div>
      
      {selectedFile && (
        <div className="selected-file-info">
          <p><strong>Selected File:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Type:</strong> {selectedFile.type}</p>
        </div>
      )}
      
      <button 
        className="button" 
        onClick={handleSubmit}
        disabled={!selectedFile || isAnalyzing}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Swing'}
      </button>
      
      {isAnalyzing && (
        <div className="analyzing-indicator">
          <div className="spinner"></div>
          <p>Analyzing your swing with AI...</p>
          <p>This may take up to 60 seconds</p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;