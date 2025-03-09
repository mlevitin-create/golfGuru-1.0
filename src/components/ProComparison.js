import React, { useState, useRef, useEffect } from 'react';

const ProComparison = ({ swingData }) => {
  const [selectedPro, setSelectedPro] = useState('tiger_woods');
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const videoRef = useRef(null);
  
  // Mock pro golfer data
  const proGolfers = {
    tiger_woods: {
      name: 'Tiger Woods',
      metrics: {
        backswing: 95,
        stance: 92,
        grip: 90,
        swingBack: 94,
        swingForward: 96,
        hipRotation: 95,
        swingSpeed: 93,
        swingPlane: 94,
        shallowing: 91,
        pacing: 97,
        confidence: 98,
        focus: 99
      },
      characteristics: [
        'Extremely powerful swing',
        'Incredible focus and mental toughness',
        'Precise ball striking',
        'Great course management'
      ],
      imageUrl: 'https://via.placeholder.com/300x200?text=Tiger+Woods'
    },
    rory_mcilroy: {
      name: 'Rory McIlroy',
      metrics: {
        backswing: 93,
        stance: 90,
        grip: 88,
        swingBack: 96,
        swingForward: 95,
        hipRotation: 92,
        swingSpeed: 98,
        swingPlane: 91,
        shallowing: 89,
        pacing: 90,
        confidence: 94,
        focus: 93
      },
      characteristics: [
        'Exceptional swing speed',
        'Great rhythm and tempo',
        'Long off the tee',
        'Natural athletic movement'
      ],
      imageUrl: 'https://via.placeholder.com/300x200?text=Rory+McIlroy'
    },
    jordan_spieth: {
      name: 'Jordan Spieth',
      metrics: {
        backswing: 88,
        stance: 91,
        grip: 90,
        swingBack: 87,
        swingForward: 89,
        hipRotation: 88,
        swingSpeed: 85,
        swingPlane: 90,
        shallowing: 92,
        pacing: 93,
        confidence: 95,
        focus: 96
      },
      characteristics: [
        'Exceptional short game',
        'Great putting skills',
        'Strong mental game',
        'Creative shot making'
      ],
      imageUrl: 'https://via.placeholder.com/300x200?text=Jordan+Spieth'
    }
  };

  // Generate thumbnail from video when swingData changes
  useEffect(() => {
    if (swingData && swingData.videoUrl) {
      generateThumbnail(swingData.videoUrl);
    }
  }, [swingData]);

  // Function to generate thumbnail from video URL
  const generateThumbnail = (videoUrl) => {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.src = videoUrl;
    
    // When video data is loaded, create thumbnail
    videoElement.onloadeddata = () => {
      // Seek to 1 second or 1/4 through the video, whichever is less
      videoElement.currentTime = 1;
    };
    
    // Once we've seeked to the right place, capture the frame
    videoElement.onseeked = () => {
      const canvas = document.createElement('canvas');
      // Set canvas dimensions to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Create thumbnail URL from canvas
      try {
        const thumbnailUrl = canvas.toDataURL('image/jpeg');
        setThumbnailUrl(thumbnailUrl);
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        // If thumbnail generation fails, we'll still have the video element
      }
    };
    
    // Handle errors
    videoElement.onerror = (err) => {
      console.error('Error loading video for thumbnail:', err);
    };
    
    // Explicitly trigger load
    videoElement.load();
  };

  // Handle playing the video when thumbnail is clicked
  const handleThumbnailClick = () => {
    if (videoRef.current) {
      videoRef.current.style.display = 'block';
      if (thumbnailUrl) {
        setThumbnailUrl(null);
      }
      videoRef.current.play();
    }
  };

  if (!swingData) {
    return (
      <div className="card">
        <h2>No Swing Data Available</h2>
        <p>Please upload and analyze a swing video first to compare with pro golfers</p>
      </div>
    );
  }

  const proData = proGolfers[selectedPro];

  const getComparisonColor = (userValue, proValue) => {
    const diff = userValue - proValue;
    if (diff >= -10) return '#27ae60'; // Green for close or better
    if (diff >= -20) return '#f39c12'; // Orange for moderately far
    return '#e74c3c'; // Red for far away
  };

  return (
    <div className="card">
      <h2>Pro Comparison</h2>
      <p>Compare your swing metrics with pro golfers</p>
      
      <div className="pro-selector" style={{ marginBottom: '20px' }}>
        <label htmlFor="pro-select">Compare with:</label>
        <select 
          id="pro-select"
          value={selectedPro}
          onChange={(e) => setSelectedPro(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            marginLeft: '10px'
          }}
        >
          {Object.entries(proGolfers).map(([key, golfer]) => (
            <option key={key} value={key}>
              {golfer.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="pro-comparison-container">
        <div className="your-swing" style={{ marginBottom: '20px' }}>
          <h3>Your Swing</h3>
          <div className="video-container" style={{ maxWidth: '100%', margin: '0 auto 20px' }}>
            {thumbnailUrl ? (
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <img 
                  src={thumbnailUrl} 
                  alt="Video preview" 
                  style={{ 
                    width: '100%', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    cursor: 'pointer'
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
            ) : null}
            <video 
              ref={videoRef}
              src={swingData.videoUrl} 
              controls 
              width="100%"
              style={{ 
                borderRadius: '8px', 
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                display: thumbnailUrl ? 'none' : 'block'
              }}
            />
          </div>
        </div>
        
        <div className="pro-swing" style={{ marginBottom: '20px' }}>
          <h3>{proData.name}'s Swing</h3>
          <div className="pro-image">
            <img 
              src={proData.imageUrl} 
              alt={`${proData.name} swing`} 
              style={{ 
                width: '100%', 
                borderRadius: '10px',
                height: '200px',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="metrics-comparison" style={{ marginTop: '30px' }}>
        <h3>Metrics Comparison</h3>
        
        {Object.entries(swingData.metrics).map(([key, value]) => {
          const proValue = proData.metrics[key] || 0;
          
          return (
            <div key={key} className="metric-comparison-item" style={{ marginBottom: '20px' }}>
              <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                <span>
                  <span style={{ color: '#3498db', fontWeight: 'bold' }}>You: {value}</span> / 
                  <span style={{ color: '#e74c3c', fontWeight: 'bold' }}> Pro: {proValue}</span>
                </span>
              </div>
              
              {/* Stacked bars instead of side-by-side */}
              <div className="comparison-stacked-bars" style={{ 
                width: '100%', 
                position: 'relative', 
                height: '40px', 
                backgroundColor: '#f5f5f5',
                borderRadius: '5px',
                overflow: 'hidden'
              }}>
                {/* Background bar (100%) */}
                <div style={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f5f5f5',
                  zIndex: 1
                }}></div>
                
                {/* Pro value bar */}
                <div style={{ 
                  position: 'absolute',
                  width: `${proValue}%`,
                  height: '20px',
                  backgroundColor: '#e74c3c',
                  borderRadius: '5px',
                  zIndex: 2,
                  opacity: 0.8,
                  bottom: '0'
                }}></div>
                
                {/* User value bar */}
                <div style={{ 
                  position: 'absolute',
                  width: `${value}%`,
                  height: '20px',
                  backgroundColor: '#3498db',
                  borderRadius: '5px',
                  zIndex: 3,
                  top: '0'
                }}></div>
                
                {/* Comparison indicator */}
                <div style={{
                  position: 'absolute',
                  left: `${value}%`,
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  backgroundColor: getComparisonColor(value, proValue),
                  zIndex: 4
                }}></div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pro-characteristics" style={{ marginTop: '30px' }}>
        <h3>{proData.name}'s Key Characteristics</h3>
        <ul>
          {proData.characteristics.map((char, index) => (
            <li key={index}>{char}</li>
          ))}
        </ul>
      </div>
      
      <div className="improvement-tips" style={{ marginTop: '30px' }}>
        <h3>How to Get Closer to {proData.name}'s Swing</h3>
        <ul>
          {Object.entries(swingData.metrics)
            .filter(([key, value]) => {
              const proValue = proData.metrics[key] || 0;
              return proValue - value > 15; // Only show tips for metrics that are significantly worse
            })
            .slice(0, 3) // Limit to top 3 areas for improvement
            .map(([key, value], index) => {
              const metricName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const proValue = proData.metrics[key] || 0;
              
              return (
                <li key={index}>
                  <strong>{metricName}:</strong> Your score ({value}) is {proValue - value} points below {proData.name}'s ({proValue}). 
                  Focus on improving this aspect of your swing.
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
};

export default ProComparison;