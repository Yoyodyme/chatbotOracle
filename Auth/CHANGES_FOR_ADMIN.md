# Auth Integration — Changes Made (Phase 1)

This document summarizes every code change made to wire up OCI IAM JWT authentication.
Two values are still missing and must be provided by the OCI Console admin before the
integration can be tested or deployed. They are marked **[ADMIN FILL-IN]** below.

---

## Missing Values Needed From the Admin

| # | What | Where to find it in OCI Console |
|---|---|---|
| 1 | **OCI OIDC Issuer URL** | IAM → Identity Domain → Domain URL (e.g. `https://idcs-<id>.identity.oraclecloud.com`) |
| 2 | **OAuth 2.0 Client ID** | IAM → Identity Domain → Applications → your app → Client ID |

Once you have both values, fill them into the two files listed in the sections below.

---

## File 1 — `MtdrSpring/backend/src/main/resources/application-prod.properties` *(new file)*

Spring Boot loads this file only when the `prod` profile is active. It tells Spring where
to fetch OCI's public signing keys so it can verify every incoming JWT automatically —
no Oracle-specific code required; JWT is a standard.

**What to fill in:**

```properties
spring.security.oauth2.resourceserver.jwt.issuer-uri=REPLACE_WITH_OCI_ISSUER_URL
#                                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                                                     [ADMIN FILL-IN #1]
```

**Full file contents:**

```properties
# OAuth2 Resource Server — JWT validation
# Replace the placeholder below with your OCI OIDC issuer URL.
# Spring will fetch the JWKS automatically from <issuer>/.well-known/openid-configuration
spring.security.oauth2.resourceserver.jwt.issuer-uri=REPLACE_WITH_OCI_ISSUER_URL
```

---

## File 2 — `MtdrSpring/backend/src/main/frontend/src/ociAuth.js` *(new file)*

OIDC configuration for the React frontend. On page load the browser will redirect
unauthenticated users to OCI's login page, then redirect back with a JWT that is
automatically attached to every API request.

**What to fill in:**

```js
export const ociAuthConfig = {
  authority: 'REPLACE_WITH_OCI_ISSUER_URL',   // [ADMIN FILL-IN #1]
  client_id: 'REPLACE_WITH_OCI_CLIENT_ID',    // [ADMIN FILL-IN #2]
  redirect_uri: window.location.origin,
  scope: 'openid',
  onSigninCallback,
};
```

**Note on `scope`:** After Step 7 the admin may also need to add the custom API scopes here
(e.g. `'openid mytodolist-api.read'`) depending on how OCI formats the scope claim in the token.

---

## File 3 — `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/security/WebSecurityConfiguration.java` *(rewritten)*

Spring Security is now split into two profiles:

| Spring Profile | Behaviour |
|---|---|
| `local` | All requests permitted — local development stays open, no token needed |
| `prod` | JWT required. `GET /api/**` needs scope `read`, all other `/api/**` need scope `admin`. Swagger UI is public. |

**Note on scope names (Step 7 action):** OCI sometimes prefixes scope names with the app name.
After getting a token and base64-decoding its middle segment, check whether the `scope` claim
contains `read` or `mytodolist-api.read`. The authority strings in this file must match exactly:

```java
// If OCI sends "read" / "admin":
.hasAnyAuthority("SCOPE_read", ...)
.hasAnyAuthority("SCOPE_admin", ...)

// If OCI sends "mytodolist-api.read" / "mytodolist-api.admin":
.hasAnyAuthority("SCOPE_mytodolist-api.read", ...)
.hasAnyAuthority("SCOPE_mytodolist-api.admin", ...)
```

---

## File 4 — `MtdrSpring/backend/src/main/frontend/src/api/client.js` *(updated)*

Removed the hardcoded HTTP Basic credentials (`admin:admin123`).
API requests now send `Authorization: Bearer <token>` when a token is present,
and send no Authorization header when running locally (backend permits all anyway).

---

## File 5 — `MtdrSpring/backend/src/main/frontend/src/main.jsx` *(updated)*

The React app is now wrapped in `<AuthProvider>` from `react-oidc-context`.
An `OidcTokenSync` component keeps the API client's Bearer token in sync with
the OIDC session at all times (including after silent token refresh).

---

## File 6 — `MtdrSpring/backend/pom.xml` *(updated)*

Added one dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

This is the only backend library change. It pulls in Spring's JWT decoder and
the Nimbus JOSE library — no Oracle-specific code anywhere.

---

## Next Steps After Admin Fills In the Values

1. **Step 6** — rebuild the Maven JAR (`./mvnw clean package -DskipTests`), push a new Docker image, and roll out on Kubernetes.
2. **Step 7** — get a token from OCI, base64-decode the middle segment, and confirm the exact scope claim format. Update `WebSecurityConfiguration.java` authority strings if they contain the `mytodolist-api.` prefix.

### Phase 2 (after Phase 1 is verified)
- DB schema: add `USER_ID` column to `TODOITEM`, add `TELEGRAM_CHAT_ID` to `USERS`.
- Filter tasks per authenticated user in repositories/controllers.
- OCI token customization to include `phone_number` in the JWT.
- Telegram `/registrar` registration flow in the bot.

**Blocking dependency:** none of the above can be tested until the OCI IAM application
exists and the two values above are provided.
