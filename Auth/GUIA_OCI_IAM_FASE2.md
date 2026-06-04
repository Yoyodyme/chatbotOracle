# Autenticación con OCI IAM — Fase 2
### Tareas por usuario · Registro del bot de Telegram

> **Prerrequisito:** tener completada la `GUIA_OCI_IAM_AUTH.md` (Fase 1).
> En esa guía la API ya exige tokens JWT. En esta fase hacemos que cada
> usuario vea solo sus propias tareas, tanto desde el frontend web como
> desde el bot de Telegram.

---

## ¿Qué resuelve esta fase?

**Estado al terminar la Fase 1:**
```
Usuario A (token válido) → GET /todolist → ve las 50 tareas de todos
Usuario B (token válido) → GET /todolist → ve las mismas 50 tareas
Bot → /listar → muestra las 50 tareas de todos
```

**Estado al terminar esta fase:**
```
Usuario A (token válido) → GET /todolist → ve solo sus 3 tareas
Usuario B (token válido) → GET /todolist → ve solo sus 7 tareas
Bot → /listar → muestra solo las tareas del usuario que escribe
```

---

## El problema de fondo: dos identidades distintas

Los usuarios llegan por dos canales con sistemas de identidad diferentes:

```
Canal Web (React)
  → Usuario autenticado en OCI IAM
  → El JWT contiene su número de teléfono como claim "phone_number"
  → Ejemplo: jwt.getClaim("phone_number") = "5512345678"

Canal Bot (Telegram)
  → Usuario autenticado por Telegram
  → El bot recibe su chatId numérico único de Telegram
  → Ejemplo: update.getMessage().getChatId() = 987654321
  → Telegram conoce el teléfono, pero el bot no lo recibe directamente
```

El puente entre ambos mundos es la tabla `USERS` con el número de teléfono:

```
OCI IAM  →  phone_number: "5512345678"  ─┐
                                          ├─→ USERS.PHONENUMBER = "5512345678"
Telegram →  chatId: 987654321            ─┘       (mismo usuario)
```

---

## Diseño de la solución

```
┌─────────────────────────────────────────────────────────────────┐
│ USERS (tabla existente + columna nueva)                         │
│   ID | PHONENUMBER | PASSWORD | TELEGRAM_CHAT_ID               │
│    1 | 5512345678  | ****     | 987654321    ← vinculado        │
│    2 | 5598765432  | ****     | NULL         ← sin vincular aún │
└───────────────────────────────────┬─────────────────────────────┘
                                    │ FK
┌───────────────────────────────────▼─────────────────────────────┐
│ TODOITEM (tabla existente + columna nueva)                       │
│   ID | DESCRIPTION        | DONE | CREATION_TS | USER_ID        │
│    1 | Estudiar Kubernetes | true | 2026-04-10  | 1             │
│    2 | Hacer tarea de OCI  | false| 2026-04-11  | 1             │
│    3 | Revisar el deploy   | false| 2026-04-12  | 2             │
└─────────────────────────────────────────────────────────────────┘
```

---

## PASO 1 — Cambios en la base de datos

Conéctate a Oracle ATP con SQLcl o desde la consola de OCI
(Database Actions → SQL) y ejecuta:

```sql
-- 1. Agregar el chatId de Telegram a la tabla de usuarios
ALTER TABLE USERS ADD TELEGRAM_CHAT_ID NUMBER;

-- 2. Agregar la relación entre tarea y usuario
ALTER TABLE TODOITEM ADD USER_ID NUMBER;
ALTER TABLE TODOITEM ADD CONSTRAINT fk_todoitem_user
    FOREIGN KEY (USER_ID) REFERENCES USERS(ID);

-- 3. Verificar
DESCRIBE USERS;
DESCRIBE TODOITEM;
```

> **¿Qué pasa con las tareas existentes?**
> Las tareas existentes quedarán con `USER_ID = NULL` hasta que alguien
> las reclame. En el Paso 5 (controllers) manejaremos este caso para
> no romper el funcionamiento actual.

---

## PASO 2 — Actualizar los modelos Java

### `User.java` — agregar el campo `telegramChatId`

