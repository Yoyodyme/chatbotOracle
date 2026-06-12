export const DEVELOPERS = [
  { label: 'My tasks',   initials: '__me__', filterName: '__me__',             bg: '#F3F4F6', color: '#374151' },
  { label: 'Gabriel',   initials: 'GP',     filterName: 'Gabriel Peres',      bg: '#DCFCE7', color: '#166534' },
  { label: 'Alejandro', initials: 'AL',     filterName: 'Alejandro García',   bg: '#DBEAFE', color: '#2563EB' },
  { label: 'Eugenio',   initials: 'ED',     filterName: 'Eugenio Díaz',       bg: '#FCE7F3', color: '#DB2777' },
  { label: 'Elián',     initials: 'EG',     filterName: 'Elián Genc',         bg: '#FCE7D6', color: '#EA580C' },
  { label: 'Grecia',    initials: 'GS',     filterName: 'Grecia Saucedo',     bg: '#E9D5FF', color: '#9333EA' },
  { label: 'Rutilo',    initials: 'RD',     filterName: 'Rutilo de la Peña',  bg: '#FEF3C7', color: '#D97706' },
];

export function getDeveloperByInitials(initials) {
  return DEVELOPERS.find((dev) => dev.initials === initials);
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function getDeveloperByName(name = '') {
  const first = normalize(name.split(' ')[0]);
  return DEVELOPERS.find((dev) =>
    dev.filterName !== '__me__' &&
    normalize(dev.filterName.split(' ')[0]) === first
  );
}