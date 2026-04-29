# Telegram Agent Bot — Architecture & Replication Guide

This document gives a Claude instance everything it needs to replicate this project identically in a new Java/Spring Boot workspace. It covers architecture patterns, exact file structure, class responsibilities, key code snippets, and a step-by-step replication checklist.

---

## 1. What This System Does

A multi-channel Agile project management assistant with three interfaces that all share a single "brain":

| Channel | Entry point | Purpose |
|---------|-------------|---------|
| Telegram bot | `TelegramAgentBot.java` | Natural-language task queries via chat |
| Web UI | `static/index.html` + `app.js` | Task CRUD form + ChatGPT-style assistant page |
| REST API | `TaskController` + `AssistantController` | Backend consumed by the web UI |

All three channels call the same `AgentOrchestrator.handleMessage(String)` and get back a plain-text response.

---

## 2. Technology Stack

| Concern | Choice |
|---------|--------|
| Language | Java 17 |
| Framework | Spring Boot 3.3.5 |
| Telegram library | `telegrambots-springboot-longpolling-starter` v9.1.0 |
| Telegram sender | `telegrambots-client` v9.1.0 (`OkHttpTelegramClient`) |
| HTTP client (LLM calls) | Spring Framework `RestClient` (built-in, no extra dependency) |
| JSON | Jackson (`jackson-databind`) |
| Build | Maven |
| Frontend | Vanilla JS + HTML5 + CSS3 (no framework) |

### `pom.xml` — critical dependencies

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
</parent>

<properties>
    <java.version>17</java.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.telegram</groupId>
        <artifactId>telegrambots-springboot-longpolling-starter</artifactId>
        <version>9.1.0</version>
    </dependency>
    <dependency>
        <groupId>org.telegram</groupId>
        <artifactId>telegrambots-client</artifactId>
        <version>9.1.0</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## 3. Exact File & Folder Structure

```
src/
└── main/
    ├── java/com/oraclebot/phase3/
    │   ├── TelegramAgentUiPhase3Application.java   ← Spring Boot entry point
    │   ├── agent/
    │   │   ├── AgentOrchestrator.java              ← Core message dispatcher
    │   │   ├── IntentParser.java                   ← Interface
    │   │   ├── IntentType.java                     ← Enum (8 intent values)
    │   │   ├── LlmIntentParser.java                ← Groq API calls (primary)
    │   │   ├── ParsedIntent.java                   ← DTO for LLM JSON response
    │   │   └── RuleBasedIntentParser.java          ← Regex fallback
    │   ├── bot/
    │   │   └── TelegramAgentBot.java               ← Telegram long-polling bot
    │   ├── config/
    │   │   ├── AiProps.java                        ← LLM config properties
    │   │   └── BotProps.java                       ← Telegram bot properties
    │   ├── controller/
    │   │   ├── AssistantController.java            ← POST /api/assistant/chat
    │   │   └── TaskController.java                 ← GET/POST /api/tasks
    │   ├── dto/
    │   │   ├── ChatRequest.java                    ← {message}
    │   │   ├── ChatResponse.java                   ← {response}
    │   │   └── CreateTaskRequest.java              ← {title, assignee, storyPoints, sprintName}
    │   ├── model/
    │   │   ├── TaskItem.java                       ← Task domain object
    │   │   └── SprintInfo.java                     ← Sprint domain object
    │   └── service/
    │       ├── ProjectWorkspaceService.java        ← Service interface
    │       └── InMemoryProjectWorkspaceService.java← In-memory implementation
    └── resources/
        ├── application.properties                  ← All config with env var defaults
        └── static/
            ├── index.html                          ← Tab-based SPA markup
            ├── app.js                              ← Fetch-based frontend logic
            └── styles.css                          ← Sage + amber design system
```

Adapt the package name (`com.oraclebot.phase3`) to your own project.

---

## 4. Configuration

### `application.properties`

