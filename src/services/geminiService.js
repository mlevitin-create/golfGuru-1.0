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
        temperature: 0.5, // Low temperature for more consistent, predictable responses
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

// Add this to the existing geminiService.js

// Enhanced metric descriptions and prompts from the Swing Recipe document
const metricDetails = {
  confidence: {
    category: "Mental",
    weighting: "5.88%",
    difficulty: 7,
    description: "This is focused on the mental side of the game. Confidence is key to not be phased by the pressure of the game, being able to stick to your fundamentals and not get in your head after a bad shot.",
    exampleUrl: "https://www.youtube.com/watch?v=y95_Us_qCpQ"
  },
  focus: {
    category: "Mental",
    weighting: "5.88%",
    difficulty: 4,
    description: "This is also focused on the mental side of the game. This is the ability to hone in on where you want to hit your shot and your concentration on the ball. Staying focused means you aren't bouncing your eyes around but remain focused on the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=SLbeLgQls_4"
  },
  stiffness: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 5,
    description: "Your ability to remove tension from your body during your swing. You don't want to be too tight or else it will limit your body from being able to swing properly. But you also don't want your body to be too loose or else you will sacrifice other fundamentals of your swing.",
    exampleUrl: "https://www.youtube.com/watch?v=trOLRAPi07M"
  },
  stance: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 2,
    description: "This is the proper set up before your swing. You want to be the right distance between you and the ball. This includes your feet around shoulder width apart with your club at roughly a 45 degree angle and your hands lined up underneath your head.",
    exampleUrl: "https://www.youtube.com/watch?v=P4d5TjzEgtk"
  },
  grip: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 3,
    description: "You should be using an interlocking golf grip instead of holding the club like a baseball bat. This will create a consistent swing and keep the club and your hands from rotating too much during your swing.",
    exampleUrl: "https://www.youtube.com/watch?v=nd6y-5nInHQ"
  },
  ballPosition: {
    category: "Setup",
    weighting: "5.88%",
    difficulty: 1,
    description: "You want to stand the right distance from the ball as you set up to take your shot. This should be so the club is at roughly a 45 degree angle from the ball and that the ball is positioned different based on the club you are using - a driver should have the ball closer to your lead foot while a short range club will have the ball more in between your feet. You also need to stand closer to the ball with short range clubs compared to a driver/long range clubs where you stand further away.",
    exampleUrl: "https://www.youtube.com/watch?v=UdZfTKBfGho"
  },
  clubTrajectoryBackswing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 8,
    description: "The path and position of the club during the backswing phase. This involves the takeaway, wrist position, and backswing plane.",
    exampleUrl: "https://www.youtube.com/watch?v=oszzApkv54s"
  },
  clubTrajectoryForswing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 8,
    description: "The path and position of the club during the forward swing phase, as you begin to swing towards the ball."
  },
  swingSpeed: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 7,
    description: "The velocity and acceleration of the club throughout the swing, particularly at impact."
  },
  shallowing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 9,
    description: "How well the club 'shallows' or drops into the correct path during the downswing."
  },
  impactPosition: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 10,
    description: "The position and angle of the club at the moment of impact with the ball."
  },
  hipRotation: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "How effectively the hips rotate during the entire swing."
  },
  pacing: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The overall rhythm and timing of your swing to ensure proper technique."
  },
  followThrough: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The completion of the swing after impact with the ball."
  },
  headPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The position and stability of your head throughout the entire swing."
  },
  shoulderPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The position and movement of your shoulders through the swing."
  },
  armPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The proper positioning of your arms throughout the entire swing."
  }
};

// Map from our code's metric keys to the swing recipe metrics
const metricKeyMapping = {
  backswing: "clubTrajectoryBackswing",
  swingBack: "clubTrajectoryBackswing",
  swingForward: "clubTrajectoryForswing",
  // Add other mappings as needed based on your actual metric names
};

/**
 * Enhanced metric insights generator that uses the Swing Recipe information
 * @param {Object} swingData - The complete swing analysis data
 * @param {string} metricKey - The specific metric to generate insights for
 * @returns {Promise<Object>} Detailed insights for the metric
 */
