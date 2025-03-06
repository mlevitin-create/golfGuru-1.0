import React, { useState } from 'react';

const ProComparison = ({ swingData }) => {
  const [selectedPro, setSelectedPro] = useState('tiger_woods');
  
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
        <div className="your-swing">
          <h3>Your Swing</h3>
          <div className="video-container">
            <video 
              src={swingData.videoUrl} 
              controls 
              width="100%"
            />
          </div>
        </div>
        
        <div className="pro-swing">
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
            <div key={key} className="metric-comparison-item" style={{ marginBottom: '15px' }}>
              <div className="metric-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                <span>
                  You: {value} / Pro: {proValue}
                </span>
              </div>
              
              <div className="comparison-bars" style={{ display: 'flex', alignItems: 'center', height: '20px', marginTop: '5px' }}>
                <div style={{ 
                  flex: `0 0 ${value}%`, 
                  height: '100%', 
                  backgroundColor: '#3498db',
                  borderRadius: '5px 0 0 5px',
                  position: 'relative',
                  zIndex: 1
                }} />
                
                <div style={{ 
                  width: '4px', 
                  height: '30px', 
                  backgroundColor: getComparisonColor(value, proValue),
                  position: 'relative',
                  zIndex: 3
                }} />
                
                <div style={{ 
                  flex: `0 0 ${proValue}%`, 
                  height: '100%', 
                  backgroundColor: '#e74c3c',
                  borderRadius: '0 5px 5px 0',
                  opacity: 0.7,
                  position: 'relative',
                  zIndex: 2
                }} />
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