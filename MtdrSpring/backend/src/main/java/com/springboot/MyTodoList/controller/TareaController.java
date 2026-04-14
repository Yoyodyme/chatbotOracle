package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.service.TareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tareas")
public class TareaController {
    @Autowired
    private TareaService tareaService;

    @GetMapping
    public ResponseEntity<List<Tarea>> obtenerTodos() {
        List<Tarea> tareas = tareaService.obtenerTodosLasTareas();
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tarea> obtenerPorId(@PathVariable Long id) {
        Tarea tarea = tareaService.obtenerTareaPorId(id);
        if (tarea != null) {
            return new ResponseEntity<>(tarea, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<Tarea> crear(@RequestBody Tarea tarea) {
        Tarea tareaCreada = tareaService.crearTarea(tarea);
        return new ResponseEntity<>(tareaCreada, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Tarea> actualizar(@PathVariable Long id, @RequestBody Tarea tarea) {
        Tarea tareaActualizada = tareaService.actualizarTarea(id, tarea);
        if (tareaActualizada != null) {
            return new ResponseEntity<>(tareaActualizada, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = tareaService.eliminarTarea(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }

    @GetMapping("/asignado/{idUsuario}")
    public ResponseEntity<List<Tarea>> obtenerPorUsuarioAsignado(@PathVariable Long idUsuario) {
        List<Tarea> tareas = tareaService.obtenerTareasPorUsuarioAsignado(idUsuario);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    @GetMapping("/creador/{idUsuario}")
    public ResponseEntity<List<Tarea>> obtenerPorUsuarioCreador(@PathVariable Long idUsuario) {
        List<Tarea> tareas = tareaService.obtenerTareasPorUsuarioCreador(idUsuario);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    @GetMapping("/estatus/{idEstatus}")
    public ResponseEntity<List<Tarea>> obtenerPorEstatus(@PathVariable Long idEstatus) {
        List<Tarea> tareas = tareaService.obtenerTareasPorEstatus(idEstatus);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }

    @GetMapping("/prioridad/{idPrioridad}")
    public ResponseEntity<List<Tarea>> obtenerPorPrioridad(@PathVariable Long idPrioridad) {
        List<Tarea> tareas = tareaService.obtenerTareasPorPrioridad(idPrioridad);
        return new ResponseEntity<>(tareas, HttpStatus.OK);
    }
}
