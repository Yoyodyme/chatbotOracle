# Notion MCP Setup — Instructions for Notion Project Owner

This document explains what needs to be done in Notion so we can import real team member and task data into the app's Oracle database.

---

## What we need from Notion

We need read access to two databases:
1. **Team members** — names, roles (Admin / Developer)
2. **Tasks** — title, description, status, priority, assigned to, due date, estimated hours

---

## Step 1 — Create a Notion Integration

1. Go to https://www.notion.so/profile/integrations
2. Click **"New integration"**
3. Give it a name (e.g. `Claude Code`)
4. Set **Capabilities** to: ✅ Read content (no need for write or user info)
5. Click **Save**
6. Copy the **Internal Integration Secret** — it starts with `ntn_...`

---

## Step 2 — Share the databases with the integration

For **each database** Claude needs to read (team members, tasks):

1. Open the database in Notion
2. Click the `...` menu (top right of the page)
3. Go to **"Connect to"**
4. Select the integration you just created (`Claude Code`)

Repeat for every database.

---

## Step 3 — Send us the API key

Send the integration secret (`ntn_...`) to the dev team so we can configure the MCP server in Claude Code and proceed with the import.

> **Security note:** This key only has read access to the databases you explicitly shared with it. It cannot access anything else in your workspace.

---

## What happens next (dev team side)

Once we have the key:
1. We configure the Notion MCP server in Claude Code
2. Claude reads the team member and task databases directly
3. We generate a SQL script (`SCRIPT_DATOS_REALES.sql`) in the same format as the existing seed script
4. The script deletes the current fake data and inserts the real data into Oracle ADB
5. You run the script once via OCI → Database Actions → SQL

No ongoing connection to Notion is needed after this — it's a one-time import.
