package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    // Step 1 — Remove conflicting code
    // @PostMapping("/login")
    // public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
    //     String nombreUsuario = body.get("nombreUsuario");
    //     String password      = body.get("password");

    //     if (nombreUsuario == null || password == null) {
    //         Map<String, Object> err = new LinkedHashMap<>();
    //         err.put("error", "Credenciales invalidas");
    //         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
    //     }

    //     Map<String, Object> result = usuarioService.login(nombreUsuario, password);
    //     if (result == null) {
    //         Map<String, Object> err = new LinkedHashMap<>();
    //         err.put("error", "Credenciales invalidas");
    //         return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
    //     }
    //     return ResponseEntity.ok(result);
    // }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@RequestParam Long idUsuario) {
        Map<String, Object> result = usuarioService.getUserInfo(idUsuario);
        if (result == null) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("error", "Usuario no encontrado");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }
        return ResponseEntity.ok(result);
    }
}
