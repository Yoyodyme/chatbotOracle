package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.MiembroEquipo;
import com.springboot.MyTodoList.repository.MiembroEquipoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class MiembroEquipoService {
    @Autowired
    private MiembroEquipoRepository miembroEquipoRepository;

    public MiembroEquipo crearMiembroEquipo(MiembroEquipo miembroEquipo) {
        return miembroEquipoRepository.save(miembroEquipo);
    }

    public List<MiembroEquipo> obtenerMiembrosPorEquipo(Long idEquipo) {
        return miembroEquipoRepository.findByEquipoIdEquipo(idEquipo);
    }

    public List<MiembroEquipo> obtenerEquiposPorUsuario(Long idUsuario) {
        return miembroEquipoRepository.findByUsuarioIdUsuario(idUsuario);
    }

    public List<MiembroEquipo> obtenerTodosLosMiembros() {
        return miembroEquipoRepository.findAll();
    }

    public boolean eliminarMiembroEquipo(Long idEquipo, Long idUsuario) {
        MiembroEquipo miembroEquipo = new MiembroEquipo();
        miembroEquipo.getEquipo().setIdEquipo(idEquipo);
        miembroEquipo.getUsuario().setIdUsuario(idUsuario);
        
        try {
            miembroEquipoRepository.delete(miembroEquipo);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
