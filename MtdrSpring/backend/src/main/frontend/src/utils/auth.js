export function getUsuarioLogueado() {
  return {
    idUsuario: 3,
    nombreUsuario: 'gabriel.peres',
    nombreCompleto: 'Gabriel Peres Baptista',
    rol: 'Scrum Master',
    idRol: 1,
  };
}

export function isLoggedIn() {
  return true;
}

export function logout() {
  window.location.href = '/';
}

export function esDeveloper() {
  return false;
}

export function esManager() {
  return true;
}
