import axios from 'axios';

// Note: You should store your API key in an environment variable (.env file)
// Create a .env file at the root of your project with:
// REACT_APP_GEMINI_API_KEY=your_api_key_here

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Flag to control whether we use real API or mock data
const USE_MOCK_DATA = false; // Set to false to try real API

/**
 * Analyzes a golf swing video using Gemini API with automatic fallback to mock data
 * @param {File} videoFile - The video file to analyze
 * @returns {Promise} Promise that resolves to the analysis results (real or mock)
 */
const analyzeGolfSwing = async (videoFile) => {
  // If USE_MOCK_DATA is true, skip API call and generate mock data
  if (USE_MOCK_DATA) {
    console.log('Using mock data instead of real API');
    // Add a small delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    return createMockAnalysis(videoFile);
  }

  try {
    // Check if API key is configured
    if (!API_KEY) {
      console.error('Gemini API key is not configured');
      return createMockAnalysis(videoFile); // Fallback to mock
    }

    // Check file size (Gemini has a 10MB limit for media files)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (videoFile.size > MAX_FILE_SIZE) {
      console.error(`File size exceeds the maximum allowed: ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB`);
      return createMockAnalysis(videoFile); // Fallback to mock
    }

    console.log('Starting video analysis, file type:', videoFile.type);
    
    // Specifically log more details about the file
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
      return createMockAnalysis(videoFile); // Fallback to mock
    }
    
    // Get base64 data part
    const base64Data = base64Video.split('base64,')[1];
    if (!base64Data) {
      console.error('Failed to extract base64 data from video');
      return createMockAnalysis(videoFile); // Fallback to mock
    }

    console.log('Preparing API request payload...');
    
    // Construct the request payload with a detailed prompt for better analysis
    // Removed responseFormat which was causing errors
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

3. Provide three specific, actionable recommendations for improvement.

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
        // Removed responseFormat which was causing errors
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
          timeout: 90000 // 90 second timeout for video processing
        }
      );

      console.log('Received response from Gemini API');
      
      // Check if we have a valid response structure
      if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
        console.error('Invalid API response structure:', response.data);
        return createMockAnalysis(videoFile); // Fallback to mock
      }

      const textResponse = response.data.candidates[0].content.parts[0].text;
      if (!textResponse) {
        console.error('No text in API response');
        return createMockAnalysis(videoFile); // Fallback to mock
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
            return createMockAnalysis(videoFile); // Fallback to mock
          }
          
          const jsonString = textResponse.substring(jsonStart, jsonEnd);
          analysisData = JSON.parse(jsonString);
        }
        
        // Validate the parsed data has the expected structure and sanitize the data
        if (!analysisData.overallScore || !analysisData.metrics || !analysisData.recommendations) {
          console.error('Parsed data missing required fields:', analysisData);
          return createMockAnalysis(videoFile); // Fallback to mock
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
        return createMockAnalysis(videoFile); // Fallback to mock
      }
      
      // Add metadata to the analysis
      return {
        ...analysisData,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        videoUrl: URL.createObjectURL(videoFile)
      };
    } catch (error) {
      console.error('Error in API request:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      return createMockAnalysis(videoFile); // Fallback to mock
    }
  } catch (error) {
    console.error('Unexpected error in analyzeGolfSwing:', error);
    return createMockAnalysis(videoFile); // Fallback to mock for any unexpected errors
  }
};

/**
 * Create mock analysis data for fallback
 * @param {File} videoFile - The video file
 * @returns {Object} Mock analysis data
 */
const createMockAnalysis = (videoFile) => {
  console.log('Generating mock analysis data');
  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    overallScore: Math.floor(Math.random() * 30) + 60,
    metrics: {
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
    },
    recommendations: [
      "Try to keep your left arm straight throughout your swing",
      "Your grip appears to be too tight, which may be affecting your control",
      "Focus on rotating your hips more during the downswing"
    ],
    videoUrl: URL.createObjectURL(videoFile),
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