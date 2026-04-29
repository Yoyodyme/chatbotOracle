package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio heredado del bot de Telegram.
 * Delega en {@link ToDoItemRepository} (que ahora usa la entidad {@link Tarea})
 * y adapta los resultados al wrapper {@link ToDoItem} que espera {@code BotActions}.
 */
@Service
public class ToDoItemService {

    @Autowired
    private ToDoItemRepository repository;

    private ToDoItem envolver(Tarea tarea) {
        return new ToDoItem(tarea);
    }

    private List<ToDoItem> envolverLista(List<Tarea> tareas) {
        return tareas.stream().map(this::envolver).collect(Collectors.toList());
    }

    public List<ToDoItem> listarTodo() {
        return envolverLista(repository.findAll());
    }

    public List<ToDoItem> findAll() {
        return envolverLista(repository.findAll());
    }

    public ResponseEntity<ToDoItem> getItemById(int id) {
        Optional<Tarea> item = repository.findById((long) id);
        if (item.isPresent()) {
            return new ResponseEntity<>(envolver(item.get()), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    public ToDoItem getToDoItemById(Integer id) {
        Optional<Tarea> item = repository.findById((long) id);
        return item.map(this::envolver).orElse(null);
    }

    public ToDoItem addToDoItem(ToDoItem item) {
        Tarea guardada = repository.save(item.getTarea());
        return envolver(guardada);
    }

    public ToDoItem updateToDoItem(int id, ToDoItem toDoItem) {
        Optional<Tarea> existente = repository.findById((long) id);
        if (existente.isPresent()) {
            Tarea tarea = existente.get();
            if (toDoItem.getTitulo() != null) {
                tarea.setTitulo(toDoItem.getTitulo());
            }
            if (toDoItem.getDescription() != null) {
                tarea.setDescripcion(toDoItem.getDescription());
            }
            // setDone es no-op en ToDoItem; el estatus real se gestiona via TareaBotActions
            Tarea guardada = repository.save(tarea);
            return envolver(guardada);
        }
        return null;
    }

    public boolean deleteToDoItem(int id) {
        try {
            if (repository.existsById((long) id)) {
                repository.deleteById((long) id);
                return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean deleteToDoItem(Integer id) {
        return deleteToDoItem(id.intValue());
    }
}