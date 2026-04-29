package com.springboot.MyTodoList.controller;

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
 * Controlador principal del bot de Telegram para EQ51.
 * Gestiona los comandos heredados de to-do y los nuevos comandos de gestión de tareas/sprint.
 *
 * El bean se omite por completo cuando {@code telegram.bot.enabled=false}, lo que permite
 * que un segundo desarrollador levante el backend sin conflicto de long-polling.
 */
@Component
@ConditionalOnProperty(name = "telegram.bot.enabled", havingValue = "true", matchIfMissing = true)
public class ToDoItemBotController implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ToDoItemBotController.class);

    // ── Dependencias ──────────────────────────────────────────────────────────

    private final BotProps botProps;
    private final TelegramClient telegramClient;

    // Servicios heredados
    private final ToDoItemService toDoItemService;
    private final DeepSeekService deepSeekService;

    // Nuevos servicios EQ51
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;

    @Value("${telegram.bot.token}")
    private String telegramBotToken;

    // ── Constructor ───────────────────────────────────────────────────────────

    public ToDoItemBotController(
            BotProps botProps,
            ToDoItemService toDoItemService,
            DeepSeekService deepSeekService,
            TareaService tareaService,
            SprintService sprintService,
            UsuarioService usuarioService,
            EstatusTareaService estatusTareaService,
            PrioridadTareaService prioridadTareaService,
            BotConversationManager conversationManager) {

        this.botProps = botProps;
        this.toDoItemService = toDoItemService;
        this.deepSeekService = deepSeekService;
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
        this.estatusTareaService = estatusTareaService;
        this.prioridadTareaService = prioridadTareaService;
        this.conversationManager = conversationManager;

        // El cliente de Telegram requiere el token en el momento de construcción;
        // getBotToken() lee botProps como fallback cuando la variable de entorno no está lista aún.
        this.telegramClient = new OkHttpTelegramClient(botProps.getToken());
    }

    // ── SpringLongPollingBot ──────────────────────────────────────────────────

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

    // ── Procesamiento de actualizaciones ──────────────────────────────────────

    @Override
    public void consume(Update update) {
        // Ignorar actualizaciones sin mensaje de texto o sin remitente
        if (!update.hasMessage() || !update.getMessage().hasText()) return;
        if (update.getMessage().getFrom() == null) return;

        String mensajeOriginal = update.getMessage().getText();
        long chatId = update.getMessage().getChatId();

        // Extraer identificador y datos del usuario de Telegram
        org.telegram.telegrambots.meta.api.objects.User remitente = update.getMessage().getFrom();
        String telegramUserId = String.valueOf(remitente.getId());
        String telegramFirstName = remitente.getFirstName();
        String telegramLastName = remitente.getLastName();
        String telegramUsername = remitente.getUserName();

        // ── Mapear etiquetas de botones a sus comandos equivalentes ──────────
        String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);

        // ── Manejar /start y "Show Main Screen" directamente en el controlador
        // para mostrar el teclado ampliado con los nuevos comandos EQ51.
        if (mensajeOriginal.equals("/start")
                || mensajeOriginal.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) {
            enviarMenuPrincipal(chatId);
            return;
        }

        // ── Construir manejadores de acciones ─────────────────────────────────

        // Manejador heredado (to-do simple)
        BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService);
        actions.setRequestText(mensajeEfectivo);
        actions.setChatId(chatId);
        if (actions.getTodoService() == null) {
            logger.info("Servicio to-do no inyectado correctamente — reinyectando");
            actions.setTodoService(toDoItemService);
        }

        // Manejador de tareas EQ51
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

        // ── Cadena de comandos heredados ──────────────────────────────────────
        actions.fnDone();
        actions.fnUndo();
        actions.fnDelete();
        actions.fnHide();
        actions.fnListAll();
        actions.fnAddItem();
        actions.fnLLM();

        // ── Nuevos comandos EQ51 ──────────────────────────────────────────────
        tareaActions.fnNuevatarea();
        tareaActions.fnAsignarSprint();
        tareaActions.fnCompletarTarea();
        tareaActions.fnTablaSprint();
        tareaActions.fnKpi();
        tareaActions.fnNuevoSprint();

        // ── Fallback: comando no reconocido ──────────────────────────────────
        // Solo se ejecuta si ningún manejador capturó el mensaje.
        if (!tareaActions.isExit() && !actions.isExit()) {
            BotHelper.sendMessageToTelegram(chatId,
                    "Comando no reconocido. Usa /start para ver los comandos disponibles.",
                    telegramClient);
        }
    }

    // ── Métodos auxiliares privados ────────────────────────────────────────────

    /**
     * Traduce las etiquetas del teclado de botones a sus comandos de slash correspondientes,
     * de modo que los manejadores de BotActions y TareaBotActions los reconozcan.
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
        }
        // Sin cambio: devolver el mensaje tal cual
        return mensajeOriginal;
    }

    /**
     * Envía el menú principal del bot EQ51 con todos los botones del teclado,
     * incluyendo los nuevos comandos de gestión de tareas y sprint.
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
                        BotLabels.NEW_SPRINT.getLabel()))
                .keyboardRow(new KeyboardRow(
                        BotLabels.SHOW_MAIN_SCREEN.getLabel(),
                        BotLabels.HIDE_MAIN_SCREEN.getLabel()))
                .build();

        String mensajeBienvenida =
                "Hola! Soy el bot de EQ51.\n\n" +
                "Comandos disponibles:\n" +
                "/newtask — Crear nueva tarea\n" +
                "/newsprint — Crear nuevo sprint\n" +
                "/assignsprint — Asignar tarea al sprint\n" +
                "/donetask — Completar tarea\n" +
                "/sprinttable — Ver tabla del sprint\n" +
                "/kpi — Ver KPIs del sprint\n" +
                "/todolist — Lista de to-dos\n" +
                "/llm — Consultar IA";

        BotHelper.sendMessageToTelegram(chatId, mensajeBienvenida, telegramClient, teclado);
    }

    // ── Registro del bot ──────────────────────────────────────────────────────

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        System.out.println("Bot registrado. Estado en ejecución: " + botSession.isRunning());
    }
}
