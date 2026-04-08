package com.springboot.MyTodoList.service;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
public class ToDoItemServiceTest {

    @Mock
    private ToDoItemRepository repository;

    @InjectMocks
    private ToDoItemService service;

    @Test
    void testListarTodo_returnsItems() {
        ToDoItem tareaSimulada = new ToDoItem();
        tareaSimulada.setID(10);
        tareaSimulada.setTitulo("Tarea Mock");
        tareaSimulada.setDescription("Descripcion de prueba");
        tareaSimulada.setDone(false);
        tareaSimulada.setCreation_ts(OffsetDateTime.now());

        when(repository.findAll()).thenReturn(Collections.singletonList(tareaSimulada));

        List<ToDoItem> resultado = service.listarTodo();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        assertEquals("Tarea Mock", resultado.get(0).getTitulo());
        verify(repository, times(1)).findAll();
    }

    @Test
    void testGetItemById_found_returnsOk() {
        ToDoItem tareaSimulada = new ToDoItem();
        tareaSimulada.setID(20);
        tareaSimulada.setTitulo("Tarea Encontrada");

        when(repository.findById(20)).thenReturn(Optional.of(tareaSimulada));

        assertEquals(20, service.getItemById(20).getBody().getID());
        assertTrue(service.getItemById(20).getStatusCode().is2xxSuccessful());
        verify(repository, times(2)).findById(20);
    }

    @Test
    void testGetItemById_notFound_returnsNotFound() {
        when(repository.findById(30)).thenReturn(Optional.empty());

        assertTrue(service.getItemById(30).getStatusCode().is4xxClientError());
        verify(repository, times(1)).findById(30);
    }

    @Test
    void testAddToDoItem_savesAndReturns() {
        ToDoItem tarea = new ToDoItem();
        tarea.setTitulo("Nueva tarea");

        when(repository.save(tarea)).thenReturn(tarea);

        ToDoItem resultado = service.addToDoItem(tarea);

        assertNotNull(resultado);
        assertEquals("Nueva tarea", resultado.getTitulo());
        verify(repository, times(1)).save(tarea);
    }

    @Test
    void testUpdateToDoItem_updatesExistingItem() {
        ToDoItem existing = new ToDoItem();
        existing.setID(40);
        existing.setTitulo("Original");
        existing.setDescription("Original desc");
        existing.setDone(false);

        ToDoItem update = new ToDoItem();
        update.setTitulo("Actualizada");
        update.setDescription("Nueva descripción");
        update.setDone(true);

        when(repository.findById(40)).thenReturn(Optional.of(existing));
        when(repository.save(any(ToDoItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ToDoItem resultado = service.updateToDoItem(40, update);

        assertNotNull(resultado);
        assertEquals("Actualizada", resultado.getTitulo());
        assertEquals("Nueva descripción", resultado.getDescription());
        assertTrue(resultado.isDone());
        verify(repository, times(1)).findById(40);
        verify(repository, times(1)).save(existing);
    }

    @Test
    void testDeleteToDoItem_existing_returnsTrue() {
        when(repository.existsById(50)).thenReturn(true);

        boolean resultado = service.deleteToDoItem(50);

        assertTrue(resultado);
        verify(repository, times(1)).existsById(50);
        verify(repository, times(1)).deleteById(50);
    }

    @Test
    void testDeleteToDoItem_nonExisting_returnsFalse() {
        when(repository.existsById(60)).thenReturn(false);

        boolean resultado = service.deleteToDoItem(60);

        assertFalse(resultado);
        verify(repository, times(1)).existsById(60);
        verify(repository, times(0)).deleteById(anyInt());
    }
}
