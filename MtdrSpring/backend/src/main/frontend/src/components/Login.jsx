import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { setLocalToken, useIsAuthenticated } from '../utils/auth';
import { apiFetch } from '../api/client';
import './Login.css';

function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ off = false }) {
  return off ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

IconEye.propTypes = { off: PropTypes.bool };

function IconOCI() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function Login() {
  const auth     = useAuth();
  const navigate = useNavigate();
  const { isAuthenticated } = useIsAuthenticated();

  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { nombreUsuario: username, password },
      });
      setLocalToken(data.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (auth.isLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-card__header">
            <span className="login-btn__spinner" style={{ margin: '0 auto', display: 'block' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1 className="login-card__title">Welcome back</h1>
          <p className="login-card__subtitle">Sign in to your account to continue</p>
        </div>

        {/* ── Local login form ─────────────────────────────── */}
        <form className="login-form" onSubmit={handleLocalLogin}>
          <div className={`login-field${error ? ' login-field--error' : ''}`}>
            <label className="login-field__label" htmlFor="username">Username</label>
            <div className="login-field__input-wrap">
              <span className="login-field__icon"><IconUser /></span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="your.username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={`login-field${error ? ' login-field--error' : ''}`}>
            <label className="login-field__label" htmlFor="password">Password</label>
            <div className={`login-field__input-wrap login-field__input-wrap--has-toggle`}>
              <span className="login-field__icon"><IconLock /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-field__toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                <IconEye off={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div className="login-alert" role="alert">{error}</div>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? <span className="login-btn__spinner" style={{ margin: '0 auto', display: 'block' }} />
              : 'Sign in'}
          </button>
        </form>

        {/* ── Divider ──────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          margin: '1.375rem 0', color: '#475569', fontSize: '0.8125rem',
        }}>
          <span style={{ flex: 1, height: 1, background: '#334155' }} />
          <span>{'or'}</span>
          <span style={{ flex: 1, height: 1, background: '#334155' }} />
        </div>

        {/* ── OCI sign-in ──────────────────────────────────── */}
        {auth.error && (
          <div className="login-alert" role="alert" style={{ marginBottom: '0.75rem' }}>
            {auth.error.message}
          </div>
        )}
        <button
          className="login-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          onClick={() => auth.signinRedirect()}
        >
          <IconOCI />
          Sign in with Oracle
        </button>
      </div>
    </div>
  );
}
