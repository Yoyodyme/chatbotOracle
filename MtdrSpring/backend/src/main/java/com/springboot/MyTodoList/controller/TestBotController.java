package com.springboot.MyTodoList.controller;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.User;
import org.telegram.telegrambots.meta.api.objects.chat.Chat;
import org.telegram.telegrambots.meta.api.objects.message.Message;

/**
 * Endpoint exclusivo del perfil "test" que inyecta un Update sintético
 * directamente en BotUpdateDispatcher, eliminando la dependencia de la
 * API real de Telegram en los tests E2E.
 *
 * Este bean NO existe en producción ni en el perfil dev.
 */
@RestController
@RequestMapping("/test")
@Profile("test")
public class TestBotController {

    private final BotUpdateDispatcher dispatcher;

    public TestBotController(BotUpdateDispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @PostMapping("/simulate-message")
    public ResponseEntity<String> simulateMessage(
            @RequestParam String chatId,
            @RequestParam String userId,
            @RequestParam String text) {

        User user = User.builder()
                .id(Long.parseLong(userId))
                .firstName("Test")
                .isBot(false)
                .userName("e2e_test")
                .build();

        Chat chat = Chat.builder()
                .id(Long.parseLong(chatId))
                .type("private")
                .build();

        Message message = Message.builder()
                .messageId(1)
                .from(user)
                .chat(chat)
                .text(text)
                .build();

        Update update = new Update();
        update.setMessage(message);

        dispatcher.dispatch(update);
        return ResponseEntity.ok("OK");
    }
}
