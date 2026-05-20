package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.agent.AgentOrchestrator;
import com.springboot.MyTodoList.dto.ChatRequest;
import com.springboot.MyTodoList.dto.ChatResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST del asistente conversacional.
 * Expone el endpoint POST /api/asistente/chat que recibe un mensaje
 * del usuario y devuelve la respuesta generada por el AgentOrchestrator.
 *
 * Mantiene el historial de conversación LLM por sesión HTTP mediante
 * {@link HttpSession}, permitiendo respuestas multi-turno con contexto.
 * El historial se limita a los últimos 10 mensajes (5 turnos completos).
 */
@RestController
@RequestMapping("/api/asistente")
public class AsistenteController {

    private static final String CLAVE_HISTORIAL = "historialLlm";
    private static final int    MAX_HISTORIAL   = 10;

    private final AgentOrchestrator orquestador;

    public AsistenteController(AgentOrchestrator orquestador) {
        this.orquestador = orquestador;
    }

    /**
     * Procesa un mensaje del usuario y devuelve la respuesta del asistente.
     * El historial de la sesión se carga antes de llamar al orquestador y se
     * actualiza con el nuevo turno (usuario + asistente) al finalizar.
     *
     * @param solicitud Cuerpo JSON con el campo "mensaje" (y "historial" opcional)
     * @param sesion    Sesión HTTP del cliente, usada para persistir el historial
     * @return Respuesta HTTP 200 con el campo "respuesta" en JSON
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest solicitud,
                                             HttpSession sesion) {
        String mensaje = solicitud.getMensaje();

        // Cargar historial previo de la sesión
        List<Map<String, String>> historial = obtenerHistorialDeSesion(sesion);

        // Generar respuesta pasando el historial al orquestador
        String respuesta = orquestador.manejarMensaje(mensaje, historial);

        // Añadir el turno actual al historial y guardarlo de vuelta en la sesión
        historial.add(Map.of("role", "user",      "content", mensaje));
        historial.add(Map.of("role", "assistant",  "content", respuesta));
        if (historial.size() > MAX_HISTORIAL) {
            historial.subList(0, historial.size() - MAX_HISTORIAL).clear();
        }
        sesion.setAttribute(CLAVE_HISTORIAL, historial);

        return ResponseEntity.ok(new ChatResponse(respuesta));
    }

    /**
     * Recupera el historial LLM almacenado en la sesión HTTP.
     * Si no existe o el valor almacenado no es del tipo esperado, devuelve
     * una lista vacía mutable lista para recibir nuevas entradas.
     *
     * @param sesion Sesión HTTP del cliente
     * @return Lista mutable de mensajes (puede estar vacía)
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, String>> obtenerHistorialDeSesion(HttpSession sesion) {
        Object almacenado = sesion.getAttribute(CLAVE_HISTORIAL);
        if (almacenado instanceof List) {
            return (List<Map<String, String>>) almacenado;
        }
        return new ArrayList<>();
    }
}
