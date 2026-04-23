# OCI Infrastructure Setup Guide

This document describes the OCI infrastructure added to this project and how to use it.

## What Was Added

```
MtdrSpring/
├── env.sh              — Source this first to set up environment + kubectl aliases
├── setup.sh            — Bootstrap the full OCI stack (run once)
├── destroy.sh          — Tear down all OCI infrastructure
├── at.cfg              — Docker auth token for OCIR (gitignored, do not commit)
├── terraform/          — OCI infrastructure as code (VCN, OKE, ATP, OCIR)
│   ├── main-var.tf     — Variables (your OCIDs and region pre-filled)
│   ├── provider.tf     — OCI Terraform provider + API key auth
│   ├── core.tf         — VCN, subnets, gateways
│   ├── containerengine.tf — OKE cluster + node pool
│   ├── database.tf     — Oracle Autonomous Database (ATP)
│   ├── repositories.tf — OCI Container Registry (OCIR)
│   ├── apigateway.tf   — API Gateway
│   ├── object_storage.tf — Object Storage bucket
│   └── outputs.tf      — Terraform outputs
└── utils/              — Orchestration scripts (called by setup.sh/destroy.sh)

MtdrSpring/backend/
├── Dockerfile          — Container image (openjdk:22, runs the fat JAR)
├── build.sh            — Maven build + Docker push to OCIR
├── deploy.sh           — kubectl apply to OKE namespace mtdrworkshop
└── undeploy.sh         — kubectl delete from OKE

build_spec.yaml         — OCI DevOps CI/CD pipeline definition
```

---

## Your OCI Account Values

| Key | Value |
|---|---|
| Tenancy OCID | `ocid1.tenancy.oc1..aaaaaaaab32jpf5nepirstbkntsg4kuv45ntdluw4izzvmvs6wgutphfrepq` |
| User OCID | `ocid1.user.oc1..aaaaaaaay65zakgqjef5ottuzlq6lo4oivlcmmgymhpczg2fdgisuhgiu6eq` |
| Compartment (yoyodyme) | `ocid1.compartment.oc1..aaaaaaaao6cvbreyw2kk66wnig3i7ukedb22cmflvhmvg5mpflbiurmj5eoa` |
| Region | `mx-queretaro-1` |
| Tenancy namespace | `axx2gmncrzyo` |
| API fingerprint | `75:ca:da:de:00:24:40:0c:bc:b4:b0:d1:da:95:b5:9e` |
| Private key | `~/.oci/oci_api_key.pem` (place the downloaded .pem file here) |
| OCIR URL | `mx-queretaro-1.ocir.io/axx2gmncrzyo` |

---

## Prerequisites Before First Run

1. **Place your API private key** at `~/.oci/oci_api_key.pem`
   - This is the `.pem` file you downloaded when creating the API Key in OCI console

2. **Install Terraform** — https://developer.hashicorp.com/terraform/install

3. **Install OCI CLI** — https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm

4. **Install kubectl** — https://kubernetes.io/docs/tasks/tools/

5. **Install Docker** — https://docs.docker.com/get-docker/

---

## Deployment Flow

### Step 1 — Set up environment
```bash
cd MtdrSpring
source env.sh
```

### Step 2 — Bootstrap OCI stack (first time only)
```bash
source setup.sh
```
This creates: VCN, OKE cluster, ATP database, OCIR repository, K8s secrets.

### Step 3 — Build and push Docker image
```bash
cd backend
source build.sh
```

### Step 4 — Deploy to Kubernetes
```bash
source deploy.sh
```

### Teardown
```bash
cd MtdrSpring
source destroy.sh
```

---

## K8s Secrets Required

Before deploying, create these secrets in the `mtdrworkshop` namespace:

```bash
# DB wallet (created automatically by setup.sh)
# db-wallet-secret

# DB password
kubectl create secret generic dbuser \
  --from-literal=dbpassword='YOUR_DB_PASSWORD' \
  -n mtdrworkshop

# Telegram + DeepSeek keys
kubectl create secret generic chatbot-secrets \
  --from-literal=telegram-bot-token='YOUR_TELEGRAM_TOKEN' \
  --from-literal=deepseek-api-key='YOUR_DEEPSEEK_KEY' \
  -n mtdrworkshop

# Frontend admin password
kubectl create secret generic frontendadmin \
  --from-literal=password='YOUR_UI_PASSWORD' \
  -n mtdrworkshop
```

---

## OCI DevOps CI/CD (build_spec.yaml)

The `build_spec.yaml` at the repo root defines the OCI DevOps build pipeline.
Before using it, set these pipeline parameters in OCI DevOps console:
- `DEPLOYMENT_CONFIG_BUCKET` — Object Storage bucket name (created by setup.sh)
- `OCI_USER_EMAIL` — your OCI account email
