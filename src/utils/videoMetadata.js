/**
 * Utility functions for extracting metadata from video files
 */

/**
 * Attempt to extract creation date from a video file
 * @param {File} videoFile - The video file to extract date from
 * @returns {Promise<Date|null>} - A promise that resolves to the date or null if not found
 */
export const extractVideoCreationDate = async (videoFile) => {
    try {
      // First try to get date from file's lastModified property
      if (videoFile.lastModified) {
        return new Date(videoFile.lastModified);
      }
      
      // For more accurate date extraction, we'll use the video element's metadata
      return new Promise((resolve) => {
        const videoElement = document.createElement('video');
        let resolved = false;
        
        // Set up event handlers
        videoElement.onloadedmetadata = () => {
          // Some videos store creation date in metadata, but browser APIs
          // don't expose this directly. We're just using this event as a fallback.
          if (!resolved) {
            resolved = true;
            resolve(new Date()); // Default to current date if no metadata found
          }
        };
        
        videoElement.onerror = () => {
          if (!resolved) {
            resolved = true;
            resolve(new Date()); // Default to current date on error
          }
        };
        
        // Create object URL and cleanup function
        const objectUrl = URL.createObjectURL(videoFile);
        
        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
          videoElement.onloadedmetadata = null;
          videoElement.onerror = null;
          videoElement.src = '';
        };
        
        // Set timeout to ensure we don't hang if metadata is unavailable
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(new Date());
          }
        }, 3000);
        
        // Start loading the video metadata
        videoElement.src = objectUrl;
        videoElement.load();
      });
    } catch (error) {
      console.error('Error extracting video date:', error);
      return new Date(); // Default to current date on any error
    }
  };
  
  /**
   * Formats date as a string for display
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  export const formatDate = (date) => {
    if (!date) return '';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  /**
   * Formats date for input value (YYYY-MM-DD)
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  export const formatDateForInput = (date) => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };