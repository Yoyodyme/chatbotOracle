package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ComentarioTarea;
import com.springboot.MyTodoList.service.ComentarioTareaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comentarios-tareas")
public class ComentarioTareaController {
    @Autowired
    private ComentarioTareaService comentarioTareaService;

    @GetMapping
    public ResponseEntity<List<ComentarioTarea>> obtenerTodos() {
        List<ComentarioTarea> comentarios = comentarioTareaService.obtenerTodosLosComentarios();
        return new ResponseEntity<>(comentarios, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComentarioTarea> obtenerPorId(@PathVariable Long id) {
        ComentarioTarea comentario = comentarioTareaService.obtenerComentarioPorId(id);
        if (comentario != null) {
            return new ResponseEntity<>(comentario, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<ComentarioTarea> crear(@RequestBody ComentarioTarea comentario) {
        ComentarioTarea comentarioCreado = comentarioTareaService.crearComentario(comentario);
        return new ResponseEntity<>(comentarioCreado, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ComentarioTarea> actualizar(@PathVariable Long id, @RequestBody ComentarioTarea comentario) {
        ComentarioTarea comentarioActualizado = comentarioTareaService.actualizarComentario(id, comentario);
        if (comentarioActualizado != null) {
            return new ResponseEntity<>(comentarioActualizado, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = comentarioTareaService.eliminarComentario(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }

    @GetMapping("/tarea/{idTarea}")
    public ResponseEntity<List<ComentarioTarea>> obtenerPorTarea(@PathVariable Long idTarea) {
        List<ComentarioTarea> comentarios = comentarioTareaService.obtenerComentariosPorTarea(idTarea);
        return new ResponseEntity<>(comentarios, HttpStatus.OK);
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<ComentarioTarea>> obtenerPorUsuario(@PathVariable Long idUsuario) {
        List<ComentarioTarea> comentarios = comentarioTareaService.obtenerComentariosPorUsuarioAutor(idUsuario);
        return new ResponseEntity<>(comentarios, HttpStatus.OK);
    }
}
