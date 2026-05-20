import { apiFetch } from './client';

/**
 * Envía un mensaje al asistente y devuelve la respuesta.
 * Incluye el historial de conversación previo para permitir respuestas con contexto.
 *
 * @param {string} mensaje   Texto del usuario en el turno actual
 * @param {Array}  historial Mensajes previos en formato [{role, content}, ...]
 *                           Por defecto lista vacía (compatible con llamadores existentes)
 * @returns {Promise<string>}
 */
export async function enviarMensaje(mensaje, historial = []) {
  const datos = await apiFetch('/api/asistente/chat', {
    method: 'POST',
    body: { mensaje, historial },
  });
  return datos.respuesta;
}
