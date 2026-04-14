package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.service.EstatusTareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estatus-tareas")
public class EstatusTareaController {
    @Autowired
    private EstatusTareaService estatusTareaService;

    @GetMapping
    public ResponseEntity<List<EstatusTarea>> obtenerTodos() {
        List<EstatusTarea> estatus = estatusTareaService.obtenerTodosLosEstatus();
        return new ResponseEntity<>(estatus, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstatusTarea> obtenerPorId(@PathVariable Long id) {
        EstatusTarea estatus = estatusTareaService.obtenerEstatusPorId(id);
        if (estatus != null) {
            return new ResponseEntity<>(estatus, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<EstatusTarea> crear(@RequestBody EstatusTarea estatus) {
        EstatusTarea estatusCreado = estatusTareaService.crearEstatus(estatus);
        return new ResponseEntity<>(estatusCreado, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstatusTarea> actualizar(@PathVariable Long id, @RequestBody EstatusTarea estatus) {
        EstatusTarea estatusActualizado = estatusTareaService.actualizarEstatus(id, estatus);
        if (estatusActualizado != null) {
            return new ResponseEntity<>(estatusActualizado, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = estatusTareaService.eliminarEstatus(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }
}
