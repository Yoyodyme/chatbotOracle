import React from 'react';

const ALTO_TOPBAR = 48;

export default function TopBar({ titulo }) {
  const estiloTopBar = {
    position: 'fixed',
    top: 0,
    right: 0,
    left: 0,
    height: ALTO_TOPBAR,
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    zIndex: 50,
  };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <header style={estiloTopBar}>
      {titulo && <h1 style={estiloTitulo}>{titulo}</h1>}
    </header>
  );
}
