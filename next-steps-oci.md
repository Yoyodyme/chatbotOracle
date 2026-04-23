# OCI Deployment — Next Steps & Status

## What Has Been Done

- [x] Cleaned project (removed old infra) → `main` branch is the clean slate
- [x] Old infra preserved in `old` branch for reference
- [x] Pulled OCI infra from reference repo (AdanRuiz/oci_devops_project)
- [x] Adapted for this tenancy: region, OCIDs, fingerprint, OCIR URL
- [x] Fixed Kubernetes version v1.35.0 → v1.34.2 (only version available in Querétaro)
- [x] Fixed build.sh: `mvn` → `./mvnw clean package -DskipTests`
- [x] Fixed OracleConfiguration.java: removed hardcoded old DB URL, now reads `DB_URL` env var
- [x] Fixed database.tf: removed hardcoded `Welcome12345` password, uses generated password
- [x] Fixed containerengine.tf: removed someone else's SSH key, now uses `sshPublicKey` variable
- [x] Fixed todolistapp-springboot.yaml:
  - Added `ORACLE_DB_USERNAME=admin`
  - Added `DB_URL` (replaces `db_url`, now read by OracleConfiguration.java)
  - Added `SPRING_ADMIN_PASSWORD` from K8s secret
  - Fixed `targetPort: http` → `targetPort: 8080`
  - Added `name: http` to container port
  - All secrets use `secretKeyRef` (no hardcoded credentials)

---

## OCI Account Values

| Key | Value |
|---|---|
| Tenancy OCID | `ocid1.tenancy.oc1..aaaaaaaab32jpf5nepirstbkntsg4kuv45ntdluw4izzvmvs6wgutphfrepq` |
| User OCID | `ocid1.user.oc1..aaaaaaaay65zakgqjef5ottuzlq6lo4oivlcmmgymhpczg2fdgisuhgiu6eq` |
| Compartment (yoyodyme) NEW | `ocid1.compartment.oc1..aaaaaaaamsxu7gf4s4oxdvfuh46dn4dfdf7nkwvg6mp2qjcxm5xhgiyqxgda` |
| Region | `mx-queretaro-1` |
| Tenancy namespace | `axx2gmncrzyo` |
| API fingerprint | `75:ca:da:de:00:24:40:0c:bc:b4:b0:d1:da:95:b5:9e` |
| Private key | `~/.oci/oci_api_key.pem` |
| OCIR URL | `mx-queretaro-1.ocir.io/axx2gmncrzyo` |

> NOTE: The compartment OCID changed because the old one was deleted and setup.sh created a new one.
> `main-var.tf` still has the OLD compartment OCID. The setup.sh scripts override it via state/env vars,
> but if running Terraform directly, update `main-var.tf` line 4 to the NEW OCID above.

---

## IMMEDIATE NEXT STEP — Do This Now in OCI Console

The OKE cluster was created with v1.35.0 and must be deleted before re-running setup:

1. OCI Console → **Developer Services** → **Kubernetes Clusters (OKE)**
2. Delete the cluster that was just created (named `mtdrworkshopcluster-xxxxx`)
3. Wait for it to fully terminate

Then in Cloud Shell:
```bash
cd ~/yoyodyme/chatbotOracle
git pull origin main
source MtdrSpring/env.sh
source MtdrSpring/setup.sh
```
Setup will resume from where it left off (skips compartment, Docker login, ADB — only retries Terraform).

---

## After setup.sh Completes Successfully

### 1. Create K8s secrets (run in Cloud Shell)
```bash
# DB password (use the password you entered during setup)
kubectl create secret generic dbuser \
  --from-literal=dbpassword='YOUR_DB_PASSWORD' \
  -n mtdrworkshop

# Telegram bot + DeepSeek
kubectl create secret generic chatbot-secrets \
  --from-literal=telegram-bot-token='8611801334:AAHsDArpy-7k593SUx3Qx2ehBiyASlaY1gk' \
  --from-literal=deepseek-api-key='YOUR_DEEPSEEK_KEY' \
  -n mtdrworkshop

# Frontend admin password
kubectl create secret generic frontendadmin \
  --from-literal=password='YOUR_UI_PASSWORD' \
  -n mtdrworkshop
```

### 2. Initialize the new database
The Terraform-created ADB is empty. Run the initial data script:
- OCI Console → **Oracle Database** → **Autonomous Database** → MTDRDB
- Click **Database Actions** → **SQL**
- Paste and run `SCRIPT_DATOS_INICIALES.sql` from the repo root

### 3. Build and deploy
```bash
cd ~/yoyodyme/chatbotOracle/MtdrSpring
source env.sh
cd backend
source build.sh    # builds JAR + Docker image + pushes to OCIR
source deploy.sh   # deploys to OKE namespace mtdrworkshop
```

### 4. Get the public IP
```bash
kubectl get service todolistapp-springboot-service -n mtdrworkshop
```
The `EXTERNAL-IP` is your app's public URL on port 80.

---

## OCI DevOps Pipeline (build_spec.yaml) — Setup Later

When setting up the OCI DevOps CI/CD pipeline in the console:
- Set pipeline parameter `DEPLOYMENT_CONFIG_BUCKET` = the bucket name created by setup.sh
  (check state: `cat ~/yoyodyme/chatbotOracle/MtdrSpring/state/DOCKER_REGISTRY`)
- Set pipeline parameter `OCI_USER_EMAIL` = your OCI account email
- The `at.cfg` file (auth token) must be included in `deployment_config.tgz` in Object Storage

---

## Known Remaining Issues (non-blocking for now)

- `main-var.tf` compartment OCID is outdated (setup.sh overrides it via env vars, not a blocker)
- `env.sh` has fragile Java version check (functional but imperfect)
- `destroy.sh` doesn't `cd` to MTDRWORKSHOP_LOCATION before moving dirs (workaround: always source from MtdrSpring/)
- Swagger UI still references old Frankfurt API gateway URL (cosmetic only)
- Auth token description mismatch in `main-destroy.sh` (affects cleanup only — fix before destroy)
