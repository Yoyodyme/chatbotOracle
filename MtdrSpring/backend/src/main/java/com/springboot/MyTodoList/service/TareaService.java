package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.repository.TareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class TareaService {
    @Autowired
    private TareaRepository tareaRepository;

    public Tarea crearTarea(Tarea tarea) {
        return tareaRepository.save(tarea);
    }

    public Tarea obtenerTareaPorId(Long id) {
        Optional<Tarea> tarea = tareaRepository.findById(id);
        return tarea.orElse(null);
    }

    public List<Tarea> obtenerTodosLasTareas() {
        return tareaRepository.findAll();
    }

    public List<Tarea> obtenerTareasPorUsuarioAsignado(Long idUsuario) {
        return tareaRepository.findByUsuarioAsignadoIdUsuario(idUsuario);
    }

    public List<Tarea> obtenerTareasPorUsuarioCreador(Long idUsuario) {
        return tareaRepository.findByUsuarioCreadorIdUsuario(idUsuario);
    }

    public List<Tarea> obtenerTareasPorEstatus(Long idEstatus) {
        return tareaRepository.findByEstatusIdEstatus(idEstatus);
    }

    public List<Tarea> obtenerTareasPorPrioridad(Long idPrioridad) {
        return tareaRepository.findByPrioridadIdPrioridad(idPrioridad);
    }

    public Tarea actualizarTarea(Long id, Tarea tareaActualizada) {
        Optional<Tarea> tareaExistente = tareaRepository.findById(id);
        if (tareaExistente.isPresent()) {
            Tarea tarea = tareaExistente.get();
            if (tareaActualizada.getTitulo() != null) {
                tarea.setTitulo(tareaActualizada.getTitulo());
            }
            if (tareaActualizada.getDescripcion() != null) {
                tarea.setDescripcion(tareaActualizada.getDescripcion());
            }
            if (tareaActualizada.getEstatus() != null) {
                tarea.setEstatus(tareaActualizada.getEstatus());
            }
            if (tareaActualizada.getPrioridad() != null) {
                tarea.setPrioridad(tareaActualizada.getPrioridad());
            }
            if (tareaActualizada.getUsuarioAsignado() != null) {
                tarea.setUsuarioAsignado(tareaActualizada.getUsuarioAsignado());
            }
            if (tareaActualizada.getFechaVencimiento() != null) {
                tarea.setFechaVencimiento(tareaActualizada.getFechaVencimiento());
            }
            return tareaRepository.save(tarea);
        }
        return null;
    }

    public boolean eliminarTarea(Long id) {
        if (tareaRepository.existsById(id)) {
            tareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
