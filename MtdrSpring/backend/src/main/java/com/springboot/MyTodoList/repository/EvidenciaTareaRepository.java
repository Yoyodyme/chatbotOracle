package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.EvidenciaTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvidenciaTareaRepository extends JpaRepository<EvidenciaTarea, Long> {
    List<EvidenciaTarea> findByTareaIdTarea(Long idTarea);
    List<EvidenciaTarea> findByUsuarioSubioIdUsuario(Long idUsuario);
}
