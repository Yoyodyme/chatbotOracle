package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.ComentarioTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComentarioTareaRepository extends JpaRepository<ComentarioTarea, Long> {
    List<ComentarioTarea> findByTareaIdTarea(Long idTarea);
    List<ComentarioTarea> findByUsuarioAutorIdUsuario(Long idUsuario);
}
