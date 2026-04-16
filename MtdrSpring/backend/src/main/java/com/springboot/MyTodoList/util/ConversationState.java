package com.springboot.MyTodoList.util;

import java.util.HashMap;
import java.util.Map;

/**
 * Holds the multi-step conversation state for a single Telegram user.
 * Used to track progress through commands like /newtask, /assignsprint, /donetask.
 */
public class ConversationState {

    private String comando;   // "newtask" | "assignsprint" | "donetask"
    private int paso;         // current step (0-indexed)
    private Map<String, Object> datos;  // accumulated data during the conversation

    public ConversationState(String comando) {
        this.comando = comando;
        this.paso = 0;
        this.datos = new HashMap<>();
    }

    public String getComando() { return comando; }
    public int getPaso() { return paso; }
    public void avanzarPaso() { this.paso++; }
    public void setPaso(int paso) { this.paso = paso; }
    public Map<String, Object> getDatos() { return datos; }
    public void setDato(String clave, Object valor) { datos.put(clave, valor); }
    public Object getDato(String clave) { return datos.get(clave); }
}
