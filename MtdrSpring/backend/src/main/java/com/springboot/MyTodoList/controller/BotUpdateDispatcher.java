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
import org.springframework.stereotype.Service;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;
import org.telegram.telegrambots.meta.generics.TelegramClient;

/**
 * Contiene toda la lógica de enrutamiento de mensajes del bot, desacoplada
 * de SpringLongPollingBot. Puede ser invocada tanto por ToDoItemBotController
 * (producción) como por TestBotController (perfil test) sin levantar long-polling.
 */
@Service
public class BotUpdateDispatcher {

    private static final Logger logger = LoggerFactory.getLogger(BotUpdateDispatcher.class);

    private final TelegramClient telegramClient;
    private final ToDoItemService toDoItemService;
    private final DeepSeekService deepSeekService;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;
    private final AgentOrchestrator orquestador;

    public BotUpdateDispatcher(
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

        this.telegramClient = new OkHttpTelegramClient(botProps.getToken());
        this.toDoItemService = toDoItemService;
        this.deepSeekService = deepSeekService;
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

        String mensajeOriginal = update.getMessage().getText();
        long chatId = update.getMessage().getChatId();

        org.telegram.telegrambots.meta.api.objects.User remitente = update.getMessage().getFrom();
        String telegramUserId  = String.valueOf(remitente.getId());
        String telegramFirstName = remitente.getFirstName();
        String telegramLastName  = remitente.getLastName();
        String telegramUsername  = remitente.getUserName();

        String mensajeEfectivo = resolverMensajeEfectivo(mensajeOriginal);

        if (mensajeOriginal.equals("/start")
                || mensajeOriginal.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) {
            conversationManager.limpiarHistorialLlm(chatId);
            enviarMenuPrincipal(chatId);
            return;
        }

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

        logger.info("[dispatch] chatId={} tieneConversacion={} texto='{}'",
                chatId, conversationManager.tieneConversacionActiva(chatId), mensajeEfectivo);

        // Wizard activo: entregar el mensaje DIRECTAMENTE al handler correspondiente,
        // sin pasar por los handlers legacy ni por el LLM/AgentOrchestrator.
        if (conversationManager.tieneConversacionActiva(chatId)) {
            tareaActions.fnNuevatarea();
            tareaActions.fnAsignarSprint();
            tareaActions.fnCompletarTarea();
            tareaActions.fnNuevoSprint();
            tareaActions.fnModificarTarea();
            tareaActions.fnModificarSprint();

            if (!tareaActions.isExit()) {
                BotHelper.sendMessageToTelegram(chatId,
                        "Escribe 'cancelar' para cancelar la operacion actual.", telegramClient);
            }
            return;
        }

        // Sin wizard activo: cadena completa de handlers + LLM como fallback.
        BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService, orquestador);
        actions.setRequestText(mensajeEfectivo);
        actions.setChatId(chatId);
        if (actions.getTodoService() == null) {
            logger.info("Servicio to-do no inyectado correctamente — reinyectando");
            actions.setTodoService(toDoItemService);
        }

        actions.fnDone();
        actions.fnUndo();
        actions.fnDelete();
        actions.fnHide();
        actions.fnListAll();
        actions.fnAddItem();
        actions.fnLLM();

        tareaActions.fnNuevatarea();
        tareaActions.fnAsignarSprint();
        tareaActions.fnCompletarTarea();
        tareaActions.fnTablaSprint();
        tareaActions.fnKpi();
        tareaActions.fnNuevoSprint();
        tareaActions.fnModificarTarea();
        tareaActions.fnModificarSprint();

        if (!tareaActions.isExit() && !actions.isExit()) {
            String respuesta;
            try {
                respuesta = orquestador.manejarMensaje(mensajeEfectivo);
            } catch (Exception ex) {
                logger.error("Error al invocar AgentOrchestrator desde free-text", ex);
                respuesta = "Ocurrio un error al procesar tu mensaje. Intenta de nuevo.";
            }
            conversationManager.agregarAlHistorialLlm(chatId, "user", mensajeEfectivo);
            conversationManager.agregarAlHistorialLlm(chatId, "assistant", respuesta);
            BotHelper.sendMessageToTelegram(chatId, respuesta, telegramClient);
        }
    }

    private String resolverMensajeEfectivo(String mensajeOriginal) {
        if (BotLabels.NEW_TASK.getLabel().equals(mensajeOriginal))        return "/newtask";
        else if (BotLabels.ASSIGN_TO_SPRINT.getLabel().equals(mensajeOriginal)) return "/assignsprint";
        else if (BotLabels.COMPLETE_TASK.getLabel().equals(mensajeOriginal))  return "/donetask";
        else if (BotLabels.SPRINT_TABLE.getLabel().equals(mensajeOriginal))   return "/sprinttable";
        else if (BotLabels.KPI_REPORT.getLabel().equals(mensajeOriginal))     return "/kpi";
        else if (BotLabels.NEW_SPRINT.getLabel().equals(mensajeOriginal))     return "/newsprint";
        else if (BotLabels.MODIFY_TASK.getLabel().equals(mensajeOriginal))    return "/modifytask";
        else if (BotLabels.MODIFY_SPRINT.getLabel().equals(mensajeOriginal))  return "/modifysprint";
        return mensajeOriginal;
    }

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
                "Hola! Soy el bot de EQ51.\n\n" +
                "Comandos disponibles:\n" +
                "/newtask — Crear nueva tarea\n" +
                "/newsprint — Crear nuevo sprint\n" +
                "/assignsprint — Asignar tarea al sprint\n" +
                "/donetask — Completar tarea\n" +
                "/modifytask — Modificar una tarea existente\n" +
                "/modifysprint — Modificar un sprint existente\n" +
                "/sprinttable — Ver tabla del sprint\n" +
                "/kpi — Ver KPIs del sprint\n" +
                "/todolist — Lista de to-dos\n" +
                "/llm — Consultar IA\n\n" +
                "Tambien puedes escribir cualquier pregunta y te respondere con IA.";

        BotHelper.sendMessageToTelegram(chatId, mensajeBienvenida, telegramClient, teclado);
    }
}
