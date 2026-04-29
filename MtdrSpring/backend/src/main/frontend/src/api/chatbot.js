import { apiFetch } from './client';

/**
 * Envía un mensaje al asistente y devuelve la respuesta.
 *
 * @param {string} mensaje
 * @returns {Promise<string>}
 */
export async function enviarMensaje(mensaje) {
  const datos = await apiFetch('/api/asistente/chat', {
    method: 'POST',
    body: { mensaje },
  });
  return datos.respuesta;
}
