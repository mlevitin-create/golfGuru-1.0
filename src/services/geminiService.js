import axios from 'axios';

// Note: You should store your API key in an environment variable (.env file)
// Create a .env file at the root of your project with:
// REACT_APP_GEMINI_API_KEY=your_api_key_here

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Flag to control whether we use real API or mock data
const USE_MOCK_DATA = false; // Set to false to try real API

/**
 * Analyzes a golf swing video using Gemini API with automatic fallback to mock data
 * @param {File} videoFile - The video file to analyze
 * @param {Object} metadata - Additional metadata like club and date information
 * @returns {Promise} Promise that resolves to the analysis results (real or mock)
 */
const analyzeGolfSwing = async (videoFile, metadata = null) => {
  // If USE_MOCK_DATA is true, skip API call and generate mock data
  if (USE_MOCK_DATA) {
    console.log('Using mock data instead of real API');
    // Add a small delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    return createMockAnalysis(videoFile, metadata);
  }

  try {
    // Check if API key is configured
    if (!API_KEY) {
      console.error('Gemini API key is not configured');
      return createMockAnalysis(videoFile, metadata); // Fallback to mock
    }

    // Log file details but don't enforce a size limit
    console.log('Starting video analysis, file type:', videoFile.type);
    console.log('File details:', {
      name: videoFile.name,
      type: videoFile.type,
      size: `${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`,
      lastModified: new Date(videoFile.lastModified).toISOString()
    });
    
    // Convert video to base64
    let base64Video;
    try {
      base64Video = await fileToBase64(videoFile);
      console.log('Successfully converted video to base64');
    } catch (error) {
      console.error('Error converting file to base64:', error);
      return createMockAnalysis(videoFile, metadata); // Fallback to mock
    }
    
    // Get base64 data part
    const base64Data = base64Video.split('base64,')[1];
    if (!base64Data) {
      console.error('Failed to extract base64 data from video');
      return createMockAnalysis(videoFile, metadata); // Fallback to mock
    }

    console.log('Preparing API request payload...');
    
    // Add club information to the prompt if available
    let clubInfo = "";
    if (metadata?.clubName) {
      clubInfo = `\n\nThis swing was performed with a ${metadata.clubName}. Take this into account in your analysis.`;
    }
    
    // Construct the request payload with a detailed prompt for better analysis
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are a professional golf coach with expertise in swing analysis. Analyze this golf swing video in detail and provide the following information:
              
1. Overall swing score (0-100) based on proper form, mechanics, and effectiveness.

2. Score each of the following metrics from 0-100:
   - backswing: Evaluate the takeaway, wrist position, and backswing plane
   - stance: Assess foot position, width, weight distribution, and posture
   - grip: Evaluate hand placement, pressure, and wrist position
   - swingBack: Rate the rotation, plane, and position at the top
   - swingForward: Evaluate the downswing path, transition, and follow through
   - hipRotation: Assess the hip turn both in backswing and through impact
   - swingSpeed: Rate the tempo and acceleration through the ball
   - shallowing: Evaluate club path and shaft position in the downswing
   - pacing: Rate the overall rhythm and timing of the swing
   - confidence: Assess the decisiveness and commitment to the swing
   - focus: Evaluate setup routine and swing execution

3. Provide three specific, actionable recommendations for improvement.${clubInfo}

Format your response ONLY as a valid JSON object with this exact structure:
{
  "overallScore": 75,
  "metrics": {
    "backswing": 70,
    "stance": 80,
    "grip": 75,
    "swingBack": 65,
    "swingForward": 70,
    "hipRotation": 60,
    "swingSpeed": 75,
    "shallowing": 65,
    "pacing": 80,
    "confidence": 85,
    "focus": 80
  },
  "recommendations": [
    "Keep your left arm straighter during the backswing",
    "Rotate your hips more aggressively through impact",
    "Maintain a more consistent tempo throughout your swing"
  ]
}`
            },
            {
              inlineData: {
                mimeType: videoFile.type,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for more consistent, predictable responses
        maxOutputTokens: 2048
      }
    };

    console.log('Sending request to Gemini API...');
    
    try {
      // Make the API request with timeout
      const response = await axios.post(
        `${API_URL}?key=${API_KEY}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 120 second timeout for video processing (increased from 90s)
        }
      );

      console.log('Received response from Gemini API');
      
      // Check if we have a valid response structure
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        console.error('Invalid API response structure:', response.data);
        return createMockAnalysis(videoFile, metadata); // Fallback to mock
      }

      const textResponse = response.data.candidates[0].content.parts[0].text;
      if (!textResponse) {
        console.error('No text in API response');
        return createMockAnalysis(videoFile, metadata); // Fallback to mock
      }
      
      console.log('Parsing response text to JSON...');
      
      // Try to find and parse JSON in the response
      let analysisData;
      try {
        // Try direct JSON parsing first
        try {
          analysisData = JSON.parse(textResponse);
        } catch (e) {
          // Fall back to extracting JSON from text
          const jsonStart = textResponse.indexOf('{');
          const jsonEnd = textResponse.lastIndexOf('}') + 1;
          
          if (jsonStart === -1 || jsonEnd <= jsonStart) {
            console.error('No valid JSON found in response');
            console.error('Raw response:', textResponse);
            return createMockAnalysis(videoFile, metadata); // Fallback to mock
          }
          
          const jsonString = textResponse.substring(jsonStart, jsonEnd);
          analysisData = JSON.parse(jsonString);
        }
        
        // Validate the parsed data has the expected structure and sanitize the data
        if (!analysisData.overallScore || !analysisData.metrics || !analysisData.recommendations) {
          console.error('Parsed data missing required fields:', analysisData);
          return createMockAnalysis(videoFile, metadata); // Fallback to mock
        }
        
        // Ensure all metrics are within the 0-100 range
        analysisData.overallScore = Math.min(100, Math.max(0, Math.round(analysisData.overallScore)));
        
        Object.keys(analysisData.metrics).forEach(key => {
          analysisData.metrics[key] = Math.min(100, Math.max(0, Math.round(analysisData.metrics[key])));
        });
        
        // Ensure we have exactly 3 recommendations
        if (!Array.isArray(analysisData.recommendations) || analysisData.recommendations.length < 1) {
          analysisData.recommendations = [
            "Work on your overall swing mechanics",
            "Practice your timing and rhythm",
            "Focus on maintaining proper form throughout your swing"
          ];
        } else if (analysisData.recommendations.length > 3) {
          analysisData.recommendations = analysisData.recommendations.slice(0, 3);
        }
        
        console.log('Successfully parsed analysis data');
      } catch (error) {
        console.error('Error parsing API response:', error);
        console.error('Raw response text:', textResponse);
        return createMockAnalysis(videoFile, metadata); // Fallback to mock
      }
      
      // Extract date information from metadata if available
      const recordedDate = metadata?.recordedDate || new Date();
      
      // Add metadata to the analysis
      return {
        ...analysisData,
        id: Date.now().toString(),
        date: new Date().toISOString(), // Analysis date (now)
        recordedDate: recordedDate instanceof Date ? recordedDate.toISOString() : recordedDate,
        videoUrl: URL.createObjectURL(videoFile),
        clubName: metadata?.clubName || null,
        clubId: metadata?.clubId || null,
        clubType: metadata?.clubType || null,
        outcome: metadata?.outcome || null
      };
    } catch (error) {
      console.error('Error in API request:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Check if it's specifically a size-related error
      if (error.response?.data?.error?.message?.includes('size') || 
          error.response?.status === 413) {
        console.error('The API rejected the file due to size limitations');
        // Still fall back to mock data
      }
      
      return createMockAnalysis(videoFile, metadata); // Fallback to mock
    }
  } catch (error) {
    console.error('Unexpected error in analyzeGolfSwing:', error);
    return createMockAnalysis(videoFile, metadata); // Fallback to mock for any unexpected errors
  }
};

