import React from 'react';

const Navigation = ({ currentPage, navigateTo }) => {
  return (
    <nav className="navigation">
      <div 
        className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => navigateTo('dashboard')}
      >
        Dashboard
      </div>
      <div 
        className={`nav-item ${currentPage === 'upload' ? 'active' : ''}`}
        onClick={() => navigateTo('upload')}
      >
        Upload
      </div>
      <div 
        className={`nav-item ${currentPage === 'tracker' ? 'active' : ''}`}
        onClick={() => navigateTo('tracker')}
      >
        Tracker
      </div>
      <div 
        className={`nav-item ${currentPage === 'comparison' ? 'active' : ''}`}
        onClick={() => navigateTo('comparison')}
      >
        Pro Comparison
      </div>
    </nav>
  );
};

export default Navigation;