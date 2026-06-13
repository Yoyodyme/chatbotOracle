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

/**
 * Business logic layer for account management; handles credential verification,
 * OCI Identity auto-registration, and Telegram account linking.
 *
 * <pre>
 * SQL — run in OCI Database Actions before enabling local login:
 *
 *   ALTER TABLE USUARIOS ADD PASSWORD_HASH VARCHAR2(255);
 *   UPDATE USUARIOS SET PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
 *   COMMIT;
 *
 *   The hash above corresponds to the password '1234' encoded with BCrypt.
 * </pre>
 */
@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Persists a new account record.
     *
     * @param usuario the entity to save
     * @return the saved instance with the generated surrogate key populated
     */
    public Usuario crearUsuario(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    /**
     * Looks up a single account by its surrogate key.
     *
     * @param id the surrogate key to search for
     * @return the matching entity, or {@code null} when no record exists for the given key
     */
    public Usuario obtenerUsuarioPorId(Long id) {
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        return usuario.orElse(null);
    }

    /**
     * Finds an account by its login handle.
     *
     * @param nombreUsuario the login handle to search for
     * @return the matching entity, or {@code null} when no record exists for the given handle
     */
    public Usuario obtenerUsuarioPorNombreUsuario(String nombreUsuario) {
        return usuarioRepository.findByNombreUsuario(nombreUsuario);
    }

    /**
     * Resolves the internal account linked to a given external integration identifier.
     *
     * @param idIntegration the external identifier (e.g. Telegram chat ID)
     * @return the matching entity, or {@code null} when no record is linked to that identifier
     */
    public Usuario obtenerUsuarioPorIdIntegration(String idIntegration) {
        return usuarioRepository.findByIdIntegrationUsuario(idIntegration).orElse(null);
    }

    /**
     * Looks up the account linked to a Telegram chat identifier.
     *
     * @param telegramId the Telegram chat ID to search for
     * @return an {@link Optional} containing the account, or empty when none is linked
     */
    public Optional<Usuario> buscarPorTelegramId(String telegramId) {
        return usuarioRepository.findByIdIntegrationUsuario(telegramId);
    }

    /**
     * Looks up the account linked to an OCI Identity subject claim.
     *
     * @param ociSubject the OCI subject claim value to search for
     * @return an {@link Optional} containing the account, or empty when none is linked
     */
    public Optional<Usuario> buscarPorOciSubject(String ociSubject) {
        return usuarioRepository.findByOciSubject(ociSubject);
    }

    /**
     * Creates a minimal account from OCI Identity attributes, deferring role assignment.
     * Intended to be called on the first successful OCI login from an unknown subject.
     *
     * @param ociSubject     OCI Identity subject claim
     * @param nombreUsuario  login handle derived from the OCI token
     * @param nombreCompleto display name derived from the OCI token
     * @return the newly persisted account
     */
    @Transactional
    public Usuario autoRegistrarDesdeOci(String ociSubject, String nombreUsuario, String nombreCompleto) {
        Usuario nuevo = new Usuario();
        nuevo.setOciSubject(ociSubject);
        nuevo.setNombreUsuario(nombreUsuario);
        nuevo.setNombreCompleto(nombreCompleto);
        nuevo.setRol(null);
        return usuarioRepository.save(nuevo);
    }

    /**
     * Creates a minimal account from a Telegram user, deferring role assignment.
     * Intended to be called on the first message from an unrecognised Telegram user.
     *
     * @param telegramId     Telegram chat ID to store as the integration identifier
     * @param nombreUsuario  username from the Telegram update
     * @param nombreCompleto display name from the Telegram update
     * @return the newly persisted account
     */
    @Transactional
    public Usuario autoRegistrarUsuario(String telegramId, String nombreUsuario, String nombreCompleto) {
        Usuario nuevo = new Usuario();
        nuevo.setIdIntegrationUsuario(telegramId);
        nuevo.setNombreUsuario(nombreUsuario);
        nuevo.setNombreCompleto(nombreCompleto);
        nuevo.setRol(null);
        return usuarioRepository.save(nuevo);
    }

    /**
     * Returns every account in the system.
     *
     * @return list of all accounts; empty when no records exist
     */
    public List<Usuario> obtenerTodosLosUsuarios() {
        return usuarioRepository.findAll();
    }

    /**
     * Applies a partial update: only non-null fields from {@code usuarioActualizado}
     * are written; existing values are preserved for null fields.
     *
     * @param id                  surrogate key identifying the record to update
     * @param usuarioActualizado  carrier object whose non-null fields will be applied
     * @return the updated entity after being re-persisted, or {@code null} when the ID is unknown
     */
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

    /**
     * Authenticates by login handle and plain-text password against the stored BCrypt hash.
     *
     * @param nombreUsuario the login handle
     * @param password      the plain-text password to verify
     * @return a summary map with account details on success, or {@code null} on bad credentials
     */
    public Map<String, Object> login(String nombreUsuario, String password) {
        Usuario usuario = usuarioRepository.findByNombreUsuario(nombreUsuario);
        if (usuario == null || usuario.getPasswordHash() == null) return null;
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        if (!encoder.matches(password, usuario.getPasswordHash())) return null;
        return buildUserInfo(usuario);
    }

    /**
     * Validates credentials and returns the matched entity; intended for programmatic auth checks.
     *
     * @param nombreUsuario the login handle
     * @param password      the plain-text password to verify
     * @return the matched entity on success, or {@code null} on bad credentials
     */
    public Usuario autenticar(String nombreUsuario, String password) {
        Usuario usuario = usuarioRepository.findByNombreUsuario(nombreUsuario);
        if (usuario == null || usuario.getPasswordHash() == null) return null;
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        return encoder.matches(password, usuario.getPasswordHash()) ? usuario : null;
    }

    /**
     * Registers a new local account with a BCrypt-hashed password.
     *
     * @param nombreUsuario  the desired login handle; must be unique
     * @param nombreCompleto the display name
     * @param password       the plain-text password; stored only as its BCrypt hash
     * @return the newly persisted account
     * @throws IllegalArgumentException when the login handle is already taken
     */
    @Transactional
    public Usuario crearUsuarioLocal(String nombreUsuario, String nombreCompleto, String password) {
        if (usuarioRepository.findByNombreUsuario(nombreUsuario) != null) {
            throw new IllegalArgumentException("Username already exists: " + nombreUsuario);
        }
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        Usuario nuevo = new Usuario();
        nuevo.setNombreUsuario(nombreUsuario);
        nuevo.setNombreCompleto(nombreCompleto);
        nuevo.setPasswordHash(encoder.encode(password));
        return usuarioRepository.save(nuevo);
    }

    /**
     * Builds a summary map for the given account surrogate key.
     *
     * @param idUsuario the surrogate key of the account to summarise
     * @return a map with display fields, or {@code null} when the ID is unknown
     */
    public Map<String, Object> getUserInfo(Long idUsuario) {
        Usuario usuario = obtenerUsuarioPorId(idUsuario);
        if (usuario == null) return null;
        return buildUserInfo(usuario);
    }

    /**
     * Removes an account by its surrogate key if it exists.
     *
     * @param id the surrogate key of the record to remove
     * @return {@code true} when found and deleted; {@code false} when the ID is unknown
     */
    public boolean eliminarUsuario(Long id) {
        if (usuarioRepository.existsById(id)) {
            usuarioRepository.deleteById(id);
            return true;
        }
        return false;
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
}