const generateMetricInsights = async (swingData, metricKey) => {
  try {
    // Sanitize and validate input
    if (!swingData || !metricKey) {
      console.error('Invalid input: Missing swingData or metricKey');
      return getDefaultInsights(metricKey);
    }

    // Ensure the metric value is a number and within 0-100 range
    const metricValue = Number(swingData.metrics[metricKey] || 0);
    const safeMetricValue = Math.max(0, Math.min(100, metricValue));

    // Check if video URL exists
    const hasVideo = Boolean(swingData.videoUrl);
    console.log('Video URL available:', hasVideo);

    // Get the swing recipe metric key if available
    const swingRecipeKey = metricKeyMapping[metricKey] || metricKey;
    
    // Get detailed information about this metric from our swing recipe
    const metricInfo = metricDetails[swingRecipeKey] || null;
    const metricDescription = metricInfo?.description || getGenericMetricDescription(metricKey);
    const metricCategory = metricInfo?.category || "Unknown";
    const metricDifficulty = metricInfo?.difficulty || 5;
    const metricWeight = metricInfo?.weighting || "5.88%";
    const exampleUrl = metricInfo?.exampleUrl || null;

    // Try to fetch the video as base64 if available
    let base64Video;
    if (hasVideo) {
      try {
        // Fetch the video blob from the URL
        const response = await fetch(swingData.videoUrl);
        const videoBlob = await response.blob();
        
        // Convert the blob to base64
        base64Video = await blobToBase64(videoBlob);
        console.log('Successfully converted video to base64');
      } catch (error) {
        console.error('Error converting video to base64:', error);
        // Continue without video, falling back to score-based analysis
        console.log('Falling back to score-based analysis without video');
      }
    }

    // Format the metric name for better readability
    const metricName = metricKey.replace(/([A-Z])/g, ' $1').toLowerCase();

    // Create the content for the coaching prompt
    let coachingPrompt = `You are the most renowned golf coach and instructor in the world. You know how to adjust your recommendations based on the type of player and how good they are as a golfer.`;
    
    if (metricInfo) {
      coachingPrompt += `\n\nYou're analyzing the "${metricName}" aspect of the swing, which is categorized as a "${metricCategory}" element with a difficulty rating of ${metricDifficulty}/10 and represents ${metricWeight} of the overall swing.`;
      coachingPrompt += `\n\n${metricDescription}`;
    }

    if (exampleUrl) {
      coachingPrompt += `\n\nAn example of how to provide guidance on this is available at ${exampleUrl}, but you should also draw from your extensive knowledge of golf technique.`;
    }

    // Prepare the complete prompt with specific guidance for the selected metric
    const promptContent = {
      coachingPrompt: coachingPrompt,
      metric: {
        name: metricName,
        score: safeMetricValue,
        description: metricDescription,
        category: metricCategory,
        difficulty: metricDifficulty,
        weighting: metricWeight
      },
      instructions: [
        "Analyze this specific aspect of the golf swing",
        "Provide technically accurate feedback based on the score and video if available",
        "Identify specific strengths and areas for improvement related to this aspect of the swing",
        "Give actionable recommendations that directly address what you observe",
        "Provide recommendations that talk about tips as well as how the swing should feel"
      ],
      outputFormat: {
        metricName: "string",
        score: "number (0-100)",
        tone: "string (excellent/good/needs improvement/poor)",
        goodAspects: "array of strings with specific observations",
        improvementAreas: "array of strings with specific observations",
        technicalBreakdown: "array of strings describing technical aspects",
        recommendations: "array of strings with actionable advice",
        feelTips: "array of strings explaining how correct execution should feel"
      }
    };

    // Prepare payload for API request
    const payload = {
      contents: [{
        parts: [{
          text: `Analyze this golf swing ${hasVideo ? 'video' : 'data'} as a professional golf coach, focusing specifically on the ${metricName} aspect:

Coaching Context: ${JSON.stringify(promptContent, null, 2)}

Please provide a detailed, professional analysis following these guidelines:
1. Focus ONLY on the ${metricName} aspect of the swing
2. Identify specific strengths related to ${metricName}
3. Identify specific areas for improvement related to ${metricName}
4. Provide actionable, technically sound recommendations
5. Include tips on how the correct execution should feel
6. Use clear, concise language that a golfer would understand
7. Strictly adhere to the JSON output format

Your response should be a valid JSON object that can be directly parsed.`
        }]
      }]
    };

    // Add video if available
    if (base64Video) {
      const base64Data = base64Video.split('base64,')[1];
      if (base64Data) {
        payload.contents[0].parts.push({
          inlineData: {
            mimeType: "video/mp4", // Adjust based on your video format
            data: base64Data
          }
        });
      }
    }

    // Set generation config
    payload.generationConfig = {
      temperature: 0.2, // Lower temperature for more consistent, focused responses
      maxOutputTokens: 1024
    };

    // Add comprehensive logging
    console.log('Sending metric analysis request for:', metricKey);
    
    // Make the API request
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 45000 // Increased timeout for video processing
      }
    );

    // Parse the response
    const extractInsights = (responseData) => {
      try {
        // Get candidates from response
        const candidates = responseData?.candidates;
        if (!candidates || candidates.length === 0) {
          console.error('No candidates in response');
          return getDefaultInsights(metricKey);
        }

        // Get text from response
        const textResponse = candidates[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          console.error('No text in response');
          return getDefaultInsights(metricKey);
        }

        // Try to extract JSON
        let jsonText = textResponse;

        // Try to find JSON in markdown code blocks
        const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        // If no code block, try to extract JSON object directly
        if (!jsonMatch) {
          const jsonStartIndex = textResponse.indexOf('{');
          const jsonEndIndex = textResponse.lastIndexOf('}') + 1;
          if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
            jsonText = textResponse.substring(jsonStartIndex, jsonEndIndex);
          }
        }

        // Parse the JSON
        let insights;
        try {
          insights = JSON.parse(jsonText);
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          console.error("Raw JSON text:", jsonText);
          return getDefaultInsights(metricKey);
        }

        // Validate insights structure
        if (!insights.goodAspects || !insights.improvementAreas || 
            !insights.technicalBreakdown || !insights.recommendations) {
          console.error('Invalid insights structure:', insights);
          return getDefaultInsights(metricKey);
        }

        return insights;
      } catch (parseError) {
        console.error('Parsing error:', parseError);
        return getDefaultInsights(metricKey);
      }
    };

    // Extract and return insights
    return extractInsights(response.data);

  } catch (error) {
    // Log error details
    console.error('Error in generateMetricInsights:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      responseData: error.response?.data,
      responseStatus: error.response?.status
    });

    // Return default insights on any error
    return getDefaultInsights(metricKey);
  }
};

