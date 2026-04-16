/**
 * Hook para cargar la lista de equipos al montar el componente
 * y persistirla en el store global de Zustand.
 */

import { useEffect, useState } from 'react';

import { getEquipos } from '../api/equipos';
import useStore from '../store';

/**
 * @returns {{ loading: boolean, error: Error|null }}
 */
export function useEquipos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setEquipos = useStore((state) => state.setEquipos);

  useEffect(() => {
    let cancelado = false;

    async function cargarEquipos() {
      setLoading(true);
      setError(null);

      try {
        const equipos = await getEquipos();

        if (!cancelado) {
          setEquipos(equipos ?? []);
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

    cargarEquipos();

    return () => {
      cancelado = true;
    };
  }, [setEquipos]);

  return { loading, error };
}

export default useEquipos;
