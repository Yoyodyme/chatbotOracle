package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TareaRepository extends JpaRepository<Tarea, Long> {
    List<Tarea> findByUsuarioAsignadoIdUsuario(Long idUsuario);
    List<Tarea> findByUsuarioCreadorIdUsuario(Long idUsuario);
    List<Tarea> findByEstatusIdEstatus(Long idEstatus);
    List<Tarea> findByPrioridadIdPrioridad(Long idPrioridad);
    List<Tarea> findBySprintIdSprint(Long idSprint);
    List<Tarea> findBySprintIdSprintAndUsuarioAsignadoIdUsuario(Long idSprint, Long idUsuario);
    List<Tarea> findByEstatusNombreIgnoreCaseAndUsuarioAsignadoIdUsuario(String nombreEstatus, Long idUsuario);

    @Query("SELECT t FROM Tarea t WHERE t.usuarioAsignado.idUsuario = :idUsuario AND LOWER(t.estatus.nombre) IN :estatuses")
    List<Tarea> findByUsuarioAsignadoAndEstatusNombres(@Param("idUsuario") Long idUsuario, @Param("estatuses") List<String> estatuses);
}
