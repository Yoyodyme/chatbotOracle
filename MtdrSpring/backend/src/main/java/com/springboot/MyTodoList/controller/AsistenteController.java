package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.agent.AgentOrchestrator;
import com.springboot.MyTodoList.dto.ChatRequest;
import com.springboot.MyTodoList.dto.ChatResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST del asistente conversacional.
 * Expone el endpoint POST /api/asistente/chat que recibe un mensaje
 * del usuario y devuelve la respuesta generada por el AgentOrchestrator.
 */
@RestController
@RequestMapping("/api/asistente")
public class AsistenteController {

    private final AgentOrchestrator orquestador;

    public AsistenteController(AgentOrchestrator orquestador) {
        this.orquestador = orquestador;
    }

    /**
     * Procesa un mensaje del usuario y devuelve la respuesta del asistente.
     *
     * @param solicitud Cuerpo JSON con el campo "mensaje"
     * @return Respuesta HTTP 200 con el campo "respuesta" en JSON
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest solicitud) {
        String respuesta = orquestador.manejarMensaje(solicitud.getMensaje());
        return ResponseEntity.ok(new ChatResponse(respuesta));
    }
}
