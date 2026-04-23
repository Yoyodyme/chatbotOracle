package com.springboot.MyTodoList.util;

public enum BotMessages {
	
	HELLO_MYTODO_BOT(
	"Hello! I'm MyTodoList Bot!\nType a new todo item below and press the send button (blue arrow), or select an option below:"),
	BOT_REGISTERED_STARTED("Bot registered and started succesfully!"),
	ITEM_DONE("Item done! Select /todolist to return to the list of todo items, or /start to go to the main screen."), 
	ITEM_UNDONE("Item undone! Select /todolist to return to the list of todo items, or /start to go to the main screen."), 
	ITEM_DELETED("Item deleted! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	TYPE_NEW_TODO_ITEM("Type a new todo item below and press the send button (blue arrow) on the rigth-hand side."),
	NEW_ITEM_ADDED("New item added! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	BYE("Bye! Select /start to resume!"),

	// newtask flow
	NEWTASK_TITLE("Nueva tarea\n\nPaso 1/4 — Escribe el titulo de la tarea:"),
	NEWTASK_DESC("Paso 2/4 — Escribe una breve descripcion (o escribe 'saltar' para omitir):"),
	NEWTASK_HOURS("Paso 3/4 — Cuantas horas estimadas requiere esta tarea? (numero, max 4h)\nOracle recomienda tareas de maximo 4 horas. Si es mayor, subdividela."),
	NEWTASK_HOURS_INVALID("Por favor escribe un numero valido de horas (ej: 2, 1.5)."),
	NEWTASK_HOURS_TOO_LONG("Esta tarea supera las 4 horas recomendadas por Oracle.\n\nSe recomienda subdividirla. Deseas continuar de todas formas? Escribe 'si' para continuar o 'cancelar' para empezar de nuevo."),
	NEWTASK_PRIORITY("Paso 4/4 — Selecciona la prioridad:"),
	NEWTASK_CREATED("Tarea creada exitosamente.\n\nID: {id}\nTitulo: {titulo}\nHoras estimadas: {horas}h"),
	NEWTASK_CANCELLED("Creacion de tarea cancelada."),

	// assignsprint flow
	ASSIGNSPRINT_NO_SPRINT("No hay un sprint activo en este momento. Pide a tu manager que active un sprint."),
	ASSIGNSPRINT_NO_TASKS("No tienes tareas pendientes para asignar al sprint."),
	ASSIGNSPRINT_SELECT("Selecciona el ID de la tarea a asignar al sprint actual:\n\n{lista}"),
	ASSIGNSPRINT_INVALID_ID("ID de tarea invalido. Escribe el numero del ID."),
	ASSIGNSPRINT_NOT_FOUND("No se encontro esa tarea asignada a ti."),
	ASSIGNSPRINT_DONE("Tarea {id} asignada al sprint y marcada como En Progreso."),

	// donetask flow
	DONETASK_NO_TASKS("No tienes tareas activas asignadas. Usa /newtask para crear una tarea."),
	DONETASK_SELECT("Selecciona el ID de la tarea a completar:\n\n{lista}"),
	DONETASK_HOURS("Cuantas horas reales tomo completar esta tarea? (numero):"),
	DONETASK_HOURS_INVALID("Por favor escribe un numero valido de horas."),
	DONETASK_DONE("Tarea {id} marcada como Completada.\nHoras reales: {horas}h"),

	// sprint table
	SPRINTTABLE_NO_SPRINT("No hay un sprint activo."),
	SPRINTTABLE_EMPTY("El sprint actual no tiene tareas asignadas."),

	// kpi
	KPI_NO_SPRINT("No hay un sprint activo."),
	KPI_EMPTY("El sprint actual no tiene tareas."),

	// newsprint flow
	NEWSPRINT_NOMBRE("Nuevo Sprint\n\nPaso 1/3 — Escribe el nombre del sprint:"),
	NEWSPRINT_FECHA_INICIO("Paso 2/3 — Fecha de inicio (dd/MM/yyyy):"),
	NEWSPRINT_FECHA_FIN("Paso 3/3 — Fecha de fin (dd/MM/yyyy):"),
	NEWSPRINT_FECHA_INVALIDA("Formato de fecha invalido. Usa dd/MM/yyyy (ej: 25/04/2025):"),
	NEWSPRINT_CREADO("Sprint '{nombre}' creado y activado."),
	NEWSPRINT_CANCELLED("Creacion de sprint cancelada.");

	private String message;

	BotMessages(String enumMessage) {
		this.message = enumMessage;
	}

	public String getMessage() {
		return message;
	}

}
