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
	NEW_TASK("New Task"),
	ASSIGN_TO_SPRINT("Assign to Sprint"),
	COMPLETE_TASK("Complete Task"),
	SPRINT_TABLE("Sprint Table"),
	KPI_REPORT("Sprint KPI"),
	CANCEL("Cancel"),
	NEW_SPRINT("New Sprint"),
	MODIFY_TASK("Modify Task"),
	MODIFY_SPRINT("Modify Sprint"),
	CONFIRM_YES("Yes, confirm"),
	CONFIRM_EDIT("No, edit");

	private String label;

	BotLabels(String enumLabel) {
		this.label = enumLabel;
	}

	public String getLabel() {
		return label;
	}

}
