// src/admin/AdminPage.js
import React, { useState, useEffect } from 'react';
import ReferenceVideoManager from '../components/ReferenceVideoManager';
import ModelImprovementTracker from '../components/ModelImprovementTracker';
import AdminAccessCheck from '../components/AdminAccessCheck';
import metricService from '../services/metricService';

const AdminPage = () => {
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Function to initialize metrics collection (one-time setup)
  const handleInitializeMetrics = async () => {
    try {
      setInitializing(true);
      setMessage({ type: 'info', text: 'Initializing metrics collection...' });
      
      await metricService.initializeMetricsCollection();
      
      setMessage({ type: 'success', text: 'Metrics collection initialized successfully!' });
    } catch (error) {
      console.error('Error initializing metrics:', error);
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <AdminAccessCheck>
      <div className="admin-page">
        <h1>Admin Dashboard</h1>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}
        
        <section className="mb-6">
          <h2>Database Management</h2>
          <button 
            onClick={handleInitializeMetrics}
            disabled={initializing}
            className="btn btn-primary"
          >
            {initializing ? 'Initializing...' : 'Initialize Metrics (First-time Setup)'}
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Note: Only use this button when setting up the app for the first time.
            It will create the base metrics collection.
          </p>
        </section>
        
        <section className="mb-6">
          <h2>Reference Video Management</h2>
          <ReferenceVideoManager />
        </section>
        
        <section className="mb-6">
          <h2>Model Performance Tracking</h2>
          <ModelImprovementTracker />
        </section>
      </div>
    </AdminAccessCheck>
  );
};

export default AdminPage;