```properties
spring.application.name=telegram-agent-ui-phase3

# Telegram
telegram.bot.name=${TELEGRAM_BOT_NAME:MyBot}
telegram.bot.token=${TELEGRAM_BOT_TOKEN:YOUR_TOKEN_HERE}

# LLM
agent.ai.enabled=${AGENT_AI_ENABLED:true}
agent.ai.base-url=${AGENT_AI_BASE_URL:https://api.groq.com/openai/v1}
agent.ai.api-key=${AGENT_AI_API_KEY:YOUR_GROQ_KEY_HERE}
agent.ai.model=${AGENT_AI_MODEL:compound-beta-mini}

# Logging
logging.level.root=INFO
logging.level.com.oraclebot=DEBUG
```

**Security rule:** Never commit real tokens. The `${ENV_VAR:default}` pattern means Spring reads the env var first; the default is only for local dev. In production, always inject secrets via environment variables.

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Token from BotFather |
| `TELEGRAM_BOT_NAME` | Bot username (without @) |
| `AGENT_AI_ENABLED` | `true` / `false` — enables LLM |
| `AGENT_AI_BASE_URL` | OpenAI-compatible endpoint (Groq: `https://api.groq.com/openai/v1`) |
| `AGENT_AI_API_KEY` | API key for the LLM provider |
| `AGENT_AI_MODEL` | Model name (e.g., `compound-beta-mini`) |

### Config property classes

`BotProps.java` — bound to `telegram.bot.*`:
```java
@ConfigurationProperties(prefix = "telegram.bot")
public class BotProps {
    private String name;
    private String token;
    // getters/setters
}
```

`AiProps.java` — bound to `agent.ai.*`:
```java
@ConfigurationProperties(prefix = "agent.ai")
public class AiProps {
    private boolean enabled;
    private String baseUrl;
    private String apiKey;
    private String model;
    // getters/setters
}
```

`TelegramAgentUiPhase3Application.java` — enables both:
```java
@SpringBootApplication
@EnableConfigurationProperties({BotProps.class, AiProps.class})
public class TelegramAgentUiPhase3Application {
    public static void main(String[] args) {
        SpringApplication.run(TelegramAgentUiPhase3Application.class, args);
    }
}
```

---

## 5. Telegram Bot

`TelegramAgentBot.java` — implements two interfaces from the `telegrambots` starter:

```java
@Component
public class TelegramAgentBot implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(TelegramAgentBot.class);

    private final BotProps botProps;
    private final AgentOrchestrator orchestrator;
    private final TelegramClient telegramClient;

    public TelegramAgentBot(BotProps botProps, AgentOrchestrator orchestrator) {
        this.botProps = botProps;
        this.orchestrator = orchestrator;
        this.telegramClient = new OkHttpTelegramClient(botProps.getToken());
    }

    @Override
    public String getBotToken() {
        return botProps.getToken();
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(Update update) {
        // Guard: only handle text messages
        if (!update.hasMessage() || !update.getMessage().hasText()) {
            return;
        }

        long chatId = update.getMessage().getChatId();
        String requestText = update.getMessage().getText();

        String responseText = orchestrator.handleMessage(requestText);

        try {
            telegramClient.execute(
                SendMessage.builder()
                    .chatId(chatId)
                    .text(responseText)
                    .build()
            );
        } catch (Exception ex) {
            logger.error("Could not reply to chat {}", chatId, ex);
        }
    }

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        logger.info("Bot registered. running={}", botSession.isRunning());
    }
}
```

**Key points:**
- `SpringLongPollingBot` — Spring starter auto-registers the bot on startup (no manual setup needed)
- `LongPollingSingleThreadUpdateConsumer` — updates are processed one at a time, sequentially
- `OkHttpTelegramClient` is constructed with the token; it is the object that calls Telegram's API to send messages
- `@AfterBotRegistration` is a lifecycle hook provided by the starter

---

## 6. Intent System

### `IntentType.java`

```java
public enum IntentType {
    HELP,
    LIST_TASKS,
    LIST_TASKS_BY_ASSIGNEE,
    LIST_TASKS_BY_STATUS,
    CREATE_TASK,
    CURRENT_SPRINT_SUMMARY,
    TEAM_LOAD_SUMMARY,
    UNKNOWN
}
```

### `IntentParser.java` (interface)

```java
public interface IntentParser {
    ParsedIntent parse(String messageText);
}
```

### `ParsedIntent.java`

