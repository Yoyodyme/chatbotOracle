import { CARD, TEXT_MUTED, TEXT_PRIMARY } from '../../theme';

export default function ChartCard({ title, subtitle, headerRight, hasData, emptyMsg = 'No data', children }) {
  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          {subtitle && <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 2 }}>{subtitle}</div>}
          <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{title}</div>
        </div>
        {headerRight}
      </div>
      {hasData
        ? children
        : <div style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 13, padding: '60px 0' }}>{emptyMsg}</div>
      }
    </div>
  );
}
