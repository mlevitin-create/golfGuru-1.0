import axios from 'axios';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

// Note: You should store your API key in an environment variable (.env file)
// Create a .env file at the root of your project with:
// REACT_APP_GEMINI_API_KEY=your_api_key_here

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Flag to control whether we use real API or mock data
const USE_MOCK_DATA = false; // Set to false to try real API

/**
 * Create a unique signature for a video file to track repeated analyses
 * @param {File} videoFile - The video file
 * @returns {string} A unique identifier based on file properties
 */
const createVideoSignature = (videoFile) => {
  return `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
};

/**
 * Check if this video has been analyzed before and ensure consistency
 * @param {Object} analysisData - The current analysis results
 * @param {File} videoFile - The video file being analyzed
 * @returns {Object} Adjusted analysis data for consistency
 */
const ensureConsistentAnalysis = (analysisData, videoFile) => {
  try {
    // Create a signature for this specific video file
    const videoSignature = createVideoSignature(videoFile);
    
    // Check if we've analyzed this video before
    const previousAnalysesJson = localStorage.getItem(`golf_analysis_${videoSignature}`);
    
    if (previousAnalysesJson) {
      // We've seen this video before
      const previousAnalyses = JSON.parse(previousAnalysesJson);
      console.log(`Found ${previousAnalyses.length} previous analyses for this video`);
      
      if (previousAnalyses.length > 0) {
        // Get the most recent previous analysis
        const lastAnalysis = previousAnalyses[previousAnalyses.length - 1];
        
        // Check for significant differences
        const overallDiff = Math.abs(analysisData.overallScore - lastAnalysis.overallScore);
        
        if (overallDiff > 8) {
          console.log(`Detected inconsistency in scoring. Previous: ${lastAnalysis.overallScore}, Current: ${analysisData.overallScore}`);
          
          // Blend the scores to make them more consistent
          // (70% current, 30% previous for more stability)
          analysisData.overallScore = Math.round(
            (0.7 * analysisData.overallScore) + (0.3 * lastAnalysis.overallScore)
          );
          
          // Also blend metrics that show significant differences
          Object.keys(analysisData.metrics).forEach(key => {
            if (lastAnalysis.metrics && lastAnalysis.metrics[key] !== undefined) {
              const metricDiff = Math.abs(analysisData.metrics[key] - lastAnalysis.metrics[key]);
              
              if (metricDiff > 10) {
                analysisData.metrics[key] = Math.round(
                  (0.7 * analysisData.metrics[key]) + (0.3 * lastAnalysis.metrics[key])
                );
              }
            }
          });
          
          console.log(`Adjusted overall score for consistency: ${analysisData.overallScore}`);
        }
      }
      
      // Add this new analysis to the history (limited to last 3)
      previousAnalyses.push({
        timestamp: new Date().toISOString(),
        overallScore: analysisData.overallScore,
        metrics: {...analysisData.metrics}
      });
      
      // Keep only the most recent 3 analyses to prevent storage bloat
      if (previousAnalyses.length > 3) {
        previousAnalyses.shift();
      }
      
      // Save updated history
      localStorage.setItem(`golf_analysis_${videoSignature}`, JSON.stringify(previousAnalyses));
      
    } else {
      // First time seeing this video, start a history
      const newHistory = [{
        timestamp: new Date().toISOString(),
        overallScore: analysisData.overallScore,
        metrics: {...analysisData.metrics}
      }];
      
      localStorage.setItem(`golf_analysis_${videoSignature}`, JSON.stringify(newHistory));
    }
    
    return analysisData;
    
  } catch (error) {
    // If anything goes wrong, just return the original data
    console.error("Error in consistency tracking:", error);
    return analysisData;
  }
};

/**
 * Calculate a more accurate overall score based on weighted metrics
 * @param {Object} metrics - Object containing metric scores
 * @returns {number} Weighted overall score
 */
const calculateWeightedOverallScore = (metrics) => {
  // These weights are based on the Swing Recipe categories
  const weights = {
    // Setup (20%)
    stance: 0.07,
    grip: 0.07,
    ballPosition: 0.06,
    
    // Swing (50%)
    backswing: 0.10,
    swingBack: 0.10,
    swingForward: 0.15,
    shallowing: 0.15,
    impactPosition: 0.15,
    
    // Body (20%)
    hipRotation: 0.08,
    pacing: 0.04,
    stiffness: 0.04,
    headPosition: 0.04,
    shoulderPosition: 0.04,
    armPosition: 0.04,
    followThrough: 0.04,
    
    // Mental (10%)
    confidence: 0.05,
    focus: 0.05
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(metrics).forEach(([key, value]) => {
    if (weights[key]) {
      weightedSum += value * weights[key];
      totalWeight += weights[key];
    } else {
      // For metrics not in our predefined weights, use a default weight
      weightedSum += value * 0.05;
      totalWeight += 0.05;
    }
  });
  
  // Normalize if we don't have all metrics
  if (totalWeight > 0 && totalWeight < 1) {
    weightedSum = weightedSum / totalWeight;
  }
  
  // Round to nearest integer
  return Math.round(weightedSum);
};

// Modify the normalizeAndValidateScores function to include our new calculation
const normalizeAndValidateScores = (analysisData) => {
  // First ensure overall score is within 0-100 range and rounded
  analysisData.overallScore = Math.min(100, Math.max(0, Math.round(analysisData.overallScore)));
  
  // Now recalculate based on weighted metrics
  const recalculatedScore = calculateWeightedOverallScore(analysisData.metrics);
  
  // If there's a significant difference (more than 5 points), use the recalculated score
  if (Math.abs(analysisData.overallScore - recalculatedScore) > 5) {
    console.log(`Adjusting overall score from ${analysisData.overallScore} to ${recalculatedScore} based on weighted metrics`);
    analysisData.overallScore = recalculatedScore;
  }
  
  // Get all metric values
  const metricValues = Object.values(analysisData.metrics);
  
  // Calculate average and standard deviation
  const avgScore = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
  const stdDev = Math.sqrt(
    metricValues.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / metricValues.length
  );
  
  console.log(`Metrics avg: ${avgScore.toFixed(1)}, stdDev: ${stdDev.toFixed(1)}`);
  
  // If standard deviation is too low (less than 5), scores are too clustered
  if (stdDev < 5 && metricValues.length > 3) {
    console.log("Detected low variance in scores, applying normalization");
    
    // Find min and max values
    const minVal = Math.min(...metricValues);
    const maxVal = Math.max(...metricValues);
    const range = maxVal - minVal;
    
    // If the range is too small, spread the scores out
    if (range < 15) {
      // Target a more realistic standard deviation
      const targetStdDev = 8;
      const stretchFactor = targetStdDev / Math.max(1, stdDev);
      
      // Apply a spread to each metric while maintaining the overall average
      Object.keys(analysisData.metrics).forEach(key => {
        // Center the value around the mean
        const centered = analysisData.metrics[key] - avgScore;
        // Stretch it out
        const stretched = centered * stretchFactor;
        // Recenter around the original mean and round
        analysisData.metrics[key] = Math.round(avgScore + stretched);
        // Ensure it's within bounds
        analysisData.metrics[key] = Math.min(100, Math.max(0, analysisData.metrics[key]));
      });
      
      // Recalculate overall score after adjusting metrics
      analysisData.overallScore = calculateWeightedOverallScore(analysisData.metrics);
    }
  }
  
  // Verify no metric has exactly the same score as the overall score, unless all metrics do
  const hasAllSameAsOverall = metricValues.every(val => val === analysisData.overallScore);
  if (!hasAllSameAsOverall) {
    Object.keys(analysisData.metrics).forEach(key => {
      if (analysisData.metrics[key] === analysisData.overallScore) {
        // Slightly adjust to avoid exact matches
        analysisData.metrics[key] += (Math.random() > 0.5 ? 1 : -1);
        // Ensure bounds
        analysisData.metrics[key] = Math.min(100, Math.max(0, analysisData.metrics[key]));
      }
    });
  }
  
  return analysisData;
};

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
              text: `You are a professional golf coach with expertise in swing analysis. Analyze this golf swing video in detail and provide a comprehensive assessment:

1. Overall swing score (0-100) based on proper form, mechanics, and effectiveness, where:
   - 90-100: Professional level swing with perfect mechanics
   - 80-89: Advanced player with very good mechanics and minor flaws
   - 70-79: Skilled player with good fundamentals but noticeable flaws
   - 60-69: Intermediate player with correct basic mechanics but significant issues
   - 50-59: Developing player with some correct elements but many issues
   - Below 50: Beginner with fundamental issues in multiple areas

2. Score each of the following metrics from 0-100 using these specific criteria:

   - backswing: Evaluate the takeaway, wrist position, and backswing plane
     * 90+: Perfect takeaway, ideal wrist cock, on-plane movement
     * 70-89: Good fundamentals with minor flaws in plane or wrist position
     * 50-69: Functional but with clear issues in takeaway or plane
     * <50: Significant flaws causing compensations

   - stance: Assess foot position, width, weight distribution, and posture
     * 90+: Perfect athletic posture, ideal width and alignment
     * 70-89: Good posture with minor alignment or width issues
     * 50-69: Basic posture established but with noticeable flaws
     * <50: Poor posture affecting the entire swing

   - grip: Evaluate hand placement, pressure, and wrist position
     * 90+: Textbook grip with ideal pressure and hand placement
     * 70-89: Functional grip with minor issues in hand position
     * 50-69: Basic grip established but with pressure or placement issues
     * <50: Fundamentally flawed grip requiring rebuilding

   - swingBack: Rate the rotation, plane, and position at the top
     * 90+: Perfect rotation with ideal club position at the top
     * 70-89: Good rotation with minor plane issues
     * 50-69: Functional but with restricted turn or off-plane issues
     * <50: Severely restricted or off-plane

   - swingForward: Evaluate the downswing path, transition, and follow through
     * 90+: Perfect sequencing and path through impact
     * 70-89: Good sequencing with minor path issues
     * 50-69: Basic sequencing but with timing or path issues
     * <50: Poor sequencing with major path flaws

   - hipRotation: Assess the hip turn both in backswing and through impact
     * 90+: Perfect hip loading and explosive rotation through impact
     * 70-89: Good rotation with minor timing or restriction issues
     * 50-69: Basic rotation but with clear restrictions
     * <50: Minimal hip involvement

   - swingSpeed: Rate the tempo and acceleration through the ball
     * 90+: Perfect tempo with ideal acceleration through impact
     * 70-89: Good tempo with minor acceleration issues
     * 50-69: Inconsistent tempo affecting clubhead speed
     * <50: Poor tempo with deceleration issues

   - shallowing: Evaluate club path and shaft position in the downswing
     * 90+: Perfect shallowing with ideal shaft plane
     * 70-89: Good shallowing with minor steepness issues
     * 50-69: Inconsistent shallowing with occasional steepness
     * <50: Consistently steep or incorrect shallowing

   - pacing: Rate the overall rhythm and timing of the swing
     * 90+: Perfect rhythm throughout with ideal transitions
     * 70-89: Good rhythm with minor timing issues
     * 50-69: Functional but with rushed or slow segments
     * <50: Disjointed or poorly timed

   - confidence: Assess the decisiveness and commitment to the swing
     * 90+: Complete commitment with precise setup routine
     * 70-89: Good commitment with occasional hesitation
     * 50-69: Basic commitment but with visible uncertainty
     * <50: Tentative throughout

   - focus: Evaluate setup routine and swing execution
     * 90+: Laser focus throughout with perfect routine
     * 70-89: Good focus with minor lapses
     * 50-69: Basic focus but with visible distractions
     * <50: Unfocused or inconsistent attention

3. Provide three specific, actionable recommendations for improvement.${clubInfo}

IMPORTANT INSTRUCTIONS:
- Be precise and discriminating in your scoring. AVOID defaulting to the 70-75 range for all metrics.
- Each metric should show appropriate variance based on skill level.
- The overall score should NOT be a simple average of the metrics.
- Focus on what you actually observe, not what you assume might be happening.
- Maintain consistency in how you evaluate similar swings.

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

        // Apply normalization and consistency enhancements
        analysisData = normalizeAndValidateScores(analysisData);
        analysisData = ensureConsistentAnalysis(analysisData, videoFile);

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
 * Create more realistic mock analysis data for fallback
 * @param {File} videoFile - The video file
 * @param {Object} metadata - Additional metadata like club and date information
 * @returns {Object} Mock analysis data
 */
const createMockAnalysis = (videoFile, metadata = null) => {
  console.log('Generating improved mock analysis data');

  // Extract date information from metadata if available
  const recordedDate = metadata?.recordedDate || new Date();

  // Generate a base skill level that will inform all metrics
  // Using a normal distribution centered around different values based on club type
  let baseSkillLevel = 65; // Default baseline
  
  // Adjust baseline based on club type if available
  if (metadata?.clubType) {
    switch(metadata.clubType) {
      case 'Wood':
        // Woods are typically harder, so lower baseline
        baseSkillLevel = 60 + (Math.random() * 10 - 5);
        break;
      case 'Iron':
        // Irons are middle difficulty
        baseSkillLevel = 65 + (Math.random() * 10 - 5);
        break;
      case 'Wedge':
        // Short game might be better for amateurs
        baseSkillLevel = 68 + (Math.random() * 10 - 5);
        break;
      case 'Putter':
        // Putting can vary widely
        baseSkillLevel = 70 + (Math.random() * 16 - 8);
        break;
      default:
        baseSkillLevel = 65 + (Math.random() * 10 - 5);
    }
  }
  
  // Create realistic variations between metrics
  // Define metric groups that should be correlated
  const metricGroups = {
    setup: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['stance', 'grip', 'ballPosition'] },
    swing: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['backswing', 'swingBack', 'swingForward', 'shallowing'] },
    body: { base: baseSkillLevel + (Math.random() * 10 - 5), metrics: ['hipRotation', 'pacing', 'followThrough', 'headPosition', 'shoulderPosition', 'armPosition'] },
    mental: { base: baseSkillLevel + (Math.random() * 14 - 7), metrics: ['confidence', 'focus'] }
  };
  
  // Generate each metric with appropriate variation
  const metrics = {};
  
  // Process each group
  Object.entries(metricGroups).forEach(([groupName, group]) => {
    const groupBase = group.base;
    
    // Add individual metrics with realistic variance
    group.metrics.forEach(metric => {
      // Create plausible variance within the group
      // Bigger variance for mental factors, smaller for physical ones
      const variance = groupName === 'mental' ? 12 : 8;
      
      // Generate score with BoxMuller to create a normal distribution
      let u1 = Math.random();
      let u2 = Math.random();
      let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      let metricScore = Math.round(groupBase + z0 * (variance / 3)); // 3 sigma
      
      // Ensure within bounds
      metrics[metric] = Math.max(30, Math.min(95, metricScore));
    });
  });
  
  // Special cases based on club type
  if (metadata?.clubType === 'Wood') {
    // Woods typically need more clubhead speed and proper shallowing
    metrics.swingSpeed = Math.min(95, metrics.swingSpeed + Math.floor(Math.random() * 8));
    metrics.shallowing = Math.max(30, metrics.shallowing - Math.floor(Math.random() * 10));
  } else if (metadata?.clubType === 'Iron') {
    // Irons need good impact position
    metrics.swingForward = Math.min(95, metrics.swingForward + Math.floor(Math.random() * 5));
  } else if (metadata?.clubType === 'Wedge') {
    // Wedges need good wrist control
    metrics.grip = Math.min(95, metrics.grip + Math.floor(Math.random() * 7));
  } else if (metadata?.clubType === 'Putter') {
    // Putting is more about mental and pace
    metrics.pacing = Math.min(95, metrics.pacing + Math.floor(Math.random() * 10));
    metrics.focus = Math.min(95, metrics.focus + Math.floor(Math.random() * 10));
  }
  
  // Generate realistic overall score with appropriate weighting
  // Not just an average but weighted toward the more important aspects
  const calcOverallScore = () => {
    const weights = {
      // Setup (20%)
      stance: 0.07,
      grip: 0.07,
      ballPosition: 0.06,
      
      // Swing (50%)
      backswing: 0.10,
      swingBack: 0.10,
      swingForward: 0.15,
      shallowing: 0.15,
      
      // Body (20%)
      hipRotation: 0.08,
      pacing: 0.04,
      headPosition: 0.04,
      shoulderPosition: 0.04,
      
      // Mental (10%)
      confidence: 0.05,
      focus: 0.05
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (weights[key]) {
        weightedSum += value * weights[key];
        totalWeight += weights[key];
      }
    });
    
    // Normalize if we don't have all metrics
    if (totalWeight > 0 && totalWeight < 1) {
      weightedSum = weightedSum / totalWeight;
    }
    
    // Add a small random factor
    return Math.round(weightedSum + (Math.random() * 4 - 2));
  };
  
  const overallScore = calculateWeightedOverallScore(metrics);
  
  // Generate appropriate recommendations based on lowest metrics
  const generateRecommendations = () => {
    // Sort metrics by score (ascending)
    const sortedMetrics = Object.entries(metrics).sort((a, b) => a[1] - b[1]);
    
    // Take the 3 lowest metrics
    const lowestMetrics = sortedMetrics.slice(0, 3);
    
    // Map of recommendation templates by metric
    const recommendationTemplates = {
      backswing: [
        "Focus on a slower, more controlled takeaway",
        "Keep your left arm straighter during the backswing",
        "Work on proper wrist hinge in your backswing"
      ],
      stance: [
        "Widen your stance slightly for better balance",
        "Adjust your posture to be more athletic at address",
        "Work on proper weight distribution in your stance"
      ],
      grip: [
        "Check your grip pressure - avoid gripping too tightly",
        "Ensure your hands work together as a unit during the swing",
        "Position your hands slightly ahead of the ball at address"
      ],
      swingBack: [
        "Focus on a full shoulder turn in your backswing",
        "Maintain your spine angle during the backswing",
        "Work on getting the club in the correct position at the top"
      ],
      swingForward: [
        "Start your downswing with your lower body",
        "Work on proper weight transfer to your lead side",
        "Focus on rotating through impact with your body"
      ],
      hipRotation: [
        "Increase your hip turn in the backswing",
        "Work on clearing your hips through impact",
        "Practice proper hip-shoulder separation"
      ],
      swingSpeed: [
        "Develop a smoother tempo for more consistent speed",
        "Work on maintaining acceleration through impact",
        "Practice swinging at 80% effort for better control"
      ],
      shallowing: [
        "Focus on dropping the club into the slot on the downswing",
        "Avoid casting the club from the top",
        "Work on the proper sequence to shallow the club"
      ],
      pacing: [
        "Develop a consistent pre-shot routine",
        "Count to establish a consistent tempo",
        "Practice with a metronome to develop rhythm"
      ],
      focus: [
        "Establish a consistent pre-shot routine",
        "Stay focused on your target throughout the swing",
        "Practice mindfulness techniques to improve focus"
      ],
      confidence: [
        "Commit fully to each shot before you swing",
        "Visualize the shot you want to hit before addressing the ball",
        "Practice positive self-talk during your round"
      ]
    };
    
    // Default recommendations if we don't have templates for a metric
    const defaultRecommendations = [
      "Work on maintaining your spine angle throughout the swing",
      "Focus on a smooth transition from backswing to downswing",
      "Practice with alignment sticks to improve your swing path"
    ];
    
    // Generate recommendations based on the lowest metrics
    return lowestMetrics.map(([metric]) => {
      const templates = recommendationTemplates[metric] || defaultRecommendations;
      return templates[Math.floor(Math.random() * templates.length)];
    });
  };
  
  const recommendations = generateRecommendations();

  return {
    id: Date.now().toString(),
    date: new Date().toISOString(), // Analysis date (now)
    recordedDate: recordedDate instanceof Date ? recordedDate.toISOString() : recordedDate,
    overallScore,
    metrics,
    recommendations,
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

/**
 * Collect user feedback on swing analysis to improve the model
 * @param {Object} swingData - The swing analysis data
 * @param {String} feedbackType - 'accurate', 'too_high', 'too_low'
 * @param {Object} metricFeedback - Feedback on specific metrics
 * @returns {Promise<boolean>} Success status
 */
const collectAnalysisFeedback = async (swingData, feedbackType, metricFeedback = {}) => {
  if (!swingData) return false;
  
  try {
    // Create feedback document
    const feedbackData = {
      timestamp: serverTimestamp(),
      swingId: swingData.id || null,
      userId: auth.currentUser?.uid || 'anonymous',
      feedbackType, // 'accurate', 'too_high', 'too_low'
      overallScore: swingData.overallScore,
      originalMetrics: {...swingData.metrics},
      metricFeedback, // e.g. { backswing: 'too_high', grip: 'accurate' }
      clubType: swingData.clubType || null,
      clubName: swingData.clubName || null,
      modelVersion: 'gemini-2.0-flash-exp' // Track which model version was used
    };
    
    // Store in Firestore
    await addDoc(collection(db, 'analysis_feedback'), feedbackData);
    console.log('Feedback saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving feedback:', error);
    return false;
  }
};

// Enhanced metric descriptions and prompts from the Swing Recipe document
// Update to metricDetails object in geminiService.js

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
    description: "The path and position of the club during the forward swing phase, as you begin to swing towards the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=ASH-gJXbMSU" // Added example URL
  },
  swingSpeed: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 7,
    description: "The velocity and acceleration of the club throughout the swing, particularly at impact.",
    exampleUrl: "https://www.youtube.com/watch?v=vZ5pMtD2wKQ" // Added example URL
  },
  shallowing: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 9,
    description: "How well the club 'shallows' or drops into the correct path during the downswing.",
    exampleUrl: "https://www.youtube.com/watch?v=V2PtvBiYWNM" // Added example URL
  },
  impactPosition: {
    category: "Club",
    weighting: "5.88%",
    difficulty: 10,
    description: "The position and angle of the club at the moment of impact with the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=gXD-uxUloos" // Added example URL
  },
  hipRotation: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "How effectively the hips rotate during the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=iEyIDzGjyRE" // Added example URL
  },
  pacing: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The overall rhythm and timing of your swing to ensure proper technique.",
    exampleUrl: "https://www.youtube.com/watch?v=AzdeJrIdkU4" // Added example URL
  },
  followThrough: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The completion of the swing after impact with the ball.",
    exampleUrl: "https://www.youtube.com/watch?v=o9H0T_n2KIQ" // Added example URL
  },
  headPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 4,
    description: "The position and stability of your head throughout the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=y_PNrUtxSxE" // Added example URL
  },
  shoulderPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The position and movement of your shoulders through the swing.",
    exampleUrl: "https://www.youtube.com/watch?v=dhOvT8cXp_c" // Added example URL
  },
  armPosition: {
    category: "Body",
    weighting: "5.88%",
    difficulty: 6,
    description: "The proper positioning of your arms throughout the entire swing.",
    exampleUrl: "https://www.youtube.com/watch?v=ASoOQdQJ4m0" // Added example URL
  }
};

// Map from our code's metric keys to the swing recipe metrics
// Enhanced metric key mapping to ensure all metrics are properly mapped
const metricKeyMapping = {
  // Current mappings
  backswing: "clubTrajectoryBackswing",
  swingBack: "clubTrajectoryBackswing",
  swingForward: "clubTrajectoryForswing",
  
  // Additional mappings for consistency
  hipRotation: "hipRotation",
  swingSpeed: "swingSpeed",
  shallowing: "shallowing",
  pacing: "pacing",
  confidence: "confidence",
  focus: "focus",
  stance: "stance",
  grip: "grip",
  shoulderPosition: "shoulderPosition",
  armPosition: "armPosition",
  headPosition: "headPosition",
  followThrough: "followThrough",
  impactPosition: "impactPosition",
  ballPosition: "ballPosition",
  stiffness: "stiffness"
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
      temperature: 0.5, // Lower temperature for more consistent, focused responses
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

// Export the main function
export default { analyzeGolfSwing, createMockAnalysis };

// Export additional utilities
export const metricInsightsGenerator = {
  generateMetricInsights,
  getDefaultInsights
};

// Export the collectAnalysisFeedback function but not the React component
export { collectAnalysisFeedback };