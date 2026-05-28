package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.agent.AgentOrchestrator;
import com.springboot.MyTodoList.agent.IntentType;
import com.springboot.MyTodoList.agent.ParsedIntent;
import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.service.EstatusTareaService;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import com.springboot.MyTodoList.util.BotConversationManager;
import com.springboot.MyTodoList.util.BotHelper;
import com.springboot.MyTodoList.util.BotLabels;
import com.springboot.MyTodoList.util.TareaBotActions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.util.List;
import java.util.Map;

/**
 * Routes all incoming Telegram bot messages to the appropriate handler.
 * Decoupled from SpringLongPollingBot so it can be invoked by both
 * ToDoItemBotController (production) and TestBotController (test profile)
 * without starting long-polling.
 */
@Service
public class BotUpdateDispatcher {

    private static final Logger logger = LoggerFactory.getLogger(BotUpdateDispatcher.class);

    private final TelegramClient telegramClient;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;
    private final AgentOrchestrator orquestador;

    public BotUpdateDispatcher(
            BotProps botProps,
            TareaService tareaService,
            SprintService sprintService,
            UsuarioService usuarioService,
            EstatusTareaService estatusTareaService,
            PrioridadTareaService prioridadTareaService,
            BotConversationManager conversationManager,
            AgentOrchestrator agentOrchestrator) {

        this.telegramClient = new OkHttpTelegramClient(botProps.getToken());
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
        this.estatusTareaService = estatusTareaService;
        this.prioridadTareaService = prioridadTareaService;
        this.conversationManager = conversationManager;
        this.orquestador = agentOrchestrator;
    }

    public void dispatch(Update update) {
        if (!update.hasMessage() || !update.getMessage().hasText()) return;
        if (update.getMessage().getFrom() == null) return;

        String originalMessage = update.getMessage().getText();
        long chatId = update.getMessage().getChatId();

        org.telegram.telegrambots.meta.api.objects.User sender = update.getMessage().getFrom();
        String telegramUserId    = String.valueOf(sender.getId());
        String telegramFirstName = sender.getFirstName();
        String telegramLastName  = sender.getLastName();
        String telegramUsername  = sender.getUserName();

        // Step 1: Handle /start and "Show Main Screen" immediately.
        if (originalMessage.equals("/start")
                || originalMessage.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) {
            conversationManager.limpiarHistorialLlm(chatId);
            sendMainMenu(chatId);
            return;
        }

        // Build the TareaBotActions instance for this message.
        TareaBotActions tareaActions = new TareaBotActions(
                telegramClient,
                tareaService,
                sprintService,
                usuarioService,
                estatusTareaService,
                prioridadTareaService,
                conversationManager);
        tareaActions.setTelegramUserId(telegramUserId);
        tareaActions.setTelegramFirstName(telegramFirstName);
        tareaActions.setTelegramLastName(telegramLastName);
        tareaActions.setTelegramUsername(telegramUsername);
        tareaActions.setChatId(chatId);

        // Step 3: If a wizard is active, route the message directly to the matching
        // continuation handler — no LLM needed.
        if (conversationManager.tieneConversacionActiva(chatId)) {
            // Resolve effective message for wizard continuations (label → command).
            String effectiveForWizard = resolveEffectiveMessage(originalMessage);
            tareaActions.setTextoMensaje(effectiveForWizard);

            logger.info("[dispatch] wizard active — chatId={} text='{}'", chatId, effectiveForWizard);

            tareaActions.fnNuevatarea();
            tareaActions.fnAsignarSprint();
            tareaActions.fnCompletarTarea();
            tareaActions.fnNuevoSprint();
            tareaActions.fnModificarTarea();
            tareaActions.fnModificarSprint();

            if (!tareaActions.isExit()) {
                BotHelper.sendMessageToTelegram(chatId,
                        "Type 'cancel' to cancel the current operation.", telegramClient);
            }
            return;
        }

        // Step 4: No wizard active — resolve effective message for direct commands.
        String effective = resolveEffectiveMessage(originalMessage);
        tareaActions.setTextoMensaje(effective);

        logger.info("[dispatch] no wizard — chatId={} effective='{}'", chatId, effective);

        // Step 5: Handle direct commands without LLM.
        switch (effective) {
            case "/newtask":
                tareaActions.startNewtask(null);
                return;
            case "/assignsprint":
                tareaActions.startAssignSprint(null);
                return;
            case "/donetask":
                tareaActions.startCompleteTask(null);
                return;
            case "/newsprint":
                tareaActions.startNewSprint(null);
                return;
            case "/modifytask":
                tareaActions.startModifyTask(null);
                return;
            case "/modifysprint":
                tareaActions.startModifySprint(null);
                return;
            case "/sprinttable":
                tareaActions.fnTablaSprint();
                return;
            case "/kpi":
                tareaActions.fnKpi();
                return;
            default:
                break;
        }

        // Step 6: Free text — classify intent via LLM and route accordingly.
        List<Map<String, String>> history = conversationManager.obtenerHistorialLlm(chatId);

        // TODO merge: classifyIntent() is added to AgentOrchestrator by Agent 1.
        ParsedIntent intent = null;
        try {
            intent = orquestador.classifyIntent(effective, history);
        } catch (Exception ex) {
            logger.error("classifyIntent failed", ex);
        }

        if (intent != null) {
            switch (intent.getIntent()) {
                case CREATE_TASK:
                    tareaActions.startNewtask(intent);
                    return;
                case ASSIGN_SPRINT:
                    tareaActions.startAssignSprint(intent);
                    return;
                case COMPLETE_TASK:
                    tareaActions.startCompleteTask(intent);
                    return;
                case MODIFY_TASK:
                    tareaActions.startModifyTask(intent);
                    return;
                case CREATE_SPRINT:
                    tareaActions.startNewSprint(intent);
                    return;
                case MODIFY_SPRINT:
                    tareaActions.startModifySprint(intent);
                    return;
                case SPRINT_TABLE:
                    tareaActions.fnTablaSprint();
                    return;
                case KPI_REPORT:
                    tareaActions.fnKpi();
                    return;
                default:
                    // Informational queries and UNKNOWN fall through to the orchestrator.
                    break;
            }
        }

        // Informational query or UNKNOWN: use full orchestrator response.
        // manejarMensaje() is used here for backwards compatibility; Agent 1 will
        // rename it to handleMessage() and keep manejarMensaje() as a @Deprecated delegate.
        String response;
        try {
            response = orquestador.manejarMensaje(effective, history);
        } catch (Exception ex) {
            logger.error("handleMessage failed", ex);
            response = "An error occurred. Please try again.";
        }
        conversationManager.agregarAlHistorialLlm(chatId, "user", effective);
        conversationManager.agregarAlHistorialLlm(chatId, "assistant", response);
        BotHelper.sendMessageToTelegram(chatId, response, telegramClient);
    }

