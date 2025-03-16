// src/components/AdminAccessCheck.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const AdminAccessCheck = ({ children }) => {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!currentUser) {
          setIsAdmin(false);
          return;
        }
        
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
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="card">
        <h2>Checking permissions...</h2>
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Unauthorized</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return children;
};

export default AdminAccessCheck;