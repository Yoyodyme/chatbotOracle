package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.service.TareaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * REST controller exposing CRUD and filter operations for work items
 * under the {@code /api/tareas} base path.
 */
@RestController
@RequestMapping("/api/tareas")
public class TareaController {

    @Autowired
    private TareaService tareaService;

    /**
     * Returns every record in the repository.
     *
     * @return HTTP 200 with the full list; empty list when no records exist
     */
    @GetMapping
    public ResponseEntity<List<Tarea>> obtenerTodos() {
        List<Tarea> tareas = tareaService.obtenerTodosLasTareas();
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    /**
     * Returns the record identified by the given surrogate key.
     *
     * @param id the surrogate key to look up
     * @return HTTP 200 with the entity, or HTTP 404 when the key is unknown
     */
    @GetMapping("/{id}")
    public ResponseEntity<Tarea> obtenerPorId(@PathVariable Long id) {
        Tarea tarea = tareaService.obtenerTareaPorId(id);
        if (tarea != null) {
            return new ResponseEntity<>(tarea, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    /**
     * Validates, persists, and returns the newly created record.
     * The response includes a {@code Location} header pointing to the new resource URI.
     *
     * @param tarea      the entity to persist; validated against Bean Validation constraints
     * @param uriBuilder injected builder used to construct the {@code Location} header
     * @return HTTP 201 with the saved entity and a {@code Location} header
     */
    @PostMapping
    public ResponseEntity<Tarea> crear(
            @Valid @RequestBody Tarea tarea,
            UriComponentsBuilder uriBuilder) {
        Tarea tareaCreada = tareaService.crearTarea(tarea);
        URI location = uriBuilder
                .path("/api/tareas/{id}")
                .buildAndExpand(tareaCreada.getIdTarea())
                .toUri();
        return ResponseEntity.created(location).body(tareaCreada);
    }

    /**
     * Partially updates an existing record; only non-null fields in the request body are applied.
     *
     * @param id    surrogate key of the record to update
     * @param tarea carrier object whose non-null fields will be applied; validated before use
     * @return HTTP 200 with the updated entity, or HTTP 404 when the key is unknown
     */
    @PutMapping("/{id}")
    public ResponseEntity<Tarea> actualizar(@PathVariable Long id, @Valid @RequestBody Tarea tarea) {
        Tarea tareaActualizada = tareaService.actualizarTarea(id, tarea);
        if (tareaActualizada != null) {
            return new ResponseEntity<>(tareaActualizada, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    /**
     * Removes the record identified by the given surrogate key.
     * {@link com.springboot.MyTodoList.config.GlobalExceptionHandler} intercepts any
     * referential integrity violation and converts it to HTTP 409.
     *
     * @param id the surrogate key of the record to delete
     * @return HTTP 204 on success, or HTTP 404 when the key is unknown
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        boolean eliminado = tareaService.eliminarTarea(id);
        if (!eliminado) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns all records assigned to the given user account.
     *
     * @param idUsuario surrogate key of the assigned account
     * @return HTTP 200 with the filtered list; empty list when none match
     */
    @GetMapping("/asignado/{idUsuario}")
    public ResponseEntity<List<Tarea>> obtenerPorUsuarioAsignado(@PathVariable Long idUsuario) {
        List<Tarea> tareas = tareaService.obtenerTareasPorUsuarioAsignado(idUsuario);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    /**
     * Returns all records submitted by the given user account.
     *
     * @param idUsuario surrogate key of the submitting account
     * @return HTTP 200 with the filtered list; empty list when none match
     */
    @GetMapping("/creador/{idUsuario}")
    public ResponseEntity<List<Tarea>> obtenerPorUsuarioCreador(@PathVariable Long idUsuario) {
        List<Tarea> tareas = tareaService.obtenerTareasPorUsuarioCreador(idUsuario);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    /**
     * Returns all records in the given lifecycle state.
     *
     * @param idEstatus surrogate key of the lifecycle state
     * @return HTTP 200 with the filtered list; empty list when none match
     */
    @GetMapping("/estatus/{idEstatus}")
    public ResponseEntity<List<Tarea>> obtenerPorEstatus(@PathVariable Long idEstatus) {
        List<Tarea> tareas = tareaService.obtenerTareasPorEstatus(idEstatus);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    /**
     * Returns all records at the given urgency level.
     *
     * @param idPrioridad surrogate key of the urgency level
     * @return HTTP 200 with the filtered list; empty list when none match
     */
    @GetMapping("/prioridad/{idPrioridad}")
    public ResponseEntity<List<Tarea>> obtenerPorPrioridad(@PathVariable Long idPrioridad) {
        List<Tarea> tareas = tareaService.obtenerTareasPorPrioridad(idPrioridad);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    /**
     * Returns all records belonging to the given iteration.
     *
     * @param idSprint surrogate key of the iteration
     * @return HTTP 200 with the filtered list; empty list when none match
     */
    @GetMapping("/sprint/{idSprint}")
    public ResponseEntity<List<Tarea>> obtenerPorSprint(@PathVariable Long idSprint) {
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(idSprint);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }
}
