// src/admin/initializeMetrics.js
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';

// This is the comprehensive metrics data with reference videos from the document
const metricsData = {
  confidence: {
    title: "Confidence",
    description: "This is focused on the mental side of the game. Confidence is key to not be phased by the pressure of the game, being able to stick to your fundamentals and not get in your head after a bad shot.",
    category: "Mental",
    difficulty: 7,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=y95_Us_qCpQ",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=y95_Us_qCpQ")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=y95_Us_qCpQ")
  },
  focus: {
    title: "Focus",
    description: "This is also focused on the mental side of the game. This is the ability to hone in on where you want to hit your shot and your concentration on the ball. Staying focused means you aren't bouncing your eyes around but remain focused on the ball.",
    category: "Mental",
    difficulty: 4,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=SLbeLgQls_4",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=SLbeLgQls_4")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=SLbeLgQls_4")
  },
  stiffness: {
    title: "Stiffness",
    description: "Your ability to remove tension from your body during your swing. You don't want to be too tight or else it will limit your body from being able to swing properly. But you also don't want your body to be too loose or else you will sacrifice other fundamentals of your swing.",
    category: "Body",
    difficulty: 5,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=trOLRAPi07M",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=trOLRAPi07M")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=trOLRAPi07M")
  },
  stance: {
    title: "Stance",
    description: "This is the proper set up before your swing. You want to be the right distance between you and the ball. This includes your feet around shoulder width apart with your club at roughly a 45 degree angle and your hands lined up underneath your head.",
    category: "Setup",
    difficulty: 2,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=P4d5TjzEgtk",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=P4d5TjzEgtk")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=P4d5TjzEgtk")
  },
  grip: {
    title: "Grip",
    description: "You should be using an interlocking golf grip instead of holding the club like a baseball bat. This will create a consistent swing and keep the club and your hands from rotating too much during your swing.",
    category: "Setup",
    difficulty: 3,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=nd6y-5nInHQ",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=nd6y-5nInHQ")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=nd6y-5nInHQ")
  },
  ballPosition: {
    title: "Ball Position",
    description: "You want to stand the right distance from the ball as you set up to take your shot. This should be so the club is at roughly a 45 degree angle from the ball and that the ball is positioned different based on the club you are using - a driver should have the ball closer to your lead foot while a short range club will have the ball more in between your feet.",
    category: "Setup",
    difficulty: 1,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=UdZfTKBfGho",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=UdZfTKBfGho")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=UdZfTKBfGho")
  },
  backswing: {
    title: "Backswing",
    description: "Your takeaway and club position during the backswing phase. The path and position of the club during the backswing phase. This involves the takeaway, wrist position, and backswing plane.",
    category: "Club",
    difficulty: 8,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=oszzApkv54s",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=oszzApkv54s")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=oszzApkv54s")
  },
  swingForward: {
    title: "Forward Swing",
    description: "The path and position of the club during the forward swing phase, as you begin to swing towards the ball.",
    category: "Club",
    difficulty: 8,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=xia6slsDGd4",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=xia6slsDGd4")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=xia6slsDGd4")
  },
  swingSpeed: {
    title: "Swing Speed",
    description: "Finding the way to maximize your swing speed where you are able to stay in control but still generate enough power to increase distance. The velocity and acceleration of the club throughout the swing, particularly at impact.",
    category: "Club",
    difficulty: 7,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=FSDH0DXWP7M",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=FSDH0DXWP7M")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=FSDH0DXWP7M")
  },
  shallowing: {
    title: "Shallowing",
    description: "How well the club 'shallows' or drops into the correct path during the downswing.",
    category: "Club",
    difficulty: 9,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=OaeUTaBo6hw",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=OaeUTaBo6hw")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=OaeUTaBo6hw")
  },
  impactPosition: {
    title: "Impact Position",
    description: "The position and angle of the club at the moment of impact with the ball.",
    category: "Club",
    difficulty: 10,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=Wu7jMcPK2yM",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=Wu7jMcPK2yM")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=Wu7jMcPK2yM")
  },
  hipRotation: {
    title: "Hip Rotation",
    description: "How your hips rotate throughout the swing.",
    category: "Body",
    difficulty: 6,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=p_HZJ2u0TIo&t=2s",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=p_HZJ2u0TIo&t=2s")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=p_HZJ2u0TIo&t=2s")
  },
  pacing: {
    title: "Tempo & Rhythm",
    description: "The overall rhythm and timing of your swing to ensure proper technique.",
    category: "Body",
    difficulty: 6,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=t8npyrOQ9Os",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=t8npyrOQ9Os")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=t8npyrOQ9Os")
  },
  followThrough: {
    title: "Follow Through",
    description: "The completion of the swing after impact with the ball.",
    category: "Body",
    difficulty: 4,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=kf0v-iCntNo",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=kf0v-iCntNo")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=kf0v-iCntNo")
  },
  headPosition: {
    title: "Head Position",
    description: "The position and stability of your head throughout the entire swing.",
    category: "Body",
    difficulty: 4,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=CsDhFI0A8-Y",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=CsDhFI0A8-Y")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=CsDhFI0A8-Y")
  },
  shoulderPosition: {
    title: "Shoulder Position",
    description: "The position and movement of your shoulders through the swing.",
    category: "Body",
    difficulty: 6,
    weighting: "5.88%",
    exampleUrl: "https://www.youtube.com/watch?v=OCuK7nWvHt0",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://www.youtube.com/watch?v=OCuK7nWvHt0")}`,
    youtubeVideoId: extractYouTubeVideoId("https://www.youtube.com/watch?v=OCuK7nWvHt0")
  },
  armPosition: {
    title: "Arm Position",
    description: "The proper positioning of your arms throughout the entire swing.",
    category: "Body",
    difficulty: 6,
    weighting: "5.88%",
    exampleUrl: "https://youtu.be/ToDcjnxouQU",
    embedUrl: `https://www.youtube.com/embed/${extractYouTubeVideoId("https://youtu.be/ToDcjnxouQU")}`,
    youtubeVideoId: extractYouTubeVideoId("https://youtu.be/ToDcjnxouQU")
  }
};

