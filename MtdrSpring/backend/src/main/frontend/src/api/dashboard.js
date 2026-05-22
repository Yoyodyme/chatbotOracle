import { apiFetch } from './client';

const fetchStats          = () => apiFetch('/api/dashboard/stats');
const fetchSprint         = () => apiFetch('/api/dashboard/sprint');
const fetchTimeComparison = () => apiFetch('/api/dashboard/time-comparison');
const fetchTeamVelocity   = () => apiFetch('/api/dashboard/team-velocity');
const fetchPersonalWork   = () => apiFetch('/api/dashboard/personal-work');
const fetchStatusDist     = () => apiFetch('/api/dashboard/status-distribution');
export const fetchWeeklyHours  = (periodo = 'week')    => apiFetch(`/api/dashboard/weekly-hours?periodo=${periodo}`);
export const fetchSprintHours  = (sprint  = 'current') => apiFetch(`/api/dashboard/weekly-hours?periodo=${sprint}`);
const fetchContributions  = () => apiFetch('/api/dashboard/contributions');

export const fetchKpiPorSprint            = () => apiFetch('/api/dashboard/kpi-por-sprint');
export const fetchHorasPorSprint          = () => apiFetch('/api/dashboard/horas-por-sprint');
export const fetchResumenSprints          = () => apiFetch('/api/dashboard/resumen-sprints');
export const fetchContribucionesPorSprint = () => apiFetch('/api/dashboard/contribuciones-por-sprint');

export async function fetchTodoDashboard() {
  const [stats, sprint, timeComparison, teamVelocity, personalWork, statusDist, weeklyHours, contributions] =
    await Promise.all([
      fetchStats(),
      fetchSprint(),
      fetchTimeComparison(),
      fetchTeamVelocity(),
      fetchPersonalWork(),
      fetchStatusDist(),
      fetchSprintHours('current'),
      fetchContributions(),
    ]);
  return { stats, sprint, timeComparison, teamVelocity, personalWork, statusDist, weeklyHours, contributions };
}
