# Telegram Bot — Known Issues

Add new issues here as they are discovered. Do not remove entries until the fix is confirmed working in production.

---

## BUG-001 — Sprint-specific task query returns active sprint summary

**Reported:** 2026-05-28  
**Status:** Open

**Steps to reproduce:**  
Type "show me the tasks in sprint 4" (or any sprint by number/name).

**Actual behaviour:**  
Bot returns the active sprint summary.

**Expected behaviour:**  
Bot lists the tasks belonging to the requested sprint.

**Root cause:**  
The LLM classifies the message as `SPRINT_SUMMARY`, and that handler always fetches the *active* sprint — it has no concept of a sprint filter. There is also no dedicated intent for "tasks in a specific sprint by name or number."

---

## BUG-002 — Bot re-registers existing users on every interaction

**Reported:** 2026-05-28  
**Status:** Open

**Steps to reproduce:**  
Any bot command or message sent by a user whose `Usuario` record was created through the web UI or SQL seed script (i.e. `idIntegrationUsuario` is null).

**Actual behaviour:**  
Bot sends "Welcome, [Name]! You have been automatically registered in the system." on every single message, then proceeds as if the user has no tasks.

**Expected behaviour:**  
Bot recognises the existing user, either by Telegram ID or by matching name/username, and uses their existing record.

**Root cause:**  
`getOrRegisterUser()` in `TareaBotActions` looks up users exclusively by `idIntegrationUsuario` (Telegram numeric ID). Users created outside the bot have this field set to `null`, so the lookup always fails and a brand-new duplicate `Usuario` row is inserted each time. All subsequent task queries run against that empty duplicate record.

---

## BUG-003 — `/sprinttable` shows an unexpected menu instead of the sprint table

**Reported:** 2026-05-28  
**Status:** Open

**Steps to reproduce:**  
Type `/sprinttable` directly in the chat.

**Actual behaviour:**  
Bot responds with a menu or keyboard different from the main menu, not the sprint table.

**Expected behaviour:**  
Bot displays the formatted sprint task table for the active sprint.

**Root cause (suspected):**  
Either (a) `BotCommands.SPRINT_TABLE.getCommand()` does not return `"/sprinttable"` exactly, causing the guard clause in `fnTablaSprint()` to bail silently, or (b) the active sprint query returns empty because no sprint in the DB has `estado = "current"`, so the "no active sprint" message is sent instead.

---

## BUG-004 — "Complete task with id 148, it took 1.5 hours" → "no active tasks"

**Reported:** 2026-05-28  
**Status:** Open

**Steps to reproduce:**  
Type a natural-language complete-task message that includes a task ID, e.g. "complete task with id 148, it took 1.5 hours to complete."

**Actual behaviour:**  
Bot responds "You have no active tasks assigned. Use /newtask to create a task."

**Expected behaviour:**  
Bot marks task 148 as completed with 1.5 actual hours.

**Root cause:**  
Two compounding problems:  
1. Same as BUG-002 — `getOrRegisterUser()` creates a fresh duplicate user, and `startCompleteTaskFlow()` queries active tasks for that empty record.  
2. The task ID `148` extracted from natural language is never used. `startCompleteTaskFlow()` always performs a user-scoped active-task lookup and ignores any slot data from the parsed intent.
