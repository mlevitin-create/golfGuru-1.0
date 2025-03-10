// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

// Create the authentication context
const AuthContext = createContext();

// Collection name constants
const USERS_COLLECTION = 'users';

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component to wrap the app
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if this user already exists in our database
      try {
        const userRef = doc(db, USERS_COLLECTION, result.user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          // New Google user, create profile and flag for setup
          await setDoc(userRef, {
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            setupCompleted: false,
            createdAt: serverTimestamp()
          });
          localStorage.setItem('needsProfileSetup', 'true');
        } else {
          // Existing user - check if they've completed setup
          const userData = userDoc.data();
          if (userData.setupCompleted === false) {
            localStorage.setItem('needsProfileSetup', 'true');
          }
        }
      } catch (firestoreError) {
        console.error("Error handling Google sign-in user data:", firestoreError);
        // Continue even if this fails
      }
      
      return result;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, {
          displayName: displayName
        });
      }
      
      // Mark this as a new user for profile setup
      localStorage.setItem('needsProfileSetup', 'true');
      
      // Add a custom claim or user property in Firestore to track setup status
      try {
        const userRef = doc(db, USERS_COLLECTION, result.user.uid);
        await setDoc(userRef, {
          email: email,
          displayName: displayName || '',
          setupCompleted: false,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (firestoreError) {
        console.error("Error setting initial user data:", firestoreError);
        // Continue even if this fails
      }
      
      return result;
    } catch (error) {
      console.error("Error signing up with email/password", error);
      throw error;
    }
  };
  
  // Sign in with email and password
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if this user has completed profile setup
      try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, result.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.setupCompleted === false) {
            // User hasn't completed setup yet, flag for redirection
            localStorage.setItem('needsProfileSetup', 'true');
          }
        } else {
          // No user document exists yet, should create one and flag for setup
          localStorage.setItem('needsProfileSetup', 'true');
          
          // Create a user document to track setup status
          await setDoc(doc(db, USERS_COLLECTION, result.user.uid), {
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            setupCompleted: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (firestoreError) {
        console.error("Error checking user setup status:", firestoreError);
        // Continue even if this fails
      }
      
      return result;
    } catch (error) {
      console.error("Error logging in with email/password", error);
      throw error;
    }
  };
  
  // Reset password
  const resetPassword = async (email) => {
    try {
      return await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error resetting password", error);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      return await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Context value to provide
  const value = {
    currentUser,
    signInWithGoogle,
    signup,
    login,
    resetPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};