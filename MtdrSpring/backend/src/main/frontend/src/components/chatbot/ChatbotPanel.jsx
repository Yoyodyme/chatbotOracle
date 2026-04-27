import React, { useState, useRef, useEffect } from 'react';
import useAppStore from '../../store/index';
import { getTareas } from '../../api/tareas';
import './ChatbotPanel.css';

const HINTS = [
  { label: 'Tareas pendientes',   mensaje: 'tareas pendientes'   },
  { label: 'Estado del sprint',   mensaje: 'estado del sprint'   },
  { label: 'Tareas completadas',  mensaje: 'tareas completadas'  },
];

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function responderMensaje(texto, tareas) {
  const t = normalizar(texto);

  if (t.includes('ayuda') || t.includes('help') || t.includes('que puedes') || t.includes('comandos')) {
    return (
      'Puedo ayudarte con:\n' +
      '• "tareas pendientes" — sin iniciar\n' +
      '• "tareas en progreso" — activas\n' +
      '• "tareas completadas" — terminadas\n' +
      '• "tareas de [nombre]" — por usuario\n' +
      '• "estado del sprint" — resumen del sprint\n' +
      '• "total de tareas" — conteo general\n' +
      '• "listar tareas" — ver todas'
    );
  }

  if (t.includes('total') || t.includes('cuantas') || t.includes('cuántas') || t.includes('conteo')) {
    return `Hay un total de ${tareas.length} tarea(s) registrada(s) en el sistema.`;
  }

  if (t.includes('pendiente') || t.includes('sin iniciar')) {
    const lista = tareas.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('pendiente'));
    if (lista.length === 0) return 'No hay tareas pendientes actualmente. ✓';
    const items = lista.slice(0, 5).map(ta => `• ${ta.titulo}`).join('\n');
    return `${lista.length} tarea(s) pendiente(s):\n${items}${lista.length > 5 ? `\n…y ${lista.length - 5} más.` : ''}`;
  }

  if (t.includes('progreso') || t.includes('en curso') || t.includes('activa')) {
    const lista = tareas.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('progreso'));
    if (lista.length === 0) return 'No hay tareas en progreso actualmente.';
    const items = lista.slice(0, 5).map(ta => `• ${ta.titulo}`).join('\n');
    return `${lista.length} tarea(s) en progreso:\n${items}${lista.length > 5 ? `\n…y ${lista.length - 5} más.` : ''}`;
  }

  if (t.includes('complet') || t.includes('terminad') || t.includes('hecha')) {
    const lista = tareas.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('complet'));
    if (lista.length === 0) return 'No hay tareas completadas aún.';
    const items = lista.slice(0, 5).map(ta => `• ${ta.titulo}`).join('\n');
    return `${lista.length} tarea(s) completada(s):\n${items}${lista.length > 5 ? `\n…y ${lista.length - 5} más.` : ''}`;
  }

  if (t.includes('sprint')) {
    const conSprint = tareas.filter(ta => ta.sprint?.nombre);
    if (conSprint.length === 0) return 'No hay tareas asignadas a un sprint actualmente.';
    const nombres = [...new Set(conSprint.map(ta => ta.sprint.nombre))];
    const pend = conSprint.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('pendiente')).length;
    const prog = conSprint.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('progreso')).length;
    const comp = conSprint.filter(ta => normalizar(ta.estatus?.nombre ?? '').includes('complet')).length;
    return (
      `Sprint: ${nombres[0]}\n` +
      `Total en sprint: ${conSprint.length}\n` +
      `• Pendientes:  ${pend}\n` +
      `• En progreso: ${prog}\n` +
      `• Completadas: ${comp}`
    );
  }

  const matchUsuario = t.match(/tareas de ([a-zà-ɏ\w]+)/);
  if (matchUsuario) {
    const nombre = matchUsuario[1];
    const del = tareas.filter(ta =>
      normalizar(ta.usuarioAsignado?.nombreCompleto ?? '').includes(nombre) ||
      normalizar(ta.usuarioAsignado?.nombreUsuario ?? '').includes(nombre)
    );
    if (del.length === 0) return `No encontré tareas asignadas a "${nombre}".`;
    const items = del.slice(0, 5).map(ta => `• ${ta.titulo} (${ta.estatus?.nombre ?? '—'})`).join('\n');
    return `${del.length} tarea(s) de ${nombre}:\n${items}${del.length > 5 ? `\n…y ${del.length - 5} más.` : ''}`;
  }

  if (t.includes('lista') || t.includes('todas') || t.includes('mostrar') || t.includes('ver tarea')) {
    if (tareas.length === 0) return 'No hay tareas registradas.';
    const items = tareas.slice(0, 6).map(ta => `• ${ta.titulo} — ${ta.estatus?.nombre ?? '—'}`).join('\n');
    return `Tareas (${tareas.length} total):\n${items}${tareas.length > 6 ? `\n…y ${tareas.length - 6} más.` : ''}`;
  }

  return 'No entendí tu pregunta.\nEscribe "ayuda" para ver qué puedo hacer.';
}

