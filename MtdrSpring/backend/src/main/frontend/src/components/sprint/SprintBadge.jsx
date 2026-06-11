import { BG_SOFT, BORDER, RED_LIGHT, RED_BORDER, BLUE_LIGHT, BLUE_BORDER, TEXT_SECONDARY } from '../../theme';

const BADGE_CONFIG = {
  PASADO: { label: 'Past',   bg: BG_SOFT,   color: '#475569', border: BORDER      },
  ACTIVE: { label: 'Active', bg: RED_LIGHT,  color: '#991B1B', border: RED_BORDER  },
  FUTURO: { label: 'Future', bg: BLUE_LIGHT, color: '#1E40AF', border: BLUE_BORDER },
};

export default function SprintBadge({ estado }) {
  const cfg = BADGE_CONFIG[estado] ?? { label: estado, bg: BG_SOFT, color: TEXT_SECONDARY, border: BORDER };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      borderRadius: 999, padding: '2px 10px',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}
