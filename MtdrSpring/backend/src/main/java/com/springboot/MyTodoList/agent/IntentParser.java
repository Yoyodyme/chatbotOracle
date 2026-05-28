package com.springboot.MyTodoList.agent;

/**
 * Contract for AI agent intent classifiers.
 * Allows swapping rule-based and LLM-backed implementations transparently.
 */
public interface IntentParser {

    /**
     * Parses the free-form text of a user message and returns the detected intent.
     *
     * @param userMessage free-form message typed by the user
     * @return classified intent with its optional extracted parameters
     */
    ParsedIntent parse(String userMessage);
}
