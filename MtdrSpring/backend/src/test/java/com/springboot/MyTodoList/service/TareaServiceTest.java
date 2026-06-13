package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.repository.TareaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TareaServiceTest {

    @Mock
    private TareaRepository tareaRepository;

    @InjectMocks
    private TareaService tareaService;

    private Tarea tareaMock;

    @BeforeEach
    void setUp() {
        EstatusTarea estatus = new EstatusTarea();
        estatus.setIdEstatus(1L);
        estatus.setNombre("Pending");

        tareaMock = new Tarea();
        tareaMock.setIdTarea(1L);
        tareaMock.setTitulo("Test Task");
        tareaMock.setDescripcion("Test Description");
        tareaMock.setHorasEstimadas(4.0);
        tareaMock.setEstatus(estatus);
    }

    @Test
    void obtenerTodosLasTareas_returnsPopulatedList() {
        when(tareaRepository.findAll()).thenReturn(List.of(tareaMock));

        List<Tarea> result = tareaService.obtenerTodosLasTareas();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Task", result.get(0).getTitulo());
        verify(tareaRepository, times(1)).findAll();
    }

    @Test
    void obtenerTodosLasTareas_returnsEmptyList() {
        when(tareaRepository.findAll()).thenReturn(List.of());

        List<Tarea> result = tareaService.obtenerTodosLasTareas();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void obtenerTareaPorId_found_returnsTarea() {
        when(tareaRepository.findById(1L)).thenReturn(Optional.of(tareaMock));

        Tarea result = tareaService.obtenerTareaPorId(1L);

        assertNotNull(result);
        assertEquals(1L, result.getIdTarea());
        assertEquals("Test Task", result.getTitulo());
    }

    @Test
    void obtenerTareaPorId_notFound_returnsNull() {
        when(tareaRepository.findById(99L)).thenReturn(Optional.empty());

        Tarea result = tareaService.obtenerTareaPorId(99L);

        assertNull(result);
    }

    @Test
    void crearTarea_savesAndReturns() {
        when(tareaRepository.save(any(Tarea.class))).thenReturn(tareaMock);

        Tarea result = tareaService.crearTarea(tareaMock);

        assertNotNull(result);
        assertEquals("Test Task", result.getTitulo());
        verify(tareaRepository, times(1)).save(any(Tarea.class));
    }

    @Test
    void crearTarea_trimsWhitespaceFromTituloAndDescripcion() {
        Tarea tareaConEspacios = new Tarea();
        tareaConEspacios.setTitulo("  Task con espacios  ");
        tareaConEspacios.setDescripcion("  Descripcion con espacios  ");

        when(tareaRepository.save(any(Tarea.class))).thenAnswer(inv -> inv.getArgument(0));

        Tarea result = tareaService.crearTarea(tareaConEspacios);

        assertEquals("Task con espacios", result.getTitulo());
        assertEquals("Descripcion con espacios", result.getDescripcion());
    }

    @Test
    void crearTarea_nullTituloAndDescripcion_doesNotThrow() {
        Tarea tareaSinStrings = new Tarea();

        when(tareaRepository.save(any(Tarea.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> tareaService.crearTarea(tareaSinStrings));
    }

    @Test
    void eliminarTarea_existing_returnsTrue() {
        when(tareaRepository.existsById(1L)).thenReturn(true);
        doNothing().when(tareaRepository).deleteById(1L);

        boolean result = tareaService.eliminarTarea(1L);

        assertTrue(result);
        verify(tareaRepository, times(1)).deleteById(1L);
    }

    @Test
    void eliminarTarea_nonExisting_returnsFalse() {
        when(tareaRepository.existsById(99L)).thenReturn(false);

        boolean result = tareaService.eliminarTarea(99L);

        assertFalse(result);
        verify(tareaRepository, never()).deleteById(any());
    }

    @Test
    void actualizarTarea_updatesFieldsAndTrimsStrings() {
        Tarea nuevosDatos = new Tarea();
        nuevosDatos.setTitulo("  Titulo Actualizado  ");
        nuevosDatos.setDescripcion("  Nueva descripcion  ");
        nuevosDatos.setHorasEstimadas(8.0);

        when(tareaRepository.findById(1L)).thenReturn(Optional.of(tareaMock));
        when(tareaRepository.save(any(Tarea.class))).thenAnswer(inv -> inv.getArgument(0));

        Tarea result = tareaService.actualizarTarea(1L, nuevosDatos);

        assertNotNull(result);
        assertEquals("Titulo Actualizado", result.getTitulo());
        assertEquals("Nueva descripcion", result.getDescripcion());
        assertEquals(8.0, result.getHorasEstimadas());
    }

    @Test
    void actualizarTarea_nonExisting_returnsNull() {
        when(tareaRepository.findById(99L)).thenReturn(Optional.empty());

        Tarea result = tareaService.actualizarTarea(99L, new Tarea());

        assertNull(result);
        verify(tareaRepository, never()).save(any());
    }
}
