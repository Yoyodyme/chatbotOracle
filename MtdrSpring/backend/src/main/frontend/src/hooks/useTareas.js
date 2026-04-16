/**
 * Hook para cargar tareas, estatus y prioridades al montar el componente.
 * Carga los tres recursos en paralelo para minimizar el tiempo de espera
 * y los persiste en el store global de Zustand.
 */

import { useEffect, useState } from 'react';

import { getTareas, getEstatuses, getPrioridades } from '../api/tareas';
import useStore from '../store';

/**
 * @returns {{ loading: boolean, error: Error|null }}
 */
export function useTareas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setTareas = useStore((state) => state.setTareas);
  const setEstatuses = useStore((state) => state.setEstatuses);
  const setPrioridades = useStore((state) => state.setPrioridades);

  useEffect(() => {
    let cancelado = false;

    async function cargarDatos() {
      setLoading(true);
      setError(null);

      try {
        const [tareas, estatuses, prioridades] = await Promise.all([
          getTareas(),
          getEstatuses(),
          getPrioridades(),
        ]);

        if (cancelado) return;

        setTareas(tareas ?? []);
        setEstatuses(estatuses ?? []);
        setPrioridades(prioridades ?? []);
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

    cargarDatos();

    // Limpiar para evitar actualizaciones de estado en componente desmontado
    return () => {
      cancelado = true;
    };
  }, [setTareas, setEstatuses, setPrioridades]);

  return { loading, error };
}

export default useTareas;
