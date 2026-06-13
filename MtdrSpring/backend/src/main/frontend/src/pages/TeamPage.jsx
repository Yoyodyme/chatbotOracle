import React from 'react';
import useAppStore from '../store/index';
import useUsuarios from '../hooks/useUsuarios';
import useEquipos from '../hooks/useEquipos';
import { getAvatarInfo } from '../utils/developers';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function SkeletonCards({ n = 5 }) {
  return (
    <div style={styles.grid}>
      {[...Array(n)].map((_, i) => (
        <div key={i} style={styles.card}>
          <Skeleton width="54px" height="54px" borderRadius="50%" />
          <Skeleton width="120px" height="14px" />
          <Skeleton width="84px" height="12px" />
          <Skeleton width="86px" height="20px" borderRadius="999px" />
        </div>
      ))}
    </div>
  );
}

function DevAvatar({ dev, size = 54 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: dev.bg,
        color: dev.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        flexShrink: 0,
        border: `1px solid ${dev.color}33`,
      }}
    >
      {dev.initials}
    </span>
  );
}

function MemberCard({ usuario, dev }) {
  const fullName = usuario.nombreCompleto || usuario.nombreUsuario || 'Unknown';
  const role = usuario.rol?.nombre || 'Team member';

  return (
    <div style={styles.card}>
      <DevAvatar dev={dev} />

      <div style={styles.memberInfo}>
        <span style={styles.memberName}>
          {fullName}
        </span>
        <span style={styles.username}>
          @{usuario.nombreUsuario}
        </span>
      </div>

      <span
        style={{
          ...styles.roleBadge,
          backgroundColor: dev.bg,
          color: dev.color,
          borderColor: `${dev.color}33`,
        }}
      >
        {role}
      </span>
    </div>
  );
}

export default function TeamPage() {
  const { loading: loadingUsuarios } = useUsuarios();
  const { loading: loadingEquipos } = useEquipos();

  const usuarios = useAppStore((s) => s.usuarios);
  const loading = loadingUsuarios || loadingEquipos;

  const usuariosFiltrados = usuarios;

  if (loading) {
    return (
      <div style={styles.page}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Team</h1>
            <p style={styles.subtitle}>Loading development team...</p>
          </div>
        </header>

        <section style={styles.content}>
          <SkeletonCards n={5} />
        </section>
      </div>
    );
  }

  if (usuariosFiltrados.length === 0) {
    return (
      <div style={styles.page}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Team</h1>
            <p style={styles.subtitle}>Development team</p>
          </div>
        </header>

        <section style={styles.content}>
          <EmptyState
            icon="👥"
            title="No development team members"
            message="No matching users found in the system."
          />
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Team</h1>
          <p style={styles.subtitle}>
            {usuariosFiltrados.length} members · development team
          </p>
        </div>
      </header>

      <section style={styles.content}>
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Development team</h2>
              <p style={styles.sectionSubtitle}>
                Core members working on the task manager
              </p>
            </div>

            <span style={styles.countBadge}>
              {usuariosFiltrados.length} members
            </span>
          </div>

          <div style={styles.grid}>
            {usuariosFiltrados.map((u, i) => (
              <MemberCard key={u.idUsuario || u.nombreUsuario} usuario={u} dev={getAvatarInfo(u, i)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    backgroundColor: '#F8F9FB',
  },

  topbar: {
    backgroundColor: '#FFFFFF',
    borderBottom: '0.5px solid #E5E7EB',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#111827',
  },

  subtitle: {
    margin: '4px 0 0',
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  content: {
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },

  sectionSubtitle: {
    margin: '4px 0 0',
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  countBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #E5E7EB',
    borderRadius: 10,
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    animation: 'fadeInUp 200ms ease-out both',
  },

  memberInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },

  memberName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },

  username: {
    fontSize: 11,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '0.5px solid',
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 500,
  },
};