```java
package com.springboot.MyTodoList.model;

import jakarta.persistence.*;

@Entity
@Table(name = "USERS")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int ID;

    @Column(name = "PHONENUMBER")
    String phonenumber;

    @Column(name = "PASSWORD")
    String userpassword;

    @Column(name = "TELEGRAM_CHAT_ID")   // ← NUEVO
    Long telegramChatId;

    public User() {}

    public User(int ID, String phonenumber, String userpassword) {
        this.ID = ID;
        this.phonenumber = phonenumber;
        this.userpassword = userpassword;
    }

    // Getters y setters existentes...
    public int getID() { return ID; }
    public void setID(int ID) { this.ID = ID; }

    public String getPhoneNumber() { return phonenumber; }
    public void setPhoneNumber(String phonenumber) { this.phonenumber = phonenumber; }

    public String getUserPassword() { return userpassword; }
    public void setUserPassword(String userpassword) { this.userpassword = userpassword; }

    // Nuevos getters/setters para telegramChatId
    public Long getTelegramChatId() { return telegramChatId; }
    public void setTelegramChatId(Long telegramChatId) { this.telegramChatId = telegramChatId; }
}
```

### `ToDoItem.java` — agregar la relación con `User`

```java
package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "TODOITEM")
public class ToDoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int ID;

    @Column(name = "DESCRIPTION")
    String description;

    @Column(name = "CREATION_TS")
    OffsetDateTime creation_ts;

    @Column(name = "done")
    boolean done;

    @Column(name = "USER_ID")     // ← NUEVO — puede ser null (tareas sin dueño aún)
    Integer userId;

    public ToDoItem() {}

    public ToDoItem(int ID, String description, OffsetDateTime creation_ts, boolean done) {
        this.ID = ID;
        this.description = description;
        this.creation_ts = creation_ts;
        this.done = done;
    }

    // Getters y setters existentes...
    public int getID() { return ID; }
    public void setID(int ID) { this.ID = ID; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public OffsetDateTime getCreation_ts() { return creation_ts; }
    public void setCreation_ts(OffsetDateTime creation_ts) { this.creation_ts = creation_ts; }

    public boolean isDone() { return done; }
    public void setDone(boolean done) { this.done = done; }

    // Nuevos getters/setters para userId
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    @Override
    public String toString() {
        return "ToDoItem{ID=" + ID + ", description='" + description + "', done=" + done + '}';
    }
}
```

---

## PASO 3 — Actualizar los Repositories

### `UserRepository.java` — agregar búsquedas por teléfono y chatId

```java
package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    // Para el canal web: buscar al usuario por su teléfono del JWT de OCI IAM
    Optional<User> findByPhonenumber(String phonenumber);

    // Para el canal bot: buscar al usuario por su chatId de Telegram
    Optional<User> findByTelegramChatId(Long telegramChatId);
}
```

### `ToDoItemRepository.java` — agregar búsqueda por usuario

```java
package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.ToDoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ToDoItemRepository extends JpaRepository<ToDoItem, Integer> {

    // Todas las tareas de un usuario específico
    List<ToDoItem> findByUserId(Integer userId);

    // Tareas sin dueño asignado (las que existían antes de esta fase)
    List<ToDoItem> findByUserIdIsNull();
}
```

---

## PASO 4 — Actualizar `ToDoItemService`

Agrega estos métodos al service existente
(`src/main/java/.../service/ToDoItemService.java`):

```java
// Importar al inicio del archivo:
import java.util.Optional;

// Agregar estos métodos dentro de la clase:

// Obtener tareas de un usuario por su ID en la BD
public List<ToDoItem> findByUserId(Integer userId) {
    return toDoItemRepository.findByUserId(userId);
}

// Agregar una tarea ya vinculada a un usuario
public ToDoItem addToDoItemForUser(ToDoItem item, Integer userId) throws Exception {
    item.setUserId(userId);
    item.setCreation_ts(OffsetDateTime.now());
    return toDoItemRepository.save(item);
}
```

---

## PASO 5 — Actualizar los controllers

### `ToDoItemController.java` — filtrar por usuario del JWT

El JWT de OCI IAM incluye el número de teléfono del usuario en el claim
`phone_number`. Lo leemos para identificar al usuario en la base de datos.

