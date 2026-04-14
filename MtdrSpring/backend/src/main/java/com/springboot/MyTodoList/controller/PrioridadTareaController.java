package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.PrioridadTarea;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prioridades-tareas")
public class PrioridadTareaController {
    @Autowired
    private PrioridadTareaService prioridadTareaService;

    @GetMapping
    public ResponseEntity<List<PrioridadTarea>> obtenerTodos() {
        List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
        return new ResponseEntity<>(prioridades, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrioridadTarea> obtenerPorId(@PathVariable Long id) {
        PrioridadTarea prioridad = prioridadTareaService.obtenerPrioridadPorId(id);
        if (prioridad != null) {
            return new ResponseEntity<>(prioridad, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<PrioridadTarea> crear(@RequestBody PrioridadTarea prioridad) {
        PrioridadTarea prioridadCreada = prioridadTareaService.crearPrioridad(prioridad);
        return new ResponseEntity<>(prioridadCreada, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrioridadTarea> actualizar(@PathVariable Long id, @RequestBody PrioridadTarea prioridad) {
        PrioridadTarea prioridadActualizada = prioridadTareaService.actualizarPrioridad(id, prioridad);
        if (prioridadActualizada != null) {
            return new ResponseEntity<>(prioridadActualizada, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = prioridadTareaService.eliminarPrioridad(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }
}
