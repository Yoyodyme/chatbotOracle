package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.EvidenciaTarea;
import com.springboot.MyTodoList.service.EvidenciaTareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/evidencias-tareas")
public class EvidenciaTareaController {
    @Autowired
    private EvidenciaTareaService evidenciaTareaService;

    @GetMapping
    public ResponseEntity<List<EvidenciaTarea>> obtenerTodos() {
        List<EvidenciaTarea> evidencias = evidenciaTareaService.obtenerTodasLasEvidencias();
        return new ResponseEntity<>(evidencias, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EvidenciaTarea> obtenerPorId(@PathVariable Long id) {
        EvidenciaTarea evidencia = evidenciaTareaService.obtenerEvidenciaPorId(id);
        if (evidencia != null) {
            return new ResponseEntity<>(evidencia, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<EvidenciaTarea> crear(@RequestBody EvidenciaTarea evidencia) {
        EvidenciaTarea evidenciaCreada = evidenciaTareaService.crearEvidencia(evidencia);
        return new ResponseEntity<>(evidenciaCreada, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EvidenciaTarea> actualizar(@PathVariable Long id, @RequestBody EvidenciaTarea evidencia) {
        EvidenciaTarea evidenciaActualizada = evidenciaTareaService.actualizarEvidencia(id, evidencia);
        if (evidenciaActualizada != null) {
            return new ResponseEntity<>(evidenciaActualizada, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = evidenciaTareaService.eliminarEvidencia(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }

    @GetMapping("/tarea/{idTarea}")
    public ResponseEntity<List<EvidenciaTarea>> obtenerPorTarea(@PathVariable Long idTarea) {
        List<EvidenciaTarea> evidencias = evidenciaTareaService.obtenerEvidenciasPorTarea(idTarea);
        return new ResponseEntity<>(evidencias, HttpStatus.OK);
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<EvidenciaTarea>> obtenerPorUsuario(@PathVariable Long idUsuario) {
        List<EvidenciaTarea> evidencias = evidenciaTareaService.obtenerEvidenciasPorUsuarioSubio(idUsuario);
        return new ResponseEntity<>(evidencias, HttpStatus.OK);
    }
}
