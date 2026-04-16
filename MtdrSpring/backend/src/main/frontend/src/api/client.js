/**
 * Base HTTP client para la API de Spring Boot.
 * Usa HTTP Basic auth con las credenciales de desarrollo.
 * Todas las peticiones son relativas a la raíz del servidor (BASE_URL = ''),
 * permitiendo que el proxy de Vite reenvíe /api y /todolist en desarrollo,
 * y que Spring Boot sirva directamente en producción.
 */

const BASE_URL = '';

// Credenciales de desarrollo — en producción se inyectarían desde env vars
const BASIC_CREDENTIALS = btoa('admin:admin123');

const AUTH_HEADER = `Basic ${BASIC_CREDENTIALS}`;

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: AUTH_HEADER,
};

/**
 * Realiza una petición HTTP a la API.
 *
 * @param {string} path - Ruta relativa, e.g. '/api/tareas'
 * @param {RequestInit} options - Opciones de fetch (method, body, etc.)
 * @returns {Promise<any|null>} Datos JSON de la respuesta, o null para 204
 * @throws {Error} Si la respuesta HTTP no es 2xx
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

  // Serializar body a JSON si es un objeto
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);

    // Sin contenido — respuesta válida para DELETE/PUT
    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      let mensajeError = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const cuerpoError = await response.json();
        mensajeError = cuerpoError.message || cuerpoError.error || mensajeError;
      } catch {
        // Ignorar si el cuerpo no es JSON válido
      }

      throw new Error(mensajeError);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('No se pudo conectar al servidor. Verifica que el backend esté corriendo en localhost:8080.');
    }
    throw error;
  }
}
