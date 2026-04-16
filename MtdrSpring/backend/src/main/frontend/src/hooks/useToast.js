/**
 * Hook para despachar toasts desde cualquier componente.
 * Genera IDs únicos y configura la duración por defecto en 4000ms.
 * El ToastContainer se encarga de leer el store y auto-eliminar
 * cada toast al vencer su duración.
 */

import { useCallback } from 'react';

import useStore from '../store';

const DURACION_DEFAULT_MS = 4000;

let contadorId = 0;

function generarId() {
  contadorId += 1;
  return `toast-${Date.now()}-${contadorId}`;
}

/**
 * @returns {{
 *   toast: (message: string, type?: string) => void,
 *   success: (message: string) => void,
 *   error: (message: string) => void,
 *   info: (message: string) => void,
 *   warning: (message: string) => void,
 * }}
 */
export function useToast() {
  const addToast = useStore((state) => state.addToast);

  const toast = useCallback(
    (message, type = 'info', options = {}) => {
      addToast({
        id: generarId(),
        message,
        type,
        duration: options.duration ?? DURACION_DEFAULT_MS,
        action: options.action ?? null,
      });
    },
    [addToast]
  );

  const success = useCallback(
    (message, options) => toast(message, 'success', options),
    [toast]
  );

  const error = useCallback(
    (message, options) => toast(message, 'error', options),
    [toast]
  );

  const info = useCallback(
    (message, options) => toast(message, 'info', options),
    [toast]
  );

  const warning = useCallback(
    (message, options) => toast(message, 'warning', options),
    [toast]
  );

  return { toast, success, error, info, warning };
}

export default useToast;
