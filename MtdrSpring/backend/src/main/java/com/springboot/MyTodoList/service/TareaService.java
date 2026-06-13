package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.repository.TareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

/**
 * Business logic layer for work-item operations; delegates persistence
 * to {@link TareaRepository} and sanitizes string input before writing.
 */
@Service
public class TareaService {

    @Autowired
    private TareaRepository tareaRepository;

    /**
     * Trims leading and trailing whitespace from string fields, then persists the entity.
     *
     * @param tarea the entity to save; must satisfy all Bean Validation constraints
     * @return the saved instance with the generated surrogate key populated
     */
    public Tarea crearTarea(Tarea tarea) {
        if (tarea.getTitulo() != null) {
            tarea.setTitulo(tarea.getTitulo().trim());
        }
        if (tarea.getDescripcion() != null) {
            tarea.setDescripcion(tarea.getDescripcion().trim());
        }
        return tareaRepository.save(tarea);
    }

    /**
     * Looks up a single record by its surrogate key.
     *
     * @param id the surrogate key to search for
     * @return the matching entity, or {@code null} when no record exists for the given key
     */
    public Tarea obtenerTareaPorId(Long id) {
        Optional<Tarea> tarea = tareaRepository.findById(id);
        return tarea.orElse(null);
    }

    /**
     * Returns every record in the repository.
     *
     * @return a list of all entities; empty when no records exist
     */
    public List<Tarea> obtenerTodosLasTareas() {
        return tareaRepository.findAll();
    }

    /**
     * Filters records by the surrogate key of the assigned user.
     *
     * @param idUsuario surrogate key of the account to filter by
     * @return records assigned to the given account; empty when none match
     */
    public List<Tarea> obtenerTareasPorUsuarioAsignado(Long idUsuario) {
        return tareaRepository.findByUsuarioAsignadoIdUsuario(idUsuario);
    }

    /**
     * Filters records by the surrogate key of the submitting user.
     *
     * @param idUsuario surrogate key of the account to filter by
     * @return records submitted by the given account; empty when none match
     */
    public List<Tarea> obtenerTareasPorUsuarioCreador(Long idUsuario) {
        return tareaRepository.findByUsuarioCreadorIdUsuario(idUsuario);
    }

    /**
     * Filters records by their lifecycle state surrogate key.
     *
     * @param idEstatus surrogate key of the status to filter by
     * @return records in the given state; empty when none match
     */
    public List<Tarea> obtenerTareasPorEstatus(Long idEstatus) {
        return tareaRepository.findByEstatusIdEstatus(idEstatus);
    }

    /**
     * Filters records by their urgency level surrogate key.
     *
     * @param idPrioridad surrogate key of the priority level to filter by
     * @return records at the given priority; empty when none match
     */
    public List<Tarea> obtenerTareasPorPrioridad(Long idPrioridad) {
        return tareaRepository.findByPrioridadIdPrioridad(idPrioridad);
    }

    /**
     * Applies a partial update: only non-null fields from {@code tareaActualizada}
     * are written; existing values are preserved for null fields. String fields are
     * trimmed before being applied.
     *
     * @param id               surrogate key identifying the record to update
     * @param tareaActualizada carrier object whose non-null fields will be applied
     * @return the updated entity after being re-persisted, or {@code null} when the ID is unknown
     */
    public Tarea actualizarTarea(Long id, Tarea tareaActualizada) {
        Optional<Tarea> tareaExistente = tareaRepository.findById(id);
        if (tareaExistente.isPresent()) {
            Tarea tarea = tareaExistente.get();
            if (tareaActualizada.getTitulo() != null) {
                tarea.setTitulo(tareaActualizada.getTitulo().trim());
            }
            if (tareaActualizada.getDescripcion() != null) {
                tarea.setDescripcion(tareaActualizada.getDescripcion().trim());
            }
            if (tareaActualizada.getEstatus() != null) {
                tarea.setEstatus(tareaActualizada.getEstatus());
            }
            if (tareaActualizada.getPrioridad() != null) {
                tarea.setPrioridad(tareaActualizada.getPrioridad());
            }
            if (tareaActualizada.getUsuarioAsignado() != null) {
                tarea.setUsuarioAsignado(tareaActualizada.getUsuarioAsignado());
            }
            if (tareaActualizada.getFechaVencimiento() != null) {
                tarea.setFechaVencimiento(tareaActualizada.getFechaVencimiento());
            }
            if (tareaActualizada.getHorasEstimadas() != null) {
                tarea.setHorasEstimadas(tareaActualizada.getHorasEstimadas());
            }
            if (tareaActualizada.getHorasReales() != null) {
                tarea.setHorasReales(tareaActualizada.getHorasReales());
            }
            if (tareaActualizada.getSprint() != null) {
                tarea.setSprint(tareaActualizada.getSprint());
            }
            return tareaRepository.save(tarea);
        }
        return null;
    }

    /**
     * Filters records by their iteration surrogate key.
     *
     * @param idSprint surrogate key of the iteration to filter by
     * @return records belonging to the given iteration; empty when none match
     */
    public List<Tarea> obtenerTareasPorSprint(Long idSprint) {
        return tareaRepository.findBySprintIdSprint(idSprint);
    }

    /**
     * Filters records by both iteration and assigned user surrogate keys.
     *
     * @param idSprint   surrogate key of the iteration
     * @param idUsuario  surrogate key of the assigned account
     * @return records matching both criteria; empty when none match
     */
    public List<Tarea> obtenerTareasPorSprintYUsuario(Long idSprint, Long idUsuario) {
        return tareaRepository.findBySprintIdSprintAndUsuarioAsignadoIdUsuario(idSprint, idUsuario);
    }

    /**
     * Filters records by lifecycle state name (case-insensitive) and assigned user.
     *
     * @param nombreEstatus case-insensitive name of the lifecycle state
     * @param idUsuario     surrogate key of the assigned account
     * @return records matching both criteria; empty when none match
     */
    public List<Tarea> obtenerTareasPorEstatusYUsuario(String nombreEstatus, Long idUsuario) {
        return tareaRepository.findByEstatusNombreIgnoreCaseAndUsuarioAsignadoIdUsuario(nombreEstatus, idUsuario);
    }

    /**
     * Returns records whose status name is "Pending" or "In Progress" for a given user.
     *
     * @param idUsuario surrogate key of the assigned account
     * @return open records assigned to the given account; empty when none match
     */
    public List<Tarea> obtenerTareasActivasPorUsuario(Long idUsuario) {
        return tareaRepository.findByUsuarioAsignadoAndEstatusNombres(idUsuario, List.of("Pending", "In Progress"));
    }

    /**
     * Removes a record by its surrogate key if it exists.
     *
     * @param id the surrogate key of the record to remove
     * @return {@code true} when the record was found and deleted; {@code false} when the ID is unknown
     */
    public boolean eliminarTarea(Long id) {
        if (tareaRepository.existsById(id)) {
            tareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