/**
 * Create mock analysis data for fallback
 * @param {File} videoFile - The video file
 * @param {Object} metadata - Additional metadata like club and date information
 * @returns {Object} Mock analysis data
 */
const createMockAnalysis = (videoFile, metadata = null) => {
  console.log('Generating mock analysis data');
  
  // Extract date information from metadata if available
  const recordedDate = metadata?.recordedDate || new Date();
  
  // Adjust mock data based on club type if available
  let metrics = {
    backswing: Math.floor(Math.random() * 40) + 60,
    stance: Math.floor(Math.random() * 40) + 60,
    grip: Math.floor(Math.random() * 40) + 60,
    swingBack: Math.floor(Math.random() * 40) + 60,
    swingForward: Math.floor(Math.random() * 40) + 60,
    hipRotation: Math.floor(Math.random() * 40) + 60,
    swingSpeed: Math.floor(Math.random() * 40) + 60,
    shallowing: Math.floor(Math.random() * 40) + 60,
    pacing: Math.floor(Math.random() * 40) + 60,
    confidence: Math.floor(Math.random() * 40) + 60,
    focus: Math.floor(Math.random() * 40) + 60,
  };
  
  // Adjust recommendations based on club type
  let recommendations = [
    "Try to keep your left arm straight throughout your swing",
    "Your grip appears to be too tight, which may be affecting your control",
    "Focus on rotating your hips more during the downswing"
  ];
  
  // Slightly customize mock data based on club type
  if (metadata?.clubType === 'Wood') {
    metrics.swingSpeed = Math.min(100, metrics.swingSpeed + 10);
    recommendations[0] = "Focus on maintaining a consistent swing path with your wood";
  } else if (metadata?.clubType === 'Iron') {
    metrics.shallowing = Math.min(100, metrics.shallowing + 5);
    recommendations[1] = "Work on hitting down on the ball with your iron";
  } else if (metadata?.clubType === 'Wedge') {
    metrics.stance = Math.min(100, metrics.stance + 8);
    recommendations[2] = "Practice opening your stance slightly with your wedge";
  } else if (metadata?.clubType === 'Putter') {
    metrics.pacing = Math.min(100, metrics.pacing + 15);
    metrics.focus = Math.min(100, metrics.focus + 10);
    recommendations = [
      "Keep your head still throughout your putting stroke",
      "Focus on a smooth, pendulum-like motion",
      "Maintain consistent tempo in your putting stroke"
    ];
  }
  
  // Calculate overall score from metrics
  const overallScore = Math.floor(
    Object.values(metrics).reduce((sum, value) => sum + value, 0) / Object.keys(metrics).length
  );
  
  return {
    id: Date.now().toString(),
    date: new Date().toISOString(), // Analysis date (now)
    recordedDate: recordedDate instanceof Date ? recordedDate.toISOString() : recordedDate,
    overallScore: overallScore,
    metrics: metrics,
    recommendations: recommendations,
    videoUrl: URL.createObjectURL(videoFile),
    clubName: metadata?.clubName || null,
    clubId: metadata?.clubId || null,
    clubType: metadata?.clubType || null,
    outcome: metadata?.outcome || null,
    _isMockData: true // Flag to indicate this is mock data
  };
};

/**
 * Convert a file to base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Promise that resolves to the base64 string
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Export with mock function available for testing
export default { analyzeGolfSwing, createMockAnalysis };