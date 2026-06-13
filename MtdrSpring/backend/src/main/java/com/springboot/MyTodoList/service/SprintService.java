package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

/**
 * Business logic layer for iteration management; delegates persistence
 * to {@link SprintRepository}.
 */
@Service
public class SprintService {

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
     * Finds the most recently started iteration whose status equals "current".
     *
     * @return an {@link Optional} containing the active iteration, or empty when none is marked current
     */
    public Optional<Sprint> obtenerSprintActivo() {
        return sprintRepository.findFirstByEstadoOrderByFechaInicioDesc("current");
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
            if (sprintActualizado.getEstado() != null) sprint.setEstado(sprintActualizado.getEstado());
            return sprintRepository.save(sprint);
        }).orElse(null);
    }
}
