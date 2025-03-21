// src/components/ShotDetailsCollector.js
import React, { useState, useEffect } from 'react';
import DateSelector from './DateSelector';
import ClubSelector from './ClubSelector';
import SwingOwnershipSelector from './SwingOwnershipSelector';

/**
 * Component to collect shot details before analysis
 * @param {Object} props
 * @param {File} props.videoFile - The video file
 * @param {Object} props.youtubeVideo - YouTube video data if applicable
 * @param {Function} props.onComplete - Function to call with completed details
 * @param {Function} props.onBack - Function to go back to previous step
 * @param {Boolean} props.isProcessing - Whether analysis is in progress
 * @returns {JSX.Element} Component for collecting shot details
 */
const ShotDetailsCollector = ({ 
  videoFile, 
  youtubeVideo, 
  onComplete, 
  onBack, 
  isProcessing 
}) => {
  // Step sequence: ownership -> date -> club
  const [step, setStep] = useState('ownership');
  const [ownership, setOwnership] = useState(null);
  const [recordedDate, setRecordedDate] = useState(new Date());
  const [clubData, setClubData] = useState(null);
  const [dateExtracted, setDateExtracted] = useState(false);

  // Extract date from file if possible
  useEffect(() => {
    const extractDateFromFile = async () => {
      if (videoFile) {
        try {
          // Import at runtime to avoid dependency issues
          const { extractVideoCreationDate } = await import('../utils/videoMetadata');
          const date = await extractVideoCreationDate(videoFile);
          setRecordedDate(date);
          setDateExtracted(true);
        } catch (error) {
          console.error('Error extracting date from file:', error);
          // Keep current date as fallback
        }
      }
    };

    if (videoFile && !dateExtracted) {
      extractDateFromFile();
    }
  }, [videoFile, dateExtracted]);

  // Handle completion of all steps
  const handleComplete = () => {
    if (onComplete) {
      // Combine all the collected data
      const completeData = {
        recordedDate,
        ...ownership,
        ...clubData,
      };

      // Add YouTube data if using YouTube
      if (youtubeVideo) {
        completeData.youtubeVideo = youtubeVideo;
      }

      onComplete(completeData);
    }
  };

  // Render ownership step
  const renderOwnershipStep = () => (
    <SwingOwnershipSelector 
      onContinue={(ownershipData) => {
        setOwnership(ownershipData);
        setStep('date');
      }}
      onBack={onBack}
    />
  );

  // Render date selection step
  const renderDateStep = () => (
    <div className="card">
      <h2>When was this swing recorded?</h2>
      <DateSelector 
        initialDate={recordedDate}
        onDateChange={setRecordedDate}
        extractFromFile={!!videoFile}
      />
      
      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={() => setStep('ownership')}
          className="button"
          style={{ padding: '10px 20px', backgroundColor: '#95a5a6' }}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          onClick={() => setStep('club')}
          className="button"
          style={{ padding: '10px 20px' }}
          disabled={isProcessing}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Render club selection step
  const renderClubStep = () => (
    <ClubSelector 
      onContinue={(clubDetails) => {
        setClubData(clubDetails);
        handleComplete();
      }}
      onSkip={(setupClubs) => {
        // If user wants to set up clubs, return that intent
        if (setupClubs === 'setup-clubs') {
          onComplete({ 
            recordedDate,
            ...ownership,
            setupClubs: true 
          });
        } else {
          // Otherwise just complete without club data
          handleComplete();
        }
      }}
    />
  );

  // Skip club selection step for non-user swings
  useEffect(() => {
    if (ownership && (ownership.swingOwnership === 'pro' || ownership.swingOwnership === 'other')) {
      // For non-user swings, we skip club data
      setClubData({});
    }
  }, [ownership]);

  // Render the current step
  switch (step) {
    case 'ownership':
      return renderOwnershipStep();
    case 'date':
      return renderDateStep();
    case 'club':
      // Skip club selector for non-user swings
      if (ownership && (ownership.swingOwnership === 'pro' || ownership.swingOwnership === 'other')) {
        // Auto-proceed with completion
        handleComplete();
        return (
          <div className="card">
            <h2>Processing...</h2>
            <div className="spinner"></div>
          </div>
        );
      }
      return renderClubStep();
    default:
      return renderOwnershipStep();
  }
};

export default ShotDetailsCollector;