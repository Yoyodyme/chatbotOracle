package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.EvidenciaTarea;
import com.springboot.MyTodoList.repository.EvidenciaTareaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class EvidenciaTareaService {
    @Autowired
    private EvidenciaTareaRepository evidenciaTareaRepository;

    public EvidenciaTarea crearEvidencia(EvidenciaTarea evidencia) {
        return evidenciaTareaRepository.save(evidencia);
    }

    public EvidenciaTarea obtenerEvidenciaPorId(Long id) {
        Optional<EvidenciaTarea> evidencia = evidenciaTareaRepository.findById(id);
        return evidencia.orElse(null);
    }

    public List<EvidenciaTarea> obtenerEvidenciasPorTarea(Long idTarea) {
        return evidenciaTareaRepository.findByTareaIdTarea(idTarea);
    }

    public List<EvidenciaTarea> obtenerEvidenciasPorUsuarioSubio(Long idUsuario) {
        return evidenciaTareaRepository.findByUsuarioSubioIdUsuario(idUsuario);
    }

    public List<EvidenciaTarea> obtenerTodasLasEvidencias() {
        return evidenciaTareaRepository.findAll();
    }

    public EvidenciaTarea actualizarEvidencia(Long id, EvidenciaTarea evidenciaActualizada) {
        Optional<EvidenciaTarea> evidenciaExistente = evidenciaTareaRepository.findById(id);
        if (evidenciaExistente.isPresent()) {
            EvidenciaTarea evidencia = evidenciaExistente.get();
            if (evidenciaActualizada.getNota() != null) {
                evidencia.setNota(evidenciaActualizada.getNota());
            }
            if (evidenciaActualizada.getUrlArchivo() != null) {
                evidencia.setUrlArchivo(evidenciaActualizada.getUrlArchivo());
            }
            return evidenciaTareaRepository.save(evidencia);
        }
        return null;
    }

    public boolean eliminarEvidencia(Long id) {
        if (evidenciaTareaRepository.existsById(id)) {
            evidenciaTareaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