```java
@JsonIgnoreProperties(ignoreUnknown = true)
public class ParsedIntent {
    private IntentType intent = IntentType.UNKNOWN;
    private String assignee;
    private String status;
    private String title;
    private Integer storyPoints;
    private String sprintName;
    private boolean clarificationNeeded;
    private String clarificationQuestion;
    // getters/setters
}
```

`@JsonIgnoreProperties(ignoreUnknown = true)` is critical — the LLM may return extra fields and this prevents deserialization failures.

---

## 7. LLM Integration (`LlmIntentParser.java`)

The primary intent parser. Uses Spring's `RestClient` to call any OpenAI-compatible API (Groq in this project).

### Two modes

| Method | Temperature | Purpose |
|--------|------------|---------|
| `parse(String)` | 0 | Deterministic JSON intent classification |
| `generateConversationalResponse(String)` | 0.7 | Free-form answer for UNKNOWN intents |

### `parse()` — intent classification

**System prompt (exact text):**
```
Eres un clasificador de intenciones para un asistente de gestion agile.
IMPORTANTE: Responde UNICAMENTE con un objeto JSON plano. Sin markdown, sin bloques de codigo, sin explicaciones, sin texto adicional. Solo el JSON crudo.
Intenciones permitidas:
HELP
LIST_TASKS
LIST_TASKS_BY_ASSIGNEE
LIST_TASKS_BY_STATUS
CREATE_TASK
CURRENT_SPRINT_SUMMARY
TEAM_LOAD_SUMMARY
UNKNOWN

Devuelve exactamente este formato JSON:
{"intent":"...","assignee":null,"status":null,"title":null,"storyPoints":null,"sprintName":null,"clarificationNeeded":false,"clarificationQuestion":null}
Si falta informacion importante, pon clarificationNeeded en true y escribe la pregunta en clarificationQuestion.
```

**HTTP request shape:**
```java
Map<String, Object> payload = Map.of(
    "model", aiProps.getModel(),
    "messages", List.of(
        Map.of("role", "system", "content", systemPrompt),
        Map.of("role", "user", "content", messageText)
    ),
    "temperature", 0
);

String rawResponse = restClient.post()
    .uri("/chat/completions")
    .contentType(MediaType.APPLICATION_JSON)
    .body(payload)
    .retrieve()
    .body(String.class);
```

**JSON extraction from response:**
```java
// Parse the OpenAI-format response to get the content string
Map responseMap = objectMapper.readValue(rawResponse, Map.class);
List choices = (List) responseMap.get("choices");
Map firstChoice = (Map) choices.get(0);
Map message = (Map) firstChoice.get("message");
String content = (String) message.get("content");

// Strip markdown code fences (LLM sometimes wraps JSON in ```json ... ```)
content = stripMarkdown(content);

return objectMapper.readValue(content, ParsedIntent.class);
```

**`stripMarkdown()` helper:**
```java
private String stripMarkdown(String text) {
    String trimmed = text.strip();
    if (trimmed.startsWith("```")) {
        trimmed = trimmed.replaceFirst("```[a-zA-Z]*\\n?", "");
        int end = trimmed.lastIndexOf("```");
        if (end != -1) trimmed = trimmed.substring(0, end);
    }
    return trimmed.strip();
}
```

**Fallback chain:**
```java
@Override
public ParsedIntent parse(String messageText) {
    // 1. If LLM disabled, go straight to fallback
    if (!aiProps.isEnabled() || aiProps.getApiKey() == null || aiProps.getApiKey().isBlank()) {
        return fallbackParser.parse(messageText);
    }
    try {
        // ... LLM call ...
        return objectMapper.readValue(stripMarkdown(content), ParsedIntent.class);
    } catch (Exception ex) {
        logger.warn("LLM parser failed. Using fallback.", ex);
        return fallbackParser.parse(messageText);
    }
}
```

### `generateConversationalResponse()` — UNKNOWN intent handling

**System prompt:**
```
Eres un asistente de gestion agile amable y util. Puedes responder preguntas sobre Scrum, Kanban, metodologias agiles, gestion de proyectos, software, tareas del proyecto y recetas de guacamole. Para cualquier otra cosa, responde: "Solo puedo ayudarte con consultas del proyecto o con recetas de guacamole."
```

Same HTTP call but `temperature: 0.7`.

### `RestClient` construction

```java
@Component
public class LlmIntentParser implements IntentParser {
    private final RestClient restClient;

