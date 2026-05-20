package com.springboot.MyTodoList.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Propiedades de configuración para el orquestador de agente IA.
 * Se leen desde el prefijo "agent.ai" en application.properties.
 */
@Component
@ConfigurationProperties(prefix = "agent.ai")
public class AiProps {

    /** Permite habilitar o deshabilitar el agente IA en tiempo de configuración. */
    private boolean habilitado = true;

    /** Clave de API del proveedor LLM (ej. DeepSeek). */
    private String apiKey;

    /** URL completa del endpoint de chat completions. */
    private String apiUrl;

    /** Nombre del modelo a usar en las peticiones. */
    private String modelo = "deepseek-chat";

    public boolean isHabilitado()        { return habilitado; }
    public void setHabilitado(boolean h) { this.habilitado = h; }

    public String getApiKey()            { return apiKey; }
    public void setApiKey(String k)      { this.apiKey = k; }

    public String getApiUrl()            { return apiUrl; }
    public void setApiUrl(String u)      { this.apiUrl = u; }

    public String getModelo()            { return modelo; }
    public void setModelo(String m)      { this.modelo = m; }
}
