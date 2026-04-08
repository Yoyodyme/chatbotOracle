package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Equipo;
import com.springboot.MyTodoList.repository.EquipoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EquipoService {
    @Autowired
    private EquipoRepository equipoRepository;

    public Equipo crearEquipo(Equipo equipo) {
        return equipoRepository.save(equipo);
    }

    public Equipo obtenerEquipoPorId(Long id) {
        Optional<Equipo> equipo = equipoRepository.findById(id);
        return equipo.orElse(null);
    }

    public Equipo obtenerEquipoPorNombre(String nombre) {
        return equipoRepository.findByNombre(nombre);
    }

    public List<Equipo> obtenerTodosLosEquipos() {
        return equipoRepository.findAll();
    }

    public Equipo actualizarEquipo(Long id, Equipo equipoActualizado) {
        Optional<Equipo> equipoExistente = equipoRepository.findById(id);
        if (equipoExistente.isPresent()) {
            Equipo equipo = equipoExistente.get();
            if (equipoActualizado.getNombre() != null) {
                equipo.setNombre(equipoActualizado.getNombre());
            }
            return equipoRepository.save(equipo);
        }
        return null;
    }

    public boolean eliminarEquipo(Long id) {
        if (equipoRepository.existsById(id)) {
            equipoRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