    public LlmIntentParser(AiProps aiProps, RuleBasedIntentParser fallbackParser, ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
            .baseUrl(aiProps.getBaseUrl())
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + aiProps.getApiKey())
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .build();
        // ...
    }
}
```

---

## 8. Rule-Based Fallback Parser (`RuleBasedIntentParser.java`)

Used when the LLM is disabled or throws. Operates on normalized (lowercase, trimmed) text.

```java
@Component
public class RuleBasedIntentParser implements IntentParser {

    private static final Pattern CREATE_TASK_PATTERN = Pattern.compile(
        "crea(?:r)? una tarea para (.+?)(?: y asigna(?:la)? a ([a-zA-ZáéíóúÁÉÍÓÚñÑ ]+))?(?: con (\\d+) puntos?)?$",
        Pattern.CASE_INSENSITIVE
    );

    @Override
    public ParsedIntent parse(String messageText) {
        String norm = normalize(messageText);

        if (norm.equals("/start") || norm.contains("ayuda") || norm.equals("/help")) {
            return intent(IntentType.HELP);
        }
        if (norm.contains("sprint actual") || norm.contains("como va el sprint")) {
            return intent(IntentType.CURRENT_SPRINT_SUMMARY);
        }
        if (norm.contains("quien tiene mas carga") || norm.contains("carga del equipo")) {
            return intent(IntentType.TEAM_LOAD_SUMMARY);
        }
        if (norm.contains("tareas tiene ")) {
            String assignee = norm.substring(norm.indexOf("tareas tiene ") + "tareas tiene ".length()).trim();
            return intentWithAssignee(IntentType.LIST_TASKS_BY_ASSIGNEE, assignee);
        }
        if (norm.contains("tareas pendientes") || norm.contains("tareas siguen") || norm.contains("tareas done")) {
            return intent(IntentType.LIST_TASKS_BY_STATUS);
        }
        if (norm.equals("/todolist") || norm.contains("lista de tareas")) {
            return intent(IntentType.LIST_TASKS);
        }

        Matcher m = CREATE_TASK_PATTERN.matcher(norm);
        if (m.find()) {
            return createTaskIntent(m.group(1), m.group(2), m.group(3));
        }

        return intent(IntentType.UNKNOWN);
    }

    private String normalize(String text) {
        return text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
    }
}
```

---

## 9. Agent Orchestrator (`AgentOrchestrator.java`)

The single entry point for all channels. Routes parsed intents to actions and returns a formatted string.

```java
@Service
public class AgentOrchestrator {

    private final LlmIntentParser llmIntentParser;
    private final ProjectWorkspaceService workspaceService;

    public String handleMessage(String messageText) {
        ParsedIntent parsedIntent = llmIntentParser.parse(messageText);

        // Clarification: ask the user for missing info
        if (parsedIntent.isClarificationNeeded()) {
            return parsedIntent.getClarificationQuestion();
        }

        String assignee = safe(parsedIntent.getAssignee());
        String status   = safe(parsedIntent.getStatus());

        return switch (parsedIntent.getIntent()) {
            case HELP                   -> helpText();
            case LIST_TASKS             -> formatTasks("These are the registered tasks:", workspaceService.findAllTasks());
            case LIST_TASKS_BY_ASSIGNEE -> formatTasks("Tasks for " + assignee + ":", workspaceService.findTasksByAssignee(assignee));
            case LIST_TASKS_BY_STATUS   -> formatTasks("Tasks with status " + status + ":", workspaceService.findTasksByStatus(status));
            case CREATE_TASK            -> createTask(parsedIntent);
            case CURRENT_SPRINT_SUMMARY -> sprintSummary();
            case TEAM_LOAD_SUMMARY      -> teamLoadSummary();
            case UNKNOWN                -> llmIntentParser.generateConversationalResponse(messageText);
        };
    }

