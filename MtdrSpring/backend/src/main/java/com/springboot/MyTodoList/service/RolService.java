package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Rol;
import com.springboot.MyTodoList.repository.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class RolService {
    @Autowired
    private RolRepository rolRepository;

    public Rol crearRol(Rol rol) {
        return rolRepository.save(rol);
    }

    public Rol obtenerRolPorId(Long id) {
        Optional<Rol> rol = rolRepository.findById(id);
        return rol.orElse(null);
    }

    public Rol obtenerRolPorNombre(String nombre) {
        return rolRepository.findByNombre(nombre);
    }

    public List<Rol> obtenerTodosLosRoles() {
        return rolRepository.findAll();
    }

    public Rol actualizarRol(Long id, Rol rolActualizado) {
        Optional<Rol> rolExistente = rolRepository.findById(id);
        if (rolExistente.isPresent()) {
            Rol rol = rolExistente.get();
            if (rolActualizado.getNombre() != null) {
                rol.setNombre(rolActualizado.getNombre());
            }
            if (rolActualizado.getDescripcion() != null) {
                rol.setDescripcion(rolActualizado.getDescripcion());
            }
            return rolRepository.save(rol);
        }
        return null;
    }

    public boolean eliminarRol(Long id) {
        if (rolRepository.existsById(id)) {
            rolRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