// Helper function to convert Blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


// Helper function for generic metric descriptions when specific one isn't available
const getGenericMetricDescription = (metricKey) => {
  const descriptions = {
    backswing: "The backswing involves the takeaway, wrist position, arm extension, and rotation. A proper backswing sets up the rest of the swing.",
    stance: "Stance includes foot position, width, weight distribution, posture, and alignment relative to the target line.",
    grip: "Grip examines hand placement, pressure, wrist position, and proper interlocking or overlapping technique.",
    swingBack: "This evaluates the rotation, plane, wrist hinge, and position at the top of the backswing.",
    swingForward: "The downswing path, transition, acceleration, and follow-through make up this metric.",
    hipRotation: "Hip rotation assesses proper turn during backswing and clearing through impact.",
    swingSpeed: "Tempo, rhythm, and acceleration through the ball are key elements of swing speed.",
    shallowing: "Shallowing examines how the club drops into the proper path during the downswing.",
    pacing: "Overall rhythm and timing throughout the entire swing motion.",
    confidence: "How decisive and committed the golfer appears in their swing.",
    focus: "Setup routine and execution concentration throughout the swing."
  };
  
  return descriptions[metricKey] || `The ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} aspect of the golf swing.`;
};

/**
 * Provide improved default insights for a metric by leveraging the Swing Recipe details
 * @param {string} metricKey - The metric key
 * @returns {Object} Default insights object with metric-specific content
 */
