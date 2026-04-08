package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TareaRepository extends JpaRepository<Tarea, Long> {
    List<Tarea> findByUsuarioAsignadoIdUsuario(Long idUsuario);
    List<Tarea> findByUsuarioCreadorIdUsuario(Long idUsuario);
    List<Tarea> findByEstatusIdEstatus(Long idEstatus);
    List<Tarea> findByPrioridadIdPrioridad(Long idPrioridad);
}
