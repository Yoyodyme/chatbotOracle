package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Business logic layer for iteration management; delegates persistence
 * to {@link SprintRepository}.
 */
@Service
public class SprintService {

    /** Canonical value for the single currently-active sprint. */
    public static final String ESTADO_ACTIVO = "ACTIVO";
    private static final String ESTADO_FUTURO = "FUTURO";
    private static final String ESTADO_PASADO = "PASADO";

    @Autowired
    private SprintRepository sprintRepository;

    /**
     * Persists a new iteration record.
     *
     * @param sprint the entity to save
     * @return the saved instance with the generated surrogate key populated
     */
    public Sprint crearSprint(Sprint sprint) {
        return sprintRepository.save(sprint);
    }

    /**
     * Finds the most recently started iteration whose status equals "ACTIVO".
     *
     * @return an {@link Optional} containing the active iteration, or empty when none is marked active
     */
    public Optional<Sprint> obtenerSprintActivo() {
        return sprintRepository.findFirstByEstadoOrderByFechaInicioDesc(ESTADO_ACTIVO);
    }

    /**
     * Returns all iterations ordered by start date descending.
     *
     * @return list of all iterations; empty when no records exist
     */
    public List<Sprint> obtenerTodosLosSprints() {
        return sprintRepository.findAllByOrderByFechaInicioDesc();
    }

    /**
     * Looks up a single iteration by its surrogate key.
     *
     * @param idSprint the surrogate key to search for
     * @return an {@link Optional} containing the matching entity, or empty when the key is unknown
     */
    public Optional<Sprint> obtenerSprintPorId(Long idSprint) {
        return sprintRepository.findById(idSprint);
    }

    /**
     * Removes an iteration by its surrogate key if it exists.
     *
     * @param idSprint the surrogate key of the record to remove
     * @return {@code true} when found and deleted; {@code false} when the ID is unknown
     */
    public boolean eliminarSprint(Long idSprint) {
        if (sprintRepository.existsById(idSprint)) {
            sprintRepository.deleteById(idSprint);
            return true;
        }
        return false;
    }

    /**
     * Applies a partial update: only non-null fields from {@code sprintActualizado}
     * are written; existing values are preserved for null fields.
     *
     * @param idSprint          surrogate key identifying the record to update
     * @param sprintActualizado carrier object whose non-null fields will be applied
     * @return the updated entity after being re-persisted, or {@code null} when the ID is unknown
     */
    public Sprint actualizarSprint(Long idSprint, Sprint sprintActualizado) {
        return sprintRepository.findById(idSprint).map(sprint -> {
            if (sprintActualizado.getNombre() != null) sprint.setNombre(sprintActualizado.getNombre());
            if (sprintActualizado.getFechaInicio() != null) sprint.setFechaInicio(sprintActualizado.getFechaInicio());
            if (sprintActualizado.getFechaFin() != null) sprint.setFechaFin(sprintActualizado.getFechaFin());

            String nuevoEstado = sprintActualizado.getEstado();
            if (nuevoEstado != null) {
                if (ESTADO_ACTIVO.equalsIgnoreCase(nuevoEstado)) {
                    // Marking this sprint as active must deactivate any other active sprint
                    // so that obtenerSprintActivo() never sees more than one match.
                    desactivarOtrosSprintsActivos(idSprint);
                    sprint.setEstado(ESTADO_ACTIVO);
                } else {
                    sprint.setEstado(nuevoEstado);
                }
            }
            return sprintRepository.save(sprint);
        }).orElse(null);
    }

    /**
     * Marks the given sprint as the single active sprint, demoting any other
     * sprint currently flagged "ACTIVO" to "FUTURO"/"PASADO" based on its dates.
     *
     * @param idSprint id of the sprint to activate
     * @return the updated (now active) sprint, or {@code null} if no sprint with that id exists
     */
    public Sprint activarSprint(Long idSprint) {
        return sprintRepository.findById(idSprint).map(sprint -> {
            desactivarOtrosSprintsActivos(idSprint);
            sprint.setEstado(ESTADO_ACTIVO);
            return sprintRepository.save(sprint);
        }).orElse(null);
    }

    /**
     * Recomputes and persists the estado of every sprint other than {@code idSprintExcluido}
     * that is currently flagged "ACTIVO", based on its start date (same rule used by
     * {@link Sprint#onCreate()}).
     */
    private void desactivarOtrosSprintsActivos(Long idSprintExcluido) {
        List<Sprint> otrosActivos = sprintRepository.findAll().stream()
                .filter(s -> !s.getIdSprint().equals(idSprintExcluido))
                .filter(s -> ESTADO_ACTIVO.equalsIgnoreCase(s.getEstado()))
                .collect(Collectors.toList());

        for (Sprint otro : otrosActivos) {
            otro.setEstado(estadoPorFecha(otro.getFechaInicio()));
            sprintRepository.save(otro);
        }
    }

    /** Mirrors the date-based estado rule applied by {@link Sprint#onCreate()}. */
    private String estadoPorFecha(LocalDate fechaInicio) {
        if (fechaInicio != null && fechaInicio.isAfter(LocalDate.now())) {
            return ESTADO_FUTURO;
        }
        return ESTADO_PASADO;
    }
}
