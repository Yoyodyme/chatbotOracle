/**
 * Hook para cargar tareas, estatus y prioridades al montar el componente.
 * Carga los tres recursos en paralelo para minimizar el tiempo de espera
 * y los persiste en el store global de Zustand.
 *
 * También re-carga automáticamente cada 30 segundos y cuando el usuario
 * vuelve a la pestaña, para reflejar tareas creadas desde el bot de Telegram.
 */

import { useCallback, useEffect, useState } from 'react';

import { getTareas, getEstatuses, getPrioridades } from '../api/tareas';
import useStore from '../store';

/**
 * @returns {{ loading: boolean, error: Error|null, refetch: () => void }}
 */
export function useTareas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setTareas = useStore((state) => state.setTareas);
  const setEstatuses = useStore((state) => state.setEstatuses);
  const setPrioridades = useStore((state) => state.setPrioridades);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [tareas, estatuses, prioridades] = await Promise.all([
        getTareas(),
        getEstatuses(),
        getPrioridades(),
      ]);

      setTareas(tareas ?? []);
      setEstatuses(estatuses ?? []);
      setPrioridades(prioridades ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [setTareas, setEstatuses, setPrioridades]);

  // Función pública para que los consumidores puedan disparar una recarga manual
  const refetch = useCallback(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    // Initial load
    cargarDatos();

    // Auto-refresh every 1 hour
    const intervalo = setInterval(cargarDatos, 3_600_000);

    return () => clearInterval(intervalo);
  }, [cargarDatos]);

  return { loading, error, refetch };
}

export default useTareas;
