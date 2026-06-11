# HTTPS Deployment Guide — yoyodyne.lat

## Current Status

| Item | Status |
|---|---|
| DNS `yoyodyne.lat` → `160.34.214.149` | ✅ Done |
| Let's Encrypt certificate | ✅ Done — expires **2026-09-09** |
| Kubernetes TLS secret `yoyodyne-tls` | ✅ Done |
| K8s secrets (`dbuser`, `db-wallet-secret`, `frontendadmin`, `chatbot-secrets`) | ✅ Done |
| YAML placeholders replaced (image, DB URL, region) | ✅ Done |
| Service configured for ports 80 + 443 with OCI SSL termination | ✅ Done |
| Docker image built & pushed to OCIR | ❌ Blocked — see below |
| Pods running | ❌ Blocked by above |
| LoadBalancer EXTERNAL-IP assigned | ❌ Pending pods |

---

## The Remaining Blocker

The Docker image `todolistapp-springboot:0.1` does not exist in the OCI Container Registry.
It must be built from `MtdrSpring/backend/` and pushed to:

```
mx-queretaro-1.ocir.io/axx2gmncrzyo/yoyodyme/mavyk/todolistapp-springboot:0.1
```

The current OCIR auth token is also expired/unauthorized (`docker login` returns `Unauthorized`).

---

## Step 1 — Get a Valid Auth Token (OCI Admin or Self-Service)

You can generate this yourself without admin help:

1. Go to **OCI Console** → top-right profile icon → **My Profile**
2. Scroll to **Auth Tokens** → click **Generate Token**
3. Give it a description (e.g. `ocir-push`) and copy the token immediately — it is only shown once

> OCI username: `a00838956`
> Tenancy namespace: `axx2gmncrzyo`
> Registry server: `mx-queretaro-1.ocir.io`

---

## Step 2 — Build and Push the Docker Image

Use **OCI Cloud Shell** (no local Docker Desktop required — it has Docker pre-installed).

```bash
# In OCI Cloud Shell, clone or navigate to the repo
cd MtdrSpring/backend

# Log in to OCIR with the new auth token
docker login mx-queretaro-1.ocir.io \
  -u axx2gmncrzyo/a00838956 \
  -p '<NEW-AUTH-TOKEN>'

# Build the image (uses the Dockerfile in MtdrSpring/backend/)
docker build -t mx-queretaro-1.ocir.io/axx2gmncrzyo/yoyodyme/mavyk/todolistapp-springboot:0.1 .

# Push to OCIR
docker push mx-queretaro-1.ocir.io/axx2gmncrzyo/yoyodyme/mavyk/todolistapp-springboot:0.1
```

Alternatively, start **Docker Desktop** on your Mac and run the same commands locally.

---

## Step 3 — Update the K8s OCIR Pull Secret

After obtaining a working auth token, replace the pull secret in the cluster:

```bash
kubectl delete secret ocir-secret

kubectl create secret docker-registry ocir-secret \
  --docker-server=mx-queretaro-1.ocir.io \
  --docker-username='axx2gmncrzyo/a00838956' \
  --docker-password='<NEW-AUTH-TOKEN>'
```

---

## Step 4 — Restart the Deployment

```bash
kubectl rollout restart deployment/todolistapp-springboot-deployment
```

Watch until pods are `Running`:

```bash
kubectl get pods -w
```

Expected output once healthy:

```
NAME                                                   READY   STATUS    RESTARTS   AGE
todolistapp-springboot-deployment-<hash>-<id>          1/1     Running   0          1m
todolistapp-springboot-deployment-<hash>-<id>          1/1     Running   0          1m
```

---

## Step 5 — Verify HTTPS

Once pods are `Running`, the OCI Load Balancer will assign `160.34.214.149` and HTTPS will be live.

```bash
# Check load balancer has the external IP
kubectl get service todolistapp-springboot-service

# Test HTTPS
curl -I https://yoyodyne.lat
```

Expected: `HTTP/2 200`

If port 443 is still refused, verify the OCI Security List has an ingress rule:
- **Protocol:** TCP
- **Source CIDR:** `0.0.0.0/0`
- **Destination port:** `443`

---

## Step 6 — Add OCI IAM Redirect URI

To make OAuth login work at the new domain, add `https://yoyodyne.lat` to the allowed
redirect URIs in **OCI IAM Console** → your OAuth application → Redirect URLs.

---

## Certificate Renewal Reminder

The Let's Encrypt cert was issued manually (`--manual` mode) and **will not auto-renew**.

Before **2026-09-09**, re-run:

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d yoyodyne.lat -d www.yoyodyne.lat
```

Then update the Kubernetes TLS secret:

```bash
kubectl delete secret yoyodyne-tls

sudo kubectl create secret tls yoyodyne-tls \
  --cert=/etc/letsencrypt/live/yoyodyne.lat/fullchain.pem \
  --key=/etc/letsencrypt/live/yoyodyne.lat/privkey.pem

kubectl rollout restart deployment/todolistapp-springboot-deployment
```

---

## Architecture Summary

```
Browser → https://yoyodyne.lat (port 443)
    ↓ OCI Load Balancer (SSL terminated, cert = yoyodyne-tls K8s secret)
    ↓ http://pod:8080 (plain HTTP inside cluster)
    Spring Boot → Oracle ADB (chatbotdb)
```
