package com.springboot.MyTodoList.agent;

/**
 * Contrato para los clasificadores de intención del agente IA.
 * Permite intercambiar implementaciones basadas en reglas o LLM.
 */
public interface IntentParser {

    /**
     * Analiza el texto libre de un mensaje y devuelve la intención detectada.
     *
     * @param textoMensaje mensaje en español escrito por el usuario
     * @return intención clasificada con sus parámetros opcionales
     */
    ParsedIntent parse(String textoMensaje);
}
