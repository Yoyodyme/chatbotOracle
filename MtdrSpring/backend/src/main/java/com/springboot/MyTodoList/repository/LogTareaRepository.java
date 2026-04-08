package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.LogTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LogTareaRepository extends JpaRepository<LogTarea, Long> {
    List<LogTarea> findByTareaIdTarea(Long idTarea);
    List<LogTarea> findByUsuarioIdUsuario(Long idUsuario);
}
