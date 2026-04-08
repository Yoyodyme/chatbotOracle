package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.repository.EstatusTareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EstatusTareaService {
    @Autowired
    private EstatusTareaRepository estatusTareaRepository;

    public EstatusTarea crearEstatus(EstatusTarea estatus) {
        return estatusTareaRepository.save(estatus);
    }

    public EstatusTarea obtenerEstatusPorId(Long id) {
        Optional<EstatusTarea> estatus = estatusTareaRepository.findById(id);
        return estatus.orElse(null);
    }

    public EstatusTarea obtenerEstatusPorNombre(String nombre) {
        return estatusTareaRepository.findByNombre(nombre);
    }

    public List<EstatusTarea> obtenerTodosLosEstatus() {
        return estatusTareaRepository.findAll();
    }

    public EstatusTarea actualizarEstatus(Long id, EstatusTarea estatusActualizado) {
        Optional<EstatusTarea> estatusExistente = estatusTareaRepository.findById(id);
        if (estatusExistente.isPresent()) {
            EstatusTarea estatus = estatusExistente.get();
            if (estatusActualizado.getNombre() != null) {
                estatus.setNombre(estatusActualizado.getNombre());
            }
            if (estatusActualizado.getOrden() != null) {
                estatus.setOrden(estatusActualizado.getOrden());
            }
            return estatusTareaRepository.save(estatus);
        }
        return null;
    }

    public boolean eliminarEstatus(Long id) {
        if (estatusTareaRepository.existsById(id)) {
            estatusTareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