    private String formatTasks(String title, List<TaskItem> tasks) {
        if (tasks.isEmpty()) return title + "\n(no tasks found)";
        StringBuilder sb = new StringBuilder(title).append("\n");
        tasks.forEach(t -> sb.append(String.format(
            "• [%s] %s | %s | %d pts | %s\n",
            t.getStatus(), t.getTitle(), t.getAssignee(), t.getStoryPoints(), t.getSprintName()
        )));
        return sb.toString().trim();
    }

    private String sprintSummary() {
        SprintInfo sprint = workspaceService.getCurrentSprint();
        List<TaskItem> all = workspaceService.findAllTasks();
        long done = all.stream().filter(t -> "DONE".equals(t.getStatus())).count();
        long inProgress = all.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
        long pending = all.stream().filter(t -> "PENDING".equals(t.getStatus())).count();
        int totalPts = all.stream().mapToInt(TaskItem::getStoryPoints).sum();
        return String.format("Sprint: %s\nDONE: %d | IN_PROGRESS: %d | PENDING: %d\nTotal story points: %d",
            sprint.getName(), done, inProgress, pending, totalPts);
    }

    private String teamLoadSummary() {
        Map<String, Integer> load = workspaceService.storyPointsByAssignee();
        StringBuilder sb = new StringBuilder("Team workload (story points):\n");
        load.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .forEach(e -> sb.append(String.format("• %s: %d pts\n", e.getKey(), e.getValue())));
        return sb.toString().trim();
    }

    private String createTask(ParsedIntent intent) {
        TaskItem task = workspaceService.createTask(
            intent.getTitle(),
            intent.getAssignee(),
            intent.getStoryPoints() == null ? 3 : intent.getStoryPoints(),
            intent.getSprintName()
        );
        return String.format("Task created! #%d: %s | %s | %d pts",
            task.getId(), task.getTitle(), task.getAssignee(), task.getStoryPoints());
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "sin filtro" : value;
    }

    private String helpText() {
        return """
            I can help you with:
            • List all tasks
            • Tasks for [person]
            • Current sprint summary
            • Team workload
            • Create a task for [title] and assign to [person] with [N] points
            """;
    }
}
```

---

## 10. Data Models

### `TaskItem.java`

```java
public class TaskItem {
    private final long id;
    private String title;
    private String assignee;
    private String status;       // PENDING | IN_PROGRESS | DONE
    private int storyPoints;
    private String sprintName;
    private LocalDate dueDate;

    public TaskItem(long id, String title, String assignee, String status,
                    int storyPoints, String sprintName, LocalDate dueDate) {
        this.id = id;
        this.title = title;
        this.assignee = assignee;
        this.status = status;
        this.storyPoints = storyPoints;
        this.sprintName = sprintName;
        this.dueDate = dueDate;
    }
    // getters/setters
}
```

### `SprintInfo.java`

```java
public class SprintInfo {
    private final String name;
    private final LocalDate startDate;
    private final LocalDate endDate;
    // constructor + getters
}
```

---

## 11. In-Memory Service (`InMemoryProjectWorkspaceService.java`)

```java
@Service
public class InMemoryProjectWorkspaceService implements ProjectWorkspaceService {

    private final List<TaskItem> tasks = new CopyOnWriteArrayList<>();
    private final AtomicLong sequence = new AtomicLong(100);
    private SprintInfo currentSprint;

    @PostConstruct
    public void seedData() {
        LocalDate today = LocalDate.now();
        currentSprint = new SprintInfo("Sprint 2", today.minusDays(2), today.plusDays(12));

        tasks.add(new TaskItem(sequence.incrementAndGet(), "Define prioritized backlog",
            "Ana", "DONE", 3, currentSprint.getName(), today.minusDays(1)));
        tasks.add(new TaskItem(sequence.incrementAndGet(), "Implement task service",
            "Luis", "IN_PROGRESS", 8, currentSprint.getName(), today.plusDays(3)));
        tasks.add(new TaskItem(sequence.incrementAndGet(), "Create sprint report",
            "Maria", "PENDING", 5, currentSprint.getName(), today.plusDays(5)));
        tasks.add(new TaskItem(sequence.incrementAndGet(), "Configure Telegram bot",
            "Luis", "PENDING", 3, currentSprint.getName(), today.plusDays(7)));
    }

