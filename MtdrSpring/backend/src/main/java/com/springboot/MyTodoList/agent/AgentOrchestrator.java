package com.springboot.MyTodoList.agent;

import com.springboot.MyTodoList.model.Sprint;
import com.springboot.MyTodoList.model.Tarea;
import com.springboot.MyTodoList.model.Usuario;
import com.springboot.MyTodoList.service.SprintService;
import com.springboot.MyTodoList.service.TareaService;
import com.springboot.MyTodoList.service.UsuarioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Orquestador principal del asistente conversacional.
 * Recibe el texto del usuario, delega el análisis de intención al LlmIntentParser
 * y despacha la lógica correspondiente a cada intención reconocida.
 *
 * Soporta historial de conversación multi-turno mediante el overload
 * {@link #manejarMensaje(String, List)}, que pasa el contexto previo al parser.
 * El overload sin historial {@link #manejarMensaje(String)} sigue siendo compatible
 * con todos los llamadores existentes (Telegram bot, etc.).
 */
@Service
public class AgentOrchestrator {

    private static final Logger logger = LoggerFactory.getLogger(AgentOrchestrator.class);
    private static final int MAX_TAREAS = 10;

    private final LlmIntentParser llmIntentParser;
    private final TareaService tareaService;
    private final SprintService sprintService;
    private final UsuarioService usuarioService;

    public AgentOrchestrator(LlmIntentParser llmIntentParser,
                              TareaService tareaService,
                              SprintService sprintService,
                              UsuarioService usuarioService) {
        this.llmIntentParser = llmIntentParser;
        this.tareaService = tareaService;
        this.sprintService = sprintService;
        this.usuarioService = usuarioService;
    }

    // -------------------------------------------------------------------------
    // Punto de entrada — sin historial (compatibilidad hacia atrás)
    // -------------------------------------------------------------------------

    /**
     * Punto de entrada compatible con llamadores existentes (bot de Telegram, etc.).
     * Delega a {@link #manejarMensaje(String, List)} con historial vacío.
     *
     * @param textoMensaje Mensaje enviado por el usuario
     * @return Respuesta en texto plano en español
     */
    public String manejarMensaje(String textoMensaje) {
        return manejarMensaje(textoMensaje, Collections.emptyList());
    }

    // -------------------------------------------------------------------------
    // Punto de entrada principal — con historial multi-turno
    // -------------------------------------------------------------------------

    /**
     * Analiza el mensaje, determina la intención y devuelve la respuesta adecuada.
     * El historial de la conversación se pasa al LLM para permitir respuestas con contexto.
     *
     * @param textoMensaje Mensaje enviado por el usuario en el turno actual
     * @param historial    Mensajes previos de la conversación (puede estar vacío)
     * @return Respuesta en texto plano en español
     */
    public String manejarMensaje(String textoMensaje, List<Map<String, String>> historial) {
        if (textoMensaje == null || textoMensaje.isBlank()) {
            return "Por favor escribe un mensaje. Puedes pedirme que liste tareas, "
                    + "muestre el resumen del sprint o la carga del equipo.";
        }

        ParsedIntent intentParseado;
        try {
            intentParseado = llmIntentParser.parse(textoMensaje, historial);
        } catch (Exception ex) {
            logger.error("Error al analizar la intención del mensaje: {}", textoMensaje, ex);
            return "Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.";
        }

        // Si el modelo necesita más información antes de responder, devolver la pregunta
        if (intentParseado.isClarificationNeeded()
                && !seguro(intentParseado.getClarificationQuestion()).isBlank()) {
            return intentParseado.getClarificationQuestion();
        }

        switch (intentParseado.getIntent()) {
            case AYUDA:
                return manejarAyuda();
            case LISTAR_TAREAS:
                return manejarListarTareas();
            case TAREAS_POR_ASIGNADO:
                return manejarTareasPorAsignado(seguro(intentParseado.getAsignado()));
            case TAREAS_POR_ESTATUS:
                return manejarTareasPorEstatus(seguro(intentParseado.getEstatus()));
            case RESUMEN_SPRINT:
                return manejarResumenSprint();
            case CARGA_EQUIPO:
                return manejarCargaEquipo();
            case VER_TAREA:
                return manejarVerTarea(seguro(intentParseado.getTitulo()));
            case MODIFICAR_TAREA:
                return "Para modificar una tarea, usa el comando Modificar Tarea en el menú del bot "
                        + "o en el panel de tareas.";
            case ASIGNAR_TAREA:
                return "Para modificar una tarea, usa el comando Modificar Tarea en el menú del bot "
                        + "o en el panel de tareas.";
            case DESCONOCIDO:
            default:
                return llmIntentParser.generarRespuestaConversacional(textoMensaje, historial);
        }
    }

    // -------------------------------------------------------------------------
    // Manejadores por intención
    // -------------------------------------------------------------------------

    /** Devuelve el texto de ayuda estático con las capacidades del asistente. */
    private String manejarAyuda() {
        return "Puedo ayudarte con lo siguiente:\n"
                + "• Listar todas las tareas\n"
                + "• Ver tareas de un usuario (ej: \"tareas de Juan\")\n"
                + "• Filtrar tareas por estatus (ej: \"tareas pendientes\")\n"
                + "• Ver el resumen del sprint activo\n"
                + "• Ver la carga de trabajo del equipo\n"
                + "• Ver los detalles de una tarea (ej: \"detalle de la tarea Login\")\n"
                + "• Conversar sobre cualquier otro tema del proyecto";
    }

    /** Lista todas las tareas (máximo MAX_TAREAS visibles, con indicador si hay más). */
    private String manejarListarTareas() {
        List<Tarea> tareas = tareaService.obtenerTodosLasTareas();

        if (tareas.isEmpty()) {
            return "No hay tareas registradas en el sistema.";
        }

        int total = tareas.size();
        StringBuilder sb = new StringBuilder("Tareas registradas:\n");

        tareas.stream()
              .limit(MAX_TAREAS)
              .forEach(t -> sb.append(formatearBulletTarea(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…y ").append(total - MAX_TAREAS).append(" más.");
        }

        return sb.toString().trim();
    }

    /**
     * Busca al usuario por nombre (fuzzy normalizado) y lista sus tareas asignadas.
     *
     * @param nombreBuscado Nombre del usuario extraído de la intención
     */
    private String manejarTareasPorAsignado(String nombreBuscado) {
        if (nombreBuscado.isBlank()) {
            return "No entendí el nombre del usuario. ¿Podrías indicarme el nombre completo o de usuario?";
        }

        List<Usuario> usuarios = usuarioService.obtenerTodosLosUsuarios();

        Optional<Usuario> usuarioEncontrado = usuarios.stream()
                .filter(u -> normalizar(seguro(u.getNombreCompleto())).contains(normalizar(nombreBuscado))
                          || normalizar(seguro(u.getNombreUsuario())).contains(normalizar(nombreBuscado)))
                .findFirst();

        if (usuarioEncontrado.isEmpty()) {
            logger.warn("No se encontró ningún usuario con nombre: {}", nombreBuscado);
            return "No encontré ningún usuario con el nombre '" + nombreBuscado + "'. "
                    + "Verifica que el nombre esté escrito correctamente.";
        }

        Usuario usuario = usuarioEncontrado.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorUsuarioAsignado(usuario.getIdUsuario());

        if (tareas.isEmpty()) {
            return "El usuario " + seguro(usuario.getNombreCompleto()) + " no tiene tareas asignadas.";
        }

        int total = tareas.size();
        StringBuilder sb = new StringBuilder(
                "Tareas asignadas a " + seguro(usuario.getNombreCompleto()) + ":\n");

        tareas.stream()
              .limit(MAX_TAREAS)
              .forEach(t -> sb.append(formatearBulletTareaConEstatus(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…y ").append(total - MAX_TAREAS).append(" más.");
        }

        return sb.toString().trim();
    }

    /**
     * Filtra tareas por estatus usando coincidencia normalizada parcial.
     *
     * @param estatusBuscado Nombre de estatus extraído de la intención
     */
    private String manejarTareasPorEstatus(String estatusBuscado) {
        if (estatusBuscado.isBlank()) {
            return "No entendí el estatus. Prueba con: Pendiente, En Progreso o Completada.";
        }

        List<Tarea> todas = tareaService.obtenerTodosLasTareas();

        List<Tarea> filtradas = todas.stream()
                .filter(t -> t.getEstatus() != null
                          && normalizar(t.getEstatus().getNombre())
                                 .contains(normalizar(estatusBuscado)))
                .collect(Collectors.toList());

        if (filtradas.isEmpty()) {
            return "No hay tareas con estatus '" + estatusBuscado + "'.";
        }

        int total = filtradas.size();
        StringBuilder sb = new StringBuilder(
                "Tareas con estatus '" + estatusBuscado + "':\n");

        filtradas.stream()
                 .limit(MAX_TAREAS)
                 .forEach(t -> sb.append(formatearBulletTarea(t)).append("\n"));

        if (total > MAX_TAREAS) {
            sb.append("…y ").append(total - MAX_TAREAS).append(" más.");
        }

        return sb.toString().trim();
    }

    /** Muestra nombre, fechas, totales, conteo por estatus y horas del sprint activo. */
    private String manejarResumenSprint() {
        Optional<Sprint> sprintOpt = sprintService.obtenerSprintActivo();

        if (sprintOpt.isEmpty()) {
            return "No hay un sprint activo en este momento.";
        }

        Sprint sprint = sprintOpt.get();
        List<Tarea> tareas = tareaService.obtenerTareasPorSprint(sprint.getIdSprint());

        int totalTareas = tareas.size();

        Map<String, Long> porEstatus = tareas.stream()
                .filter(t -> t.getEstatus() != null)
                .collect(Collectors.groupingBy(
                        t -> t.getEstatus().getNombre(),
                        Collectors.counting()));

        double horasEstimadas = tareas.stream()
                .filter(t -> t.getHorasEstimadas() != null)
                .mapToDouble(Tarea::getHorasEstimadas)
                .sum();

        double horasReales = tareas.stream()
                .filter(t -> t.getHorasReales() != null)
                .mapToDouble(Tarea::getHorasReales)
                .sum();

        StringBuilder sb = new StringBuilder();
        sb.append("Resumen del Sprint Activo\n");
        sb.append("Nombre: ").append(seguro(sprint.getNombre())).append("\n");
        sb.append("Inicio: ").append(sprint.getFechaInicio() != null ? sprint.getFechaInicio() : "—").append("\n");
        sb.append("Fin: ").append(sprint.getFechaFin() != null ? sprint.getFechaFin() : "—").append("\n");
        sb.append("Total de tareas: ").append(totalTareas).append("\n");

        if (!porEstatus.isEmpty()) {
            sb.append("Por estatus:\n");
            porEstatus.forEach((estatus, cantidad) ->
                    sb.append("  • ").append(estatus).append(": ").append(cantidad).append("\n"));
        }

        sb.append(String.format("Horas estimadas: %.1f%n", horasEstimadas));
        sb.append(String.format("Horas reales: %.1f", horasReales));

        return sb.toString().trim();
    }

    /** Muestra el conteo de tareas por miembro del equipo, ordenado de mayor a menor. */
    private String manejarCargaEquipo() {
        List<Tarea> todas = tareaService.obtenerTodosLasTareas();

        if (todas.isEmpty()) {
            return "No hay tareas registradas para mostrar la carga del equipo.";
        }

        Map<String, Long> cargaPorPersona = todas.stream()
                .collect(Collectors.groupingBy(
                        t -> (t.getUsuarioAsignado() != null
                                && t.getUsuarioAsignado().getNombreCompleto() != null)
                             ? t.getUsuarioAsignado().getNombreCompleto()
                             : "Sin asignar",
                        Collectors.counting()));

        StringBuilder sb = new StringBuilder("Carga de trabajo del equipo:\n");

        cargaPorPersona.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(entrada ->
                        sb.append("• ").append(entrada.getKey())
                          .append(": ").append(entrada.getValue())
                          .append(" tarea(s)\n"));

        return sb.toString().trim();
    }

    /**
     * Busca una tarea por coincidencia parcial del título y muestra sus detalles.
     *
     * @param tituloBuscado Título o parte del título extraído de la intención
     */
    private String manejarVerTarea(String tituloBuscado) {
        if (tituloBuscado == null || tituloBuscado.isBlank()) {
            return "¿De qué tarea quieres ver los detalles? Indícame el título o parte del nombre.";
        }

        List<Tarea> todas = tareaService.obtenerTodosLasTareas();

        Optional<Tarea> encontrada = todas.stream()
                .filter(t -> t.getTitulo() != null
                        && normalizar(t.getTitulo()).contains(normalizar(tituloBuscado)))
                .findFirst();

        if (encontrada.isEmpty()) {
            return "No encontré ninguna tarea con el título '" + tituloBuscado + "'. "
                    + "Verifica que el nombre esté escrito correctamente.";
        }

        Tarea t = encontrada.get();
        String estatus   = t.getEstatus() != null ? seguro(t.getEstatus().getNombre()) : "—";
        String asignado  = t.getUsuarioAsignado() != null
                ? seguro(t.getUsuarioAsignado().getNombreCompleto()) : "Sin asignar";
        String hEst      = t.getHorasEstimadas() != null ? String.valueOf(t.getHorasEstimadas()) : "—";
        String hReal     = t.getHorasReales()    != null ? String.valueOf(t.getHorasReales())    : "—";

        return "Tarea: " + seguro(t.getTitulo()) + "\n"
                + "Estatus: " + estatus + "\n"
                + "Asignado a: " + asignado + "\n"
                + "Horas estimadas: " + hEst + "\n"
                + "Horas reales: " + hReal;
    }

    // -------------------------------------------------------------------------
    // Helpers de formato
    // -------------------------------------------------------------------------

    /**
     * Formatea una tarea en una línea: "• titulo [estatus] — asignado"
     * Incluye título, estatus y nombre del asignado (o "sin asignar" si es null).
     */
    private String formatearBulletTarea(Tarea tarea) {
        String titulo = seguro(tarea.getTitulo());
        String estatus = tarea.getEstatus() != null
                ? seguro(tarea.getEstatus().getNombre())
                : "sin estatus";
        String asignado = tarea.getUsuarioAsignado() != null
                ? seguro(tarea.getUsuarioAsignado().getNombreCompleto())
                : "sin asignar";
        return "• " + titulo + " [" + estatus + "] — " + asignado;
    }

    /**
     * Formatea una tarea mostrando únicamente título y estatus (sin asignado).
     * Usado en listas donde el asignado ya es el contexto (TAREAS_POR_ASIGNADO).
     */
    private String formatearBulletTareaConEstatus(Tarea tarea) {
        String titulo = seguro(tarea.getTitulo());
        String estatus = tarea.getEstatus() != null
                ? seguro(tarea.getEstatus().getNombre())
                : "sin estatus";
        return "• " + titulo + " [" + estatus + "]";
    }

    // -------------------------------------------------------------------------
    // Helpers utilitarios
    // -------------------------------------------------------------------------

    /**
     * Normaliza un texto para comparación: convierte a minúsculas y elimina acentos.
     *
     * @param texto Texto a normalizar
     * @return Texto normalizado, o cadena vacía si es null
     */
    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.toLowerCase()
                .replace('á', 'a').replace('é', 'e').replace('í', 'i')
                .replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
                .replace('ü', 'u');
    }

    /**
     * Devuelve el valor si no es null, o una cadena vacía en caso contrario.
     *
     * @param valor Valor posiblemente null
     * @return El valor original o ""
     */
    private String seguro(String valor) {
        return valor != null ? valor : "";
    }
}
