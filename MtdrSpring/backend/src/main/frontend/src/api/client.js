/**
 * Base HTTP client for the Spring Boot API.
 * In prod the Authorization header is populated with a Bearer token via
 * setAuthToken(), called by OidcTokenSync in main.jsx whenever the OIDC
 * session changes. In local dev no token is set and the backend (profile
 * "local") permits all requests.
 */

const BASE_URL = '';

const LOCAL_JWT_KEY = 'local_jwt';

let _bearerToken = null;

/** Called by OidcTokenSync whenever the OIDC access token changes. */
export function setAuthToken(token) {
  _bearerToken = token;
}

/**
 * Performs an HTTP request to the API.
 *
 * @param {string} path - Relative path, e.g. '/api/tareas'
 * @param {RequestInit} options - Fetch options (method, body, etc.)
 * @returns {Promise<any|null>} JSON response data, or null for 204
 * @throws {Error} If the HTTP response is not 2xx
 */
export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const token = _bearerToken || localStorage.getItem(LOCAL_JWT_KEY);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      let mensajeError = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const cuerpoError = await response.json();
        mensajeError = cuerpoError.message || cuerpoError.error || mensajeError;
      } catch {
        // Ignore if the body is not valid JSON
      }

      throw new Error(mensajeError);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Could not connect to the server. Verify that the backend is running on localhost:8080.');
    }
    throw error;
  }
}
