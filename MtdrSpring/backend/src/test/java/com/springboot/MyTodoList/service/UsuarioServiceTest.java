package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Rol;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.UsuarioRepository;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private UsuarioService usuarioService;

    private Usuario usuarioMock;

    @BeforeEach
    void setUp() {
        Rol rol = new Rol();
        rol.setIdRol(1L);
        rol.setNombre("Developer");

        usuarioMock = new Usuario();
        usuarioMock.setIdUsuario(1L);
        usuarioMock.setNombreUsuario("gabriel.peres");
        usuarioMock.setNombreCompleto("Gabriel Peres Baptista");
        usuarioMock.setIdIntegrationUsuario("7967344809");
        usuarioMock.setRol(rol);
    }

    @Test
    void obtenerTodosLosUsuarios_returnsPopulatedList() {
        when(usuarioRepository.findAll()).thenReturn(List.of(usuarioMock));

        List<Usuario> result = usuarioService.obtenerTodosLosUsuarios();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("gabriel.peres", result.get(0).getNombreUsuario());
    }

    @Test
    void obtenerTodosLosUsuarios_returnsEmptyList() {
        when(usuarioRepository.findAll()).thenReturn(List.of());

        List<Usuario> result = usuarioService.obtenerTodosLosUsuarios();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void obtenerUsuarioPorId_found_returnsUsuario() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioMock));

        Usuario result = usuarioService.obtenerUsuarioPorId(1L);

        assertNotNull(result);
        assertEquals("Gabriel Peres Baptista", result.getNombreCompleto());
    }

    @Test
    void obtenerUsuarioPorId_notFound_returnsNull() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        Usuario result = usuarioService.obtenerUsuarioPorId(99L);

        assertNull(result);
    }

    @Test
    void buscarPorTelegramId_found_returnsUsuario() {
        when(usuarioRepository.findByIdIntegrationUsuario("7967344809"))
                .thenReturn(Optional.of(usuarioMock));

        Optional<Usuario> result = usuarioService.buscarPorTelegramId("7967344809");

        assertTrue(result.isPresent());
        assertEquals(1L, result.get().getIdUsuario());
    }

    @Test
    void buscarPorTelegramId_notFound_returnsEmpty() {
        when(usuarioRepository.findByIdIntegrationUsuario(anyString()))
                .thenReturn(Optional.empty());

        Optional<Usuario> result = usuarioService.buscarPorTelegramId("id_inexistente");

        assertFalse(result.isPresent());
    }

    @Test
    void crearUsuario_savesAndReturns() {
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuarioMock);

        Usuario result = usuarioService.crearUsuario(usuarioMock);

        assertNotNull(result);
        assertEquals("gabriel.peres", result.getNombreUsuario());
        verify(usuarioRepository, times(1)).save(any(Usuario.class));
    }

    @Test
    void eliminarUsuario_existing_returnsTrue() {
        when(usuarioRepository.existsById(1L)).thenReturn(true);
        doNothing().when(usuarioRepository).deleteById(1L);

        boolean result = usuarioService.eliminarUsuario(1L);

        assertTrue(result);
        verify(usuarioRepository, times(1)).deleteById(1L);
    }

    @Test
    void eliminarUsuario_nonExisting_returnsFalse() {
        when(usuarioRepository.existsById(99L)).thenReturn(false);

        boolean result = usuarioService.eliminarUsuario(99L);

        assertFalse(result);
        verify(usuarioRepository, never()).deleteById(any());
    }

    @Test
    void actualizarUsuario_existing_updatesFields() {
        Usuario updates = new Usuario();
        updates.setNombreCompleto("Gabriel Actualizado");
        updates.setNombreUsuario("gabriel.nuevo");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuarioMock));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario result = usuarioService.actualizarUsuario(1L, updates);

        assertNotNull(result);
        assertEquals("Gabriel Actualizado", result.getNombreCompleto());
        assertEquals("gabriel.nuevo", result.getNombreUsuario());
    }

    @Test
    void actualizarUsuario_nonExisting_returnsNull() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        Usuario result = usuarioService.actualizarUsuario(99L, new Usuario());

        assertNull(result);
        verify(usuarioRepository, never()).save(any());
    }
}