    @Override
    public List<TaskItem> findAllTasks() {
        return tasks.stream().sorted(Comparator.comparingLong(TaskItem::getId)).toList();
    }

    @Override
    public List<TaskItem> findTasksByAssignee(String assignee) {
        String norm = normalize(assignee);
        return tasks.stream()
            .filter(t -> normalize(t.getAssignee()).contains(norm))
            .sorted(Comparator.comparingLong(TaskItem::getId))
            .toList();
    }

    @Override
    public List<TaskItem> findTasksByStatus(String status) {
        String norm = normalizeStatus(status);
        return tasks.stream()
            .filter(t -> t.getStatus().equalsIgnoreCase(norm))
            .sorted(Comparator.comparingLong(TaskItem::getId))
            .toList();
    }

    @Override
    public TaskItem createTask(String title, String assignee, int storyPoints, String sprintName) {
        TaskItem task = new TaskItem(
            sequence.incrementAndGet(),
            title,
            (assignee == null || assignee.isBlank()) ? "Unassigned" : capitalize(assignee),
            "PENDING",
            storyPoints <= 0 ? 3 : storyPoints,
            (sprintName == null || sprintName.isBlank()) ? currentSprint.getName() : sprintName,
            LocalDate.now().plusDays(5)
        );
        tasks.add(task);
        return task;
    }

    @Override
    public SprintInfo getCurrentSprint() {
        return currentSprint;
    }

    @Override
    public Map<String, Integer> storyPointsByAssignee() {
        Map<String, Integer> result = new LinkedHashMap<>();
        tasks.forEach(t -> result.merge(t.getAssignee(), t.getStoryPoints(), Integer::sum));
        return result;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeStatus(String value) {
        return switch (normalize(value)) {
            case "pendiente", "pending"              -> "PENDING";
            case "en progreso", "in progress",
                 "in_progress"                       -> "IN_PROGRESS";
            case "done", "hecha", "terminada"        -> "DONE";
            default                                  -> value.toUpperCase(Locale.ROOT);
        };
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) return value;
        return value.substring(0, 1).toUpperCase(Locale.ROOT) +
               value.substring(1).toLowerCase(Locale.ROOT);
    }
}
```

`CopyOnWriteArrayList` makes reads thread-safe without locking. `AtomicLong` gives monotonically increasing IDs without synchronization.

---

## 12. REST API Controllers

### `TaskController.java`

```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final ProjectWorkspaceService workspaceService;

    public TaskController(ProjectWorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public List<TaskItem> getTasks() {
        return workspaceService.findAllTasks();
    }

    @PostMapping
    public TaskItem createTask(@RequestBody CreateTaskRequest request) {
        return workspaceService.createTask(
            request.getTitle(),
            request.getAssignee(),
            request.getStoryPoints() == null ? 3 : request.getStoryPoints(),
            request.getSprintName()
        );
    }
}
```

### `AssistantController.java`

```java
@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AgentOrchestrator orchestrator;

    public AssistantController(AgentOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping("/chat")
    public ChatResponse chat(@RequestBody ChatRequest request) {
        String response = orchestrator.handleMessage(request.getMessage());
        return new ChatResponse(response);
    }
}
```

### DTOs

```java
// ChatRequest.java
public class ChatRequest {
    private String message;
    // getter/setter
}

// ChatResponse.java
public class ChatResponse {
    private final String response;
    public ChatResponse(String response) { this.response = response; }
    public String getResponse() { return response; }
}

// CreateTaskRequest.java
public class CreateTaskRequest {
    private String title;
    private String assignee;
    private Integer storyPoints;
    private String sprintName;
    // getters/setters
}
```

---

## 13. Web UI

### `index.html` — Structure

Two-tab SPA. No JavaScript framework — all DOM manipulation is manual.

```html
<!-- Tab navigation -->
<nav class="tabs">
  <button class="tab active" data-page="tasks">Tasks</button>
  <button class="tab" data-page="chat">Assistant</button>
</nav>

<!-- Tasks page -->
<section id="tasks-page">
  <form id="task-form">
    <input name="title" placeholder="Task title" required>
    <input name="assignee" placeholder="Assignee">
    <input name="storyPoints" type="number" placeholder="Story points">
    <input name="sprintName" placeholder="Sprint">
    <button type="submit">Create</button>
  </form>
  <div id="task-list"></div>
