# Local Development Setup

Everything you need to run the backend on your machine.

## Prerequisites

- **Java 11+** — [Download](https://adoptium.net/)
- **Maven** — not required, the repo includes `./mvnw`
- **Node.js** — not required, Maven downloads it automatically on first build

---

## Steps

### 1. Clone the repo

```bash
git clone <repo-url>
cd chatbotOracle/MtdrSpring/backend
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in the following:

| Variable | What to put |
|---|---|
| `ORACLE_DB_PASSWORD` | Ask Eugen for the database password |
| `SPRING_ADMIN_USER` | Any username you want (e.g. `admin`) |
| `SPRING_ADMIN_PASSWORD` | Any password you want |
| `SSL_KEYSTORE_PASSWORD` | Any password you want (e.g. `changeit`) |
| `TELEGRAM_BOT_TOKEN` | Optional — leave the placeholder to skip the bot |
| `DEEPSEEK_API_KEY` | Optional — leave the placeholder to skip AI features |

### 3. Generate the local HTTPS keystore

This file is gitignored so each developer generates their own. Run this **once** from the `MtdrSpring/backend/` directory:

```bash
keytool -genkeypair \
  -alias local-dev \
  -keyalg RSA -keysize 2048 \
  -storetype PKCS12 \
  -keystore src/main/resources/keystore.p12 \
  -validity 3650 \
  -storepass changeit \
  -dname "CN=localhost, OU=Dev, O=LocalDev, L=Local, S=Local, C=US" \
  -noprompt
```

> If you set a different `SSL_KEYSTORE_PASSWORD` in your `.env`, use that same value for `-storepass` above.

### 4. Start the app

```bash
bash start-dev.sh
```

Maven will build the React frontend, compile the Java backend, and start the server.
First run takes a few minutes to download dependencies.

### 5. Open the app

Go to **[https://localhost:8080](https://localhost:8080)**

The browser will warn about the self-signed certificate — click **Advanced → Proceed to localhost**.
The login page will appear. Sign in with the `SPRING_ADMIN_USER` / `SPRING_ADMIN_PASSWORD` you set in `.env`.

---

## Troubleshooting

**`Could not load store from 'classpath:keystore.p12'`**
You skipped step 3. Run the `keytool` command and restart.

**`No se encontró el archivo .env`**
You skipped step 2. Copy `.env.example` to `.env` and fill in the values.

**The app starts but login says "Invalid credentials"**
The username/password on the login form must match `SPRING_ADMIN_USER` / `SPRING_ADMIN_PASSWORD` in your `.env`, not the Oracle DB credentials.

**Port 8080 already in use**
Find and kill the process using it:
```bash
lsof -ti :8080 | xargs kill -9
```