package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import jakarta.transaction.Transactional;

/**
 * Repositorio heredado del bot.
 * Ahora respalda la entidad {@link Tarea} en lugar de ToDoItem para
 * eliminar el conflicto de doble @Entity sobre la tabla TAREAS.
 */
@Repository
@Transactional
@EnableTransactionManagement
public interface ToDoItemRepository extends JpaRepository<Tarea, Long> {

}
