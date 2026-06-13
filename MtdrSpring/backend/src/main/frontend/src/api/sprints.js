import { apiFetch } from "./client";

export function getSprints() {
  return apiFetch("/api/sprints");
}

export function getSprintActivo() {
  return apiFetch("/api/sprints/activo");
}

export function getSprint(id) {
  return apiFetch(`/api/sprints/${id}`);
}

export function createSprint(data) {
  return apiFetch("/api/sprints", { method: "POST", body: data });
}

export function updateSprint(id, data) {
  return apiFetch(`/api/sprints/${id}`, { method: "PUT", body: data });
}

/**
 * Marks the given sprint as the single active sprint ("ACTIVO"), demoting
 * any previously active sprint based on its dates.
 *
 * @param {number} id
 * @returns {Promise<Sprint>}
 */
export function activateSprint(id) {
  return apiFetch(`/api/sprints/${id}/activar`, { method: "PUT" });
}

/**
 * Fetches all tasks associated with a sprint.
 * Requires GET /api/tareas/sprint/{id} to be implemented in TareaController.
 *
 * @param {number} idSprint
 * @returns {Promise<Tarea[]>}
 */
export const getTareasBySprint = (idSprint) =>
  apiFetch(`/api/tareas/sprint/${idSprint}`);

export function deleteSprint(id) {
  return apiFetch(`/api/sprints/${id}`, { method: "DELETE" });
}
