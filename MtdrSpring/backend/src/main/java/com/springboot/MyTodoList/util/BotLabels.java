package com.springboot.MyTodoList.util;

public enum BotLabels {
	
	SHOW_MAIN_SCREEN("Show Main Screen"), 
	HIDE_MAIN_SCREEN("Hide Main Screen"),
	LIST_ALL_ITEMS("List All Items"), 
	ADD_NEW_ITEM("Add New Item"),
	DONE("DONE"),
	UNDO("UNDO"),
	DELETE("DELETE"),
	MY_TODO_LIST("MY TODO LIST"),
	DASH("-"),
	NEW_TASK("Nueva Tarea"),
	ASSIGN_TO_SPRINT("Asignar a Sprint"),
	COMPLETE_TASK("Completar Tarea"),
	SPRINT_TABLE("Tabla del Sprint"),
	KPI_REPORT("KPI del Sprint"),
	CANCEL("Cancelar"),
	NEW_SPRINT("Nuevo Sprint");

	private String label;

	BotLabels(String enumLabel) {
		this.label = enumLabel;
	}

	public String getLabel() {
		return label;
	}

}
