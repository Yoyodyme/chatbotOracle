/**
 * API de Equipos y Miembros de Equipo.
 * Modelo: Equipo { idEquipo, nombre }
 */

import { apiFetch } from './client';

/**
 * Obtiene la lista de todos los equipos.
 * @returns {Promise<Equipo[]>}
 */
export function getEquipos() {
  return apiFetch('/api/equipos');
}

/**
 * Obtiene los miembros de un equipo específico.
 * @param {number} idEquipo
 * @returns {Promise<Usuario[]>}
 */
export function getMiembrosEquipo(idEquipo) {
  return apiFetch(`/api/miembros-equipo/equipo/${idEquipo}`);
}
