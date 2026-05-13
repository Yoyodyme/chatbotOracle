import { apiFetch } from './client';

export function getSprints() {
  return apiFetch('/api/sprints');
}

export function getSprintActivo() {
  return apiFetch('/api/sprints/activo');
}

export function getSprint(id) {
  return apiFetch(`/api/sprints/${id}`);
}

export function createSprint(data) {
  return apiFetch('/api/sprints', { method: 'POST', body: data });
}

export function updateSprint(id, data) {
  return apiFetch(`/api/sprints/${id}`, { method: 'PUT', body: data });
}
