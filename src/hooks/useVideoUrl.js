// src/hooks/useVideoUrl.js
import { useState, useEffect } from 'react';

/**
 * Custom hook to manage video URLs including temporary URLs for non-user swings
 * @param {Object} swingData - The swing data containing URL information
 * @returns {Object} Video URL information and handling functions
 */
const useVideoUrl = (swingData) => {
  // State for video URL status
  const [videoUrl, setVideoUrl] = useState(null);
  const [isTemporary, setIsTemporary] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  
  // Set up video URL when swing data changes
  useEffect(() => {
    if (!swingData) {
      setVideoUrl(null);
      setIsTemporary(false);
      setIsYouTube(false);
      return;
    }
    
    // Check for YouTube videos
    if (swingData.isYouTubeVideo) {
      setVideoUrl(swingData.videoUrl);
      setIsYouTube(true);
      setIsTemporary(false);
      return;
    }
    
    // Handle temporary URLs for non-user swings
    if (swingData._temporaryVideoUrl) {
      console.log('Using temporary video URL for analysis');
      setVideoUrl(swingData._temporaryVideoUrl);
      setIsTemporary(true);
      setIsYouTube(false);
      return;
    }
    
    // Handle normal video URLs
    if (swingData.videoUrl && swingData.videoUrl !== 'non-user-swing') {
      setVideoUrl(swingData.videoUrl);
      setIsTemporary(false);
      setIsYouTube(false);
      return;
    }
    
    // No valid video URL
    setVideoUrl(null);
    setIsTemporary(false);
    setIsYouTube(false);
  }, [swingData]);
  
  // Clean up temporary URLs on unmount
  useEffect(() => {
    return () => {
      if (isTemporary && videoUrl) {
        console.log('Cleaning up temporary video URL');
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [isTemporary, videoUrl]);
  
  // Create temporary URL from a file
  const createTemporaryUrl = (file) => {
    if (!file) return null;
    
    // Revoke previous URL if it exists
    if (isTemporary && videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    // Create new URL
    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);
    setIsTemporary(true);
    setIsYouTube(false);
    
    return newUrl;
  };
  
  // Clean up current URL if it's temporary
  const cleanupUrl = () => {
    if (isTemporary && videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      setIsTemporary(false);
    }
  };
  
  return {
    videoUrl,
    isTemporary,
    isYouTube,
    hasVideo: !!videoUrl,
    createTemporaryUrl,
    cleanupUrl
  };
};

export default useVideoUrl;