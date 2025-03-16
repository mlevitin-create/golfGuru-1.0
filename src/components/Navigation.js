// In src/components/Navigation.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const Navigation = ({ currentPage, navigateTo, showProfile = false }) => {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().isAdmin === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  // Handle navigation click with direct function call - no local function to ensure it always uses the latest navigateTo
  return (
    <nav className="navigation">
      <div 
        className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
        onClick={() => navigateTo('dashboard')}
        style={{ 
          padding: '10px 20px', 
          cursor: 'pointer',
          borderBottom: currentPage === 'dashboard' ? '2px solid #3498db' : 'none'
        }}
      >
        Dashboard
      </div>
      <div 
        className={`nav-item ${currentPage === 'upload' ? 'active' : ''}`}
        onClick={() => navigateTo('upload')}
        style={{ 
          padding: '10px 20px', 
          cursor: 'pointer',
          borderBottom: currentPage === 'upload' ? '2px solid #3498db' : 'none'
        }}
      >
        Upload
      </div>
      <div 
        className={`nav-item ${currentPage === 'tracker' ? 'active' : ''}`}
        onClick={() => navigateTo('tracker')}
        style={{ 
          padding: '10px 20px', 
          cursor: 'pointer',
          borderBottom: currentPage === 'tracker' ? '2px solid #3498db' : 'none'
        }}
      >
        Tracker
      </div>
      <div 
        className={`nav-item ${currentPage === 'comparison' ? 'active' : ''}`}
        onClick={() => navigateTo('comparison')}
        style={{ 
          padding: '10px 20px', 
          cursor: 'pointer',
          borderBottom: currentPage === 'comparison' ? '2px solid #3498db' : 'none'
        }}
      >
        Pro Comparison
      </div>
      {showProfile && (
        <div 
          className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => navigateTo('profile')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: currentPage === 'profile' ? '2px solid #3498db' : 'none'
          }}
        >
          Profile
        </div>
      )}
      
      {/* Admin link - only show if isAdmin state is true */}
      {isAdmin && (
        <div 
          className={`nav-item ${currentPage === 'admin' ? 'active' : ''}`}
          onClick={() => navigateTo('admin')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer',
            borderBottom: currentPage === 'admin' ? '2px solid #3498db' : 'none'
          }}
        >
          Admin
        </div>
      )}
    </nav>
  );
};

export default Navigation;