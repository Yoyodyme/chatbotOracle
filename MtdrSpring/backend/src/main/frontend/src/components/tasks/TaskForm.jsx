import React, { useState } from 'react';
import useAppStore from '../../store/index';

const ESTILO_CAMPO = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const ESTILO_LABEL = {
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
};

const ESTILO_INPUT = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.9375rem',
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  padding: '9px 12px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  appearance: 'none',
  WebkitAppearance: 'none',
};

const ESTILO_INPUT_FOCUS_HANDLER = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 3px rgba(6,111,204,0.18)',
};

function Campo({ label, children }) {
  return (
    <div style={ESTILO_CAMPO}>
      <label style={ESTILO_LABEL}>{label}</label>
      {children}
    </div>
  );
}

function InputConFoco({ style = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...ESTILO_INPUT, ...style, ...(focused ? ESTILO_INPUT_FOCUS_HANDLER : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function TextareaConFoco({ style = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...ESTILO_INPUT,
        minHeight: '88px',
        resize: 'vertical',
        ...style,
        ...(focused ? ESTILO_INPUT_FOCUS_HANDLER : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function SelectConFoco({ style = {}, children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...ESTILO_INPUT,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238d8d8d' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '32px',
        cursor: 'pointer',
        ...style,
        ...(focused ? ESTILO_INPUT_FOCUS_HANDLER : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

export default function TaskForm({ onSubmit, onCancel, initialValues }) {
  const estatuses = useAppStore((s) => s.estatuses);
  const prioridades = useAppStore((s) => s.prioridades);
  const usuarios = useAppStore((s) => s.usuarios);

  const esEdicion = Boolean(initialValues);

  const [campos, setCampos] = useState({
    titulo: initialValues?.titulo ?? '',
    descripcion: initialValues?.descripcion ?? '',
    idEstatus: initialValues?.idEstatus ?? '',
    idPrioridad: initialValues?.idPrioridad ?? '',
    idUsuarioAsignado: initialValues?.idUsuarioAsignado ?? '',
    fechaVencimiento: initialValues?.fechaVencimiento
      ? initialValues.fechaVencimiento.slice(0, 10)
      : '',
  });

  const [errores, setErrores] = useState({});

  function actualizarCampo(campo, valor) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: '' }));
    }
  }

  function validar() {
    const nuevosErrores = {};
    if (!campos.titulo.trim()) {
      nuevosErrores.titulo = 'El título es obligatorio';
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  function manejarEnvio(e) {
    e.preventDefault();
    if (!validar()) return;

    const datos = {
      titulo: campos.titulo.trim(),
      descripcion: campos.descripcion.trim() || null,
      idEstatus: campos.idEstatus ? Number(campos.idEstatus) : null,
      idPrioridad: campos.idPrioridad ? Number(campos.idPrioridad) : null,
      idUsuarioAsignado: campos.idUsuarioAsignado ? Number(campos.idUsuarioAsignado) : null,
      fechaVencimiento: campos.fechaVencimiento || null,
    };

    onSubmit(datos);
  }

  const estiloFormulario = {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  };

  const estiloAcciones = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '4px',
  };

  const estiloBotonPrimario = {
    padding: '9px 20px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 100ms',
  };

  const estiloBotonSecundario = {
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background-color 100ms, color 100ms',
  };

  const estiloError = {
    fontSize: '0.75rem',
    color: 'var(--danger)',
    marginTop: '2px',
  };

  return (
    <form style={estiloFormulario} onSubmit={manejarEnvio} noValidate>
      <Campo label="Título *">
        <InputConFoco
          type="text"
          value={campos.titulo}
          onChange={(e) => actualizarCampo('titulo', e.target.value)}
          placeholder="Nombre de la tarea"
          maxLength={200}
        />
        {errores.titulo && <span style={estiloError}>{errores.titulo}</span>}
      </Campo>

      <Campo label="Descripción">
        <TextareaConFoco
          value={campos.descripcion}
          onChange={(e) => actualizarCampo('descripcion', e.target.value)}
          placeholder="Describe los detalles de la tarea..."
        />
      </Campo>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <Campo label="Estatus">
          <SelectConFoco
            value={campos.idEstatus}
            onChange={(e) => actualizarCampo('idEstatus', e.target.value)}
          >
            <option value="">Sin estatus</option>
            {(estatuses || []).map((est) => (
              <option key={est.idEstatus} value={est.idEstatus}>
                {est.nombre}
              </option>
            ))}
          </SelectConFoco>
        </Campo>

        <Campo label="Prioridad">
          <SelectConFoco
            value={campos.idPrioridad}
            onChange={(e) => actualizarCampo('idPrioridad', e.target.value)}
          >
            <option value="">Sin prioridad</option>
            {(prioridades || []).map((pri) => (
              <option key={pri.idPrioridad} value={pri.idPrioridad}>
                {pri.nombre}
              </option>
            ))}
          </SelectConFoco>
        </Campo>
      </div>

      <Campo label="Asignado a">
        <SelectConFoco
          value={campos.idUsuarioAsignado}
          onChange={(e) => actualizarCampo('idUsuarioAsignado', e.target.value)}
        >
          <option value="">Sin asignar</option>
          {(usuarios || []).map((usr) => (
            <option key={usr.idUsuario} value={usr.idUsuario}>
              {usr.nombreCompleto || usr.nombreUsuario}
            </option>
          ))}
        </SelectConFoco>
      </Campo>

      <Campo label="Fecha de vencimiento">
        <InputConFoco
          type="date"
          value={campos.fechaVencimiento}
          onChange={(e) => actualizarCampo('fechaVencimiento', e.target.value)}
          style={{ colorScheme: 'light' }}
        />
      </Campo>

      <div style={estiloAcciones}>
        <button
          type="button"
          style={estiloBotonSecundario}
          onClick={onCancel}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          style={estiloBotonPrimario}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {esEdicion ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  );
}