</section>

<!-- Chat page -->
<section id="chat-page" hidden>
  <!-- Hint buttons: data-message attribute auto-fills input -->
  <button class="hint" data-message="tasks for ana">Ana's tasks</button>
  <button class="hint" data-message="sprint status">Sprint status</button>

  <div id="chat-messages"></div>
  <form id="chat-form">
    <input id="chat-input" placeholder="Ask anything...">
    <button type="submit">Send</button>
  </form>
</section>
```

### `app.js` — Key Patterns

```javascript
// XSS-safe string escaping
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Typewriter animation on chat responses
function typewriter(el, text, delay = 18) {
  return new Promise(resolve => {
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, ++i);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      if (i < text.length) setTimeout(tick, delay);
      else resolve();
    };
    setTimeout(tick, delay);
  });
}

// Tab routing
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('[id$="-page"]').forEach(p => p.hidden = true);
    document.getElementById(tab.dataset.page + '-page').hidden = false;
  });
});

// Hint buttons populate the chat input
document.querySelectorAll('.hint').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('chat-input').value = btn.dataset.message;
  });
});

// Chat submit
chatForm.addEventListener('submit', async e => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = '';

  appendMessage('user', message);

  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  const data = await res.json();

  const el = appendMessage('assistant', '');
  await typewriter(el, data.response, 18);
});

// Task creation
taskForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(taskForm);
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: fd.get('title'),
      assignee: fd.get('assignee'),
      storyPoints: parseInt(fd.get('storyPoints')) || 3,
      sprintName: fd.get('sprintName')
    })
  });
  taskForm.reset();
  fetchTasks();
});

async function fetchTasks() {
  const res = await fetch('/api/tasks');
  const tasks = await res.json();
  taskList.innerHTML = tasks.map(t => `
    <div class="task-card">
      <span class="badge badge-${t.status.toLowerCase()}">${esc(t.status)}</span>
      <strong>${esc(t.title)}</strong>
      <span>${esc(t.assignee)} | ${t.storyPoints} pts | ${esc(t.sprintName)}</span>
    </div>
  `).join('');
}
```

### `styles.css` — Design tokens

```css
:root {
  --sage:   #7d9e8b;
  --amber:  #c8883c;
  --ink:    #1e1e1e;
  --paper:  #f5f0e8;
  --card:   #ffffff;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--paper);
  color: var(--ink);
}

h1, h2 { font-family: 'DM Serif Display', serif; }

.topbar { backdrop-filter: blur(8px); }

