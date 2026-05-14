package com.springboot.MyTodoList.util;

import com.springboot.MyTodoList.model.EstatusTarea;
import com.springboot.MyTodoList.model.PrioridadTarea;
import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.EstatusTareaService;
import com.springboot.MyTodoList.service.PrioridadTareaService;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Handles all new Telegram bot commands related to the Tarea (task) domain:
 * /newtask, /assignsprint, /donetask, /sprinttable, /kpi, /newsprint,
 * /modifytask, /modifysprint
 *
 * Instantiated per incoming message. Uses BotConversationManager (Spring bean)
 * for multi-step conversation state.
 */
public class TareaBotActions {

    private static final Logger logger = LoggerFactory.getLogger(TareaBotActions.class);
    private static final double MAX_HORAS_RECOMENDADAS = 4.0;
    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yy");
    private static final DateTimeFormatter FORMATO_FECHA_COMPLETO = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TelegramClient telegramClient;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;
    private final EstatusTareaService estatusTareaService;
    private final PrioridadTareaService prioridadTareaService;
    private final BotConversationManager conversationManager;

    private String textoMensaje;
    private long chatId;
    private String telegramUserId;  // Telegram user ID as String (for Usuario.idIntegrationUsuario)
    private String telegramFirstName;
    private String telegramLastName;
    private String telegramUsername;
    boolean exit;

    public TareaBotActions(TelegramClient telegramClient,
                           TareaService tareaService,
                           SprintService sprintService,
                           UsuarioService usuarioService,
                           EstatusTareaService estatusTareaService,
                           PrioridadTareaService prioridadTareaService,
                           BotConversationManager conversationManager) {
        this.telegramClient = telegramClient;
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
        this.estatusTareaService = estatusTareaService;
        this.prioridadTareaService = prioridadTareaService;
        this.conversationManager = conversationManager;
        this.exit = false;
    }

    public void setTextoMensaje(String texto) { this.textoMensaje = texto; }
    public void setChatId(long chatId) { this.chatId = chatId; }
    public void setTelegramUserId(String telegramUserId) { this.telegramUserId = telegramUserId; }
    public void setTelegramFirstName(String telegramFirstName) { this.telegramFirstName = telegramFirstName; }
    public void setTelegramLastName(String telegramLastName) { this.telegramLastName = telegramLastName; }
    public void setTelegramUsername(String telegramUsername) { this.telegramUsername = telegramUsername; }
    public boolean isExit() { return exit; }

    // ── /newtask ─────────────────────────────────────────────────────────────

