package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.service.SprintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * REST controller exposing CRUD operations for iterations
 * under the {@code /api/sprints} base path.
 */
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    @Autowired
    private SprintService sprintService;

    /**
     * Returns all iterations ordered by start date descending.
     *
     * @return list of all iterations; empty list when no records exist
     */
    @GetMapping
    public List<Sprint> obtenerTodos() {
        return sprintService.obtenerTodosLosSprints();
    }

    /**
     * Returns the iteration currently marked as active (estado = "current").
     *
     * @return HTTP 200 with the active iteration, or HTTP 404 when none is marked current
     */
    @GetMapping("/activo")
    public ResponseEntity<Sprint> obtenerActivo() {
        return sprintService.obtenerSprintActivo()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns the iteration identified by the given surrogate key.
     *
     * @param id the surrogate key to look up
     * @return HTTP 200 with the entity, or HTTP 404 when the key is unknown
     */
    @GetMapping("/{id}")
    public ResponseEntity<Sprint> obtenerPorId(@PathVariable Long id) {
        return sprintService.obtenerSprintPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Persists a new iteration record and returns the saved entity.
     *
     * @param sprint the entity to persist
     * @return HTTP 200 with the saved entity including its generated surrogate key
     */
    @PostMapping
    public ResponseEntity<Sprint> crear(@RequestBody Sprint sprint) {
        return ResponseEntity.ok(sprintService.crearSprint(sprint));
    }

    /**
     * Partially updates an existing iteration; only non-null fields in the request body are applied.
     *
     * @param id     surrogate key of the record to update
     * @param sprint carrier object whose non-null fields will be applied
     * @return HTTP 200 with the updated entity, or HTTP 404 when the key is unknown
     */
    @PutMapping("/{id}")
    public ResponseEntity<Sprint> actualizar(@PathVariable Long id, @RequestBody Sprint sprint) {
        Sprint actualizado = sprintService.actualizarSprint(id, sprint);
        if (actualizado == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(actualizado);
    }

    /**
     * Removes the iteration identified by the given surrogate key.
     *
     * @param id the surrogate key of the record to delete
     * @return HTTP 204 on success, or HTTP 404 when the key is unknown
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!sprintService.eliminarSprint(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.noContent().build();
    }
}
