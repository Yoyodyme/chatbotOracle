# Local HTTPS Setup

Spring Boot serves the app over HTTPS on port 8080. To run it locally you need to generate a trusted certificate with `mkcert` and convert it into the PKCS12 keystore that Spring loads.

---

## Prerequisites

- [mkcert](https://github.com/FiloSottile/mkcert) — generates locally-trusted dev certificates
- `openssl` — converts PEM files to PKCS12 (ships with macOS and most Linux distros)

### Install mkcert

**macOS**
```bash
brew install mkcert
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt install libnss3-tools
curl -sSL https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-$(uname -s)-$(uname -m) \
  -o /usr/local/bin/mkcert && chmod +x /usr/local/bin/mkcert
```

**Windows**
```powershell
choco install mkcert
```

---

## Step 1 — Install the local CA

Run this once per machine. It installs mkcert's root CA into your system/browser trust stores so the certificate is trusted without browser warnings.

```bash
mkcert -install
```

---

## Step 2 — Generate the certificate

Run this from the **repo root** (or any directory — the output files are only needed temporarily):

```bash
mkcert localhost 127.0.0.1
```

This produces two files:
- `localhost+1.pem` — the certificate
- `localhost+1-key.pem` — the private key

> These files are gitignored. Do not commit them.

---

## Step 3 — Convert to PKCS12 keystore

Spring Boot requires a PKCS12 keystore. Choose a password (used in the next step) and run:

```bash
openssl pkcs12 -export \
  -in localhost+1.pem \
  -inkey localhost+1-key.pem \
  -out MtdrSpring/backend/src/main/resources/keystore.p12 \
  -name localhost \
  -passout pass:YOUR_PASSWORD_HERE
```

Replace `YOUR_PASSWORD_HERE` with a password of your choice.

> `keystore.p12` is also gitignored. Do not commit it.

---

## Step 4 — Set the password in your `.env`

Open `MtdrSpring/backend/.env` (copy from `.env.example` if it doesn't exist yet) and set:

```
SSL_KEYSTORE_PASSWORD=YOUR_PASSWORD_HERE
```

Use the same password you chose in Step 3.

---

## Step 5 — Clean up the PEM files

Once `keystore.p12` is in place, the PEM files are no longer needed:

```bash
rm localhost+1.pem localhost+1-key.pem
```

---

## Verify it works

Start the backend:

```bash
cd MtdrSpring/backend
./mvnw spring-boot:run
```

Then open [https://localhost:8080](https://localhost:8080) in your browser. You should see a valid (green padlock) certificate — no security warnings.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `FileNotFoundException: keystore.p12` | Make sure the file is at `MtdrSpring/backend/src/main/resources/keystore.p12` |
| `UnrecoverableKeyException` / keystore password wrong | `SSL_KEYSTORE_PASSWORD` in `.env` does not match the password used in Step 3 |
| Browser shows "Not Secure" despite green lock on other machines | You skipped `mkcert -install` — the local CA is not trusted on this machine |
| Port 8080 already in use | Another process is using 8080; stop it or change `server.port` in `application.properties` |
