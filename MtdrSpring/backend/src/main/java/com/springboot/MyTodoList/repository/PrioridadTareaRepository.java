package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.PrioridadTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PrioridadTareaRepository extends JpaRepository<PrioridadTarea, Long> {
    PrioridadTarea findByNombre(String nombre);
}
