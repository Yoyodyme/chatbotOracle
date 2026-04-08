package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.PrioridadTarea;
import com.springboot.MyTodoList.repository.PrioridadTareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class PrioridadTareaService {
    @Autowired
    private PrioridadTareaRepository prioridadTareaRepository;

    public PrioridadTarea crearPrioridad(PrioridadTarea prioridad) {
        return prioridadTareaRepository.save(prioridad);
    }

    public PrioridadTarea obtenerPrioridadPorId(Long id) {
        Optional<PrioridadTarea> prioridad = prioridadTareaRepository.findById(id);
        return prioridad.orElse(null);
    }

    public PrioridadTarea obtenerPrioridadPorNombre(String nombre) {
        return prioridadTareaRepository.findByNombre(nombre);
    }

    public List<PrioridadTarea> obtenerTodasLasPrioridades() {
        return prioridadTareaRepository.findAll();
    }

    public PrioridadTarea actualizarPrioridad(Long id, PrioridadTarea prioridadActualizada) {
        Optional<PrioridadTarea> prioridadExistente = prioridadTareaRepository.findById(id);
        if (prioridadExistente.isPresent()) {
            PrioridadTarea prioridad = prioridadExistente.get();
            if (prioridadActualizada.getNombre() != null) {
                prioridad.setNombre(prioridadActualizada.getNombre());
            }
            if (prioridadActualizada.getOrden() != null) {
                prioridad.setOrden(prioridadActualizada.getOrden());
            }
            return prioridadTareaRepository.save(prioridad);
        }
        return null;
    }

    public boolean eliminarPrioridad(Long id) {
        if (prioridadTareaRepository.existsById(id)) {
            prioridadTareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