```java
package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.UserRepository;
import com.springboot.MyTodoList.service.ToDoItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class ToDoItemController {

    @Autowired
    private ToDoItemService toDoItemService;

    @Autowired
    private UserRepository userRepository;

    /**
     * GET /todolist
     * Devuelve solo las tareas del usuario autenticado.
     * Si el usuario no está en la BD, devuelve lista vacía.
     *
     * @AuthenticationPrincipal Jwt jwt → Spring inyecta el token decodificado
     */
    @GetMapping("/todolist")
    public List<ToDoItem> getAllToDoItems(@AuthenticationPrincipal Jwt jwt) {
        Integer userId = resolveUserId(jwt);
        if (userId == null) return List.of();
        return toDoItemService.findByUserId(userId);
    }

    @GetMapping("/todolist/{id}")
    public ResponseEntity<ToDoItem> getToDoItemById(
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Integer userId = resolveUserId(jwt);
            ResponseEntity<ToDoItem> response = toDoItemService.getItemById(id);
            ToDoItem item = response.getBody();

            // Solo devuelve la tarea si pertenece al usuario autenticado
            if (item == null || !item.getUserId().equals(userId)) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(item, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/todolist")
    public ResponseEntity<ToDoItem> addToDoItem(
            @RequestBody ToDoItem todoItem,
            @AuthenticationPrincipal Jwt jwt) throws Exception {
        Integer userId = resolveUserId(jwt);
        if (userId == null) return new ResponseEntity<>(HttpStatus.UNAUTHORIZED);

        ToDoItem saved = toDoItemService.addToDoItemForUser(todoItem, userId);

        HttpHeaders headers = new HttpHeaders();
        headers.set("location", "" + saved.getID());
        headers.set("Access-Control-Expose-Headers", "location");
        return ResponseEntity.ok().headers(headers).build();
    }

    @PutMapping("/todolist/{id}")
    public ResponseEntity<ToDoItem> updateToDoItem(
            @RequestBody ToDoItem toDoItem,
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Integer userId = resolveUserId(jwt);
            ToDoItem existing = toDoItemService.getItemById(id).getBody();

            // Solo puede modificar sus propias tareas
            if (existing == null || !existing.getUserId().equals(userId)) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
            ToDoItem updated = toDoItemService.updateToDoItem(id, toDoItem);
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/todolist/{id}")
    public ResponseEntity<Boolean> deleteToDoItem(
            @PathVariable int id,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            Integer userId = resolveUserId(jwt);
            ToDoItem existing = toDoItemService.getItemById(id).getBody();

            // Solo puede borrar sus propias tareas
            if (existing == null || !existing.getUserId().equals(userId)) {
                return new ResponseEntity<>(false, HttpStatus.FORBIDDEN);
            }
            boolean deleted = toDoItemService.deleteToDoItem(id);
            return new ResponseEntity<>(deleted, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Extrae el número de teléfono del JWT y busca al usuario en la BD.
     * OCI IAM incluye el teléfono en el claim "phone_number".
     *
     * Retorna null si el usuario no está registrado en la BD.
     */
    private Integer resolveUserId(Jwt jwt) {
        if (jwt == null) return null;

        // El claim "phone_number" en OCI IAM puede venir como "+525512345678"
        // La BD guarda solo los dígitos: "5512345678"
        String rawPhone = jwt.getClaimAsString("phone_number");
        if (rawPhone == null) return null;

        String phone = rawPhone.replaceAll("[^0-9]", ""); // quitar el "+" y espacios
        Optional<User> user = userRepository.findByPhonenumber(phone);
        return user.map(User::getID).orElse(null);
    }
}
```

---

## PASO 6 — Flujo de registro en el bot de Telegram

El bot necesita saber a qué usuario de la BD corresponde cada `chatId`.
Lo hacemos con un flujo de registro simple: el usuario escribe su número
de teléfono la primera vez que usa el bot.

### 6.1 — Agregar el comando `/registrar` a `BotCommands.java`

```java
// En el enum BotCommands, agregar:
REGISTER_COMMAND("/registrar", "Vincular tu cuenta con el bot");
```

