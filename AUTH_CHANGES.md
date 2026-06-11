# Authentication Changes — June 10, 2026

This document summarizes all authentication-related changes made in this session. It covers four distinct fixes/features.

---

## 1. OIDC Scope Fix — User profile fields missing in sidebar

**Problem:** Clicking a user's avatar in the sidebar showed `—` for both name and email. The OCI token only contained the `sub` (user ID) claim because the `profile` and `email` scopes were never requested.

**Fix:** Added `profile email` to the scope string in `ociAuth.js`.

```js
// MtdrSpring/backend/src/main/frontend/src/ociAuth.js
scope: 'openid profile email mytodolist-apiread mytodolist-apiadmin'
```

**OCI IAM action required (Elián):**
- Go to OCI Console → Identity & Security → Domains → your domain → Applications → open the frontend app
- In the **Token Issuance Policies** tab, enable the `name` and `email` user attributes so they are included in the ID token
- Log out and back in to get a fresh token with the new claims

---

## 2. Login Redirect Fix — App immediately sent users to Oracle portal

**Problem:** Visiting `https://localhost:8080` (HTTPS) redirected users straight to the OCI login portal with no intermediate screen. This happened because:
- `http://` and `https://` are different browser origins — switching to HTTPS cleared the cached session
- `AppShell` called `auth.signinRedirect()` directly whenever no session was found

**Fix:** `AppShell` now navigates to `/login` instead of calling `signinRedirect()`. The existing Login page's "Sign in with Oracle" button triggers the redirect explicitly.

```js
// MtdrSpring/backend/src/main/frontend/src/components/layout/AppShell.jsx
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    navigate('/login'); // was: auth.signinRedirect()
  }
}, [isLoading, isAuthenticated, navigate]);
```

**OCI IAM action required:** Register `https://localhost:8080` as an allowed redirect URI in the frontend app on OCI IAM (same place the original `http://localhost:8080` was registered).

---

## 3. Dual Authentication — Local username/password alongside OCI

**Problem / Goal:** The app only supported OCI sign-in. Team members without OCI accounts could not access the platform. We needed a way to create local users and give them access independently of OCI.

### How it works

- **OCI sign-in** — unchanged. Uses OIDC, token issued by Oracle.
- **Local sign-in** — username + BCrypt password stored in the `USUARIOS` table. Spring Boot issues a signed HS256 JWT (8-hour expiry) on successful login. The frontend stores it in `localStorage` and sends it as a `Bearer` token on every API request.
- **Spring Security (PROD)** — now tries the OCI JWKS decoder first; if that fails, falls back to the local HS256 decoder. Both token types grant the same API access.

### Files changed

| File | What changed |
|---|---|
| `application.properties` | Added `app.jwt.secret` (reads from `LOCAL_JWT_SECRET` env var) |
| `service/LocalJwtService.java` | **New.** Issues and validates HS256 JWTs using the Nimbus library (already on classpath) |
| `security/WebSecurityConfiguration.java` | PROD profile: dual `JwtDecoder` (OCI + local). `/api/auth/login` and `/api/auth/users` permitted without auth |
| `controller/AuthController.java` | `POST /api/auth/login` and `POST /api/auth/users` implemented (was commented out) |
| `service/UsuarioService.java` | Added `autenticar()` (returns `Usuario` on valid credentials) and `crearUsuarioLocal()` (hashes password with BCrypt) |
| `src/main/frontend/src/utils/auth.js` | Added `useIsAuthenticated`, updated `useCurrentUser` and `useSignOut` to handle both auth sources |
| `src/main/frontend/src/api/client.js` | API requests fall back to local JWT from `localStorage` when no OCI token is active |
| `src/main/frontend/src/components/layout/AppShell.jsx` | Guards against both OCI and local auth |
| `src/main/frontend/src/components/Login.jsx` | Username/password form added above the OCI button with an "or" divider |

### Environment variable required for production

Add `LOCAL_JWT_SECRET` to your production environment (OCI, Docker, or `.env`). It must be **at least 32 characters** long.

```
LOCAL_JWT_SECRET=replace-this-with-a-long-random-string-in-prod
```

### Creating a local user

Call the endpoint once per user (no auth token required). You can use Swagger UI at `/swagger-ui.html` or curl:

```bash
curl -k -X POST https://localhost:8080/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{
    "nombreUsuario": "eugen",
    "nombreCompleto": "Eugenio Díaz",
    "password": "yourpassword"
  }'
```

Returns:
```json
{ "idUsuario": 1, "nombreUsuario": "eugen", "nombreCompleto": "Eugenio Díaz" }
```

> **Note:** The `/api/auth/users` endpoint is currently open (no token required) to allow bootstrapping. Before going to public production, consider restricting it or calling it only once per user.

### Sign-in flow (local)

1. User visits the app → redirected to `/login`
2. Enters username + password → `POST /api/auth/login`
3. Spring Boot validates BCrypt hash → issues a signed JWT
4. Frontend stores the JWT in `localStorage` → navigates to `/`
5. All subsequent API calls send `Authorization: Bearer <local-jwt>`

---

## 4. Sidebar profile card — username shown for local users

**Problem:** The profile card under a user's name showed `—` for email when the user was signed in locally (local users have no email in their token).

**Fix:** The card now shows the user's `email` for OCI users, or their `nombreUsuario` (login username) for local users.

```jsx
// MtdrSpring/backend/src/main/frontend/src/components/layout/Sidebar.jsx
{user.email || user.username || '—'}
```

`useCurrentUser` in `auth.js` was updated to expose a `username` field from both token types (`preferred_username` for OCI, `username` claim for local JWTs).