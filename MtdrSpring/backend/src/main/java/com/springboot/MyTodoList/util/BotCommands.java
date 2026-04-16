package com.springboot.MyTodoList.util;

public enum BotCommands {

	START_COMMAND("/start"), 
	HIDE_COMMAND("/hide"), 
	TODO_LIST("/todolist"),
	ADD_ITEM("/additem"),
	LLM_REQ("/llm"),
	NEW_TASK("/newtask"),
	ASSIGN_SPRINT("/assignsprint"),
	DONE_TASK("/donetask"),
	SPRINT_TABLE("/sprinttable"),
	KPI("/kpi"),
	NEW_SPRINT("/newsprint");

	private String command;

	BotCommands(String enumCommand) {
		this.command = enumCommand;
	}

	public String getCommand() {
		return command;
	}
}
