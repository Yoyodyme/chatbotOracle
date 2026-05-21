/**
 * Hook to load all sprints on mount and persist them in local state.
 * Follows the same pattern as useTareas.js.
 *
 * Status derivation logic (client-side only, no DB change needed):
 *   - activo === true                        → 'ACTIVO'
 *   - fechaInicio > today && activo === false → 'FUTURO'
 *   - fechaFin < today && activo === false    → 'PASADO'
 */

import { useCallback, useEffect, useState } from "react";
import { getSprints } from "../api/sprints";

/**
 * Derives the display status from the sprint's fields.
 * @param {Object} sprint
 * @returns {'ACTIVO'|'FUTURO'|'PASADO'}
 */
export function deriveSprintStatus(sprint) {
  if (sprint.activo) return "ACTIVO";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (sprint.fechaInicio && new Date(sprint.fechaInicio) > today)
    return "FUTURO";
  return "PASADO";
}

/**
 * @returns {{
 *   sprints: Sprint[],
 *   loading: boolean,
 *   error: Error|null,
 *   refetch: () => void,
 *   setSprints: (sprints: Sprint[]) => void,
 * }}
 */
export function useSprints() {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarSprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSprints();
      setSprints(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSprints();
  }, [cargarSprints]);

  return { sprints, loading, error, refetch: cargarSprints, setSprints };
}

export default useSprints;
