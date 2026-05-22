package com.springboot.MyTodoList.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring-managed singleton that stores:
 * 1. Active states of multi-step bot conversations (per chatId).
 * 2. LLM message history per chat session, to provide conversational context
 *    to language models (independent of the flow state).
 *
 * Thread-safe via ConcurrentHashMap.
 */
@Component
public class BotConversationManager {

    // -------------------------------------------------------------------------
    // Multi-step flow state (Telegram bot)
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
    // LLM history per chat (multi-turn conversational context)
    // -------------------------------------------------------------------------

    /**
     * Stores the LLM message history per chatId.
     * Each entry is a map with the keys "role" and "content",
     * following the standard format of the OpenAI/DeepSeek API.
     */
    private final ConcurrentHashMap<Long, List<Map<String, String>>> historialLlmPorChat =
            new ConcurrentHashMap<>();

    /**
     * Adds a message to the LLM history of a chat.
     * If the history exceeds 10 messages, the oldest ones are removed to
     * keep only the last 10 (sliding window).
     *
     * @param chatId  Telegram chat identifier
     * @param role    message role: "user" or "assistant"
     * @param content message content
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
     * Returns the LLM history associated with a chatId, or an empty list if none exists.
     *
     * @param chatId Telegram chat identifier
     * @return list of messages (may be empty)
     */
    public List<Map<String, String>> obtenerHistorialLlm(long chatId) {
        return historialLlmPorChat.getOrDefault(chatId, new ArrayList<>());
    }

    /**
     * Clears the LLM history for a chat (useful when closing a session or
     * when the user starts a new conversation from scratch).
     *
     * @param chatId Telegram chat identifier
     */
    public void limpiarHistorialLlm(long chatId) {
        historialLlmPorChat.remove(chatId);
    }
}