    /**
     * Translates keyboard button labels to their canonical bot command equivalents.
     * Returns the original message unchanged if no mapping exists.
     */
    private String resolveEffectiveMessage(String originalMessage) {
        if (BotLabels.NEW_TASK.getLabel().equals(originalMessage))         return "/newtask";
        if (BotLabels.ASSIGN_TO_SPRINT.getLabel().equals(originalMessage)) return "/assignsprint";
        if (BotLabels.COMPLETE_TASK.getLabel().equals(originalMessage))    return "/donetask";
        if (BotLabels.SPRINT_TABLE.getLabel().equals(originalMessage))     return "/sprinttable";
        if (BotLabels.KPI_REPORT.getLabel().equals(originalMessage))       return "/kpi";
        if (BotLabels.NEW_SPRINT.getLabel().equals(originalMessage))       return "/newsprint";
        if (BotLabels.MODIFY_TASK.getLabel().equals(originalMessage))      return "/modifytask";
        if (BotLabels.MODIFY_SPRINT.getLabel().equals(originalMessage))    return "/modifysprint";
        return originalMessage;
    }

    /**
     * Sends the main menu keyboard and welcome message to the given chat.
     */
    private void sendMainMenu(long chatId) {
        ReplyKeyboardMarkup keyboard = ReplyKeyboardMarkup.builder()
                .resizeKeyboard(true)
                .keyboardRow(new KeyboardRow(
                        BotLabels.NEW_TASK.getLabel(),
                        BotLabels.ASSIGN_TO_SPRINT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.COMPLETE_TASK.getLabel(),
                        BotLabels.NEW_SPRINT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.MODIFY_TASK.getLabel(),
                        BotLabels.MODIFY_SPRINT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.SPRINT_TABLE.getLabel(),
                        BotLabels.KPI_REPORT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.SHOW_MAIN_SCREEN.getLabel(),
                        BotLabels.HIDE_MAIN_SCREEN.getLabel()))
                .build();

        String welcomeMessage =
                "Hello! I'm the EQ51 project bot.\n\n" +
                "Available commands:\n" +
                "/newtask — Create a new task\n" +
                "/newsprint — Create a new sprint\n" +
                "/assignsprint — Assign a task to a sprint\n" +
                "/donetask — Complete a task\n" +
                "/modifytask — Modify an existing task\n" +
                "/modifysprint — Modify an existing sprint\n" +
                "/sprinttable — View sprint task table\n" +
                "/kpi — View sprint KPIs\n\n" +
                "You can also describe what you need in plain English and I'll figure it out.";

        BotHelper.sendMessageToTelegram(chatId, welcomeMessage, telegramClient, keyboard);
    }
}
