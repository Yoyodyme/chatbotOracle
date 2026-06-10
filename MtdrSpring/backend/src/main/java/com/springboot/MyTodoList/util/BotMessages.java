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
	NEWTASK_TITLE("New task\n\nStep 1/6 — Enter the task title:"),
	NEWTASK_DESC("Step 2/6 — Enter a brief description (or type 'skip' to omit):"),
	NEWTASK_HOURS("Step 3/6 — How many estimated hours does this task require? (number, max 4h)\nOracle recommends tasks of at most 4 hours. If longer, break it down."),
	NEWTASK_HOURS_INVALID("Please enter a valid number of hours (e.g. 2, 1.5)."),
	NEWTASK_HOURS_TOO_LONG("This task exceeds the 4-hour limit recommended by Oracle.\n\nIt is recommended to break it down. Do you want to continue anyway? Type 'yes' to continue or 'cancel' to start over."),
	NEWTASK_PRIORITY("Step 4/6 — Select the priority:"),
	NEWTASK_CREATED("Task created successfully.\n\nID: {id}\nTitle: {titulo}\nEstimated hours: {horas}h"),
	NEWTASK_CANCELLED("Task creation cancelled."),

	// newtask sprint step
	NEWTASK_SPRINT("Step 6/6 — Which sprint should this task go to?\n\n{lista}\nOr type 'backlog' to add to the backlog without a sprint."),
	NEWTASK_SPRINT_INVALID("Invalid option. Enter a number from the list, or type 'backlog'."),

	// assignsprint flow
	ASSIGNSPRINT_NO_SPRINT("There is no active sprint at the moment. Ask your manager to activate a sprint."),
	ASSIGNSPRINT_NO_TASKS("You have no pending tasks to assign to the sprint."),
	ASSIGNSPRINT_SELECT("Select the ID of the task to assign to the current sprint:\n\n{lista}"),
	ASSIGNSPRINT_INVALID_ID("Invalid task ID. Enter the numeric ID."),
	ASSIGNSPRINT_NOT_FOUND("That task assigned to you was not found."),
	ASSIGNSPRINT_DONE("Task {id} assigned to the sprint and marked as In Progress."),

	// donetask flow
	DONETASK_NO_TASKS("You have no active tasks assigned. Use /newtask to create a task."),
	DONETASK_SELECT("Select the ID of the task to complete:\n\n{lista}"),
	DONETASK_HOURS("How many actual hours did it take to complete this task? (number):"),
	DONETASK_HOURS_INVALID("Please enter a valid number of hours."),
	DONETASK_DONE("Task {id} marked as Completed.\nActual hours: {horas}h"),

	// sprint table
	SPRINTTABLE_NO_SPRINT("There is no active sprint."),
	SPRINTTABLE_EMPTY("The current sprint has no assigned tasks."),

	// kpi
	KPI_NO_SPRINT("There is no active sprint."),
	KPI_EMPTY("The current sprint has no tasks."),

	// active sprint
	ACTIVESPRINT_NO_SPRINT("No active sprint. Use 'New Sprint' to create one."),

	// list sprints
	LISTSPRINTS_EMPTY("No sprints on record yet. Use 'New Sprint' to create one."),

	// newsprint flow
	NEWSPRINT_NOMBRE("New Sprint\n\nStep 1/3 — Enter the sprint name:"),
	NEWSPRINT_FECHA_INICIO("Step 2/3 — Start date (dd/MM/yyyy):"),
	NEWSPRINT_FECHA_FIN("Step 3/3 — End date (dd/MM/yyyy):"),
	NEWSPRINT_FECHA_INVALIDA("Invalid date format. Use dd/MM/yyyy (e.g. 25/04/2025):"),
	NEWSPRINT_CREADO("Sprint '{nombre}' created and activated."),
	NEWSPRINT_CANCELLED("Sprint creation cancelled."),

	// select assignee in newtask (step 5/6)
	SELECCIONAR_ASIGNADO("Step 5/6 — Select who to assign the task to:\n(Reply with the number)"),

	// new task confirmation — 6 format args: title, desc, hours, priority, assignee, sprint
	TAREA_CONFIRMACION("Task summary:\nTitle: %s\nDescription: %s\nEstimated hours: %.1f\nPriority: %s\nAssigned to: %s\nSprint: %s\n\nIs this correct? Reply 'yes' to save, or 'edit [field]' to correct.\nExample: edit title, edit hours, edit priority, edit assigned, edit sprint"),

	// modify task
	MODIFICAR_CAMPO("Which field do you want to edit?\n1. Title\n2. Description\n3. Estimated hours\n4. Priority\n5. Assigned to\n6. Sprint\n7. Status\n\nReply with the number."),
	CAMBIOS_GUARDADOS("Changes saved successfully."),

	// sprint confirmation
	SPRINT_CONFIRMACION("Sprint summary:\nName: %s\nStart: %s\nEnd: %s\n\nIs this correct? Reply 'yes' to save or 'no' to cancel."),

	// select task to modify
	SELECCIONAR_TAREA_MODIFICAR("Select the task you want to modify (enter the ID):");

	private String message;

	BotMessages(String enumMessage) {
		this.message = enumMessage;
	}

	public String getMessage() {
		return message;
	}

}