export const initializeAllMetrics = async () => {
  try {
    console.log("Starting metrics initialization with YouTube references...");
    const batchOp = writeBatch(db);
    
    // Add each metric to the batch
    Object.entries(metricsData).forEach(([key, data]) => {
      const docRef = doc(db, 'metrics', key);
      batchOp.set(docRef, {
        ...data,
        initialized: new Date().toISOString()
      });
      console.log(`Added ${key} to batch with reference: ${data.exampleUrl}`);
    });
    
    // Commit the batch
    await batchOp.commit();
    console.log("All metrics initialized successfully with YouTube references");
    return {
      success: true,
      message: "All metrics initialized successfully with YouTube references",
      metrics: Object.keys(metricsData).length
    };
  } catch (error) {
    console.error("Error initializing metrics:", error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};

// Process a single reference video for a metric
export const processReferenceVideo = async (metricKey) => {
  try {
    if (!metricsData[metricKey]) {
      throw new Error(`Metric key "${metricKey}" not found in metrics data`);
    }
    
    const metricInfo = metricsData[metricKey];
    console.log(`Processing reference video for ${metricKey}: ${metricInfo.exampleUrl}`);
    
    // Import the analysis service
    const { analyzeReferenceVideo } = await import('../services/referenceAnalysisService');
    
    // Analyze the video
    const analysis = await analyzeReferenceVideo(metricKey, metricInfo.exampleUrl);
    
    console.log(`Reference video for ${metricKey} processed successfully`);
    return {
      success: true,
      metricKey,
      analysis
    };
  } catch (error) {
    console.error(`Error processing reference video for ${metricKey}:`, error);
    return {
      success: false,
      metricKey,
      message: error.message,
      error
    };
  }
};

// Process all reference videos
export const processAllReferenceVideos = async () => {
  const results = {
    processed: [],
    failed: [],
    total: Object.keys(metricsData).length
  };
  
  console.log(`Starting to process ${results.total} reference videos...`);
  
  for (const metricKey of Object.keys(metricsData)) {
    try {
      console.log(`Processing ${metricKey}...`);
      const result = await processReferenceVideo(metricKey);
      
      if (result.success) {
        results.processed.push(metricKey);
      } else {
        results.failed.push({ metricKey, error: result.message });
      }
    } catch (error) {
      console.error(`Error processing ${metricKey}:`, error);
      results.failed.push({ metricKey, error: error.message });
    }
  }
  
  console.log(`Completed processing. Successful: ${results.processed.length}, Failed: ${results.failed.length}`);
  return results;
};