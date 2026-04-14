package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.LogTarea;
import com.springboot.MyTodoList.service.LogTareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs-tareas")
public class LogTareaController {
    @Autowired
    private LogTareaService logTareaService;

    @GetMapping
    public ResponseEntity<List<LogTarea>> obtenerTodos() {
        List<LogTarea> logs = logTareaService.obtenerTodosLosLogs();
        return new ResponseEntity<>(logs, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LogTarea> obtenerPorId(@PathVariable Long id) {
        LogTarea log = logTareaService.obtenerLogPorId(id);
        if (log != null) {
            return new ResponseEntity<>(log, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<LogTarea> crear(@RequestBody LogTarea log) {
        LogTarea logCreado = logTareaService.crearLog(log);
        return new ResponseEntity<>(logCreado, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = logTareaService.eliminarLog(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }

    @GetMapping("/tarea/{idTarea}")
    public ResponseEntity<List<LogTarea>> obtenerPorTarea(@PathVariable Long idTarea) {
        List<LogTarea> logs = logTareaService.obtenerLogsPorTarea(idTarea);
        return new ResponseEntity<>(logs, HttpStatus.OK);
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<LogTarea>> obtenerPorUsuario(@PathVariable Long idUsuario) {
        List<LogTarea> logs = logTareaService.obtenerLogsPorUsuario(idUsuario);
        return new ResponseEntity<>(logs, HttpStatus.OK);
    }
}
