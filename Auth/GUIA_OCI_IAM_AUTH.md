# Autenticación con OCI IAM — Fase 1
### Proteger la API con JWT · Sin cambios en la base de datos

> **¿Qué resuelve esta fase?**
> Hoy cualquier persona que conozca tu IP puede leer, crear y borrar tareas
> sin identificarse. Al terminar esta guía, la API exige un token válido
> emitido por OCI para responder. Las tareas siguen siendo globales (no hay
> "mis tareas" vs "tus tareas") — eso se resuelve en la Fase 2.

> **¿Qué NO cubre esta fase?**
> - Tareas asociadas a usuarios individuales
> - Flujo de registro del bot de Telegram
> - Matching entre usuario de OCI IAM y usuario en la base de datos
> → Todo eso está en `GUIA_OCI_IAM_FASE2.md`

---

## ¿Qué cambia exactamente?

**Antes (estado actual):**
```
Cualquier persona → GET /todolist → 200 OK  (ve todas las tareas)
Cualquier persona → DELETE /todolist/1 → 200 OK  (borra cualquier tarea)
```

**Después de esta fase:**
```
Sin token         → GET /todolist → 401 Unauthorized
Token válido      → GET /todolist → 200 OK  (ve todas las tareas)
Token válido      → DELETE /todolist/1 → 403 Forbidden  (solo admin puede)
Token admin       → DELETE /todolist/1 → 200 OK
```

Las tareas siguen siendo de todos, pero al menos solo usuarios autenticados
pueden verlas y solo administradores pueden modificarlas.

---

## Cómo funciona el flujo

```
                    ┌──────────────────────────────────┐
                    │   OCI IAM Identity Domain         │
                    │                                   │
                    │  Guarda usuarios y contraseñas    │
                    │  Verifica identidad               │
                    │  Emite tokens JWT firmados        │
                    └────────────┬─────────────────────┘
                                 │
           ┌─────────────────────┼──────────────────────┐
           │                     │                      │
    (1) Login               (2) JWT Token          (3) JWT Token
    usuario/pass            firmado por OCI        llega al backend
           │                     │                      │
           ▼                     ▼                      ▼
   [ React Frontend ]    [ React Frontend ]    [ Spring Boot API ]
                                                        │
                                              (4) Valida firma del token
                                              con claves públicas de OCI
                                                        │
                                              (5) Permite o rechaza
                                              según scope del token
```

**El bot de Telegram no cambia en esta fase.** Telegram ya autentica a sus
usuarios con número de teléfono — el bot sigue funcionando igual, llamando
directamente a los servicios sin pasar por HTTP.

---

## Prerrequisitos

- Despliegue completado (Fase 3 de `GUIA_PROGRESIVA.md`)
- Acceso a OCI Console con permisos de administrador
- La app corriendo en `http://<TU_IP>`

---

## PASO 1 — Configurar OCI IAM Identity Domain

### 1.1 — Abrir el Identity Domain

1. Consola OCI → menú (☰) → **Identity & Security → Identity → Domains**
2. Haz clic en el dominio **Default**

> El dominio Default se creó automáticamente con tu cuenta. El tipo "Free"
> soporta hasta 2,000 usuarios activos mensuales sin costo extra.

### 1.2 — Crear la aplicación OAuth

1. Menú lateral → **Integrated Applications → Add application**
2. Selecciona **Confidential Application → Launch workflow**

| Campo | Valor |
|-------|-------|
| Name | `mytodolist-api` |
| Description | `Backend de MyTodoList` |

→ **Next**

### 1.3 — Configurar OAuth (pantalla siguiente)

En **Client configuration**:
- Marca: ✅ **Configure this application as a client now**
- En **Allowed grant types**: ✅ `Client Credentials`  ✅ `JWT Assertion`

En **Token issuance policy**:
- Marca: ✅ **Add app roles**
- **Add roles** → selecciona `Authenticator Client` y `Me`

→ **Next → Next → Finish**

### 1.4 — Crear los scopes

Los scopes son los permisos que puede tener un token. Vamos a crear dos:

1. Dentro de `mytodolist-api` → **OAuth configuration → Scopes → Add scope**

| Scope name | Display name |
|------------|--------------|
| `read` | Lectura de tareas |
| `admin` | Administración completa |

### 1.5 — Activar la aplicación

Botón **Activate** (arriba a la derecha) → **Activate application**

> Una aplicación inactiva no emite tokens. Es fácil olvidar este paso.

### 1.6 — Guardar las credenciales

En **OAuth configuration**, copia y guarda:

```
Client ID:     <visible en la pantalla>
Client Secret: <clic en "Show secret" — solo se muestra una vez>

Issuer URL:    <Domain URL> + /oauth2/v1
```

El **Domain URL** está en: Identity Domain → **Settings → Domain Information**

Ejemplo de Issuer URL:
```
https://idcs-a1b2c3d4e5f6.identity.oraclecloud.com/oauth2/v1
```

