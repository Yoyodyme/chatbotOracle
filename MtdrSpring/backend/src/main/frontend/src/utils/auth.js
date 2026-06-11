import { useAuth } from 'react-oidc-context';

const LOCAL_JWT_KEY = 'local_jwt';

// ── Local token storage ───────────────────────────────────────────────────────

export function getLocalToken() {
  return localStorage.getItem(LOCAL_JWT_KEY);
}

export function setLocalToken(token) {
  localStorage.setItem(LOCAL_JWT_KEY, token);
}

export function clearLocalToken() {
  localStorage.removeItem(LOCAL_JWT_KEY);
}

function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isLocalTokenValid() {
  const token = getLocalToken();
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp < Date.now() / 1000) {
    clearLocalToken();
    return false;
  }
  return true;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Returns { isAuthenticated, isLoading } — true for either OCI or local login.
 * Use this in AppShell to decide whether to redirect to /login.
 */
export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isAuthenticated) return { isAuthenticated: true, isLoading: false };
  if (isLoading)       return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: isLocalTokenValid(), isLoading: false };
}

/**
 * Returns the current user's profile fields regardless of auth source.
 * OCI tokens take priority over local tokens.
 */
export function useCurrentUser() {
  const { user } = useAuth();

  if (user?.profile) {
    const p = user.profile;
    return {
      source:    'oci',
      sub:       p.sub                          ?? null,
      name:      p.name ?? p.preferred_username ?? null,
      email:     p.email                        ?? null,
      username:  p.preferred_username           ?? null,
      idUsuario: null,
    };
  }

  const token = getLocalToken();
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload && (!payload.exp || payload.exp > Date.now() / 1000)) {
      return {
        source:    'local',
        sub:       payload.sub      ?? null,
        name:      payload.name     ?? null,
        email:     null,
        username:  payload.username ?? null,
        idUsuario: payload.idUsuario ?? null,
      };
    }
  }

  return { source: null, sub: null, name: null, email: null, username: null, idUsuario: null };
}

/**
 * Returns a sign-out function that works for both auth sources.
 */
export function useSignOut() {
  const auth = useAuth();
  return () => {
    clearLocalToken();
    if (auth.isAuthenticated) {
      auth.signoutRedirect();
    } else {
      globalThis.location.replace('/login');
    }
  };
}