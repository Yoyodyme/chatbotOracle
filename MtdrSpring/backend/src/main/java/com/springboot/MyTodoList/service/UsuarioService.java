package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;

    public Usuario crearUsuario(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    public Usuario obtenerUsuarioPorId(Long id) {
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        return usuario.orElse(null);
    }

    public Usuario obtenerUsuarioPorNombreUsuario(String nombreUsuario) {
        return usuarioRepository.findByNombreUsuario(nombreUsuario);
    }

    public Usuario obtenerUsuarioPorIdIntegration(String idIntegration) {
        return usuarioRepository.findByIdIntegrationUsuario(idIntegration).orElse(null);
    }

    public Optional<Usuario> buscarPorTelegramId(String telegramId) {
        return usuarioRepository.findByIdIntegrationUsuario(telegramId);
    }

    @Transactional
    public Usuario autoRegistrarUsuario(String telegramId, String nombreUsuario, String nombreCompleto) {
        Usuario nuevo = new Usuario();
        nuevo.setIdIntegrationUsuario(telegramId);
        nuevo.setNombreUsuario(nombreUsuario);
        nuevo.setNombreCompleto(nombreCompleto);
        nuevo.setRol(null);
        return usuarioRepository.save(nuevo);
    }

    public List<Usuario> obtenerTodosLosUsuarios() {
        return usuarioRepository.findAll();
    }

    public Usuario actualizarUsuario(Long id, Usuario usuarioActualizado) {
        Optional<Usuario> usuarioExistente = usuarioRepository.findById(id);
        if (usuarioExistente.isPresent()) {
            Usuario usuario = usuarioExistente.get();
            if (usuarioActualizado.getNombreUsuario() != null) {
                usuario.setNombreUsuario(usuarioActualizado.getNombreUsuario());
            }
            if (usuarioActualizado.getNombreCompleto() != null) {
                usuario.setNombreCompleto(usuarioActualizado.getNombreCompleto());
            }
            if (usuarioActualizado.getRol() != null) {
                usuario.setRol(usuarioActualizado.getRol());
            }
            if (usuarioActualizado.getIdIntegrationUsuario() != null) {
                usuario.setIdIntegrationUsuario(usuarioActualizado.getIdIntegrationUsuario());
            }
            return usuarioRepository.save(usuario);
        }
        return null;
    }

    public boolean eliminarUsuario(Long id) {
        if (usuarioRepository.existsById(id)) {
            usuarioRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
