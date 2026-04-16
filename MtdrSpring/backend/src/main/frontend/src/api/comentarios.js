/**
 * API de Comentarios de Tarea.
 * Modelo: ComentarioTarea { idComentario, tarea, usuarioAutor, cuerpo, creadoEn }
 */

import { apiFetch } from './client';

/**
 * Obtiene todos los comentarios de una tarea.
 * @param {number} idTarea
 * @returns {Promise<ComentarioTarea[]>}
 */
export function getComentariosByTarea(idTarea) {
  return apiFetch(`/api/comentarios-tareas/tarea/${idTarea}`);
}

/**
 * Crea un nuevo comentario en una tarea.
 * @param {{ tarea: { idTarea: number }, usuarioAutor: { idUsuario: number }, cuerpo: string }} data
 * @returns {Promise<ComentarioTarea>}
 */
export function createComentario(data) {
  return apiFetch('/api/comentarios-tareas', {
    method: 'POST',
    body: data,
  });
}
