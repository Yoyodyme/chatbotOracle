package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Equipo;
import com.springboot.MyTodoList.service.EquipoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipos")
public class EquipoController {
    @Autowired
    private EquipoService equipoService;

    @GetMapping
    public ResponseEntity<List<Equipo>> obtenerTodos() {
        List<Equipo> equipos = equipoService.obtenerTodosLosEquipos();
        return new ResponseEntity<>(equipos, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Equipo> obtenerPorId(@PathVariable Long id) {
        Equipo equipo = equipoService.obtenerEquipoPorId(id);
        if (equipo != null) {
            return new ResponseEntity<>(equipo, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    public ResponseEntity<Equipo> crear(@RequestBody Equipo equipo) {
        Equipo equipoCreado = equipoService.crearEquipo(equipo);
        return new ResponseEntity<>(equipoCreado, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Equipo> actualizar(@PathVariable Long id, @RequestBody Equipo equipo) {
        Equipo equipoActualizado = equipoService.actualizarEquipo(id, equipo);
        if (equipoActualizado != null) {
            return new ResponseEntity<>(equipoActualizado, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long id) {
        boolean eliminado = equipoService.eliminarEquipo(id);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }
}