---

## PASO 2 — Modificar Spring Boot

### 2.1 — Agregar dependencia en `pom.xml`

```xml
<!-- Dentro de <dependencies> -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

No necesitas librerías de Oracle. JWT es un estándar — Spring sabe validar
tokens de cualquier proveedor (OCI, Google, Keycloak, Auth0) con esto solo.

### 2.2 — Agregar el Issuer URL al perfil de producción

En `src/main/resources/application-prod.properties`:

```properties
# OCI IAM — Resource Server
# Reemplaza con tu Issuer URL del paso 1.6
spring.security.oauth2.resourceserver.jwt.issuer-uri=https://idcs-XXXXXXXXXX.identity.oraclecloud.com/oauth2/v1
```

Al arrancar, Spring descarga automáticamente las claves públicas de OCI desde
`<issuer-uri>/.well-known/openid-configuration` y las usa para verificar que
cada JWT no fue falsificado.

El perfil local no necesita cambios — en desarrollo seguimos sin autenticación.

### 2.3 — Reemplazar `WebSecurityConfiguration.java`

```java
package com.springboot.MyTodoList.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class WebSecurityConfiguration {

    /**
     * Perfil PROD — valida JWTs emitidos por OCI IAM.
     *
     * Scopes:
     *   SCOPE_read  → puede ver tareas
     *   SCOPE_admin → puede ver, crear, modificar y borrar
     *
     * Spring Security mapea el scope "read" del JWT como la autoridad "SCOPE_read".
     */
    @Bean
    @Profile("prod")
    public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                // Preflight de CORS (el navegador pregunta si puede hacer el request)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Lectura de tareas
                .requestMatchers(HttpMethod.GET, "/todolist", "/todolist/**")
                    .hasAnyAuthority("SCOPE_read", "SCOPE_admin")

                // Escritura de tareas — solo admin
                .requestMatchers(HttpMethod.POST, "/todolist")
                    .hasAuthority("SCOPE_admin")
                .requestMatchers(HttpMethod.PUT, "/todolist/**")
                    .hasAuthority("SCOPE_admin")
                .requestMatchers(HttpMethod.DELETE, "/todolist/**")
                    .hasAuthority("SCOPE_admin")

                // Gestión de usuarios — solo admin
                .requestMatchers("/users/**", "/adduser", "/updateUser/**", "/deleteUser/**")
                    .hasAuthority("SCOPE_admin")

                // Cualquier otra ruta requiere autenticación válida
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .csrf(csrf -> csrf.disable());

        return http.build();
    }

    /**
     * Perfil LOCAL — sin autenticación para desarrollo.
     */
    @Bean
    @Profile("local")
    public SecurityFilterChain localSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .csrf(csrf -> csrf.disable())
            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(formLogin -> formLogin.disable());

        return http.build();
    }
}
```

### 2.4 — Verificar `CorsConfig.java`

El header `Authorization` debe estar en la lista de headers permitidos para
que el token pase el preflight del navegador:

```java
package com.springboot.MyTodoList.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*")); // incluye Authorization
        config.setExposedHeaders(List.of("location", "Access-Control-Expose-Headers"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

---

## PASO 3 — Compilar y redesplegar

```bash
cd oci_devops_project/MtdrSpring/backend

export DOCKER_REGISTRY="qro.ocir.io/axvi8cfahhpe/rpvapp/rp1a2b"
export TODO_PDB_NAME="rpvappdb"
export OCI_REGION="mx-queretaro-1"
export UI_USERNAME="admin"

# Compilar
mvn clean package spring-boot:repackage -DskipTests

# Construir y subir imagen
./build.sh

# Actualizar deployment sin tiempo de inactividad
kubectl rollout restart deployment/todolistapp-springboot-deployment -n mtdrworkshop

# Verificar que arrancó correctamente
kubectl get pods -n mtdrworkshop

# Ver logs — buscar que Spring cargó la config de OCI IAM
kubectl logs -n mtdrworkshop deployment/todolistapp-springboot-deployment | grep -i "oauth\|jwt\|identity"
```

---

## PASO 4 — Probar

### 4.1 — Obtener un token de OCI IAM

```bash
CLIENT_ID="tu-client-id"
CLIENT_SECRET="tu-client-secret"
ISSUER_URL="https://idcs-XXXXXXXXXX.identity.oraclecloud.com"

curl -s -X POST "$ISSUER_URL/oauth2/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "scope=mytodolist-api.read"
```

Respuesta:
```json
{
  "access_token": "eyJraWQiOiJPQ0lfSURDU19LRVkiLCJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

```bash
TOKEN="eyJraWQi..."   # pega el access_token aquí
APP_URL="http://163.192.144.124"
```

### 4.2 — Verificar los tres casos

```bash
# Sin token → debe dar 401
curl -s -o /dev/null -w "Sin token:         %{http_code}\n" \
  "$APP_URL/todolist"

# Con token read → debe dar 200
curl -s -o /dev/null -w "Con token read:    %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$APP_URL/todolist"

# Intentar borrar con token read → debe dar 403
curl -s -o /dev/null -w "DELETE token read: %{http_code}\n" \
  -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$APP_URL/todolist/1"
```

Resultado esperado:
```
Sin token:         401
Con token read:    200
DELETE token read: 403
```

### 4.3 — Inspeccionar el token (opcional)

```bash
# Ver qué contiene el JWT (la parte del medio, decodificada de Base64)
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Verás algo como:
```json
{
  "sub": "tu-client-id",
  "iss": "https://idcs-XXXXXXXXXX.identity.oraclecloud.com",
  "scope": "mytodolist-api.read",
  "exp": 1748900000,
  "iat": 1748896400
}
```

Spring lee el campo `scope`, lo convierte en la autoridad `SCOPE_read`
y lo compara con lo que definiste en `hasAnyAuthority(...)`.

---

## PASO 5 — Integrar con React (básico)

```bash
cd src/main/frontend
npm install oidc-client-ts react-oidc-context
```

Crea `src/auth/ociAuth.js`:

```javascript
export const ociAuthConfig = {
  authority: "https://idcs-XXXXXXXXXX.identity.oraclecloud.com",
  client_id: "tu-client-id",
  redirect_uri: window.location.origin + "/callback",
  scope: "openid profile mytodolist-api.read",
};
```

En `src/index.js`:

```javascript
import { AuthProvider } from "react-oidc-context";
import { ociAuthConfig } from "./auth/ociAuth";

root.render(
  <AuthProvider {...ociAuthConfig}>
    <App />
  </AuthProvider>
);
```

Usar el token en cualquier fetch:

```javascript
import { useAuth } from "react-oidc-context";

function TodoList() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <button onClick={() => auth.signinRedirect()}>Iniciar sesión</button>;
  }

  const fetchTodos = () =>
    fetch("/todolist", {
      headers: { Authorization: `Bearer ${auth.user?.access_token}` },
    }).then(r => r.json());

  return <div>Hola, {auth.user?.profile?.name}</div>;
}
```

---

## Solución de problemas

### 401 aunque el token parece válido

El campo `iss` del JWT no coincide exactamente con el `issuer-uri` de Spring.

```bash
# Inspecciona el "iss" real del token
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin); print('iss:', d['iss'])
"
```

Ese valor debe ser idéntico al `issuer-uri` en `application-prod.properties`.

---

### 403 aunque debería tener permiso

El scope en el JWT llega con prefijo del nombre de la app: `mytodolist-api.read`
en lugar de solo `read`. Spring lo mapea como `SCOPE_mytodolist-api.read`.

Ajusta `WebSecurityConfiguration.java`:

```java
.hasAnyAuthority("SCOPE_mytodolist-api.read", "SCOPE_mytodolist-api.admin")
```

O usa este endpoint temporal para ver exactamente qué autoridades llegan:

```java
// En cualquier controller, agregar temporalmente:
@GetMapping("/debug/token")
public Object debugToken(@AuthenticationPrincipal Jwt jwt) {
    return jwt.getClaims(); // Muestra todos los claims del JWT
}
```

---

### CrashLoopBackOff al redesplegar

Spring no pudo descargar las claves públicas de OCI al arrancar.
Verifica que el `issuer-uri` es correcto abriendo en el navegador:

```
https://idcs-XXXXXXXXXX.identity.oraclecloud.com/oauth2/v1/.well-known/openid-configuration
```

Debe responder un JSON. Si da 404, la URL está mal.

---

### Error de CORS al llamar desde React

Verifica que `CorsConfig.java` tiene `config.setAllowedHeaders(List.of("*"))`
y que `WebSecurityConfiguration` tiene `.cors(Customizer.withDefaults())`
y `.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`.

---

## Resumen de lo que lograste en esta fase

| | Antes | Ahora |
|--|-------|-------|
| ¿Quién puede ver tareas? | Cualquiera | Solo con token `read` o `admin` |
| ¿Quién puede borrar tareas? | Cualquiera | Solo con token `admin` |
| ¿Dónde viven las contraseñas? | En texto plano en la BD | En OCI IAM (nunca llegan al backend) |
| ¿Las tareas tienen dueño? | No | No (eso es Fase 2) |
| ¿El bot cambió? | No | No (eso es Fase 2) |

---

## Siguiente paso

`GUIA_OCI_IAM_FASE2.md` — Tareas por usuario y registro del bot de Telegram:
- Agregar `USER_ID` a la tabla `TODOITEM`
- Flujo de registro en el bot (número de teléfono → usuario en BD)
- Filtrar tareas por usuario en los controllers
- Leer el número de teléfono del JWT para identificar al usuario en la API web
