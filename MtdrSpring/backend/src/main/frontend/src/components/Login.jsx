import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import './Login.css';

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) navigate('/');
  }, [auth.isAuthenticated, navigate]);

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

  if (auth.error) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-card__header">
            <h1 className="login-card__title">Authentication error</h1>
            <p className="login-card__subtitle">{auth.error.message}</p>
          </div>
          <button className="login-btn" onClick={() => auth.signinRedirect()}>
            Try again
          </button>
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
        <button className="login-btn" onClick={() => auth.signinRedirect()}>
          Sign in with OCI
        </button>
      </div>
    </div>
  );
}