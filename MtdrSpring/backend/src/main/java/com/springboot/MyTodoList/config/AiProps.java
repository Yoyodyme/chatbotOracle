package com.springboot.MyTodoList.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the AI agent orchestrator.
 * Read from the "agent.ai" prefix in application.properties.
 */
@Component
@ConfigurationProperties(prefix = "agent.ai")
public class AiProps {

    /** Enables or disables the AI agent at configuration time. */
    private boolean habilitado = true;

    /** API key for the LLM provider (e.g. DeepSeek). */
    private String apiKey;

    /** Full URL of the chat completions endpoint. */
    private String apiUrl;

    /** Name of the model to use in requests. */
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
