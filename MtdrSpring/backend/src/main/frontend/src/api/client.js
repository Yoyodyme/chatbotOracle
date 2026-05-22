/**
 * Base HTTP client for the Spring Boot API.
 * Uses HTTP Basic auth with development credentials.
 * All requests are relative to the server root (BASE_URL = ''),
 * allowing Vite's proxy to forward /api and /todolist in development,
 * and Spring Boot to serve directly in production.
 */

const BASE_URL = '';

// Development credentials — in production these would be injected from env vars
const BASIC_CREDENTIALS = btoa('admin:admin123');

const AUTH_HEADER = `Basic ${BASIC_CREDENTIALS}`;

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: AUTH_HEADER,
};

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

  const config = {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
  };

  // Serialize body to JSON if it is an object
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // No content — valid response for DELETE/PUT
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
