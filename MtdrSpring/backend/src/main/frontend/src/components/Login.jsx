import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  }
  return errors;
}

function IconMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function Login() {
  const [fields, setFields]             = useState({ email: '', password: '' });
  const [touched, setTouched]           = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const navigate = useNavigate();

  const errors    = validate(fields);
  const isInvalid = Object.keys(errors).length > 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError('');
  }

  function handleBlur(e) {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setSubmitError('');

    // ── Integration point for Eugenio ───────────────────────────────────
    // Replace this block with the real OCI IDCS / IAM call.
    // On success, store the session and navigate('/').
    // On failure, call setSubmitError('Incorrect email or password').
    // ────────────────────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 600)); // simulated loading
    navigate('/');
  }

  function fieldClass(name) {
    const hasError = touched[name] && errors[name];
    const isValid  = touched[name] && !errors[name] && fields[name];
    return ['login-field', hasError && 'login-field--error', isValid && 'login-field--valid']
      .filter(Boolean).join(' ');
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-card__header">
          <h1 className="login-card__title">Welcome back</h1>
          <p className="login-card__subtitle">Sign in to your account to continue</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className={fieldClass('email')}>
            <label className="login-field__label" htmlFor="login-email">
              Email address
            </label>
            <div className="login-field__input-wrap">
              <span className="login-field__icon"><IconMail /></span>
              <input
                id="login-email"
                name="email"
                type="email"
                value={fields.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                aria-invalid={touched.email && !!errors.email}
              />
            </div>
            {touched.email && errors.email && (
              <span id="email-error" className="login-field__error" role="alert">
                <IconWarning />{errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className={fieldClass('password')}>
            <div className="login-field__label-row">
              <label className="login-field__label" htmlFor="login-password">
                Password
              </label>
              <Link to="/forgot-password" className="login-field__forgot">
                Forgot password?
              </Link>
            </div>
            <div className="login-field__input-wrap login-field__input-wrap--has-toggle">
              <span className="login-field__icon"><IconLock /></span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={fields.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                aria-invalid={touched.password && !!errors.password}
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            {touched.password && errors.password && (
              <span id="password-error" className="login-field__error" role="alert">
                <IconWarning />{errors.password}
              </span>
            )}
          </div>

          {submitError && (
            <div className="login-alert" role="alert">
              <IconWarning />{submitError}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading
              ? <><span className="login-btn__spinner" aria-hidden="true" />Signing in…</>
              : 'Sign in'
            }
          </button>
        </form>

        <p className="login-card__register">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>

      </div>
    </div>
  );
}