export default function ChatbotPanel() {
  const [abierto, setAbierto]         = useState(false);
  const [mensajes, setMensajes]       = useState([
    { rol: 'asistente', texto: '¡Hola! Soy tu asistente de tareas.\n¿En qué te puedo ayudar hoy?' },
  ]);
  const [entrada, setEntrada]         = useState('');
  const [cargando, setCargando]       = useState(false);
  const [hintsVisible, setHintsVisible] = useState(true);

  const mensajesRef = useRef(null);
  const inputRef    = useRef(null);
  const tareasStore = useAppStore((s) => s.tareas);

  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  }, [mensajes, cargando]);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  async function enviar(texto) {
    const msg = texto.trim();
    if (!msg || cargando) return;

    setHintsVisible(false);
    setMensajes(prev => [...prev, { rol: 'usuario', texto: msg }]);
    setEntrada('');
    setCargando(true);

    let tareas = tareasStore;
    if (tareas.length === 0) {
      try { tareas = (await getTareas()) ?? []; }
      catch { tareas = []; }
    }

    await new Promise(r => setTimeout(r, 500));

    const respuesta = responderMensaje(msg, tareas);
    setCargando(false);

    // Efecto de escritura carácter por carácter
    setMensajes(prev => [...prev, { rol: 'asistente', texto: '' }]);
    let i = 0;
    const intervalo = setInterval(() => {
      i++;
      setMensajes(prev => {
        const copia = [...prev];
        copia[copia.length - 1] = { rol: 'asistente', texto: respuesta.slice(0, i) };
        return copia;
      });
      if (i >= respuesta.length) clearInterval(intervalo);
    }, 14);
  }

  function manejarSubmit(e) {
    e.preventDefault();
    enviar(entrada);
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        className={`chatbot-fab${abierto ? ' chatbot-fab--activo' : ''}`}
        onClick={() => setAbierto(v => !v)}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {abierto ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">AI</div>
              <div>
                <p className="chatbot-nombre">Asistente</p>
                <p className="chatbot-sub">EQ51 · Task Manager</p>
              </div>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="chatbot-mensajes" ref={mensajesRef}>
            {mensajes.map((m, idx) => (
              <div key={idx} className={`chatbot-burbuja chatbot-burbuja--${m.rol}`}>
                <span style={{ whiteSpace: 'pre-line' }}>{m.texto}</span>
              </div>
            ))}
            {cargando && (
              <div className="chatbot-burbuja chatbot-burbuja--asistente chatbot-typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          {/* Chips de sugerencia */}
          {hintsVisible && (
            <div className="chatbot-hints">
              {HINTS.map(h => (
                <button
                  key={h.mensaje}
                  className="chatbot-hint"
                  onClick={() => enviar(h.mensaje)}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chatbot-form" onSubmit={manejarSubmit}>
            <input
              ref={inputRef}
              className="chatbot-input"
              value={entrada}
              onChange={e => setEntrada(e.target.value)}
              placeholder="Escribe tu pregunta…"
              disabled={cargando}
              autoComplete="off"
            />
            <button
              type="submit"
              className="chatbot-enviar"
              disabled={!entrada.trim() || cargando}
              aria-label="Enviar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
