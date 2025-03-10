/**
 * Gets consistent information about a swing metric
 * @param {string} metricKey - The metric identifier
 * @returns {Object} Information about the metric
 */
export const getMetricInfo = (metricKey) => {
    // Map between internal metric keys and display information
    const metricsMap = {
      // Mental metrics
      confidence: {
        title: "Confidence",
        description: "Your mental composure and commitment to the swing",
        category: "Mental",
        difficulty: 7,
        weight: "5.88%"
      },
      focus: {
        title: "Focus",
        description: "Your concentration and attention during setup and swing",
        category: "Mental",
        difficulty: 4,
        weight: "5.88%"
      },
      
      // Setup metrics
      stance: {
        title: "Stance",
        description: "Your foot position, width, alignment, and posture",
        category: "Setup",
        difficulty: 2,
        weight: "5.88%"
      },
      grip: {
        title: "Grip",
        description: "How you hold the club and hand positioning",
        category: "Setup",
        difficulty: 3,
        weight: "5.88%"
      },
      ballPosition: {
        title: "Ball Position",
        description: "The position of the ball relative to your stance and club type",
        category: "Setup",
        difficulty: 1,
        weight: "5.88%"
      },
      
      // Club metrics
      backswing: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8,
        weight: "5.88%"
      },
      swingBack: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8,
        weight: "5.88%"
      },
      clubTrajectoryBackswing: {
        title: "Backswing",
        description: "Your takeaway and club position during the backswing phase",
        category: "Club",
        difficulty: 8,
        weight: "5.88%"
      },
      swingForward: {
        title: "Downswing",
        description: "The path your club takes on the way down to impact",
        category: "Club",
        difficulty: 8,
        weight: "5.88%"
      },
      clubTrajectoryForswing: {
        title: "Downswing",
        description: "The path your club takes on the way down to impact",
        category: "Club",
        difficulty: 8,
        weight: "5.88%"
      },
      swingSpeed: {
        title: "Swing Speed",
        description: "The velocity and acceleration through your swing",
        category: "Club",
        difficulty: 7,
        weight: "5.88%"
      },
      shallowing: {
        title: "Shallowing",
        description: "How well your club drops into the proper path during downswing",
        category: "Club",
        difficulty: 9,
        weight: "5.88%"
      },
      impactPosition: {
        title: "Impact Position",
        description: "The position and angle of the club at the moment of impact",
        category: "Club",
        difficulty: 10,
        weight: "5.88%"
      },
      
      // Body metrics
      stiffness: {
        title: "Stiffness",
        description: "Your ability to remove tension from your body during your swing",
        category: "Body",
        difficulty: 5,
        weight: "5.88%"
      },
      hipRotation: {
        title: "Hip Rotation",
        description: "How your hips rotate throughout the swing",
        category: "Body",
        difficulty: 6,
        weight: "5.88%"
      },
      pacing: {
        title: "Tempo & Rhythm",
        description: "The timing and rhythm throughout your swing",
        category: "Body",
        difficulty: 6,
        weight: "5.88%"
      },
      followThrough: {
        title: "Follow Through",
        description: "Your swing completion after ball contact",
        category: "Body",
        difficulty: 4,
        weight: "5.88%"
      },
      headPosition: {
        title: "Head Position",
        description: "The stability and position of your head during the swing",
        category: "Body",
        difficulty: 4,
        weight: "5.88%"
      },
      shoulderPosition: {
        title: "Shoulder Position",
        description: "How your shoulders move and position throughout the swing",
        category: "Body",
        difficulty: 6,
        weight: "5.88%"
      },
      armPosition: {
        title: "Arm Position",
        description: "The positioning of your arms throughout the swing",
        category: "Body", 
        difficulty: 6,
        weight: "5.88%"
      }
    };
  
    // Default info for metrics not in the map
    const defaultInfo = {
      title: metricKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      description: "An important aspect of your golf swing",
      category: "General",
      difficulty: 5,
      weight: "5.88%"
    };
  
    return metricsMap[metricKey] || defaultInfo;
  };
  
  /**
   * Gets a color for a metric category
   * @param {string} category - The metric category 
   * @returns {string} Color hex code
   */
  export const getCategoryColor = (category) => {
    switch(category) {
      case 'Mental': return '#9b59b6'; // Purple
      case 'Body': return '#e67e22';   // Orange
      case 'Setup': return '#3498db';  // Blue
      case 'Club': return '#2ecc71';   // Green
      default: return '#95a5a6';       // Gray
    }
  };
  
  /**
   * Gets a color based on metric score
   * @param {number} score - The metric score (0-100)
   * @returns {string} Color hex code
   */
  export const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green for good
    if (score >= 60) return '#f39c12'; // Orange for average
    return '#e74c3c'; // Red for needs improvement
  };