    public void fnNuevatarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.NEW_TASK.getCommand());
        boolean tieneConversacionNewtask = conversationManager.tieneConversacionActiva(chatId)
                && "newtask".equals(conversationManager.obtenerEstado(chatId).getComando());

        logger.info("[fnNuevatarea] chatId={} esComandoInicio={} tieneConversacionNewtask={}",
                chatId, esComandoInicio, tieneConversacionNewtask);

        if (!esComandoInicio && !tieneConversacionNewtask) return;

        if (esComandoInicio) {
            ConversationState estado = new ConversationState("newtask");
            conversationManager.iniciarConversacion(chatId, estado);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_TITLE.getMessage(), telegramClient);
            exit = true;
            return;
        }

        // Conversation already active — handle current step
        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoNewtask(estado);
        exit = true;
    }

    private void procesarPasoNewtask(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // esperando titulo
                estado.setDato("titulo", textoMensaje.trim());
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_DESC.getMessage(), telegramClient);
                break;

            case 1: // esperando descripcion
                String descripcion = textoMensaje.equalsIgnoreCase("saltar") ? null : textoMensaje.trim();
                estado.setDato("descripcion", descripcion);
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS.getMessage(), telegramClient);
                break;

            case 2: // esperando horas estimadas
                procesarHorasEstimadas(estado);
                break;

            case 3: // esperando confirmacion de horas largas (si/cancelar)
                procesarConfirmacionHorasLargas(estado);
                break;

            case 4: // esperando seleccion de prioridad
                procesarPrioridadNewtask(estado);
                break;

            case 5: // esperando seleccion de asignado
                procesarAsignadoNewtask(estado);
                break;

            case 6: // esperando confirmacion final
                procesarConfirmacionTarea(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarHorasEstimadas(ConversationState estado) {
        double horas;
        try {
            horas = Double.parseDouble(textoMensaje.trim().replace(",", "."));
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_INVALID.getMessage(), telegramClient);
            return;
        }

        estado.setDato("horasEstimadas", horas);

        if (horas > MAX_HORAS_RECOMENDADAS) {
            estado.setPaso(3); // saltar a confirmacion de horas largas
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_HOURS_TOO_LONG.getMessage(), telegramClient);
            return;
        }

        estado.setPaso(4);
        enviarSeleccionPrioridad(estado);
    }

    private void procesarConfirmacionHorasLargas(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("si") || textoMensaje.equalsIgnoreCase("sí")) {
            estado.setPaso(4);
            enviarSeleccionPrioridad(estado);
        } else if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Responde 'si' para confirmar o 'cancelar' para cancelar.", telegramClient);
        }
    }

    private void enviarSeleccionPrioridad(ConversationState estado) {
        List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
        estado.setDato("listaPrioridades", prioridades);
        StringBuilder sb = new StringBuilder(BotMessages.NEWTASK_PRIORITY.getMessage()).append("\n\n");
        for (int i = 0; i < prioridades.size(); i++) {
            sb.append(i + 1).append(". ").append(prioridades.get(i).getNombre()).append("\n");
        }
        sb.append("\nEscribe el numero de la prioridad:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarPrioridadNewtask(ConversationState estado) {
        int indice;
        try {
            indice = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Numero de prioridad invalido. Intenta de nuevo:", telegramClient);
            return;
        }

        List<PrioridadTarea> prioridades = (List<PrioridadTarea>) estado.getDato("listaPrioridades");
        if (prioridades == null || indice < 1 || indice > prioridades.size()) {
            BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige entre 1 y " + (prioridades != null ? prioridades.size() : "?") + ":", telegramClient);
            return;
        }

        PrioridadTarea prioridadSeleccionada = prioridades.get(indice - 1);
        estado.setDato("prioridadSeleccionada", prioridadSeleccionada);
        estado.setPaso(5);
        enviarSeleccionAsignado(estado);
    }

    private void enviarSeleccionAsignado(ConversationState estado) {
        List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
        estado.setDato("listaUsuarios", usuarios);
        StringBuilder sb = new StringBuilder(BotMessages.SELECCIONAR_ASIGNADO.getMessage()).append("\n\n");
        for (int i = 0; i < usuarios.size(); i++) {
            sb.append(i + 1).append(". ").append(usuarios.get(i).getNombreCompleto()).append("\n");
        }
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarAsignadoNewtask(ConversationState estado) {
        int indice;
        try {
            indice = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Escribe el numero del usuario:", telegramClient);
            return;
        }

        List<Usuario> usuarios = (List<Usuario>) estado.getDato("listaUsuarios");
        if (usuarios == null || indice < 1 || indice > usuarios.size()) {
            BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige entre 1 y " + (usuarios != null ? usuarios.size() : "?") + ":", telegramClient);
            return;
        }

        Usuario usuarioAsignado = usuarios.get(indice - 1);
        estado.setDato("usuarioAsignado", usuarioAsignado);
        estado.setPaso(6);

        // Mostrar resumen para confirmacion
        mostrarConfirmacionNuevaTarea(estado);
    }

    private void mostrarConfirmacionNuevaTarea(ConversationState estado) {
        String titulo = (String) estado.getDato("titulo");
        String descripcion = (String) estado.getDato("descripcion");
        Double horas = (Double) estado.getDato("horasEstimadas");
        PrioridadTarea prioridad = (PrioridadTarea) estado.getDato("prioridadSeleccionada");
        Usuario asignado = (Usuario) estado.getDato("usuarioAsignado");

        String mensajeConfirmacion = String.format(
                BotMessages.TAREA_CONFIRMACION.getMessage(),
                titulo != null ? titulo : "(sin titulo)",
                descripcion != null ? descripcion : "(sin descripcion)",
                horas != null ? horas : 0.0,
                prioridad != null ? prioridad.getNombre() : "(sin prioridad)",
                asignado != null ? asignado.getNombreCompleto() : "(sin asignado)"
        );
        BotHelper.sendMessageToTelegram(chatId, mensajeConfirmacion, telegramClient);
    }

    private void procesarConfirmacionTarea(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();

        if (texto.equals("si") || texto.equals("sí")) {
            crearTareaDesdeEstado(estado);
            return;
        }

        if (texto.startsWith("editar ")) {
            String campo = texto.substring(7).trim();
            switch (campo) {
                case "titulo":
                    estado.setPaso(0);
                    BotHelper.sendMessageToTelegram(chatId, "Escribe el nuevo titulo:", telegramClient);
                    break;
                case "descripcion":
                    estado.setPaso(1);
                    BotHelper.sendMessageToTelegram(chatId, "Escribe la nueva descripcion (o 'saltar'):", telegramClient);
                    break;
                case "horas":
                    estado.setPaso(2);
                    BotHelper.sendMessageToTelegram(chatId, "Escribe las horas estimadas:", telegramClient);
                    break;
                case "prioridad":
                    estado.setPaso(4);
                    enviarSeleccionPrioridad(estado);
                    break;
                case "asignado":
                    estado.setPaso(5);
                    enviarSeleccionAsignado(estado);
                    break;
                default:
                    BotHelper.sendMessageToTelegram(chatId,
                            "Campo no reconocido. Usa: editar titulo, editar descripcion, editar horas, editar prioridad, editar asignado",
                            telegramClient);
            }
            return;
        }

        if (texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWTASK_CANCELLED.getMessage(), telegramClient);
            return;
        }

        // Respuesta no reconocida — mostrar resumen de nuevo
        BotHelper.sendMessageToTelegram(chatId,
                "Responde 'si' para guardar, 'editar [campo]' para corregir, o 'cancelar' para cancelar.",
                telegramClient);
        mostrarConfirmacionNuevaTarea(estado);
    }

    @SuppressWarnings("unchecked")
    private void crearTareaDesdeEstado(ConversationState estado) {
        Usuario usuarioCreador = obtenerOAutoRegistrarUsuario();
        Usuario usuarioAsignado = (Usuario) estado.getDato("usuarioAsignado");
        PrioridadTarea prioridad = (PrioridadTarea) estado.getDato("prioridadSeleccionada");

        Tarea nuevaTarea = new Tarea();
        nuevaTarea.setTitulo((String) estado.getDato("titulo"));
        nuevaTarea.setDescripcion((String) estado.getDato("descripcion"));
        nuevaTarea.setHorasEstimadas((Double) estado.getDato("horasEstimadas"));
        nuevaTarea.setUsuarioCreador(usuarioCreador);
        nuevaTarea.setUsuarioAsignado(usuarioAsignado != null ? usuarioAsignado : usuarioCreador);
        nuevaTarea.setPrioridad(prioridad);

        EstatusTarea estatusPendiente = estatusTareaService.obtenerEstatusPorNombre("Pendiente");
        if (estatusPendiente != null) {
            nuevaTarea.setEstatus(estatusPendiente);
        } else {
            List<EstatusTarea> todosLosEstatus = estatusTareaService.obtenerTodosLosEstatus();
            if (!todosLosEstatus.isEmpty()) {
                nuevaTarea.setEstatus(todosLosEstatus.get(0));
                logger.warn("Estatus 'Pendiente' no encontrado; usando '{}' como fallback",
                        todosLosEstatus.get(0).getNombre());
            } else {
                logger.warn("No se encontro ningun estatus en la BD; la tarea se guardara sin estatus");
            }
        }

        Tarea tareaCreada = tareaService.crearTarea(nuevaTarea);
        conversationManager.terminarConversacion(chatId);

        String mensaje = BotMessages.NEWTASK_CREATED.getMessage()
                .replace("{id}", String.valueOf(tareaCreada.getIdTarea()))
                .replace("{titulo}", tareaCreada.getTitulo())
                .replace("{horas}", String.valueOf(tareaCreada.getHorasEstimadas()));
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    // ── /assignsprint ─────────────────────────────────────────────────────────

    public void fnAsignarSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.ASSIGN_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "assignsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoAsignarSprint();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoAsignarSprint(estado);
        exit = true;
    }

    private void iniciarFlujoAsignarSprint() {
        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_SPRINT.getMessage(), telegramClient);
            return;
        }

        Usuario usuarioSprint = obtenerOAutoRegistrarUsuario();

        List<Tarea> tareasPendientes = tareaService.obtenerTareasPorEstatusYUsuario("Pendiente", usuarioSprint.getIdUsuario());
        if (tareasPendientes.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("assignsprint");
        estado.setDato("idSprint", sprintOpt.get().getIdSprint());
        estado.setDato("idUsuario", usuarioSprint.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        String listaTareas = construirListaTareas(tareasPendientes);
        String mensaje = BotMessages.ASSIGNSPRINT_SELECT.getMessage().replace("{lista}", listaTareas);
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    private void procesarPasoAsignarSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        Long idTarea;
        try {
            idTarea = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_INVALID_ID.getMessage(), telegramClient);
            return;
        }

        Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
        Long idUsuario = (Long) estado.getDato("idUsuario");
        Long idSprint = (Long) estado.getDato("idSprint");

        if (tarea == null || tarea.getUsuarioAsignado() == null
                || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
            return;
        }

        EstatusTarea estatusEnProgreso = estatusTareaService.obtenerEstatusPorNombre("En Progreso");
        if (estatusEnProgreso == null) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Error de configuracion: estatus 'En Progreso' no encontrado.", telegramClient);
            return;
        }
        tarea.setEstatus(estatusEnProgreso);
        Sprint sprint = sprintService.obtenerSprintPorId(idSprint)
                .orElseThrow(() -> new RuntimeException("Sprint no encontrado: " + idSprint));
        tarea.setSprint(sprint);
        tareaService.actualizarTarea(idTarea, tarea);
        conversationManager.terminarConversacion(chatId);

        String mensaje = BotMessages.ASSIGNSPRINT_DONE.getMessage()
                .replace("{id}", String.valueOf(idTarea));
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    // ── /donetask ─────────────────────────────────────────────────────────────

    public void fnCompletarTarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.DONE_TASK.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "donetask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoCompletarTarea();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoCompletarTarea(estado);
        exit = true;
    }

    private void iniciarFlujoCompletarTarea() {
        Usuario usuarioDone = obtenerOAutoRegistrarUsuario();

        logger.info("[donetask] Buscando tareas activas — telegramUserId={}, idUsuario={}",
                telegramUserId, usuarioDone.getIdUsuario());

        List<Tarea> tareasActivas = tareaService.obtenerTareasActivasPorUsuario(usuarioDone.getIdUsuario());

        logger.info("[donetask] Tareas activas encontradas: {}", tareasActivas.size());

        if (tareasActivas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_NO_TASKS.getMessage(), telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("donetask");
        estado.setDato("idUsuario", usuarioDone.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        String listaTareas = construirListaTareas(tareasActivas);
        String mensaje = BotMessages.DONETASK_SELECT.getMessage().replace("{lista}", listaTareas);
        BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
    }

    private void procesarPasoCompletarTarea(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        if (estado.getPaso() == 0) {
            // esperando ID de tarea
            Long idTarea;
            try {
                idTarea = Long.parseLong(textoMensaje.trim());
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, "ID invalido. Escribe el numero de la tarea:", telegramClient);
                return;
            }

            Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
            Long idUsuario = (Long) estado.getDato("idUsuario");

            logger.info("[donetask] paso 0 — idTarea recibido={}, idUsuario esperado={}, idUsuario en tarea={}",
                    idTarea,
                    idUsuario,
                    (tarea != null && tarea.getUsuarioAsignado() != null)
                            ? tarea.getUsuarioAsignado().getIdUsuario()
                            : "null");

            if (tarea == null || tarea.getUsuarioAsignado() == null
                    || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, BotMessages.ASSIGNSPRINT_NOT_FOUND.getMessage(), telegramClient);
                return;
            }

            String estatusActual = tarea.getEstatus() != null ? tarea.getEstatus().getNombre() : "";
            if (!estatusActual.equals("Pendiente") && !estatusActual.equals("En Progreso")) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId,
                        "Esa tarea ya no esta activa (estatus: " + estatusActual + "). Operacion cancelada.",
                        telegramClient);
                return;
            }

            estado.setDato("idTarea", idTarea);
            estado.avanzarPaso();
            BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS.getMessage(), telegramClient);
            return;
        }

        if (estado.getPaso() == 1) {
            // esperando horas reales
            double horasReales;
            try {
                horasReales = Double.parseDouble(textoMensaje.trim().replace(",", "."));
            } catch (NumberFormatException e) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.DONETASK_HOURS_INVALID.getMessage(), telegramClient);
                return;
            }

            Long idTarea = (Long) estado.getDato("idTarea");
            Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
            if (tarea == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Tarea no encontrada. Operacion cancelada.", telegramClient);
                return;
            }

            EstatusTarea estatusCompletada = estatusTareaService.obtenerEstatusPorNombre("Completada");
            if (estatusCompletada == null) {
                conversationManager.terminarConversacion(chatId);
                BotHelper.sendMessageToTelegram(chatId, "Error de configuracion: estatus 'Completada' no encontrado.", telegramClient);
                return;
            }
            tarea.setEstatus(estatusCompletada);
            tarea.setHorasReales(horasReales);
            tareaService.actualizarTarea(idTarea, tarea);
            conversationManager.terminarConversacion(chatId);

            String mensaje = BotMessages.DONETASK_DONE.getMessage()
                    .replace("{id}", String.valueOf(idTarea))
                    .replace("{horas}", String.valueOf(horasReales));
            BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
        }
    }

    // ── /sprinttable ──────────────────────────────────────────────────────────

    public void fnTablaSprint() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.SPRINT_TABLE.getCommand())) return;

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.SPRINTTABLE_NO_SPRINT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.SPRINTTABLE_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String tabla = construirTablaSprint(sprint, tareas);
        BotHelper.sendMessageToTelegram(chatId, tabla, telegramClient);
        exit = true;
    }

    // ── /kpi ──────────────────────────────────────────────────────────────────

    public void fnKpi() {
        if (exit) return;
        if (!textoMensaje.equals(BotCommands.KPI.getCommand())) return;

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.KPI_NO_SPRINT.getMessage(), telegramClient);
            exit = true;
            return;
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        if (tareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, BotMessages.KPI_EMPTY.getMessage(), telegramClient);
            exit = true;
            return;
        }

        String reporte = construirReporteKpi(sprint, tareas);
        BotHelper.sendMessageToTelegram(chatId, reporte, telegramClient);
        exit = true;
    }

    // ── /newsprint ────────────────────────────────────────────────────────────

    public void fnNuevoSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.NEW_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "newsprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            if (conversationManager.tieneConversacionActiva(chatId)) {
                BotHelper.sendMessageToTelegram(chatId,
                        "Ya tienes una operacion en curso. Escribe 'cancelar' para terminarla primero.",
                        telegramClient);
                exit = true;
                return;
            }
            ConversationState estado = new ConversationState("newsprint");
            conversationManager.iniciarConversacion(chatId, estado);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_NOMBRE.getMessage(), telegramClient);
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoNuevoSprint(estado);
        exit = true;
    }

    private void procesarPasoNuevoSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // esperando nombre del sprint
                estado.setDato("nombreSprint", textoMensaje.trim());
                estado.avanzarPaso();
                BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INICIO.getMessage(), telegramClient);
                break;

            case 1: // esperando fecha de inicio
                try {
                    LocalDate fechaInicio = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    estado.setDato("fechaInicio", fechaInicio);
                    estado.avanzarPaso();
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_FIN.getMessage(), telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 2: // esperando fecha de fin
                try {
                    LocalDate fechaFin = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    LocalDate fechaInicio = (LocalDate) estado.getDato("fechaInicio");

                    if (!fechaFin.isAfter(fechaInicio)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "La fecha de fin debe ser posterior a la fecha de inicio. Intenta de nuevo (dd/MM/yyyy):",
                                telegramClient);
                        break;
                    }

                    estado.setDato("fechaFin", fechaFin);
                    estado.avanzarPaso();

                    // Mostrar resumen para confirmacion antes de crear
                    String resumen = String.format(
                            BotMessages.SPRINT_CONFIRMACION.getMessage(),
                            estado.getDato("nombreSprint"),
                            fechaInicio.format(FORMATO_FECHA_COMPLETO),
                            fechaFin.format(FORMATO_FECHA_COMPLETO)
                    );
                    BotHelper.sendMessageToTelegram(chatId, resumen, telegramClient);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                }
                break;

            case 3: // esperando confirmacion de creacion de sprint
                procesarConfirmacionNuevoSprint(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarConfirmacionNuevoSprint(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();
        if (texto.equals("si") || texto.equals("sí")) {
            // Desactivar sprint activo anterior si existe
            Optional<Sprint> sprintPrevioOpt = sprintService.obtenerSprintActivo();
            if (sprintPrevioOpt.isPresent()) {
                Sprint sprintPrevio = sprintPrevioOpt.get();
                sprintPrevio.setActivo(false);
                Sprint resultado = sprintService.actualizarSprint(sprintPrevio.getIdSprint(), sprintPrevio);
                if (resultado == null) {
                    logger.warn("No se pudo desactivar el sprint anterior con ID {}", sprintPrevio.getIdSprint());
                }
            }

            // Crear el nuevo sprint
            Sprint nuevoSprint = new Sprint();
            nuevoSprint.setNombre((String) estado.getDato("nombreSprint"));
            nuevoSprint.setFechaInicio((LocalDate) estado.getDato("fechaInicio"));
            nuevoSprint.setFechaFin((LocalDate) estado.getDato("fechaFin"));
            nuevoSprint.setActivo(true);
            sprintService.crearSprint(nuevoSprint);
            conversationManager.terminarConversacion(chatId);

            String mensaje = BotMessages.NEWSPRINT_CREADO.getMessage()
                    .replace("{nombre}", nuevoSprint.getNombre());
            BotHelper.sendMessageToTelegram(chatId, mensaje, telegramClient);
        } else if (texto.equals("no") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_CANCELLED.getMessage(), telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Responde 'si' para crear el sprint o 'no' para cancelar.", telegramClient);
        }
    }

    // ── /modifytask ───────────────────────────────────────────────────────────

    public void fnModificarTarea() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.MODIFY_TASK.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "modifytask".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoModificarTarea();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoModificarTarea(estado);
        exit = true;
    }

    private void iniciarFlujoModificarTarea() {
        Usuario usuario = obtenerOAutoRegistrarUsuario();
        List<Tarea> todasLasTareas = tareaService.obtenerTareasPorUsuarioAsignado(usuario.getIdUsuario());

        if (todasLasTareas.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "No tienes tareas asignadas para modificar.", telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("modifytask");
        estado.setDato("idUsuario", usuario.getIdUsuario());
        conversationManager.iniciarConversacion(chatId, estado);

        StringBuilder sb = new StringBuilder("Tus tareas:\n\n");
        sb.append(construirListaTareasDetallada(todasLasTareas));
        sb.append("\n").append(BotMessages.SELECCIONAR_TAREA_MODIFICAR.getMessage());
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void procesarPasoModificarTarea(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // esperando ID de tarea
                procesarSeleccionTareaModificar(estado);
                break;

            case 1: // esperando numero de campo a editar
                procesarSeleccionCampo(estado);
                break;

            case 2: // esperando nuevo valor del campo
                procesarNuevoValorCampo(estado);
                break;

            case 3: // esperando confirmacion final
                procesarConfirmacionModificarTarea(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarSeleccionTareaModificar(ConversationState estado) {
        Long idTarea;
        try {
            idTarea = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "ID invalido. Escribe el numero del ID de la tarea:", telegramClient);
            return;
        }

        Tarea tarea = tareaService.obtenerTareaPorId(idTarea);
        Long idUsuario = (Long) estado.getDato("idUsuario");

        if (tarea == null || tarea.getUsuarioAsignado() == null
                || !tarea.getUsuarioAsignado().getIdUsuario().equals(idUsuario)) {
            BotHelper.sendMessageToTelegram(chatId, "No se encontro esa tarea asignada a ti. Intenta con otro ID:", telegramClient);
            return;
        }

        estado.setDato("idTarea", idTarea);
        estado.setDato("tareaActual", tarea);
        estado.avanzarPaso();

        String detalle = mostrarDetalleTarea(tarea);
        BotHelper.sendMessageToTelegram(chatId, detalle, telegramClient);
        BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
    }

    private void procesarSeleccionCampo(ConversationState estado) {
        int campo;
        try {
            campo = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Numero invalido. " + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        if (campo < 1 || campo > 7) {
            BotHelper.sendMessageToTelegram(chatId, "Elige un numero del 1 al 7:\n" + BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
            return;
        }

        estado.setDato("campoSeleccionado", campo);
        estado.avanzarPaso();

        switch (campo) {
            case 1:
                BotHelper.sendMessageToTelegram(chatId, "Escribe el nuevo titulo:", telegramClient);
                break;
            case 2:
                BotHelper.sendMessageToTelegram(chatId, "Escribe la nueva descripcion:", telegramClient);
                break;
            case 3:
                BotHelper.sendMessageToTelegram(chatId, "Escribe las nuevas horas estimadas (numero):", telegramClient);
                break;
            case 4:
                List<PrioridadTarea> prioridades = prioridadTareaService.obtenerTodasLasPrioridades();
                estado.setDato("listaPrioridades", prioridades);
                StringBuilder sbP = new StringBuilder("Selecciona la nueva prioridad:\n\n");
                for (int i = 0; i < prioridades.size(); i++) {
                    sbP.append(i + 1).append(". ").append(prioridades.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbP.toString(), telegramClient);
                break;
            case 5:
                List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();
                estado.setDato("listaUsuarios", usuarios);
                StringBuilder sbU = new StringBuilder("Selecciona el nuevo asignado:\n\n");
                for (int i = 0; i < usuarios.size(); i++) {
                    sbU.append(i + 1).append(". ").append(usuarios.get(i).getNombreCompleto()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbU.toString(), telegramClient);
                break;
            case 6:
                List<Sprint> sprints = sprintService.obtenerTodosLosSprints();
                estado.setDato("listaSprints", sprints);
                StringBuilder sbS = new StringBuilder("Selecciona el nuevo sprint:\n\n");
                for (int i = 0; i < sprints.size(); i++) {
                    Sprint s = sprints.get(i);
                    sbS.append(i + 1).append(". ").append(s.getNombre());
                    if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                        sbS.append(" (").append(s.getFechaInicio().format(FORMATO_FECHA))
                           .append(" - ").append(s.getFechaFin().format(FORMATO_FECHA)).append(")");
                    }
                    if (Boolean.TRUE.equals(s.getActivo())) sbS.append(" [Activo]");
                    sbS.append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbS.toString(), telegramClient);
                break;
            case 7:
                List<EstatusTarea> estatus = estatusTareaService.obtenerTodosLosEstatus();
                estado.setDato("listaEstatus", estatus);
                StringBuilder sbE = new StringBuilder("Selecciona el nuevo estatus:\n\n");
                for (int i = 0; i < estatus.size(); i++) {
                    sbE.append(i + 1).append(". ").append(estatus.get(i).getNombre()).append("\n");
                }
                BotHelper.sendMessageToTelegram(chatId, sbE.toString(), telegramClient);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    @SuppressWarnings("unchecked")
    private void procesarNuevoValorCampo(ConversationState estado) {
        int campo = (int) estado.getDato("campoSeleccionado");
        Tarea tareaActual = (Tarea) estado.getDato("tareaActual");

        switch (campo) {
            case 1: // titulo
                String nuevoTitulo = textoMensaje.trim();
                if (nuevoTitulo.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "El titulo no puede estar vacio. Intenta de nuevo:", telegramClient);
                    return;
                }
                estado.setDato("nuevoTitulo", nuevoTitulo);
                break;

            case 2: // descripcion
                estado.setDato("nuevaDescripcion", textoMensaje.trim());
                break;

            case 3: // horas estimadas
                try {
                    double nuevasHoras = Double.parseDouble(textoMensaje.trim().replace(",", "."));
                    estado.setDato("nuevasHoras", nuevasHoras);
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Escribe las horas estimadas:", telegramClient);
                    return;
                }
                break;

            case 4: // prioridad
                try {
                    int indicePrioridad = Integer.parseInt(textoMensaje.trim());
                    List<PrioridadTarea> prioridades = (List<PrioridadTarea>) estado.getDato("listaPrioridades");
                    if (prioridades == null || indicePrioridad < 1 || indicePrioridad > prioridades.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevaPrioridad", prioridades.get(indicePrioridad - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                    return;
                }
                break;

            case 5: // asignado
                try {
                    int indiceUsuario = Integer.parseInt(textoMensaje.trim());
                    List<Usuario> usuarios = (List<Usuario>) estado.getDato("listaUsuarios");
                    if (usuarios == null || indiceUsuario < 1 || indiceUsuario > usuarios.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoAsignado", usuarios.get(indiceUsuario - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                    return;
                }
                break;

            case 6: // sprint
                try {
                    int indiceSprint = Integer.parseInt(textoMensaje.trim());
                    List<Sprint> sprints = (List<Sprint>) estado.getDato("listaSprints");
                    if (sprints == null || indiceSprint < 1 || indiceSprint > sprints.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoSprint", sprints.get(indiceSprint - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                    return;
                }
                break;

            case 7: // estatus
                try {
                    int indiceEstatus = Integer.parseInt(textoMensaje.trim());
                    List<EstatusTarea> listaEstatus = (List<EstatusTarea>) estado.getDato("listaEstatus");
                    if (listaEstatus == null || indiceEstatus < 1 || indiceEstatus > listaEstatus.size()) {
                        BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                        return;
                    }
                    estado.setDato("nuevoEstatus", listaEstatus.get(indiceEstatus - 1));
                } catch (NumberFormatException e) {
                    BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige de la lista:", telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        estado.avanzarPaso();
        // Mostrar resumen del cambio y pedir confirmacion
        String resumen = construirResumenCambio(campo, estado, tareaActual);
        BotHelper.sendMessageToTelegram(chatId, resumen + "\n\nConfirmas los cambios? (si / no)", telegramClient);
    }

    @SuppressWarnings("unchecked")
    private void procesarConfirmacionModificarTarea(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();

        if (texto.equals("si") || texto.equals("sí")) {
            Long idTarea = (Long) estado.getDato("idTarea");
            int campo = (int) estado.getDato("campoSeleccionado");

            // Crear objeto Tarea con solo el campo modificado
            Tarea tareaActualizada = new Tarea();

            switch (campo) {
                case 1:
                    tareaActualizada.setTitulo((String) estado.getDato("nuevoTitulo"));
                    break;
                case 2:
                    tareaActualizada.setDescripcion((String) estado.getDato("nuevaDescripcion"));
                    break;
                case 3:
                    tareaActualizada.setHorasEstimadas((Double) estado.getDato("nuevasHoras"));
                    break;
                case 4:
                    tareaActualizada.setPrioridad((PrioridadTarea) estado.getDato("nuevaPrioridad"));
                    break;
                case 5:
                    tareaActualizada.setUsuarioAsignado((Usuario) estado.getDato("nuevoAsignado"));
                    break;
                case 6:
                    tareaActualizada.setSprint((Sprint) estado.getDato("nuevoSprint"));
                    break;
                case 7:
                    tareaActualizada.setEstatus((EstatusTarea) estado.getDato("nuevoEstatus"));
                    break;
                default:
                    conversationManager.terminarConversacion(chatId);
                    return;
            }

            Tarea resultado = tareaService.actualizarTarea(idTarea, tareaActualizada);
            conversationManager.terminarConversacion(chatId);

            if (resultado != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error al guardar los cambios. Intenta de nuevo.", telegramClient);
            }
        } else if (texto.equals("no")) {
            // Regresar a seleccion de campo
            estado.setPaso(1);
            Tarea tareaActual = (Tarea) estado.getDato("tareaActual");
            BotHelper.sendMessageToTelegram(chatId, mostrarDetalleTarea(tareaActual), telegramClient);
            BotHelper.sendMessageToTelegram(chatId, BotMessages.MODIFICAR_CAMPO.getMessage(), telegramClient);
        } else if (texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Responde 'si' para confirmar, 'no' para elegir otro campo, o 'cancelar'.", telegramClient);
        }
    }

    // ── /modifysprint ─────────────────────────────────────────────────────────

    public void fnModificarSprint() {
        if (exit) return;

        boolean esComandoInicio = textoMensaje.equals(BotCommands.MODIFY_SPRINT.getCommand());
        boolean tieneConversacionActiva = conversationManager.tieneConversacionActiva(chatId)
                && "modifysprint".equals(conversationManager.obtenerEstado(chatId).getComando());

        if (!esComandoInicio && !tieneConversacionActiva) return;

        if (esComandoInicio) {
            iniciarFlujoModificarSprint();
            exit = true;
            return;
        }

        ConversationState estado = conversationManager.obtenerEstado(chatId);
        procesarPasoModificarSprint(estado);
        exit = true;
    }

    private void iniciarFlujoModificarSprint() {
        List<Sprint> sprints = sprintService.obtenerTodosLosSprints();

        if (sprints.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "No hay sprints disponibles para modificar.", telegramClient);
            return;
        }

        ConversationState estado = new ConversationState("modifysprint");
        conversationManager.iniciarConversacion(chatId, estado);

        StringBuilder sb = new StringBuilder("Sprints disponibles:\n\n");
        for (Sprint s : sprints) {
            sb.append("ID ").append(s.getIdSprint()).append(" — ").append(s.getNombre());
            if (s.getFechaInicio() != null && s.getFechaFin() != null) {
                sb.append(" (").append(s.getFechaInicio().format(FORMATO_FECHA_COMPLETO))
                  .append(" -> ").append(s.getFechaFin().format(FORMATO_FECHA_COMPLETO)).append(")");
            }
            sb.append(Boolean.TRUE.equals(s.getActivo()) ? " [Activo]" : " [Inactivo]");
            sb.append("\n");
        }
        sb.append("\nEscribe el ID del sprint que deseas modificar:");
        BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    }

    private void procesarPasoModificarSprint(ConversationState estado) {
        if (textoMensaje.equalsIgnoreCase("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
            return;
        }

        switch (estado.getPaso()) {
            case 0: // esperando ID de sprint
                procesarSeleccionSprintModificar(estado);
                break;

            case 1: // esperando numero de campo a editar
                procesarSeleccionCampoSprint(estado);
                break;

            case 2: // esperando nuevo valor
                procesarNuevoValorSprint(estado);
                break;

            case 3: // esperando confirmacion
                procesarConfirmacionModificarSprint(estado);
                break;

            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarSeleccionSprintModificar(ConversationState estado) {
        Long idSprint;
        try {
            idSprint = Long.parseLong(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "ID invalido. Escribe el numero del ID del sprint:", telegramClient);
            return;
        }

        Optional<Sprint> sprintOpt = sprintService.obtenerSprintPorId(idSprint);
        if (sprintOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(chatId, "Sprint no encontrado. Escribe un ID valido:", telegramClient);
            return;
        }

        Sprint sprint = sprintOpt.get();
        estado.setDato("idSprint", idSprint);
        estado.setDato("sprintActual", sprint);
        estado.avanzarPaso();

        StringBuilder detalle = new StringBuilder("Sprint seleccionado:\n");
        detalle.append("Nombre: ").append(sprint.getNombre()).append("\n");
        if (sprint.getFechaInicio() != null) {
            detalle.append("Inicio: ").append(sprint.getFechaInicio().format(FORMATO_FECHA_COMPLETO)).append("\n");
        }
        if (sprint.getFechaFin() != null) {
            detalle.append("Fin: ").append(sprint.getFechaFin().format(FORMATO_FECHA_COMPLETO)).append("\n");
        }
        detalle.append("Activo: ").append(Boolean.TRUE.equals(sprint.getActivo()) ? "Si" : "No").append("\n\n");
        detalle.append("Que campo deseas editar?\n1. Nombre\n2. Fecha inicio\n3. Fecha fin");
        BotHelper.sendMessageToTelegram(chatId, detalle.toString(), telegramClient);
    }

    private void procesarSeleccionCampoSprint(ConversationState estado) {
        int campo;
        try {
            campo = Integer.parseInt(textoMensaje.trim());
        } catch (NumberFormatException e) {
            BotHelper.sendMessageToTelegram(chatId, "Numero invalido. Elige 1, 2 o 3:", telegramClient);
            return;
        }

        if (campo < 1 || campo > 3) {
            BotHelper.sendMessageToTelegram(chatId, "Elige un numero del 1 al 3:\n1. Nombre\n2. Fecha inicio\n3. Fecha fin", telegramClient);
            return;
        }

        estado.setDato("campoSprint", campo);
        estado.avanzarPaso();

        switch (campo) {
            case 1:
                BotHelper.sendMessageToTelegram(chatId, "Escribe el nuevo nombre del sprint:", telegramClient);
                break;
            case 2:
                BotHelper.sendMessageToTelegram(chatId, "Escribe la nueva fecha de inicio (dd/MM/yyyy):", telegramClient);
                break;
            case 3:
                BotHelper.sendMessageToTelegram(chatId, "Escribe la nueva fecha de fin (dd/MM/yyyy):", telegramClient);
                break;
            default:
                conversationManager.terminarConversacion(chatId);
        }
    }

    private void procesarNuevoValorSprint(ConversationState estado) {
        int campo = (int) estado.getDato("campoSprint");
        Sprint sprintActual = (Sprint) estado.getDato("sprintActual");

        switch (campo) {
            case 1: // nombre
                String nuevoNombre = textoMensaje.trim();
                if (nuevoNombre.isEmpty()) {
                    BotHelper.sendMessageToTelegram(chatId, "El nombre no puede estar vacio. Intenta de nuevo:", telegramClient);
                    return;
                }
                estado.setDato("nuevoNombreSprint", nuevoNombre);
                break;

            case 2: // fecha inicio
                try {
                    LocalDate nuevaFechaInicio = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    estado.setDato("nuevaFechaInicioSprint", nuevaFechaInicio);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            case 3: // fecha fin
                try {
                    LocalDate nuevaFechaFin = LocalDate.parse(textoMensaje.trim(), FORMATO_FECHA_COMPLETO);
                    // Validar que sea posterior a la fecha de inicio actual o nueva
                    LocalDate fechaInicioRef = estado.getDato("nuevaFechaInicioSprint") != null
                            ? (LocalDate) estado.getDato("nuevaFechaInicioSprint")
                            : sprintActual.getFechaInicio();
                    if (fechaInicioRef != null && !nuevaFechaFin.isAfter(fechaInicioRef)) {
                        BotHelper.sendMessageToTelegram(chatId,
                                "La fecha de fin debe ser posterior a la fecha de inicio. Intenta de nuevo (dd/MM/yyyy):",
                                telegramClient);
                        return;
                    }
                    estado.setDato("nuevaFechaFinSprint", nuevaFechaFin);
                } catch (Exception e) {
                    BotHelper.sendMessageToTelegram(chatId, BotMessages.NEWSPRINT_FECHA_INVALIDA.getMessage(), telegramClient);
                    return;
                }
                break;

            default:
                conversationManager.terminarConversacion(chatId);
                return;
        }

        estado.avanzarPaso();

        // Calcular nombre, fechaInicio, fechaFin para el resumen (usar nuevo valor si fue modificado)
        String nombreMostrar = estado.getDato("nuevoNombreSprint") != null
                ? (String) estado.getDato("nuevoNombreSprint")
                : sprintActual.getNombre();
        LocalDate inicioMostrar = estado.getDato("nuevaFechaInicioSprint") != null
                ? (LocalDate) estado.getDato("nuevaFechaInicioSprint")
                : sprintActual.getFechaInicio();
        LocalDate finMostrar = estado.getDato("nuevaFechaFinSprint") != null
                ? (LocalDate) estado.getDato("nuevaFechaFinSprint")
                : sprintActual.getFechaFin();

        String resumen = String.format(
                BotMessages.SPRINT_CONFIRMACION.getMessage(),
                nombreMostrar,
                inicioMostrar != null ? inicioMostrar.format(FORMATO_FECHA_COMPLETO) : "—",
                finMostrar != null ? finMostrar.format(FORMATO_FECHA_COMPLETO) : "—"
        );
        BotHelper.sendMessageToTelegram(chatId, resumen, telegramClient);
    }

    private void procesarConfirmacionModificarSprint(ConversationState estado) {
        String texto = textoMensaje.trim().toLowerCase();
        Sprint sprintActual = (Sprint) estado.getDato("sprintActual");
        Long idSprint = (Long) estado.getDato("idSprint");

        if (texto.equals("si") || texto.equals("sí")) {
            // Construir sprint con los campos a actualizar
            Sprint sprintActualizado = new Sprint();
            if (estado.getDato("nuevoNombreSprint") != null) {
                sprintActualizado.setNombre((String) estado.getDato("nuevoNombreSprint"));
            }
            if (estado.getDato("nuevaFechaInicioSprint") != null) {
                sprintActualizado.setFechaInicio((LocalDate) estado.getDato("nuevaFechaInicioSprint"));
            }
            if (estado.getDato("nuevaFechaFinSprint") != null) {
                sprintActualizado.setFechaFin((LocalDate) estado.getDato("nuevaFechaFinSprint"));
            }

            Sprint resultado = sprintService.actualizarSprint(idSprint, sprintActualizado);
            conversationManager.terminarConversacion(chatId);

            if (resultado != null) {
                BotHelper.sendMessageToTelegram(chatId, BotMessages.CAMBIOS_GUARDADOS.getMessage(), telegramClient);
            } else {
                BotHelper.sendMessageToTelegram(chatId, "Error al guardar los cambios. Intenta de nuevo.", telegramClient);
            }
        } else if (texto.equals("no") || texto.equals("cancelar")) {
            conversationManager.terminarConversacion(chatId);
            BotHelper.sendMessageToTelegram(chatId, "Operacion cancelada.", telegramClient);
        } else {
            BotHelper.sendMessageToTelegram(chatId, "Responde 'si' para guardar los cambios o 'no' para cancelar.", telegramClient);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Usuario obtenerOAutoRegistrarUsuario() {
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorTelegramId(telegramUserId);
        if (usuarioOpt.isPresent()) {
            return usuarioOpt.get();
        }

        String nombreUsuario = (telegramUsername != null && !telegramUsername.isEmpty())
                ? telegramUsername
                : "user_" + telegramUserId;

        String nombreCompleto;
        if (telegramFirstName != null && !telegramFirstName.isEmpty()) {
            nombreCompleto = telegramLastName != null && !telegramLastName.isEmpty()
                    ? telegramFirstName + " " + telegramLastName
                    : telegramFirstName;
        } else {
            nombreCompleto = nombreUsuario;
        }

        Usuario nuevo = usuarioService.autoRegistrarUsuario(telegramUserId, nombreUsuario, nombreCompleto);
        BotHelper.sendMessageToTelegram(chatId,
                "Bienvenido, " + nombreCompleto + "! Te hemos registrado automaticamente en el sistema.",
                telegramClient);
        return nuevo;
    }

    private String construirListaTareas(List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tareas) {
            sb.append("ID ").append(t.getIdTarea())
              .append(" — ").append(t.getTitulo());
            if (t.getHorasEstimadas() != null) {
                sb.append(" (").append(t.getHorasEstimadas()).append("h est.)");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String construirListaTareasDetallada(List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        for (Tarea t : tareas) {
            sb.append("ID ").append(t.getIdTarea())
              .append(" — ").append(t.getTitulo());
            if (t.getEstatus() != null) {
                sb.append(" [").append(t.getEstatus().getNombre()).append("]");
            }
            if (t.getHorasEstimadas() != null) {
                sb.append(" (").append(t.getHorasEstimadas()).append("h est.)");
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private String mostrarDetalleTarea(Tarea tarea) {
        StringBuilder sb = new StringBuilder("Detalles de la tarea:\n\n");
        sb.append("ID: ").append(tarea.getIdTarea()).append("\n");
        sb.append("Titulo: ").append(tarea.getTitulo()).append("\n");
        sb.append("Descripcion: ").append(tarea.getDescripcion() != null ? tarea.getDescripcion() : "(sin descripcion)").append("\n");
        sb.append("Horas estimadas: ").append(tarea.getHorasEstimadas() != null ? tarea.getHorasEstimadas() + "h" : "—").append("\n");
        sb.append("Horas reales: ").append(tarea.getHorasReales() != null ? tarea.getHorasReales() + "h" : "—").append("\n");
        sb.append("Prioridad: ").append(tarea.getPrioridad() != null ? tarea.getPrioridad().getNombre() : "—").append("\n");
        sb.append("Estatus: ").append(tarea.getEstatus() != null ? tarea.getEstatus().getNombre() : "—").append("\n");
        sb.append("Asignado a: ").append(tarea.getUsuarioAsignado() != null ? tarea.getUsuarioAsignado().getNombreCompleto() : "—").append("\n");
        sb.append("Sprint: ").append(tarea.getSprint() != null ? tarea.getSprint().getNombre() : "—").append("\n");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String construirResumenCambio(int campo, ConversationState estado, Tarea tareaActual) {
        StringBuilder sb = new StringBuilder("Cambio propuesto:\n");
        switch (campo) {
            case 1:
                sb.append("Titulo: ").append(tareaActual.getTitulo())
                  .append(" -> ").append(estado.getDato("nuevoTitulo"));
                break;
            case 2:
                sb.append("Descripcion: ").append(tareaActual.getDescripcion())
                  .append(" -> ").append(estado.getDato("nuevaDescripcion"));
                break;
            case 3:
                sb.append("Horas estimadas: ").append(tareaActual.getHorasEstimadas())
                  .append(" -> ").append(estado.getDato("nuevasHoras"));
                break;
            case 4:
                String prioridadAnterior = tareaActual.getPrioridad() != null ? tareaActual.getPrioridad().getNombre() : "—";
                PrioridadTarea nuevaPrioridad = (PrioridadTarea) estado.getDato("nuevaPrioridad");
                sb.append("Prioridad: ").append(prioridadAnterior)
                  .append(" -> ").append(nuevaPrioridad != null ? nuevaPrioridad.getNombre() : "—");
                break;
            case 5:
                String asignadoAnterior = tareaActual.getUsuarioAsignado() != null
                        ? tareaActual.getUsuarioAsignado().getNombreCompleto() : "—";
                Usuario nuevoAsignado = (Usuario) estado.getDato("nuevoAsignado");
                sb.append("Asignado a: ").append(asignadoAnterior)
                  .append(" -> ").append(nuevoAsignado != null ? nuevoAsignado.getNombreCompleto() : "—");
                break;
            case 6:
                String sprintAnterior = tareaActual.getSprint() != null ? tareaActual.getSprint().getNombre() : "—";
                Sprint nuevoSprint = (Sprint) estado.getDato("nuevoSprint");
                sb.append("Sprint: ").append(sprintAnterior)
                  .append(" -> ").append(nuevoSprint != null ? nuevoSprint.getNombre() : "—");
                break;
            case 7:
                String estatusAnterior = tareaActual.getEstatus() != null ? tareaActual.getEstatus().getNombre() : "—";
                EstatusTarea nuevoEstatus = (EstatusTarea) estado.getDato("nuevoEstatus");
                sb.append("Estatus: ").append(estatusAnterior)
                  .append(" -> ").append(nuevoEstatus != null ? nuevoEstatus.getNombre() : "—");
                break;
            default:
                sb.append("(campo desconocido)");
        }
        return sb.toString();
    }

    private String construirTablaSprint(Sprint sprint, List<Tarea> tareas) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== SPRINT: ").append(sprint.getNombre()).append(" ===\n");
        if (sprint.getFechaInicio() != null && sprint.getFechaFin() != null) {
            sb.append(sprint.getFechaInicio().format(FORMATO_FECHA))
              .append(" - ").append(sprint.getFechaFin().format(FORMATO_FECHA)).append("\n");
        }
        sb.append("Total tareas: ").append(tareas.size()).append("\n\n");

        sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                "ID", "Titulo", "Dev", "Estatus", "HEst", "HReal"));
        sb.append("-".repeat(65)).append("\n");

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? truncar(t.getUsuarioAsignado().getNombreCompleto(), 12)
                    : "Sin asignar";
            String estatus = t.getEstatus() != null ? truncar(t.getEstatus().getNombre(), 12) : "—";
            String hEst = t.getHorasEstimadas() != null ? t.getHorasEstimadas() + "h" : "—";
            String hReal = t.getHorasReales() != null ? t.getHorasReales() + "h" : "—";
            String titulo = truncar(t.getTitulo(), 20);

            sb.append(String.format("%-6s %-20s %-12s %-12s %5s %5s\n",
                    t.getIdTarea(), titulo, dev, estatus, hEst, hReal));
        }
        return sb.toString();
    }

    private String construirReporteKpi(Sprint sprint, List<Tarea> tareas) {
        // Agrupa por desarrollador: [total, completadas, horasEstTotal, horasRealTotal]
        Map<String, double[]> kpiPorDev = new LinkedHashMap<>();

        for (Tarea t : tareas) {
            String dev = t.getUsuarioAsignado() != null
                    ? t.getUsuarioAsignado().getNombreCompleto() : "Sin asignar";
            kpiPorDev.putIfAbsent(dev, new double[]{0, 0, 0, 0});
            double[] metricas = kpiPorDev.get(dev);
            metricas[0]++;
            boolean completada = t.getEstatus() != null
                    && "Completada".equalsIgnoreCase(t.getEstatus().getNombre());
            if (completada) metricas[1]++;
            if (t.getHorasEstimadas() != null) metricas[2] += t.getHorasEstimadas();
            if (t.getHorasReales() != null) metricas[3] += t.getHorasReales();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== KPI — ").append(sprint.getNombre()).append(" ===\n\n");

        for (Map.Entry<String, double[]> entrada : kpiPorDev.entrySet()) {
            double[] m = entrada.getValue();
            double eficiencia = m[2] > 0 ? (m[3] / m[2]) * 100 : 0;
            sb.append("Developer: ").append(entrada.getKey()).append("\n");
            sb.append("  Tareas total     : ").append((int) m[0]).append("\n");
            sb.append("  Completadas      : ").append((int) m[1]).append("\n");
            sb.append("  Horas estimadas  : ").append(m[2]).append("h\n");
            sb.append("  Horas reales     : ").append(m[3]).append("h\n");
            if (m[3] > 0) {
                sb.append("  Eficiencia       : ").append(String.format("%.0f%%", eficiencia))
                  .append(eficiencia <= 100 ? " (bajo presupuesto)" : " (sobre presupuesto)").append("\n");
            }
            sb.append("\n");
        }

        long completadasTotal = tareas.stream()
                .filter(t -> t.getEstatus() != null && "Completada".equalsIgnoreCase(t.getEstatus().getNombre()))
                .count();
        sb.append("TOTAL SPRINT: ").append(completadasTotal).append("/").append(tareas.size())
          .append(" tareas completadas");

        return sb.toString();
    }

    private String truncar(String texto, int maxLen) {
        if (texto == null) return "—";
        return texto.length() <= maxLen ? texto : texto.substring(0, maxLen - 1) + ".";
    }
}