### 6.2 — Agregar el label en `BotLabels.java`

```java
// En el enum BotLabels, agregar:
ENTER_PHONE("Ingresa tu número de teléfono (10 dígitos):"),
REGISTRATION_SUCCESS("✅ Cuenta vinculada correctamente. Ya puedes usar el bot."),
REGISTRATION_NOT_FOUND("❌ No encontré una cuenta con ese número. ¿Estás registrado en la app web?"),
REGISTRATION_PROMPT("Para usar el bot, primero debes vincular tu cuenta.\nEscribe /registrar");
```

### 6.3 — Agregar la lógica en `BotActions.java`

Agrega estos campos y método a la clase `BotActions`:

```java
// Agregar imports:
import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.UserRepository;
import java.util.Optional;

// Agregar campo:
private UserRepository userRepository;

// Modificar el constructor para recibir el repository:
public BotActions(TelegramClient tc, ToDoItemService ts, DeepSeekService ds, UserRepository ur) {
    telegramClient = tc;
    todoService = ts;
    deepSeekService = ds;
    userRepository = ur;
    exit = false;
}

/**
 * Verifica si el usuario tiene su chatId vinculado en la BD.
 * Si no está vinculado, le pide que use /registrar.
 * Retorna el User si está vinculado, null si no.
 */
public User requireRegisteredUser() {
    Optional<User> user = userRepository.findByTelegramChatId(chatId);
    if (user.isEmpty()) {
        BotHelper.sendMessageToTelegram(
            chatId,
            BotLabels.REGISTRATION_PROMPT.getLabel(),
            telegramClient
        );
        exit = true;
        return null;
    }
    return user.get();
}

/**
 * Maneja el comando /registrar y el flujo de ingreso de teléfono.
 *
 * El flujo tiene dos pasos:
 *   Paso 1: Usuario escribe /registrar → bot pide el número
 *   Paso 2: Usuario escribe el número → bot busca en BD y vincula
 *
 * Usamos el chatId como clave para saber en qué paso está el usuario.
 */

// Este Map guarda qué chatIds están en proceso de registro
// (en producción usar Redis o la BD; aquí es suficiente para el ejemplo)
private static final java.util.concurrent.ConcurrentHashMap<Long, Boolean>
    pendingRegistration = new java.util.concurrent.ConcurrentHashMap<>();

public void fnRegister() {
    if (exit) return;

    // Paso 1: el usuario escribió /registrar
    if (requestText.equals(BotCommands.REGISTER_COMMAND.getCommand())) {
        pendingRegistration.put(chatId, true);
        BotHelper.sendMessageToTelegram(
            chatId,
            BotLabels.ENTER_PHONE.getLabel(),
            telegramClient
        );
        exit = true;
        return;
    }

    // Paso 2: el usuario está en proceso de registro y envió su número
    if (pendingRegistration.getOrDefault(chatId, false)) {
        String phone = requestText.replaceAll("[^0-9]", "");

        Optional<User> userOpt = userRepository.findByPhonenumber(phone);

        if (userOpt.isEmpty()) {
            BotHelper.sendMessageToTelegram(
                chatId,
                BotLabels.REGISTRATION_NOT_FOUND.getLabel(),
                telegramClient
            );
        } else {
            User user = userOpt.get();
            user.setTelegramChatId(chatId);
            userRepository.save(user);

            BotHelper.sendMessageToTelegram(
                chatId,
                BotLabels.REGISTRATION_SUCCESS.getLabel(),
                telegramClient
            );
        }

        pendingRegistration.remove(chatId);
        exit = true;
    }
}
```

### 6.4 — Actualizar `fnStart` para pedir registro si no está vinculado

En `BotActions.java`, modifica `fnStart()` para verificar el registro:

