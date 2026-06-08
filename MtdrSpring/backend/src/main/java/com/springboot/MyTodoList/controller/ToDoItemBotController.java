package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.config.BotProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;

/**
 * Registrador del bot de Telegram para long-polling.
 * Solo existe cuando {@code telegram.bot.enabled=true} (nunca en el perfil test).
 * Toda la lógica de procesamiento de mensajes vive en BotUpdateDispatcher.
 */
@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = false)
public class ToDoItemBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ToDoItemBotController.class);

    private final BotProps botProps;
    private final BotUpdateDispatcher dispatcher;

    @Value("${telegram.bot.token}")
    private String telegramBotToken;

    public ToDoItemBotController(BotProps botProps, BotUpdateDispatcher dispatcher) {
        this.botProps = botProps;
        this.dispatcher = dispatcher;
    }

    @Override
    public String getBotToken() {
        if (telegramBotToken != null && !telegramBotToken.trim().isEmpty()) {
            return telegramBotToken;
        }
        return botProps.getToken();
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(Update update) {
        dispatcher.dispatch(update);
    }

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        logger.info("Bot registrado. Estado en ejecución: {}", botSession.isRunning());
    }
}
