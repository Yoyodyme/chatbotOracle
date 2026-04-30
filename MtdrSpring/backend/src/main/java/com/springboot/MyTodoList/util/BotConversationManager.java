package com.springboot.MyTodoList.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring-managed singleton que almacena:
 * 1. Los estados activos de conversaciones multi-paso del bot (por chatId).
 * 2. El historial de mensajes LLM por sesión de chat, para dar contexto
 *    conversacional a los modelos de lenguaje (independiente del estado de flujo).
 *
 * Thread-safe via ConcurrentHashMap.
 */
@Component
public class BotConversationManager {

    // -------------------------------------------------------------------------
    // Estado de flujos multi-paso (bot de Telegram)
    // -------------------------------------------------------------------------

    private final ConcurrentHashMap<Long, ConversationState> estadosActivos = new ConcurrentHashMap<>();

    public void iniciarConversacion(long chatId, ConversationState estado) {
        estadosActivos.put(chatId, estado);
    }

    public ConversationState obtenerEstado(long chatId) {
        return estadosActivos.get(chatId);
    }

    public boolean tieneConversacionActiva(long chatId) {
        return estadosActivos.containsKey(chatId);
    }

    public void terminarConversacion(long chatId) {
        estadosActivos.remove(chatId);
    }

    // -------------------------------------------------------------------------
    // Historial LLM por chat (contexto conversacional multi-turno)
    // -------------------------------------------------------------------------

    /**
     * Almacena el historial de mensajes LLM por chatId.
     * Cada entrada es un mapa con las claves "role" y "content",
     * siguiendo el formato estándar de la API de OpenAI/DeepSeek.
     */
    private final ConcurrentHashMap<Long, List<Map<String, String>>> historialLlmPorChat =
            new ConcurrentHashMap<>();

    /**
     * Agrega un mensaje al historial LLM de un chat.
     * Si el historial supera 10 mensajes, elimina los más antiguos para
     * mantener sólo los últimos 10 (ventana deslizante).
     *
     * @param chatId  identificador del chat de Telegram
     * @param role    rol del mensaje: "user" o "assistant"
     * @param content contenido del mensaje
     */
    public void agregarAlHistorialLlm(long chatId, String role, String content) {
        historialLlmPorChat
                .computeIfAbsent(chatId, k -> new ArrayList<>())
                .add(Map.of("role", role, "content", content));

        List<Map<String, String>> historial = historialLlmPorChat.get(chatId);
        if (historial.size() > 10) {
            historial.subList(0, historial.size() - 10).clear();
        }
    }

    /**
     * Devuelve el historial LLM asociado al chatId, o una lista vacía si no existe.
     *
     * @param chatId identificador del chat de Telegram
     * @return lista de mensajes (puede estar vacía)
     */
    public List<Map<String, String>> obtenerHistorialLlm(long chatId) {
        return historialLlmPorChat.getOrDefault(chatId, new ArrayList<>());
    }

    /**
     * Elimina el historial LLM de un chat (útil al cerrar una sesión o
     * cuando el usuario inicia una nueva conversación desde cero).
     *
     * @param chatId identificador del chat de Telegram
     */
    public void limpiarHistorialLlm(long chatId) {
        historialLlmPorChat.remove(chatId);
    }
}