```java
public void fnStart() {
    if (!(requestText.equals(BotCommands.START_COMMAND.getCommand()) ||
          requestText.equals(BotLabels.SHOW_MAIN_SCREEN.getLabel())) || exit)
        return;

    // Verificar si el usuario ya está registrado
    Optional<User> user = userRepository.findByTelegramChatId(chatId);
    if (user.isEmpty()) {
        BotHelper.sendMessageToTelegram(
            chatId,
            "¡Bienvenido! Para empezar, vincula tu cuenta:\n" +
            BotLabels.REGISTRATION_PROMPT.getLabel(),
            telegramClient
        );
        exit = true;
        return;
    }

    // Usuario registrado → mostrar menú normal
    BotHelper.sendMessageToTelegram(
        chatId,
        BotMessages.HELLO_MYTODO_BOT.getMessage(),
        telegramClient,
        ReplyKeyboardMarkup.builder()
            .keyboardRow(new KeyboardRow(
                BotLabels.LIST_ALL_ITEMS.getLabel(),
                BotLabels.ADD_NEW_ITEM.getLabel()))
            .keyboardRow(new KeyboardRow(
                BotLabels.SHOW_MAIN_SCREEN.getLabel(),
                BotLabels.HIDE_MAIN_SCREEN.getLabel()))
            .build()
    );
    exit = true;
}
```

### 6.5 — Filtrar tareas por usuario en las acciones del bot

En `BotActions.java`, modifica `fnListAllItems()` para mostrar solo las
tareas del usuario autenticado:

```java
public void fnListAllItems() {
    if (!requestText.equals(BotLabels.LIST_ALL_ITEMS.getLabel()) || exit) return;

    // Verificar que el usuario está registrado
    User user = requireRegisteredUser();
    if (user == null) return;   // requireRegisteredUser ya envió el mensaje

    // Obtener solo las tareas de este usuario
    List<ToDoItem> items = todoService.findByUserId(user.getID());

    if (items.isEmpty()) {
        BotHelper.sendMessageToTelegram(
            chatId, "No tienes tareas pendientes.", telegramClient);
        exit = true;
        return;
    }

    // Construir la lista de tareas (mismo formato que antes)
    StringBuilder sb = new StringBuilder();
    for (ToDoItem item : items) {
        sb.append(item.getID())
          .append(BotLabels.DASH.getLabel())
          .append(item.getDescription())
          .append(item.isDone() ? " ✅" : "")
          .append("\n");
    }
    BotHelper.sendMessageToTelegram(chatId, sb.toString(), telegramClient);
    exit = true;
}
```

Aplica el mismo patrón (`requireRegisteredUser()` + `findByUserId()`) en
`fnAddItem()`, `fnDone()`, `fnUndo()` y `fnDelete()`.

### 6.6 — Actualizar el constructor en `ToDoItemBotController.java`

```java
// Agregar import:
import com.springboot.MyTodoList.repository.UserRepository;

// Agregar campo:
@Autowired
private UserRepository userRepository;

// Modificar la línea donde creas BotActions en el método consume():
BotActions actions = new BotActions(telegramClient, toDoItemService, deepSeekService, userRepository);

// Agregar la llamada al nuevo método de registro:
actions.fnRegister();   // ← agregar antes de fnStart()
actions.fnStart();
actions.fnDone();
// ... resto igual
```

---

## PASO 7 — Configurar OCI IAM para incluir el teléfono en el JWT

Para que el `phone_number` llegue en el JWT necesitas configurarlo en OCI.

1. En OCI Console → Identity Domain → **Applications → mytodolist-api**
2. Ve a **OAuth configuration → Token customization**
3. Agrega un claim personalizado:

| Campo | Valor |
|-------|-------|
| Claim name | `phone_number` |
| Value | User attribute: `phoneNumbers[primary].value` |
| Include in | Access token |

4. Guarda y reactiva la aplicación.

**Verifica que el claim llega:**
```bash
# Obtén un nuevo token y decodifícalo
TOKEN=$(curl -s -X POST "$ISSUER_URL/oauth2/v1/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=mytodolist-api.read" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin); print('phone_number:', d.get('phone_number','NO ESTÁ'))
"
```

---

## PASO 8 — Compilar y redesplegar

```bash
cd oci_devops_project/MtdrSpring/backend

export DOCKER_REGISTRY="qro.ocir.io/axvi8cfahhpe/rpvapp/rp1a2b"
export TODO_PDB_NAME="rpvappdb"
export OCI_REGION="mx-queretaro-1"
export UI_USERNAME="admin"

mvn clean package spring-boot:repackage -DskipTests
./build.sh
kubectl rollout restart deployment/todolistapp-springboot-deployment -n mtdrworkshop
kubectl get pods -n mtdrworkshop
```

