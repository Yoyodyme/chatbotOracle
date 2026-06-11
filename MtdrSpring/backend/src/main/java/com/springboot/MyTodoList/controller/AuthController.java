package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.LocalJwtService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String FIELD_ERROR          = "error";
    private static final String FIELD_NOMBRE_USUARIO = "nombreUsuario";
    private static final String FIELD_NOMBRE_COMPLETO = "nombreCompleto";

    private final UsuarioService  usuarioService;
    private final LocalJwtService localJwtService;

    public AuthController(UsuarioService usuarioService, LocalJwtService localJwtService) {
        this.usuarioService  = usuarioService;
        this.localJwtService = localJwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String nombreUsuario = body.get(FIELD_NOMBRE_USUARIO);
        String password      = body.get("password");

        if (nombreUsuario == null || password == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(FIELD_ERROR, "nombreUsuario and password are required"));
        }

        Usuario usuario = usuarioService.autenticar(nombreUsuario, password);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(FIELD_ERROR, "Invalid credentials"));
        }

        try {
            String token = localJwtService.generateToken(usuario);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("token",              token);
            result.put("idUsuario",          usuario.getIdUsuario());
            result.put(FIELD_NOMBRE_USUARIO, usuario.getNombreUsuario());
            result.put(FIELD_NOMBRE_COMPLETO, usuario.getNombreCompleto());
            result.put("rol", usuario.getRol() != null ? usuario.getRol().getNombre() : null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(FIELD_ERROR, "Token generation failed"));
        }
    }

    // Creates a local (non-OCI) user with a BCrypt-hashed password.
    // In production, protect this endpoint or call it once per user via Swagger.
    @PostMapping("/users")
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody Map<String, Object> body) {
        String nombreUsuario  = (String) body.get(FIELD_NOMBRE_USUARIO);
        String nombreCompleto = (String) body.get(FIELD_NOMBRE_COMPLETO);
        String password       = (String) body.get("password");

        if (nombreUsuario == null || password == null) {
            return ResponseEntity.badRequest()
                .body(Map.of(FIELD_ERROR, "nombreUsuario and password are required"));
        }

        try {
            Usuario created = usuarioService.crearUsuarioLocal(nombreUsuario, nombreCompleto, password);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("idUsuario",           created.getIdUsuario());
            result.put(FIELD_NOMBRE_USUARIO,  created.getNombreUsuario());
            result.put(FIELD_NOMBRE_COMPLETO, created.getNombreCompleto());
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(FIELD_ERROR, e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@RequestParam Long idUsuario) {
        Map<String, Object> result = usuarioService.getUserInfo(idUsuario);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(FIELD_ERROR, "User not found"));
        }
        return ResponseEntity.ok(result);
    }
}
