import React, { useState, useRef, useEffect } from 'react';
import { enviarMensaje } from '../../api/chatbot';
import './ChatbotPanel.css';

const HINTS = [
  { label: 'Pending tasks',    mensaje: 'pending tasks'    },
  { label: 'Sprint status',    mensaje: 'sprint status'    },
  { label: 'Completed tasks',  mensaje: 'completed tasks'  },
];


export default function ChatbotPanel() {
  const [abierto, setAbierto]         = useState(false);
  const [mensajes, setMensajes]       = useState([
    { rol: 'asistente', texto: 'Hi! I\'m your task assistant.\nHow can I help you today?' },
  ]);
  const [entrada, setEntrada]         = useState('');
  const [cargando, setCargando]       = useState(false);
  const [hintsVisible, setHintsVisible] = useState(true);

  const mensajesRef = useRef(null);
  const inputRef    = useRef(null);

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

    // Construir historial desde los mensajes actuales antes de añadir el nuevo turno.
    // Se filtran mensajes de rol 'sistema', se toman los últimos 10 y se mapean al
    // formato estándar {role, content} que espera el backend (OpenAI/DeepSeek API).
    const historial = mensajes
      .filter(m => m.rol !== 'sistema')
      .slice(-10)
      .map(m => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto }));

    setHintsVisible(false);
    setMensajes(prev => [...prev, { rol: 'usuario', texto: msg }]);
    setEntrada('');
    setCargando(true);

    let respuesta;
    try {
      respuesta = await enviarMensaje(msg, historial);
    } catch (err) {
      respuesta = 'Error connecting to the assistant. Please verify the server is online.';
    }
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
        aria-label={abierto ? 'Close assistant' : 'Open assistant'}
      >
        {abierto ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <img
            src="/chatbot-avatar.png"
            alt="Assistant"
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <img
                  src="/chatbot-avatar.png"
                  alt="Assistant"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <p className="chatbot-nombre">Assistant</p>
                <p className="chatbot-sub">Yoyodyme · Task Manager</p>
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
              placeholder="Ask a question…"
              disabled={cargando}
              autoComplete="off"
            />
            <button
              type="submit"
              className="chatbot-enviar"
              disabled={!entrada.trim() || cargando}
              aria-label="Send"
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
