// 1. First, let's create a utility function to handle YouTube URLs

// In a new file: src/utils/youtubeUtils.js
/**
 * Extracts the YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - YouTube video ID or null if invalid
 */
export const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // Try various YouTube URL formats
    const regexPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^#\&\?]*).*/,
      /youtube\.com\/shorts\/([^#\&\?]*)/,
      /youtube\.com\/live\/([^#\&\?]*)/
    ];
    
    for (const pattern of regexPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };
  
  /**
   * Validates if a string is a valid YouTube URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid YouTube URL
   */
  export const isValidYouTubeUrl = (url) => {
    return !!extractYouTubeVideoId(url);
  };
  
  /**
   * Converts a YouTube video ID to an embed URL
   * @param {string} videoId - YouTube video ID
   * @returns {string} - YouTube embed URL
   */
  export const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };
  
  /**
   * Converts a YouTube video ID to a thumbnail URL
   * @param {string} videoId - YouTube video ID
   * @param {string} quality - Thumbnail quality (default, mqdefault, hqdefault, sddefault, maxresdefault)
   * @returns {string} - YouTube thumbnail URL
   */
  export const getYouTubeThumbnailUrl = (videoId, quality = 'hqdefault') => {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  };
  