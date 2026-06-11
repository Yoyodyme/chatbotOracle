import React from 'react';
import { DEVELOPERS } from '../../utils/developers';

export default function DevFilterBar({ active, onChange }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderBottom: '0.5px solid #E5E7EB',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {DEVELOPERS.map((dev) => {
        const isOn = active === dev.initials;

        return (
          <button
            key={`${dev.label}-${dev.initials}`}
            onClick={() => onChange(isOn ? null : dev.initials)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              fontSize: 12,
              color: isOn ? '#DC2626' : '#6B7280',
              fontWeight: isOn ? 600 : 400,
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isOn ? '#DC2626' : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: dev.bg,
                color: dev.color,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 600,
              }}
            >
              {dev.initials}
            </span>
            {dev.label}
          </button>
        );
      })}
    </div>
  );
}