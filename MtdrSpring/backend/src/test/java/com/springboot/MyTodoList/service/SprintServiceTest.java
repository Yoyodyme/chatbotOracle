package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.repository.SprintRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    @Mock
    private SprintRepository sprintRepository;

    @InjectMocks
    private SprintService sprintService;

    private Sprint sprintMock;

    @BeforeEach
    void setUp() {
        sprintMock = new Sprint();
        sprintMock.setIdSprint(1L);
        sprintMock.setNombre("Sprint 1");
        sprintMock.setEstado("current");
        sprintMock.setFechaInicio(LocalDate.now().minusDays(7));
        sprintMock.setFechaFin(LocalDate.now().plusDays(7));
    }

    @Test
    void obtenerTodosLosSprints_returnsPopulatedList() {
        when(sprintRepository.findAllByOrderByFechaInicioDesc()).thenReturn(List.of(sprintMock));

        List<Sprint> result = sprintService.obtenerTodosLosSprints();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Sprint 1", result.get(0).getNombre());
    }

    @Test
    void obtenerTodosLosSprints_returnsEmptyList() {
        when(sprintRepository.findAllByOrderByFechaInicioDesc()).thenReturn(List.of());

        List<Sprint> result = sprintService.obtenerTodosLosSprints();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void obtenerSprintActivo_found_returnsSprint() {
        when(sprintRepository.findFirstByEstadoOrderByFechaInicioDesc("current"))
                .thenReturn(Optional.of(sprintMock));

        Optional<Sprint> result = sprintService.obtenerSprintActivo();

        assertTrue(result.isPresent());
        assertEquals("current", result.get().getEstado());
        assertEquals("Sprint 1", result.get().getNombre());
    }

    @Test
    void obtenerSprintActivo_notFound_returnsEmpty() {
        when(sprintRepository.findFirstByEstadoOrderByFechaInicioDesc("current"))
                .thenReturn(Optional.empty());

        Optional<Sprint> result = sprintService.obtenerSprintActivo();

        assertFalse(result.isPresent());
    }

    @Test
    void crearSprint_savesAndReturns() {
        when(sprintRepository.save(any(Sprint.class))).thenReturn(sprintMock);

        Sprint result = sprintService.crearSprint(sprintMock);

        assertNotNull(result);
        assertEquals("Sprint 1", result.getNombre());
        verify(sprintRepository, times(1)).save(any(Sprint.class));
    }

    @Test
    void eliminarSprint_existing_returnsTrue() {
        when(sprintRepository.existsById(1L)).thenReturn(true);
        doNothing().when(sprintRepository).deleteById(1L);

        boolean result = sprintService.eliminarSprint(1L);

        assertTrue(result);
        verify(sprintRepository, times(1)).deleteById(1L);
    }

    @Test
    void eliminarSprint_nonExisting_returnsFalse() {
        when(sprintRepository.existsById(99L)).thenReturn(false);

        boolean result = sprintService.eliminarSprint(99L);

        assertFalse(result);
        verify(sprintRepository, never()).deleteById(any());
    }

    @Test
    void actualizarSprint_existing_updatesFields() {
        Sprint updates = new Sprint();
        updates.setNombre("Sprint 2");
        updates.setEstado("PASADO");
        updates.setFechaFin(LocalDate.now());

        when(sprintRepository.findById(1L)).thenReturn(Optional.of(sprintMock));
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(inv -> inv.getArgument(0));

        Sprint result = sprintService.actualizarSprint(1L, updates);

        assertNotNull(result);
        assertEquals("Sprint 2", result.getNombre());
        assertEquals("PASADO", result.getEstado());
    }

    @Test
    void actualizarSprint_nonExisting_returnsNull() {
        when(sprintRepository.findById(99L)).thenReturn(Optional.empty());

        Sprint result = sprintService.actualizarSprint(99L, new Sprint());

        assertNull(result);
        verify(sprintRepository, never()).save(any());
    }
}
