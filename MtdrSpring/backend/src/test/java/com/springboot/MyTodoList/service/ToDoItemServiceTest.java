package com.springboot.MyTodoList.service;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
public class ToDoItemServiceTest {

    @Mock
    private ToDoItemRepository repository;

    @InjectMocks
    private ToDoItemService service;

    private Tarea crearTareaSimulada(long id, String titulo, String descripcion) {
        Tarea tarea = new Tarea();
        tarea.setIdTarea(id);
        tarea.setTitulo(titulo);
        tarea.setDescripcion(descripcion);
        return tarea;
    }

    @Test
    void testListarTodo_retornaItems() {
        Tarea tareaSimulada = crearTareaSimulada(10L, "Tarea Mock", "Descripcion de prueba");

        when(repository.findAll()).thenReturn(Collections.singletonList(tareaSimulada));

        List<ToDoItem> resultado = service.listarTodo();

        assertNotNull(resultado);
        assertEquals(1, resultado.size());
        assertEquals("Tarea Mock", resultado.get(0).getTitulo());
        verify(repository, times(1)).findAll();
    }

    @Test
    void testGetItemById_encontrado_retornaOk() {
        Tarea tareaSimulada = crearTareaSimulada(20L, "Tarea Encontrada", null);

        when(repository.findById(20L)).thenReturn(Optional.of(tareaSimulada));

        assertEquals(20, service.getItemById(20).getBody().getID());
        assertTrue(service.getItemById(20).getStatusCode().is2xxSuccessful());
        verify(repository, times(2)).findById(20L);
    }

    @Test
    void testGetItemById_noEncontrado_retornaNotFound() {
        when(repository.findById(30L)).thenReturn(Optional.empty());

        assertTrue(service.getItemById(30).getStatusCode().is4xxClientError());
        verify(repository, times(1)).findById(30L);
    }

    @Test
    void testAddToDoItem_guardaYRetorna() {
        Tarea tarea = crearTareaSimulada(0L, "Nueva tarea", null);
        ToDoItem item = new ToDoItem(tarea);

        when(repository.save(tarea)).thenReturn(tarea);

        ToDoItem resultado = service.addToDoItem(item);

        assertNotNull(resultado);
        assertEquals("Nueva tarea", resultado.getTitulo());
        verify(repository, times(1)).save(tarea);
    }

    @Test
    void testUpdateToDoItem_actualizaItemExistente() {
        Tarea tareaExistente = crearTareaSimulada(40L, "Original", "Original desc");

        ToDoItem update = new ToDoItem();
        update.setTitulo("Actualizada");
        update.setDescription("Nueva descripcion");

        when(repository.findById(40L)).thenReturn(Optional.of(tareaExistente));
        when(repository.save(tareaExistente)).thenReturn(tareaExistente);

        ToDoItem resultado = service.updateToDoItem(40, update);

        assertNotNull(resultado);
        assertEquals("Actualizada", resultado.getTitulo());
        assertEquals("Nueva descripcion", resultado.getDescription());
        verify(repository, times(1)).findById(40L);
        verify(repository, times(1)).save(tareaExistente);
    }

    @Test
    void testDeleteToDoItem_existente_retornaTrue() {
        when(repository.existsById(50L)).thenReturn(true);

        boolean resultado = service.deleteToDoItem(50);

        assertTrue(resultado);
        verify(repository, times(1)).existsById(50L);
        verify(repository, times(1)).deleteById(50L);
    }

    @Test
    void testDeleteToDoItem_noExistente_retornaFalse() {
        when(repository.existsById(60L)).thenReturn(false);

        boolean resultado = service.deleteToDoItem(60);

        assertFalse(resultado);
        verify(repository, times(1)).existsById(60L);
        verify(repository, times(0)).deleteById(anyLong());
    }
}