const getDefaultInsights = (metricKey) => {
  // Get the swing recipe metric key if available
  const swingRecipeKey = metricKeyMapping[metricKey] || metricKey;
  
  // Get detailed information about this metric from our swing recipe
  const metricInfo = metricDetails[swingRecipeKey];
  
  // Base default structure
  const baseDefaults = {
    goodAspects: [],
    improvementAreas: [],
    technicalBreakdown: [],
    recommendations: [],
    feelTips: []
  };
  
  // If we have specific information from the Swing Recipe, use it
  if (metricInfo) {
    return {
      goodAspects: [
        `Good ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} is crucial for a consistent swing`,
        `This is a ${metricInfo.category} element with a difficulty rating of ${metricInfo.difficulty}/10`
      ],
      improvementAreas: [
        `${metricInfo.description}`,
        `This element represents ${metricInfo.weighting} of your overall swing score`
      ],
      technicalBreakdown: [
        `${metricInfo.description}`,
        `This is categorized as a "${metricInfo.category}" element in golf technique`
      ],
      recommendations: [
        `Focus on improving this aspect through dedicated practice`,
        `Consider working with a professional instructor on this specific element`,
        metricInfo.exampleUrl ? `Watch instructional videos like ${metricInfo.exampleUrl}` : `Watch instructional videos focusing on this aspect of your swing`
      ],
      feelTips: [
        `When executed correctly, this element should feel natural and controlled`,
        `Focus on building muscle memory through repetitive practice`
      ]
    };
  }
  
  // Metric-specific defaults for common metrics not in the Swing Recipe
  const metricDefaults = {
    backswing: {
      goodAspects: [
        "Maintaining a straight left arm during backswing helps create width and power",
        "Proper shoulder turn creates torque for a more powerful downswing"
      ],
      improvementAreas: [
        "Focus on keeping the club on plane throughout the backswing",
        "Watch for over-rotation which can lead to inconsistent contact"
      ],
      technicalBreakdown: [
        "The backswing starts with a one-piece takeaway",
        "The wrists should hinge naturally as the club reaches parallel to the ground",
        "Proper rotation involves turning the shoulders while maintaining spine angle"
      ],
      recommendations: [
        "Practice the 'L' position drill to improve your takeaway and club position",
        "Work on maintaining your spine angle during the shoulder turn",
        "Use alignment sticks to ensure proper swing plane"
      ],
      feelTips: [
        "The backswing should feel wide and controlled, not rushed",
        "Focus on feeling your weight shift slightly to your trail side",
        "Your hands should feel light with natural wrist hinge"
      ]
    },
    // Other metric defaults as needed...
  };
  
  // If we have defaults for this metric, use them, otherwise use generic
  if (metricDefaults[metricKey]) {
    return {
      ...baseDefaults,
      ...metricDefaults[metricKey]
    };
  }
  
  // Generic defaults if metric not found anywhere
  return {
    goodAspects: [
      "Work with a golf professional for personalized analysis",
      "Record your swing regularly to track progress"
    ],
    improvementAreas: [
      "Focus on fundamentals like grip, stance, and posture",
      "Break down the swing into components for targeted practice"
    ],
    technicalBreakdown: [
      "The golf swing is a complex motion requiring coordination of multiple body parts",
      "Proper sequencing from ground up creates efficient power",
      "Balance and tempo are fundamental to consistency"
    ],
    recommendations: [
      "Work with a PGA teaching professional for personalized instruction",
      "Practice with purpose, focusing on specific aspects rather than just hitting balls",
      "Use video analysis to identify and address specific issues"
    ],
    feelTips: [
      "A good swing should feel balanced and rhythmic",
      "Focus on feeling connected throughout the swing",
      "The correct motion will feel effortless, not forced"
    ]
  };
};
// In geminiService.js, add this to the exports at the bottom:

// Metric Insights Generator
export const metricInsightsGenerator = {
  generateMetricInsights,
  getDefaultInsights
};