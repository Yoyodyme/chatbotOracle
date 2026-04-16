import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import EmptyState from '../shared/EmptyState';

function generarDatosBurndown(tareas, sprint) {
  if (!sprint?.fechaInicio || !sprint?.fechaFin) return [];

  const inicio = new Date(sprint.fechaInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(sprint.fechaFin);
  fin.setHours(23, 59, 59, 999);

  const total = tareas.length;
  if (total === 0) return [];

  // Generar array de días en el sprint
  const dias = [];
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (dias.length === 0) return [];

  const hoy = new Date();

  // Para cada día, contar tareas completadas hasta esa fecha
  const datos = dias.map((dia, idx) => {
    const label = dia.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    const ideal = Math.round(total - (total / (dias.length - 1 || 1)) * idx);

    // Solo calcular real si la fecha ya pasó o es hoy
    let real = undefined;
    if (dia <= hoy) {
      const completadasHastaHoy = tareas.filter((t) => {
        if (!t.estatus) return false;
        const nombre = (t.estatus.nombre || '').toLowerCase();
        if (nombre !== 'completada') return false;
        // Si tiene fecha de actualización, usarla; de lo contrario, asumir completada
        const fechaComp = t.actualizadoEn || t.creadoEn;
        if (!fechaComp) return true;
        return new Date(fechaComp) <= dia;
      }).length;
      real = total - completadasHastaHoy;
    }

    return { label, ideal: Math.max(0, ideal), real };
  });

  return datos;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <p
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginBottom: '6px',
        }}
      >
        {label}
      </p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: '0.8125rem',
            color: entry.color,
            margin: '2px 0',
          }}
        >
          {entry.name}: <strong>{entry.value ?? '—'}</strong>
        </p>
      ))}
    </div>
  );
};

export default function BurndownChart({ tareas = [], sprint }) {
  const datos = useMemo(() => generarDatosBurndown(tareas, sprint), [tareas, sprint]);

  if (!sprint || datos.length === 0) {
    return (
      <EmptyState
        icon="📉"
        title="Sin datos de burndown"
        message="Selecciona un sprint activo con tareas para ver el gráfico."
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 240 }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#dde1e7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fill: '#8d8d8d',
            }}
            axisLine={{ stroke: '#dde1e7' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fill: '#8d8d8d',
            }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '12px',
              color: '#8d8d8d',
              paddingTop: '8px',
            }}
          />
          {/* Línea ideal — punteada, color muted */}
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="#8d8d8d"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
          />
          {/* Línea real — sólida, color accent */}
          <Line
            type="monotone"
            dataKey="real"
            name="Real"
            stroke="#066FCC"
            strokeWidth={2}
            dot={{ fill: '#066FCC', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: '#066FCC', r: 5, strokeWidth: 0 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
