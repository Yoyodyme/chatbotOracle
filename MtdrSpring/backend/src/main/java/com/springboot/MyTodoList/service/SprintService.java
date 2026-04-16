package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SprintService {

    @Autowired
    private SprintRepository sprintRepository;

    public Sprint crearSprint(Sprint sprint) {
        return sprintRepository.save(sprint);
    }

    public Optional<Sprint> obtenerSprintActivo() {
        return sprintRepository.findFirstByActivoTrueOrderByFechaInicioDesc();
    }

    public List<Sprint> obtenerTodosLosSprints() {
        return sprintRepository.findAllByOrderByFechaInicioDesc();
    }

    public Optional<Sprint> obtenerSprintPorId(Long idSprint) {
        return sprintRepository.findById(idSprint);
    }

    public Sprint actualizarSprint(Long idSprint, Sprint sprintActualizado) {
        return sprintRepository.findById(idSprint).map(sprint -> {
            if (sprintActualizado.getNombre() != null) sprint.setNombre(sprintActualizado.getNombre());
            if (sprintActualizado.getFechaInicio() != null) sprint.setFechaInicio(sprintActualizado.getFechaInicio());
            if (sprintActualizado.getFechaFin() != null) sprint.setFechaFin(sprintActualizado.getFechaFin());
            if (sprintActualizado.getActivo() != null) sprint.setActivo(sprintActualizado.getActivo());
            return sprintRepository.save(sprint);
        }).orElse(null);
    }
}
