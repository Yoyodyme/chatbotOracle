import { CARD, TEXT_MUTED, TEXT_PRIMARY, BG_SOFT } from '../../theme';

export default function MetricCard({ label, value, sub, accent, badgeBg, badgeColor }) {
  return (
    <div style={CARD}>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: accent ?? TEXT_PRIMARY,
        lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: 10, fontWeight: 500,
          padding: '2px 8px', borderRadius: 20,
          background: badgeBg ?? BG_SOFT,
          color: badgeColor ?? TEXT_MUTED,
        }}>
          {sub}
        </span>
      </div>
    </div>
  );
}