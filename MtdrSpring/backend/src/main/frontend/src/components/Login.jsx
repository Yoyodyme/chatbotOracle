import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';

export default function Login() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password,      setPassword]      = useState('');
  const [error,         setError]         = useState('');
  const [cargando,      setCargando]      = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const resp = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { nombreUsuario, password },
      });
      localStorage.setItem('usuario', JSON.stringify(resp));
      navigate('/');
    } catch {
      setError('Incorrect username or password');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f0f4f8',
    }}>
      <div style={{
        width: 400,
        padding: '36px 40px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            fontSize: 26, fontWeight: 700, color: '#066FCC',
            letterSpacing: '-0.02em',
          }}>
            EQ51
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Task Manager
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 6,
            }}>
              Username
            </label>
            <input
              type="text"
              value={nombreUsuario}
              onChange={e => setNombreUsuario(e.target.value)}
              required
              autoFocus
              placeholder="ej. ale_torres"
              style={{
                width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 14, color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-base)', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-secondary)', marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 14, color: 'var(--text-primary)',
                backgroundColor: 'var(--bg-base)', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--danger)', textAlign: 'center',
              padding: '6px 10px', borderRadius: 6,
              backgroundColor: 'var(--danger-bg, #fef2f2)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%', padding: '10px', marginTop: 4,
              backgroundColor: '#066FCC', color: '#ffffff',
              border: 'none', borderRadius: 8,
              cursor: cargando ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
              opacity: cargando ? 0.7 : 1,
              transition: 'opacity 150ms',
            }}
          >
            {cargando ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