.badge-done        { background: var(--sage);  color: white; }
.badge-in_progress { background: var(--amber); color: white; }
.badge-pending     { background: #999;         color: white; }
```

Fonts loaded from Google Fonts: `DM Serif Display` + `DM Sans`.

---

## 14. Architecture Flow

```
User (Telegram or Browser)
         │
         ▼
 ┌───────────────────────────────────────────────────┐
 │           Spring Boot Application (port 8080)     │
 │                                                   │
 │  TelegramAgentBot ──────┐                         │
 │  (long-polling)         │                         │
 │                         ▼                         │
 │  AssistantController ──► AgentOrchestrator        │
 │  POST /api/assistant/   │                         │
 │  chat                   │  1. parse(text)         │
 │                         ▼                         │
 │              LlmIntentParser ──► Groq API         │
 │              (primary)          /chat/completions  │
 │                    │                              │
 │                    │ fallback on error/disabled    │
 │                    ▼                              │
 │         RuleBasedIntentParser (regex)             │
 │                    │                              │
 │                    │  2. ParsedIntent             │
 │                    ▼                              │
 │              AgentOrchestrator                    │
 │              routes by IntentType                 │
 │                    │                              │
 │                    │  3. query/mutate             │
 │                    ▼                              │
 │        InMemoryProjectWorkspaceService            │
 │        (CopyOnWriteArrayList + AtomicLong)        │
 │                    │                              │
 │                    │  4. formatted String         │
 │                    ▼                              │
 │  TelegramAgentBot / AssistantController           │
 │  sends response back to user                      │
 └───────────────────────────────────────────────────┘

  TaskController ──► InMemoryProjectWorkspaceService
  GET/POST /api/tasks       (separate CRUD path for web UI)
```

---

## 15. Error Handling Patterns

| Layer | Pattern |
|-------|---------|
| Telegram send | `try/catch Exception` → log error, silent fail (user sees nothing) |
| LLM `parse()` | `try/catch Exception` → `logger.warn` + return `fallbackParser.parse(text)` |
| LLM `generateConversationalResponse()` | `try/catch Exception` → return static error string |
| LLM disabled | Check `aiProps.isEnabled()` at start of `parse()` → skip to fallback immediately |

No error propagates to the user as a stack trace. The bot always sends a human-readable message.

---

## 16. Deployment

### Dockerfile

```dockerfile
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/telegram-agent-ui-phase3-0.1.0.jar app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Build the JAR first: `mvn clean package -DskipTests`
Then: `docker build -t telegram-agent-bot .`
Run: `docker run -e TELEGRAM_BOT_TOKEN=xxx -e AGENT_AI_API_KEY=yyy -p 8080:8080 telegram-agent-bot`

### Local run

```bash
mvn spring-boot:run
```

Bot starts polling Telegram automatically. Web UI available at `http://localhost:8080`.

---

## 17. Replication Checklist

Follow this order to replicate from scratch in a new Spring Boot project:

1. **Create project** — Spring Initializr: Java 17, Spring Boot 3.3.5, add `spring-boot-starter-web` and `spring-boot-starter-validation`
2. **Add `pom.xml` dependencies** — `telegrambots-springboot-longpolling-starter:9.1.0` and `telegrambots-client:9.1.0`
3. **Write `application.properties`** — all six env vars with safe defaults
4. **Create `BotProps` + `AiProps`** — `@ConfigurationProperties` classes
5. **Annotate main class** — `@EnableConfigurationProperties({BotProps.class, AiProps.class})`
6. **Create domain models** — `TaskItem`, `SprintInfo` (plain Java, no JPA annotations needed for in-memory)
7. **Create DTOs** — `ChatRequest`, `ChatResponse`, `CreateTaskRequest`
8. **Create `IntentType` enum** — 8 values exactly as listed
9. **Create `ParsedIntent`** — with `@JsonIgnoreProperties(ignoreUnknown = true)`
10. **Create `IntentParser` interface** — one method: `ParsedIntent parse(String)`
11. **Create `RuleBasedIntentParser`** — keyword matching + regex, annotated `@Component`
12. **Create `ProjectWorkspaceService` interface** — five method signatures
13. **Create `InMemoryProjectWorkspaceService`** — `@Service`, `@PostConstruct seedData()`, thread-safe collections
14. **Create `LlmIntentParser`** — `@Component`, builds `RestClient` in constructor, implements `parse()` + `generateConversationalResponse()` + `stripMarkdown()`
15. **Create `AgentOrchestrator`** — `@Service`, `handleMessage()` with switch on `IntentType`
16. **Create `TelegramAgentBot`** — `@Component`, implements both interfaces, `consume()` guard + delegate to orchestrator
17. **Create `TaskController` + `AssistantController`** — standard `@RestController` classes
18. **Add static web UI** — `src/main/resources/static/index.html`, `app.js`, `styles.css`
19. **Run** — `mvn spring-boot:run`, set env vars, test via Telegram and `http://localhost:8080`

---

## 18. What Is NOT Implemented (Intentional Gaps)

The following are explicitly absent from this phase and would be the next evolution:

| Feature | Notes |
|---------|-------|
| Database persistence | Data is lost on restart; next step: Spring Data JPA + H2/PostgreSQL |
| Conversation history | Each message is stateless; no multi-turn context sent to LLM |
| Telegram inline keyboards | Bot sends plain text only; no buttons or callback queries |
| Authentication | No user auth on REST API or web UI |
| Tests | `spring-boot-starter-test` is in pom.xml but no test classes exist |
| Webhook mode | Long-polling only; webhook would require a public HTTPS URL |
| Rate limiting | No protection against spamming the LLM or task endpoints |
