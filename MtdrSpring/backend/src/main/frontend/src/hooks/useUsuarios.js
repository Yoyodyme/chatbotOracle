/**
 * Hook para cargar la lista de usuarios al montar el componente
 * y persistirla en el store global de Zustand.
 */

import { useEffect, useState } from 'react';

import { getUsuarios } from '../api/usuarios';
import useStore from '../store';

/**
 * @returns {{ loading: boolean, error: Error|null }}
 */
export function useUsuarios() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setUsuarios = useStore((state) => state.setUsuarios);

  useEffect(() => {
    let cancelado = false;

    async function cargarUsuarios() {
      setLoading(true);
      setError(null);

      try {
        const usuarios = await getUsuarios();

        if (!cancelado) {
          setUsuarios(usuarios ?? []);
        }
      } catch (err) {
        if (!cancelado) {
          setError(err);
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    cargarUsuarios();

    return () => {
      cancelado = true;
    };
  }, [setUsuarios]);

  return { loading, error };
}

export default useUsuarios;
