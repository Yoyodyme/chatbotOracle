/**
 * Developer filter list, derived dynamically from real DB users (`usuarios`).
 *
 * The dashboard endpoints (e.g. `/api/dashboard/kpi-por-sprint`,
 * `/api/dashboard/personal-work`) return a single first name in the
 * `usuario`/`nombre` field (e.g. "Elian", "Gabriel"). To match a developer
 * filter entry against that data, we compare the *normalized first name*
 * (lowercased, accent-stripped) of `usuario.nombreCompleto`.
 */

// Fixed first entry: shows ALL tasks/data, unfiltered.
export const ALL_TASKS_FILTER = {
  label: 'All tasks',
  initials: '__all__',
  filterName: null,
  bg: '#F3F4F6',
  color: '#374151',
};

// Color palette cycled per developer (DB has no color field).
const PALETTE = [
  { bg: '#DCFCE7', color: '#166534' },
  { bg: '#DBEAFE', color: '#2563EB' },
  { bg: '#FCE7F3', color: '#DB2777' },
  { bg: '#FCE7D6', color: '#EA580C' },
  { bg: '#E9D5FF', color: '#9333EA' },
  { bg: '#FEF3C7', color: '#D97706' },
  { bg: '#CFFAFE', color: '#0E7490' },
  { bg: '#E0E7FF', color: '#4338CA' },
];

/**
 * Lowercases and strips diacritics, e.g. "Elián" -> "elian".
 */
export function normalizeName(str = '') {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Derives initials from a full name the same way KanbanBoard does when
 * matching `usuarioAsignado`: first letter of the first two words, uppercased.
 */
function initialsFromFullName(fullName = '') {
  const partes = fullName.trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

/**
 * Returns avatar display info (initials, bg, color) for a single user,
 * cycling through the shared color palette by index. Useful for rendering
 * one card per real `usuario` (e.g. TeamPage) without deduplication.
 *
 * @param {{nombreCompleto?:string, nombreUsuario?:string}} usuario
 * @param {number} index
 */
export function getAvatarInfo(usuario, index = 0) {
  const fullName = (usuario?.nombreCompleto || usuario?.nombreUsuario || '').trim();
  const palette = PALETTE[index % PALETTE.length];
  return {
    initials: initialsFromFullName(fullName) || fullName.slice(0, 2).toUpperCase(),
    ...palette,
  };
}

/**
 * Builds the developer filter list from real `usuarios` (Usuario { idUsuario,
 * nombreUsuario, nombreCompleto, rol }).
 *
 * Returns `[ALL_TASKS_FILTER, ...derived]`, deduplicated by normalized first
 * name (the same key used to match against dashboard `usuario` fields), so
 * duplicate team members don't produce redundant filter entries.
 *
 * @param {Array<{idUsuario:number, nombreUsuario?:string, nombreCompleto?:string}>} usuarios
 * @returns {Array<{label:string, initials:string, filterName:string|null, bg:string, color:string}>}
 */
export function buildDeveloperFilters(usuarios = []) {
  const seen = new Set();
  const derived = [];

  usuarios.forEach((u) => {
    const fullName = (u.nombreCompleto || u.nombreUsuario || '').trim();
    if (!fullName) return;

    const firstName = fullName.split(/\s+/)[0];
    const key = normalizeName(firstName);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const palette = PALETTE[derived.length % PALETTE.length];
    derived.push({
      label: firstName,
      initials: initialsFromFullName(fullName) || firstName.slice(0, 2).toUpperCase(),
      filterName: fullName,
      ...palette,
    });
  });

  return [ALL_TASKS_FILTER, ...derived];
}

export function getDeveloperByInitials(initials, devs = []) {
  return devs.find((dev) => dev.initials === initials);
}

/**
 * Finds the developer filter entry whose first name (normalized) matches the
 * first name of `name` (normalized). Excludes the "All tasks" entry.
 */
export function getDeveloperByName(name = '', devs = []) {
  const first = normalizeName((name || '').split(' ')[0]);
  if (!first) return undefined;
  return devs.find((dev) =>
    dev.filterName &&
    normalizeName(dev.filterName.split(' ')[0]) === first
  );
}
