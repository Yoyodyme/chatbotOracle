package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    Equipo findByNombre(String nombre);
}
