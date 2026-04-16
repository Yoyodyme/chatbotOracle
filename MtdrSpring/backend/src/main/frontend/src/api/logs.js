/**
 * API de Logs de Tarea (auditoría de cambios de estatus).
 * Modelo: LogTarea { idLog, tarea, usuario, idEstatusOrigen,
 *                    idEstatuDestino, mensaje, creadoEn }
 */

import { apiFetch } from './client';

/**
 * Obtiene todos los logs de todas las tareas.
 * @returns {Promise<LogTarea[]>}
 */
export function getLogs() {
  return apiFetch('/api/logs-tareas');
}

/**
 * Obtiene los logs de cambio de una tarea específica.
 * @param {number} idTarea
 * @returns {Promise<LogTarea[]>}
 */
export function getLogsByTarea(idTarea) {
  return apiFetch(`/api/logs-tareas/tarea/${idTarea}`);
}
