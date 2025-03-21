// src/utils/VideoUrlManager.js

/**
 * Utility class for managing video URLs including temporary URLs
 */
class VideoUrlManager {
    constructor() {
      // Track created temporary URLs for cleanup
      this.temporaryUrls = new Map();
    }
  
    /**
     * Create a temporary URL for a video file
     * @param {File} file - The video file
     * @param {string} id - Optional identifier for the URL
     * @returns {string} The created URL
     */
    createTemporaryUrl(file, id = null) {
      if (!file) return null;
      
      const url = URL.createObjectURL(file);
      const urlId = id || `temp_${Date.now()}`;
      
      // Store URL with identifier for later cleanup
      this.temporaryUrls.set(urlId, url);
      
      console.log(`Using temporary video URL for display: ${url}`);
      return url;
    }
  
    /**
     * Get a temporary URL by its identifier
     * @param {string} id - The URL identifier
     * @returns {string|null} The URL or null if not found
     */
    getTemporaryUrl(id) {
      return this.temporaryUrls.get(id) || null;
    }
  
    /**
     * Revoke a specific temporary URL
     * @param {string} id - The URL identifier
     */
    revokeTemporaryUrl(id) {
      const url = this.temporaryUrls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        this.temporaryUrls.delete(id);
        console.log('Temporary video URL revoked');
      }
    }
  
    /**
     * Revoke all temporary URLs
     */
    revokeAllTemporaryUrls() {
      this.temporaryUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      this.temporaryUrls.clear();
      console.log('All temporary video URLs revoked');
    }
  
    /**
     * Check if a URL is temporary
     * @param {string} url - The URL to check
     * @returns {boolean} Whether the URL is temporary
     */
    isTemporaryUrl(url) {
      return Array.from(this.temporaryUrls.values()).includes(url);
    }
  
    /**
     * Get the best video URL from swing data
     * @param {Object} swingData - The swing data object
     * @returns {string|null} The best video URL to use
     */
    getVideoUrlFromSwingData(swingData) {
      if (!swingData) return null;
  
      // Handle YouTube videos
      if (swingData.isYouTubeVideo && swingData.videoUrl) {
        return swingData.videoUrl;
      }
  
      // Priority order: temporary URL > stored URL
      if (swingData._temporaryVideoUrl) {
        return swingData._temporaryVideoUrl;
      }
  
      // Skip non-user swing placeholders
      if (swingData.videoUrl && swingData.videoUrl !== 'non-user-swing') {
        return swingData.videoUrl;
      }
  
      return null;
    }
  
    /**
     * Create a fetch-compatible URL for a video
     * This is needed because blob URLs might need special handling
     * @param {string} url - The video URL
     * @returns {string} A fetch-compatible URL
     */
    getFetchableUrl(url) {
      // YouTube URLs don't need special handling
      if (url && url.includes('youtube.com')) {
        return url;
      }
      
      // For blob URLs created with URL.createObjectURL, 
      // we return as is - they work for local fetching
      return url;
    }
  
    /**
     * Safely fetch a video blob using the URL
     * @param {string} url - The video URL 
     * @returns {Promise<Blob>} A promise resolving to the video blob
     */
    async fetchVideoBlob(url) {
      if (!url) {
        throw new Error('No video URL provided');
      }
  
      // Skip fetching for YouTube videos
      if (url.includes('youtube.com')) {
        throw new Error('Cannot fetch YouTube videos as blobs');
      }
  
      try {
        const fetchableUrl = this.getFetchableUrl(url);
        console.log(`Fetching video from: ${fetchableUrl}`);
        
        const response = await fetch(fetchableUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
        }
        
        return await response.blob();
      } catch (error) {
        console.error('Error fetching video blob:', error);
        throw error;
      }
    }
  }
  
  // Export singleton instance for app-wide use
  const videoUrlManager = new VideoUrlManager();
  export default videoUrlManager;