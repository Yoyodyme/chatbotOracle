package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.MiembroEquipo;
import com.springboot.MyTodoList.model.MiembroEquipoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MiembroEquipoRepository extends JpaRepository<MiembroEquipo, MiembroEquipoId> {
    List<MiembroEquipo> findByEquipoIdEquipo(Long idEquipo);
    List<MiembroEquipo> findByUsuarioIdUsuario(Long idUsuario);
}
