import React, { useState, useEffect } from 'react';

const DateSelector = ({ initialDate, onDateChange, extractFromFile = true }) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [isUsingFileDate, setIsUsingFileDate] = useState(extractFromFile);
  const [fileDate, setFileDate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Format date for display
  const formatDateForDisplay = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date for input value
  const formatDateForInput = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
    onDateChange(newDate);
    setIsUsingFileDate(false);
  };

  // Update parent when date changes
  useEffect(() => {
    // If using file date and we have one, use it
    if (isUsingFileDate && fileDate) {
      onDateChange(fileDate);
    } else {
      // Otherwise use the manually selected date
      onDateChange(selectedDate);
    }
  }, [isUsingFileDate, fileDate, selectedDate, onDateChange]);

  // Set file date if provided and we're using file date
  useEffect(() => {
    if (initialDate && extractFromFile) {
      setFileDate(initialDate);
      setSelectedDate(initialDate);
    }
  }, [initialDate, extractFromFile]);

  return (
    <div className="date-selector" style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontWeight: 'bold', marginBottom: '5px' }}>Swing Date:</label>
        
        {!isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              padding: '6px 12px', 
              borderRadius: '4px', 
              backgroundColor: '#f8f9fa',
              marginRight: '10px' 
            }}>
              {isUsingFileDate && fileDate 
                ? `${formatDateForDisplay(fileDate)} (from file)` 
                : formatDateForDisplay(selectedDate)}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3498db',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '5px'
              }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={handleDateChange}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginRight: '10px'
              }}
            />
            <button
              onClick={() => setIsEditing(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#3498db',
                cursor: 'pointer',
                fontSize: '0.9rem',
                padding: '5px'
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
      
      {fileDate && (
        <div style={{ marginTop: '5px', fontSize: '0.9rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isUsingFileDate}
              onChange={() => setIsUsingFileDate(!isUsingFileDate)}
              style={{ marginRight: '5px' }}
            />
            Use date from file metadata ({formatDateForDisplay(fileDate)})
          </label>
        </div>
      )}
    </div>
  );
};

export default DateSelector;