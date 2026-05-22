package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRIPT SQL — ejecutar en OCI Database Actions antes de usar el login:
 *
 *   ALTER TABLE USUARIOS ADD PASSWORD_HASH VARCHAR2(255);
 *   UPDATE USUARIOS SET PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
 *   COMMIT;
 *
 *   El hash corresponde a la contraseña '1234' con BCrypt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

    public Map<String, Object> login(String nombreUsuario, String password) {
        Usuario usuario = usuarioRepository.findByNombreUsuario(nombreUsuario);
        if (usuario == null || usuario.getPasswordHash() == null) return null;
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        if (!encoder.matches(password, usuario.getPasswordHash())) return null;
        return buildUserInfo(usuario);
    }

    public Map<String, Object> getUserInfo(Long idUsuario) {
        Usuario usuario = obtenerUsuarioPorId(idUsuario);
        if (usuario == null) return null;
        return buildUserInfo(usuario);
    }

    private Map<String, Object> buildUserInfo(Usuario usuario) {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("idUsuario",      usuario.getIdUsuario());
        info.put("nombreUsuario",  usuario.getNombreUsuario());
        info.put("nombreCompleto", usuario.getNombreCompleto());
        info.put("rol",    usuario.getRol() != null ? usuario.getRol().getNombre() : null);
        info.put("idRol",  usuario.getRol() != null ? usuario.getRol().getIdRol()  : null);
        return info;
    }

    public boolean eliminarUsuario(Long id) {
        if (usuarioRepository.existsById(id)) {
            usuarioRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
