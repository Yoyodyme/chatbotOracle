import React from 'react';
import useAppStore from '../store/index';
import useUsuarios from '../hooks/useUsuarios';
import useEquipos from '../hooks/useEquipos';
import Avatar from '../components/shared/Avatar';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';

function SkeletonTarjetas({ n = 6 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px',
      }}
    >
      {[...Array(n)].map((_, i) => (
        <div
          key={i}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Skeleton width="48px" height="48px" borderRadius="50%" />
          <Skeleton width="100px" height="14px" />
          <Skeleton width="72px" height="12px" />
          <Skeleton width="64px" height="20px" borderRadius="9999px" />
        </div>
      ))}
    </div>
  );
}

function TarjetaUsuario({ usuario }) {
  const estiloCard = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    textAlign: 'center',
    animation: 'fadeInUp 200ms ease-out both',
    transition: 'border-color 150ms, box-shadow 150ms',
    boxShadow: 'var(--shadow-sm)',
  };

  const estiloNombreCompleto = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
  };

  const estiloNombreUsuario = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  };

  const estiloRolBadge = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid rgba(6,111,204,0.25)',
    color: 'var(--accent)',
  };

  return (
    <div
      style={estiloCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <Avatar user={usuario} size="lg" />
      <span style={estiloNombreCompleto}>
        {usuario.nombreCompleto || usuario.nombreUsuario}
      </span>
      <span style={estiloNombreUsuario}>@{usuario.nombreUsuario}</span>
      {usuario.rol?.nombre && (
        <span style={estiloRolBadge}>{usuario.rol.nombre}</span>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { loading: loadingUsuarios } = useUsuarios();
  const { loading: loadingEquipos } = useEquipos();
  const usuarios = useAppStore((s) => s.usuarios);
  const equipos = useAppStore((s) => s.equipos);

  const loading = loadingUsuarios || loadingEquipos;

  const estiloPage = { display: 'flex', flexDirection: 'column', gap: '32px' };

  const estiloTitulo = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1.375rem',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    marginBottom: '4px',
  };

  const estiloSeccionHeader = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 600,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const estiloContadorEquipo = {
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
    fontWeight: 400,
    color: 'var(--text-muted)',
  };

  const estiloGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  };

  const estiloDivider = {
    height: '1px',
    backgroundColor: 'var(--border)',
    margin: '0',
  };

  if (loading) {
    return (
      <div style={estiloPage}>
        <h1 style={estiloTitulo}>Equipo</h1>
        <SkeletonTarjetas n={8} />
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div style={estiloPage}>
        <h1 style={estiloTitulo}>Equipo</h1>
        <EmptyState
          icon="👥"
          title="Sin miembros"
          message="No se encontraron usuarios en el sistema."
        />
      </div>
    );
  }

  const usuariosConEquipo = new Set();
  const secciones = equipos.map((equipo) => {
    const miembros = usuarios.filter((u) => {
      const perteneceEquipo =
        u.equipo?.idEquipo === equipo.idEquipo ||
        u.idEquipo === equipo.idEquipo;
      if (perteneceEquipo) usuariosConEquipo.add(u.idUsuario);
      return perteneceEquipo;
    });
    return { equipo, miembros };
  });

  const sinEquipo = usuarios.filter((u) => !usuariosConEquipo.has(u.idUsuario));
  const mostrarSinEquipo = sinEquipo.length > 0;

  return (
    <div style={estiloPage}>
      <h1 style={estiloTitulo}>Equipo</h1>

      {secciones.map(({ equipo, miembros }) => (
        miembros.length > 0 && (
          <section key={equipo.idEquipo}>
            <h2 style={estiloSeccionHeader}>
              {equipo.nombre}
              <span style={estiloContadorEquipo}>
                {miembros.length} miembro{miembros.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div style={estiloGrid}>
              {miembros.map((u) => (
                <TarjetaUsuario key={u.idUsuario} usuario={u} />
              ))}
            </div>
            <div style={{ ...estiloDivider, marginTop: '24px' }} />
          </section>
        )
      ))}

      {mostrarSinEquipo && (
        <section>
          <h2 style={{ ...estiloSeccionHeader, color: 'var(--text-muted)' }}>
            Sin equipo
            <span style={estiloContadorEquipo}>
              {sinEquipo.length} miembro{sinEquipo.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <div style={estiloGrid}>
            {sinEquipo.map((u) => (
              <TarjetaUsuario key={u.idUsuario} usuario={u} />
            ))}
          </div>
        </section>
      )}

      {equipos.length === 0 && (
        <section>
          <h2 style={estiloSeccionHeader}>
            Todos los miembros
            <span style={estiloContadorEquipo}>{usuarios.length}</span>
          </h2>
          <div style={estiloGrid}>
            {usuarios.map((u) => (
              <TarjetaUsuario key={u.idUsuario} usuario={u} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
