/**
 * API de Tareas — CRUD completo + catálogos de estatus y prioridad.
 * Modelo: Tarea { idTarea, titulo, descripcion, estatus, prioridad,
 *                 usuarioCreador, usuarioAsignado, fechaVencimiento,
 *                 creadoEn, actualizadoEn }
 */

import { apiFetch } from './client';

/**
 * Obtiene todas las tareas.
 * @returns {Promise<Tarea[]>}
 */
export function getTareas() {
  return apiFetch('/api/tareas');
}

/**
 * Obtiene una tarea por ID.
 * @param {number} id
 * @returns {Promise<Tarea>}
 */
export function getTarea(id) {
  return apiFetch(`/api/tareas/${id}`);
}

/**
 * Crea una nueva tarea.
 * @param {Partial<Tarea>} data
 * @returns {Promise<Tarea>}
 */
export function createTarea(data) {
  return apiFetch('/api/tareas', {
    method: 'POST',
    body: data,
  });
}

/**
 * Actualiza una tarea existente.
 * @param {number} id
 * @param {Partial<Tarea>} data
 * @returns {Promise<Tarea>}
 */
export function updateTarea(id, data) {
  return apiFetch(`/api/tareas/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Elimina una tarea por ID.
 * @param {number} id
 * @returns {Promise<null>}
 */
export function deleteTarea(id) {
  return apiFetch(`/api/tareas/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Obtiene el catálogo de estatus disponibles.
 * Modelo: EstatusTarea { idEstatus, nombre, orden }
 * @returns {Promise<EstatusTarea[]>}
 */
export function getEstatuses() {
  return apiFetch('/api/estatus-tareas');
}

/**
 * Obtiene el catálogo de prioridades disponibles.
 * Modelo: PrioridadTarea { idPrioridad, nombre, orden }
 * @returns {Promise<PrioridadTarea[]>}
 */
export function getPrioridades() {
  return apiFetch('/api/prioridades-tareas');
}
