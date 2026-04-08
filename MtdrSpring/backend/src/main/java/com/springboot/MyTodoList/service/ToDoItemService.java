package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ToDoItemService {
    @Autowired
    private ToDoItemRepository repository;

    public ToDoItem guardar(ToDoItem item) {
        return repository.save(item);
    }

    public List<ToDoItem> listarTodo() {
        return repository.findAll();
    }

    public List<ToDoItem> findAll() {
        return repository.findAll();
    }

    public ResponseEntity<ToDoItem> getItemById(int id) {
        Optional<ToDoItem> item = repository.findById(id);
        if (item.isPresent()) {
            return new ResponseEntity<>(item.get(), HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    public ToDoItem getToDoItemById(Integer id) {
        Optional<ToDoItem> item = repository.findById(id);
        return item.orElse(null);
    }

    public ToDoItem addToDoItem(ToDoItem item) {
        return repository.save(item);
    }

    public ToDoItem updateToDoItem(int id, ToDoItem toDoItem) {
        Optional<ToDoItem> existingItem = repository.findById(id);
        if (existingItem.isPresent()) {
            ToDoItem item = existingItem.get();
            if (toDoItem.getTitulo() != null) {
                item.setTitulo(toDoItem.getTitulo());
            }
            if (toDoItem.getDescription() != null) {
                item.setDescription(toDoItem.getDescription());
            }
            item.setDone(toDoItem.isDone());
            if (toDoItem.getCreation_ts() != null) {
                item.setCreation_ts(toDoItem.getCreation_ts());
            }
            return repository.save(item);
        }
        return null;
    }

    public boolean deleteToDoItem(int id) {
        try {
            if (repository.existsById(id)) {
                repository.deleteById(id);
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