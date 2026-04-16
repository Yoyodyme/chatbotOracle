import React from 'react';
import Skeleton from '../shared/Skeleton';

export default function CardSkeleton() {
  const estiloCard = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloFila = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div style={estiloCard} aria-hidden="true">
      {/* Top row: ID + badge */}
      <div style={estiloFila}>
        <Skeleton width="72px" height="12px" borderRadius="4px" />
        <Skeleton width="56px" height="20px" borderRadius="6px" />
      </div>
      {/* Title lines */}
      <Skeleton width="100%" height="14px" borderRadius="4px" />
      <Skeleton width="75%" height="14px" borderRadius="4px" />
      {/* Bottom row: status + avatar */}
      <div style={estiloFila}>
        <Skeleton width="80px" height="16px" borderRadius="4px" />
        <Skeleton width="24px" height="24px" borderRadius="50%" />
      </div>
    </div>
  );
}
