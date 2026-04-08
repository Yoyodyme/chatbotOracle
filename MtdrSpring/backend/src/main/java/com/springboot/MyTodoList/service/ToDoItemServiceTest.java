package com.springboot.MyTodoList.service;

// Importaciones necesarias para JUnit 5 y Mockito
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Arrays;
import java.util.List;

@ExtendWith(MockitoExtension.class) // 1. Indica que usaremos Mockito
public class ToDoItemServiceTest {

    @Mock
    private ToDoItemRepository repository; // 2. Crea el "falso" Repositorio

    @InjectMocks
    private ToDoItemService service; // 3. Inyecta el falso Repositorio dentro de tu Service real

    @Test
    void testListarTareas() {
        // --- ARRANGE (Preparar) ---
        ToDoItem tareaSimulada = new ToDoItem();
        tareaSimulada.setID(10);
        tareaSimulada.setTitulo("Tarea Mock");
        
        // Aquí le decimos a Mockito qué responder
        when(repository.findAll()).thenReturn(Arrays.asList(tareaSimulada));

        // --- ACT (Ejecutar) ---
        List<ToDoItem> resultado = service.listarTodo();

        // --- ASSERT (Verificar) ---
        assertNotNull(resultado); // Verifica que no sea nulo
        assertEquals(1, resultado.size()); // Verifica que traiga 1 elemento
        assertEquals("Tarea Mock", resultado.get(0).getTitulo()); // Verifica el contenido
        
        // Verifica que el Service realmente llamó al método findAll del repositorio
        verify(repository, times(1)).findAll();
    }
}