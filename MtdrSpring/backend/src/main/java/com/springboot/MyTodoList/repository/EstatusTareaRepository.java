package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.EstatusTarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EstatusTareaRepository extends JpaRepository<EstatusTarea, Long> {
    EstatusTarea findByNombre(String nombre);
}
