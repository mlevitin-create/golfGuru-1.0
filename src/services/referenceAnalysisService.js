// src/services/referenceAnalysisService.js
import axios from 'axios';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';

// Configuration
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent';

/**
 * Analyzes a reference YouTube video for a specific golf swing metric
 * @param {string} metricKey - The metric to analyze
 * @param {string} youtubeUrl - YouTube URL of the reference video
 * @returns {Promise<Object>} The analysis results
 */
export const analyzeReferenceVideo = async (metricKey, youtubeUrl) => {
  try {
    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Get metric information
    const metricInfo = await getMetricInfo(metricKey);
    
    // Create the analysis prompt
    const analysisPrompt = `
You are a PGA Master Professional with 30 years experience in golf swing analysis. 
Watch this instructional YouTube video about ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} in the golf swing.

Your task is to conduct a comprehensive analysis of this video to create a reference model for the ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} aspect of the golf swing. This model will be used to evaluate and score other golfers' swings.

Analyze the video for:
1. Technical Guidelines: What are the precise technical elements that define proper ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()}?
2. Ideal Form: What does perfect execution of this element look like?
3. Common Mistakes: What are the most frequent errors golfers make with this aspect?
4. Coaching Cues: What verbal cues would help a golfer improve this aspect?
5. Scoring Rubric: Define specific criteria for scoring this element on a 0-100 scale, with detailed descriptions for these ranges:
   - 90+: Perfect technique
   - 70-89: Good technique with minor flaws
   - 50-69: Developing technique with clear issues
   - <50: Significant flaws requiring fundamental correction

Please format your response as a JSON object with the following structure:
{
  "technicalGuidelines": ["guideline1", "guideline2", ...],
  "idealForm": ["aspect1", "aspect2", ...],
  "commonMistakes": ["mistake1", "mistake2", ...],
  "coachingCues": ["cue1", "cue2", ...],
  "scoringRubric": {
    "90+": "detailed description",
    "70-89": "detailed description",
    "50-69": "detailed description",
    "<50": "detailed description"
  }
}

Provide comprehensive, detailed, and technically accurate information that could be used to evaluate a golfer's ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} technique.
    `;
    
    // Create the API request
    const payload = {
      contents: [{
        parts: [
          { text: analysisPrompt },
          {
            fileData: {
              mimeType: "video/*",
              fileUri: `https://youtu.be/${videoId}`
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };
    
    // Make the API request
    const response = await axios.post(
      `${API_URL}?key=${API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 180000 // 3 minutes
      }
    );
    
    // Process the response
    const textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('No text in API response');
    }
    
    // Extract JSON from response
    let jsonResponse;
    try {
      // Try to extract JSON from the text
      const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                        textResponse.match(/\{[\s\S]*?\}/);
      
      const jsonText = jsonMatch ? jsonMatch[0] : textResponse;
      jsonResponse = JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing JSON from response:', error);
      console.error('Raw response:', textResponse);
      throw new Error('Failed to parse analysis result');
    }
    
    // Validate the response structure
    if (!jsonResponse.technicalGuidelines || !jsonResponse.idealForm || 
        !jsonResponse.commonMistakes || !jsonResponse.coachingCues || 
        !jsonResponse.scoringRubric) {
      throw new Error('Invalid analysis structure');
    }
    
    // Save the result to Firestore
    const referenceData = {
      metricKey,
      youtubeUrl,
      youtubeVideoId: videoId,
      referenceAnalysis: jsonResponse,
      analyzedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'reference_models', metricKey), referenceData, { merge: true });
    
    return referenceData;
  } catch (error) {
    console.error(`Error analyzing reference video for ${metricKey}:`, error);
    throw error;
  }
};

/**
 * Get information about a specific metric
 * @param {string} metricKey - The metric key to get info for
 * @returns {Promise<Object>} Metric information
 */
const getMetricInfo = async (metricKey) => {
  try {
    // Try to get from Firestore first
    const docRef = doc(db, 'metrics', metricKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // If not in Firestore, use default info
    return {
      title: metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: `The ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} aspect of the golf swing.`,
      category: 'General',
      difficulty: 5
    };
  } catch (error) {
    console.error(`Error getting metric info for ${metricKey}:`, error);
    // Return default info on error
    return {
      title: metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: `The ${metricKey.replace(/([A-Z])/g, ' $1').toLowerCase()} aspect of the golf swing.`,
      category: 'General',
      difficulty: 5
    };
  }
};

/**
 * Extract technical patterns from multiple reference analyses
 * @returns {Promise<Object>} Patterns found across references
 */
export const extractTechnicalPatterns = async () => {
  try {
    // Get all reference models
    const snapshot = await getDocs(collection(db, 'reference_models'));
    
    if (snapshot.empty) {
      return null;
    }
    
    // Initialize pattern collection
    const patterns = {
      technicalPatterns: [],
      commonMistakes: [],
      coachingApproaches: []
    };
    
    // Process each reference model
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.referenceAnalysis) {
        // Collect common technical guidelines
        data.referenceAnalysis.technicalGuidelines.forEach(guideline => {
          if (!patterns.technicalPatterns.includes(guideline)) {
            patterns.technicalPatterns.push(guideline);
          }
        });
        
        // Collect common mistakes
        data.referenceAnalysis.commonMistakes.forEach(mistake => {
          if (!patterns.commonMistakes.includes(mistake)) {
            patterns.commonMistakes.push(mistake);
          }
        });
        
        // Collect coaching approaches
        data.referenceAnalysis.coachingCues.forEach(cue => {
          if (!patterns.coachingApproaches.includes(cue)) {
            patterns.coachingApproaches.push(cue);
          }
        });
      }
    });
    
    // Save patterns to Firestore
    await setDoc(doc(db, 'system', 'technical_patterns'), {
      ...patterns,
      updatedAt: serverTimestamp()
    });
    
    return patterns;
  } catch (error) {
    console.error('Error extracting technical patterns:', error);
    throw error;
  }
};

export default {
  analyzeReferenceVideo,
  extractTechnicalPatterns
};