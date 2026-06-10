import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { RED, BORDER, TEXT_PRIMARY, TEXT_MUTED } from '../../theme';

export default function GaugeSprint({ pct, completadas, restantes, nombreSprint }) {
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));
  const data = [{ value: safe }, { value: 100 - safe }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 160, width: '100%', maxWidth: 320 }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              startAngle={180} endAngle={0}
              cx="50%" cy="100%"
              innerRadius={78} outerRadius={110}
              dataKey="value" stroke="none"
            >
              <Cell fill={RED} />
              <Cell fill={BORDER} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: RED, lineHeight: 1 }}>{safe}%</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
            {nombreSprint
              ? <><strong style={{ color: TEXT_PRIMARY }}>{nombreSprint}</strong> — {completadas} <span style={{ color: TEXT_MUTED }}>completed</span></>
              : 'No active sprint'}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: TEXT_MUTED }}>{restantes} remaining</div>
    </div>
  );
}