---

## PASO 9 — Probar el flujo completo

### Canal web

```bash
# 1. Obtener token de usuario con número de teléfono configurado en OCI IAM
TOKEN="..."

# 2. Crear una tarea (queda asignada al usuario del token)
curl -X POST "http://TU_IP/todolist" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Mi primera tarea privada", "done": false}'

# 3. Listar tareas (solo las del usuario del token)
curl "http://TU_IP/todolist" \
  -H "Authorization: Bearer $TOKEN"

# 4. Con otro token de otro usuario → no ve las tareas del usuario anterior
TOKEN_USUARIO2="..."
curl "http://TU_IP/todolist" \
  -H "Authorization: Bearer $TOKEN_USUARIO2"
# → devuelve [] (lista vacía si el usuario 2 no tiene tareas propias)
```

### Canal bot

```
Usuario abre Telegram → escribe /start
Bot: "Para empezar, vincula tu cuenta: escribe /registrar"

Usuario escribe: /registrar
Bot: "Ingresa tu número de teléfono (10 dígitos):"

Usuario escribe: 5512345678
Bot busca ese número en USERS → lo encuentra → guarda su chatId
Bot: "✅ Cuenta vinculada correctamente."

Usuario escribe: Listar tareas
Bot: muestra solo las tareas del usuario 5512345678
     (las mismas que vería en el frontend web con su token)
```

---

## Solución de problemas

### `phone_number` no llega en el JWT

Verifica en OCI Console que el Token Customization está guardado y que
el usuario de OCI IAM tiene el número de teléfono configurado en su perfil
(Identity Domain → Users → el usuario → Edit → Phone number).

---

### El bot muestra "No encontré una cuenta con ese número"

El número que escribió el usuario no coincide con `PHONENUMBER` en la BD.

```sql
-- Verificar qué formato está guardado en la BD
SELECT ID, PHONENUMBER FROM USERS;
```

Si la BD guarda `+525512345678` y el usuario escribió `5512345678`,
ajusta el `replaceAll` en `fnRegister()` para normalizar ambos lados.

---

### El `pendingRegistration` Map se pierde al reiniciar el pod

Esto ocurre porque el Map vive en memoria. En producción con múltiples
réplicas o reinicios frecuentes, guarda el estado de registro en la BD:

```sql
-- Tabla temporal de registro pendiente
CREATE TABLE PENDING_REGISTRATION (
    TELEGRAM_CHAT_ID NUMBER PRIMARY KEY,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Y reemplaza el `ConcurrentHashMap` por queries a esta tabla.

---

### Las tareas antiguas (USER_ID = NULL) no aparecen

Es esperado — las tareas sin dueño quedan "huérfanas". Puedes:

**Opción A:** Asignarlas manualmente desde SQL:
```sql
UPDATE TODOITEM SET USER_ID = 1 WHERE USER_ID IS NULL;
```

**Opción B:** Mostrarlas como "tareas globales" en el controller:
```java
// En resolveUserId(), si no se encuentra el usuario devuelve null
// y el controller puede decidir mostrar las tareas sin dueño:
if (userId == null) {
    return toDoItemService.findByUserIdIsNull();
}
```

---

## Resumen del flujo completo

```
CANAL WEB
  1. Usuario se registra en OCI IAM (nombre, teléfono, contraseña)
  2. Inicia sesión → OCI emite JWT con phone_number
  3. React envía JWT en cada request
  4. Spring extrae phone_number del JWT → busca usuario en BD
  5. Devuelve solo las tareas de ese usuario

CANAL BOT
  1. Usuario abre el bot → /start
  2. Bot detecta que el chatId no está vinculado → pide /registrar
  3. Usuario escribe /registrar → bot pide el número de teléfono
  4. Usuario escribe su número → bot busca en BD y guarda el chatId
  5. Todas las acciones del bot filtran por ese chatId → mismo usuario
```

Los dos canales comparten la misma base de datos y el mismo `USER_ID`,
por lo que una tarea creada en el web aparece en el bot y viceversa.
