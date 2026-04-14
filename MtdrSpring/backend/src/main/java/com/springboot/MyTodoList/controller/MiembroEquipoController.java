package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.MiembroEquipo;
import com.springboot.MyTodoList.service.MiembroEquipoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/miembros-equipos")
public class MiembroEquipoController {
    @Autowired
    private MiembroEquipoService miembroEquipoService;

    @GetMapping
    public ResponseEntity<List<MiembroEquipo>> obtenerTodos() {
        List<MiembroEquipo> miembros = miembroEquipoService.obtenerTodosLosMiembros();
        return new ResponseEntity<>(miembros, HttpStatus.OK);
    }

    @PostMapping
    public ResponseEntity<MiembroEquipo> crear(@RequestBody MiembroEquipo miembroEquipo) {
        MiembroEquipo miembroCreado = miembroEquipoService.crearMiembroEquipo(miembroEquipo);
        return new ResponseEntity<>(miembroCreado, HttpStatus.CREATED);
    }

    @GetMapping("/equipo/{idEquipo}")
    public ResponseEntity<List<MiembroEquipo>> obtenerPorEquipo(@PathVariable Long idEquipo) {
        List<MiembroEquipo> miembros = miembroEquipoService.obtenerMiembrosPorEquipo(idEquipo);
        return new ResponseEntity<>(miembros, HttpStatus.OK);
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<MiembroEquipo>> obtenerPorUsuario(@PathVariable Long idUsuario) {
        List<MiembroEquipo> equipos = miembroEquipoService.obtenerEquiposPorUsuario(idUsuario);
        return new ResponseEntity<>(equipos, HttpStatus.OK);
    }

    @DeleteMapping("/{idEquipo}/{idUsuario}")
    public ResponseEntity<Boolean> eliminar(@PathVariable Long idEquipo, @PathVariable Long idUsuario) {
        boolean eliminado = miembroEquipoService.eliminarMiembroEquipo(idEquipo, idUsuario);
        if (eliminado) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        }
        return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }
}
