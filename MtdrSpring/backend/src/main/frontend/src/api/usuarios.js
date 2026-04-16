/**
 * API de Usuarios.
 * Modelo: Usuario { idUsuario, nombreUsuario, nombreCompleto, rol }
 *         Rol     { idRol, nombre }
 */

import { apiFetch } from './client';

/**
 * Obtiene la lista de todos los usuarios.
 * @returns {Promise<Usuario[]>}
 */
export function getUsuarios() {
  return apiFetch('/api/usuarios');
}

/**
 * Obtiene un usuario por ID.
 * @param {number} id
 * @returns {Promise<Usuario>}
 */
export function getUsuario(id) {
  return apiFetch(`/api/usuarios/${id}`);
}
