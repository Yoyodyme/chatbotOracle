/**
 * Hook para cargar la lista de usuarios al montar el componente
 * y persistirla en el store global de Zustand.
 */

import { useEffect, useState } from 'react';

import { getUsuarios } from '../api/usuarios';
import useStore from '../store';

// Accounts that exist in the database but should not appear in team/filter UI.
const HIDDEN_USERNAMES = ['rolando', 'carlos', 'martha', 'gerado', 'adan', 'eugen'];

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
          const visibles = (usuarios ?? []).filter(
            (u) => !HIDDEN_USERNAMES.includes(u.nombreUsuario)
          );
          setUsuarios(visibles);
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
