// src/components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login = ({ onClose, allowSkip = false }) => {
  const { signInWithGoogle, login, signup, resetPassword } = useAuth();
  
  // View states: 'login', 'signup', 'reset'
  const [view, setView] = useState('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Update the handleGoogleSignIn function
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      // The flag for profile setup is handled in AuthContext.js now
      onClose();
    } catch (error) {
      setError(formatError(error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Update the handleLogin function
    const handleLogin = async (e) => {
      e.preventDefault();
      
      if (!validateEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }
      
      setError('');
      setLoading(true);
      
      try {
        await login(email, password);
        // The flag for profile setup is handled in AuthContext.js now
        onClose();
      } catch (error) {
        setError(formatError(error.message));
      } finally {
        setLoading(false);
      }
    };
  
  // Update the handleSignup function
  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await signup(email, password, displayName.trim() || null);
      setMessage('Account created successfully! You are now logged in.');
      
      // The needsProfileSetup flag is now handled in AuthContext.js
      // No need to separately save default clubs here as that's now
      // part of the profile setup flow
      
      onClose();
    } catch (error) {
      setError(formatError(error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error) {
      setError(formatError(error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  // Helper to format error messages from Firebase
  const formatError = (errorMsg) => {
    if (errorMsg.includes('auth/user-not-found') || errorMsg.includes('auth/wrong-password')) {
      return 'Invalid email or password';
    } else if (errorMsg.includes('auth/email-already-in-use')) {
      return 'Email already in use. Try logging in or resetting your password.';
    } else if (errorMsg.includes('auth/weak-password')) {
      return 'Password is too weak. Please use a stronger password.';
    } else if (errorMsg.includes('auth/network-request-failed')) {
      return 'Network error. Please check your connection and try again.';
    } else {
      return errorMsg.replace('Firebase: ', '').replace(/ \(auth\/.*\)./, '.');
    }
  };
  
  // Render login view
  const renderLogin = () => (
    <form onSubmit={handleLogin}>
      <h2>Sign In</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="button"
        style={{ 
          width: '100%', 
          padding: '12px', 
          marginBottom: '10px',
          backgroundColor: '#3498db',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
      
      <div style={{ marginBottom: '15px', textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={() => setView('reset')}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '0.9rem'
          }}
        >
          Forgot Password?
        </button>
      </div>
      
      <div className="separator" style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        <span style={{ margin: '0 10px', color: '#777', fontSize: '0.9rem' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
      </div>
      
      <button 
        type="button" 
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '12px', 
          marginBottom: '20px',
          border: '1px solid #ddd',
          borderRadius: '5px',
          backgroundColor: 'white',
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: '10px' }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', color: '#333' }}>
          Don't have an account?{' '}
          <button 
            type="button" 
            onClick={() => setView('signup')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.9rem',
              padding: 0
            }}
          >
            Sign Up
          </button>
        </p>
      </div>
      
      {allowSkip && (
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#777',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Skip for now
          </button>
        </div>
      )}
    </form>
  );
  
  // Render signup view
  const renderSignup = () => (
    <form onSubmit={handleSignup}>
      <h2>Create Account</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="displayName" style={{ display: 'block', marginBottom: '5px' }}>Name (optional)</label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          placeholder="Your name"
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
          placeholder="At least 6 characters"
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="button"
        style={{ 
          width: '100%', 
          padding: '12px', 
          marginBottom: '20px',
          backgroundColor: '#3498db',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
      
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', color: '#333' }}>
          Already have an account?{' '}
          <button 
            type="button" 
            onClick={() => setView('login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.9rem',
              padding: 0
            }}
          >
            Sign In
          </button>
        </p>
      </div>
    </form>
  );
  
  // Render password reset view
  const renderReset = () => (
    <form onSubmit={handleResetPassword}>
      <h2>Reset Password</h2>
      <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#555' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
      </div>
      
      <button 
        type="submit" 
        disabled={loading}
        className="button"
        style={{ 
          width: '100%', 
          padding: '12px', 
          marginBottom: '20px',
          backgroundColor: '#3498db',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Sending...' : 'Reset Password'}
      </button>
      
      <div style={{ textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={() => setView('login')}
          style={{
            background: 'none',
            border: 'none',
            color: '#3498db',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: '0.9rem'
          }}
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );
  
  return (
    <div>
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px',
          fontSize: '0.95rem'
        }}>
          {error}
        </div>
      )}
      
      {message && (
        <div style={{ 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px',
          fontSize: '0.95rem'
        }}>
          {message}
        </div>
      )}
      
      {view === 'login' && renderLogin()}
      {view === 'signup' && renderSignup()}
      {view === 'reset' && renderReset()}
    </div>
  );
};

export default Login;