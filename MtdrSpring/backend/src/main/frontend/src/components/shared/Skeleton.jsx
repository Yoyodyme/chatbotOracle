import React from 'react';
import '../../styles/animations.css';

export default function Skeleton({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
  className = '',
}) {
  const estiloBase = {
    display: 'block',
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, #e8ecf0 25%, #f0f3f7 50%, #e8ecf0 75%)',
    backgroundSize: '800px 100%',
    animation: 'shimmer 1.5s infinite linear',
    flexShrink: 0,
  };

  return (
    <span
      className={className}
      style={estiloBase}
      aria-hidden="true"
    />
  );
}
