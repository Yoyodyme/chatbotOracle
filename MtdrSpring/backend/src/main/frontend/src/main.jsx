import React, { StrictMode, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from 'react-oidc-context';

import './styles/globals.css';
import './styles/animations.css';
import App from './App.jsx';
import { ociAuthConfig } from './ociAuth.js';
import { setAuthToken } from './api/client.js';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('React Error Boundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ color: '#ff6b6b', padding: '32px', fontFamily: 'monospace', background: '#0d0f14', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff4444', marginBottom: '16px' }}>Render Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px' }}>
            {String(this.state.error)}
            {this.state.error?.stack && '\n\nStack:\n' + this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// Syncs the OIDC access token into the API client whenever the session changes.
// Must be rendered inside <AuthProvider>.
function OidcTokenSync() {
  const { user } = useAuth();
  useEffect(() => {
    setAuthToken(user?.access_token ?? null);
  }, [user?.access_token]);
  return null;
}

const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider {...ociAuthConfig}>
        <OidcTokenSync />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
