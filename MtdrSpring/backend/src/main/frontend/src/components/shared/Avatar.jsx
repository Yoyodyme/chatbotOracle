import React from 'react';

// Paleta de colores OCI-compatible (tonos más suaves para fondo blanco)
const AVATAR_COLORS = [
  '#066FCC', // accent blue
  '#2d7d46', // success green
  '#b95000', // warning amber
  '#0043ce', // deep blue
  '#7c3aed', // purple
  '#be185d', // pink
];

function hashName(name) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return hash;
}

function getInitials(user) {
  const nombre = user?.nombreCompleto || user?.nombreUsuario || '?';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  return nombre.slice(0, 2).toUpperCase();
}

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 40,
};

export default function Avatar({ user, size = 'md' }) {
  const px = SIZE_MAP[size] ?? SIZE_MAP.md;
  const initials = getInitials(user);
  const nombre = user?.nombreCompleto || user?.nombreUsuario || '';
  const bgColor = AVATAR_COLORS[hashName(nombre)];
  const fontSize = px * 0.375;

  const estiloContenedor = {
    width: px,
    height: px,
    borderRadius: '50%',
    backgroundColor: bgColor + '1a', // ~10% opacity tint
    border: `1.5px solid ${bgColor}40`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    userSelect: 'none',
  };

  const estiloTexto = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: fontSize,
    color: bgColor,
    lineHeight: 1,
    letterSpacing: '0.02em',
  };

  return (
    <span style={estiloContenedor} title={nombre}>
      <span style={estiloTexto}>{initials}</span>
    </span>
  );
}
