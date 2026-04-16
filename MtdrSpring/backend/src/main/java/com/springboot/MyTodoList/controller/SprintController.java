package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.service.SprintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    @Autowired
    private SprintService sprintService;

    @GetMapping
    public List<Sprint> obtenerTodos() {
        return sprintService.obtenerTodosLosSprints();
    }

    @GetMapping("/activo")
    public ResponseEntity<Sprint> obtenerActivo() {
        return sprintService.obtenerSprintActivo()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sprint> obtenerPorId(@PathVariable Long id) {
        return sprintService.obtenerSprintPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Sprint> crear(@RequestBody Sprint sprint) {
        return ResponseEntity.ok(sprintService.crearSprint(sprint));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sprint> actualizar(@PathVariable Long id, @RequestBody Sprint sprint) {
        Sprint actualizado = sprintService.actualizarSprint(id, sprint);
        if (actualizado == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(actualizado);
    }
}
