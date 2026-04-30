package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.agent.AgentOrchestrator;
import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.service.DeepSeekService;
import com.springboot.MyTodoList.service.EstatusTareaService;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.ToDoItemService;
import com.springboot.MyTodoList.service.UsuarioService;
import com.springboot.MyTodoList.util.BotActions;
import com.springboot.MyTodoList.util.BotConversationManager;
import com.springboot.MyTodoList.util.BotHelper;
import com.springboot.MyTodoList.util.BotLabels;
import com.springboot.MyTodoList.util.TareaBotActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Main Telegram bot controller for EQ51.
 * Handles legacy to-do commands and the new task/sprint management commands.
 *
 * The bean is skipped entirely when {@code telegram.bot.enabled=false}, allowing
 * a second developer to start the backend without a long-polling conflict.
 */
@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = true)
public class ToDoItemBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ToDoItemBotController.class);

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final BotProps botProps;
    private final TelegramClient telegramClient;

    // Legacy services
    private final ToDoItemService toDoItemService;
    private final DeepSeekService deepSeekService;

    // New EQ51 services
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;
    private final AgentOrchestrator orquestador;

    @Value("${telegram.bot.token}")
    private String telegramBotToken;

    // ── Constructor ──────────────────────────────────────────────────────────

    public ToDoItemBotController(
            BotProps botProps,
            ToDoItemService toDoItemService,
            DeepSeekService deepSeekService,
            TareaService tareaService,
            SprintService sprintService,
            UsuarioService usuarioService,
            EstatusTareaService estatusTareaService,
            PrioridadTareaService prioridadTareaService,
            BotConversationManager conversationManager,
            AgentOrchestrator agentOrchestrator) {

        this.botProps = botProps;
        this.toDoItemService = toDoItemService;
        this.deepSeekService = deepSeekService;
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
        this.estatusTareaService = estatusTareaService;
        this.prioridadTareaService = prioridadTareaService;
        this.conversationManager = conversationManager;
        this.orquestador = agentOrchestrator;

        // The Telegram client requires the token at construction time;
        // getBotToken() reads botProps as a fallback when the environment variable is not yet available.
        this.telegramClient = new OkHttpTelegramClient(botProps.getToken());
    }

    // ── SpringLongPollingBot ─────────────────────────────────────────────────

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

    // ── Update processing ────────────────────────────────────────────────────

    @Override
    public void consume(Update update) {
        // Ignore updates with no text message or no sender
        if (!update.hasMessage() || !update.getMessage().hasText()) return;
        if (update.getMessage().getFrom() == null) return;

        String mensajeOriginal = update.getMessage().getText();
        long chatId = update.getMessage().getChatId();

        // Extract identifier and data from the Telegram user
        org.telegram.telegrambots.meta.api.objects.User remitente = update.getMessage().getFrom();
        String telegramUserId = String.valueOf(remitente.getId());
        String telegramFirstName = remitente.getFirstName();
        String telegramLastName = remitente.getLastName();
        String telegramUsername = remitente.getUserName();

        // ── Map button labels to their equivalent slash commands ─────────────
        String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);

        // ── Handle /start and "Show Main Screen" directly in the controller
        // to display the expanded keyboard with the new EQ51 commands.
        if (mensajeOriginal.equals("/start")
                || mensajeOriginal.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) {
            conversationManager.limpiarHistorialLlm(chatId);
            enviarMenuPrincipal(chatId);
            return;
        }

        // ── Build action handlers ─────────────────────────────────────────────

        // Legacy handler (simple to-do)
        BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService, orquestador);
        actions.setRequestText(mensajeEfectivo);
        actions.setChatId(chatId);
        if (actions.getTodoService() == null) {
            logger.info("To-do service not properly injected — re-injecting");
            actions.setTodoService(toDoItemService);
        }

        // EQ51 task handler
        TareaBotActions tareaActions = new TareaBotActions(
                telegramClient,
                tareaService,
                sprintService,
                usuarioService,
                estatusTareaService,
                prioridadTareaService,
                conversationManager);
        tareaActions.setTextoMensaje(mensajeEfectivo);
        tareaActions.setChatId(chatId);
        tareaActions.setTelegramUserId(telegramUserId);
        tareaActions.setTelegramFirstName(telegramFirstName);
        tareaActions.setTelegramLastName(telegramLastName);
        tareaActions.setTelegramUsername(telegramUsername);

        // ── Legacy command chain ──────────────────────────────────────────────
        actions.fnDone();
        actions.fnUndo();
        actions.fnDelete();
        actions.fnHide();
        actions.fnListAll();
        actions.fnAddItem();
        actions.fnLLM();

        // ── New EQ51 commands ────────────────────────────────────────────────
        tareaActions.fnNuevatarea();
        tareaActions.fnAsignarSprint();
        tareaActions.fnCompletarTarea();
        tareaActions.fnTablaSprint();
        tareaActions.fnKpi();
        tareaActions.fnNuevoSprint();
        tareaActions.fnModificarTarea();
        tareaActions.fnModificarSprint();

        // ── Fallback: free text → LLM, or error message if there is an active conversation without a handler
        if (!tareaActions.isExit() && !actions.isExit()) {
            if (!conversationManager.tieneConversacionActiva(chatId)) {
                // Free text with no active conversation: route to the LLM orchestrator
                String respuesta;
                try {
                    respuesta = orquestador.manejarMensaje(mensajeEfectivo);
                } catch (Exception ex) {
                    logger.error("Error invoking AgentOrchestrator from free-text", ex);
                    respuesta = "An error occurred while processing your message. Please try again.";
                }
                conversationManager.agregarAlHistorialLlm(chatId, "user", mensajeEfectivo);
                conversationManager.agregarAlHistorialLlm(chatId, "assistant", respuesta);
                BotHelper.sendMessageToTelegram(chatId, respuesta, telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId,
                        "Command not recognized. Use /start to see the available commands.",
                        telegramClient);
            }
        }
    }

    // ── Private helper methods ────────────────────────────────────────────────

    /**
     * Translates keyboard button labels to their corresponding slash commands,
     * so that BotActions and TareaBotActions handlers can recognize them.
     */
    private String resolverMensajeEfectivo(String mensajeOriginal) {
        if (BotLabels.NEW_TASK.getLabel().equals(mensajeOriginal)) {
            return "/newtask";
        } else if (BotLabels.ASSIGN_TO_SPRINT.getLabel().equals(mensajeOriginal)) {
            return "/assignsprint";
        } else if (BotLabels.COMPLETE_TASK.getLabel().equals(mensajeOriginal)) {
            return "/donetask";
        } else if (BotLabels.SPRINT_TABLE.getLabel().equals(mensajeOriginal)) {
            return "/sprinttable";
        } else if (BotLabels.KPI_REPORT.getLabel().equals(mensajeOriginal)) {
            return "/kpi";
        } else if (BotLabels.NEW_SPRINT.getLabel().equals(mensajeOriginal)) {
            return "/newsprint";
        } else if (BotLabels.MODIFY_TASK.getLabel().equals(mensajeOriginal)) {
            return "/modifytask";
        } else if (BotLabels.MODIFY_SPRINT.getLabel().equals(mensajeOriginal)) {
            return "/modifysprint";
        }
        // No match: return the message as-is
        return mensajeOriginal;
    }

    /**
     * Sends the EQ51 bot main menu with all keyboard buttons,
     * including the new task and sprint management commands.
     */
    private void enviarMenuPrincipal(long chatId) {
        ReplyKeyboardMarkup teclado = ReplyKeyboardMarkup.builder()
                .resizeKeyboard(true)
                .keyboardRow(new KeyboardRow(
                        BotLabels.LIST_ALL_ITEMS.getLabel(),
                        BotLabels.NEW_TASK.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.ASSIGN_TO_SPRINT.getLabel(),
                        BotLabels.COMPLETE_TASK.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.SPRINT_TABLE.getLabel(),
                        BotLabels.KPI_REPORT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.NEW_SPRINT.getLabel(),
                        BotLabels.MODIFY_TASK.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.MODIFY_SPRINT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.SHOW_MAIN_SCREEN.getLabel(),
                        BotLabels.HIDE_MAIN_SCREEN.getLabel()))
                .build();

        String mensajeBienvenida =
                "Hello! I'm the EQ51 bot.\n\n" +
                "Available commands:\n" +
                "/newtask — Create a new task\n" +
                "/newsprint — Create a new sprint\n" +
                "/assignsprint — Assign a task to a sprint\n" +
                "/donetask — Complete a task\n" +
                "/modifytask — Modify an existing task\n" +
                "/modifysprint — Modify an existing sprint\n" +
                "/sprinttable — View the sprint board\n" +
                "/kpi — View sprint KPIs\n" +
                "/todolist — To-do list\n" +
                "/llm — Ask the AI\n\n" +
                "You can also type any question and I will answer with AI.";

        BotHelper.sendMessageToTelegram(chatId, mensajeBienvenida, telegramClient, teclado);
    }

    // ── Bot registration ──────────────────────────────────────────────────────

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        System.out.println("Bot registered. Running status: " + botSession.isRunning());
    }
}
