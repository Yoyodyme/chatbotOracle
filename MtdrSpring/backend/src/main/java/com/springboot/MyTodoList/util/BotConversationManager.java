package com.springboot.MyTodoList.util;

import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring-managed singleton that stores active multi-step conversation states
 * indexed by Telegram chat ID. Thread-safe via ConcurrentHashMap.
 */
@Component
public class BotConversationManager {

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
}
