# State Server

State Server is a lightweight Go service that registers deployable nodes, stores
show-logic packages, ingests events, applies rule-based state transitions, and
broadcasts global state over WebSocket.

It is intended to be simple for human integrators (clear HTTP/WS API) and easy
for AI agents to extend (small modules, single-store interface).

## Quick start

Requirements:
- Go 1.22+

Run locally:
```
cd "State Server"
go run ./cmd/state-server
```

Defaults:
- HTTP: `:8081`
- DB: `state-server.db` (SQLite, created if missing)
- Data directory: `data` (for rules, contexts, cooldowns, signals, state JSON files)

## Configuration

Environment variables:
- `STATE_SERVER_DB`: SQLite file path (default `state-server.db`)
- `STATE_SERVER_LISTEN`: HTTP listen address (default `:8081`)
- `STATE_SERVER_ASSETS_DIR`: directory served at `/assets` (default `Assets`)
- `STATE_SERVER_DATA_DIR`: directory for JSON data files (default `data`)
- `STATE_SERVER_SCHEMA`: optional JSON schema file for show logic
- `STATE_SERVER_ENGINE_VERS`: comma-separated allowed engine versions
  (default `1.0.0`)
- `STATE_SERVER_VERSION`: server version string (default `0.1.0`)

## HTTP API

Base URL: `http://localhost:8081`

Health:
- `GET /health`

Control UI:
- `GET /ui` (state override buttons)
- `GET /ui/state` (live state monitor with WebSocket)
- `GET /ui/rules` (rules editor)
- `GET /ui/show-designer` (show logic designer)
- `GET /ui/register` (registration + reassignment UI)
- `GET /ws/ui/register` (WebSocket for registration UI updates)

Registration:
- `POST /register` (same as `POST /api/v1/register`)
- `POST /api/v1/register`

Body:
```
{
  "deployable_id": "string",
  "hostname": "string",
  "capabilities": {
    "video_outputs": [{"id": "HDMI-1", "type": "hdmi"}],
    "audio_outputs": [{"id": "default", "type": "analog"}],
    "inputs": [{"id": "btn-1", "type": "button"}],
    "serial_devices": ["ttyUSB0"],
    "has_display": true,
    "has_audio": true
  },
  "agent_version": "0.3.0"
}
```

Response:
```
{
  "known": true,
  "assigned_role": "role-a",
  "needs_assignment": false,
  "message": ""
}
```

Deployable registry:
- `GET /api/v1/deployables` (list all deployables)
- `GET /api/v1/deployables/pending` (list pending/unassigned deployables)
- `GET /api/v1/deployables-with-logic` (list deployables with their assigned show logic)
- `PATCH /api/v1/deployables/{id}` (update deployable)
- `POST /api/v1/deployables/{id}/assign` (assign role and show logic to deployable)

Patch body:
```
{"assigned_role": "role-a"}
```

Show logic:
- `PUT /api/v1/show-logic/{role}` (upsert show logic for a role)
- `GET /api/v1/deployables/{id}/show-logic` (get show logic assigned to deployable)
- `GET /api/v1/show-logic-files` (list JSON files in `show-logic/`)
- `GET /api/v1/show-logic/{logic_id}` (get show logic file by ID)
- `PUT /api/v1/show-logic/{logic_id}` (update show logic file)
- `POST /api/v1/show-logic` (create new show logic file)
- `POST /api/v1/show-logic/{logic_id}/copy` (copy show logic file)

`PUT` body:
```
{
  "package_id": "optional",
  "role": "role-a",
  "logic_version": "2026.02.01",
  "engine_contract_version": "1.0.0",
  "show_logic": { ... }, 
  "referenced_assets": ["asset-a.png", "asset-b.wav"]
}
```

Deployable ACK:
- `POST /register/ack`
- `POST /api/v1/deployables/{id}/ack`

Body:
```
{
  "deployable_id": "string",
  "package_id": "optional",
  "logic_verified": true,
  "assets_verified": true
}
```

Event ingestion:
- `POST /api/v1/events` (ingest events from deployables)

State override:
- `POST /api/v1/state` (manually override global state)

Assets:
- `GET /assets/<file>` (served from `STATE_SERVER_ASSETS_DIR`)
- `GET /api/v1/assets` (list available assets)

Hardware registry:
- `GET /api/v1/hardware-registry` (get hardware capabilities registry)

States and signals:
- `GET /api/v1/states` (list all states from show logic files)
- `GET /api/v1/signals` (list all signals from deployables)
- `GET /api/v1/deployables/{id}/signals` (get signals for a specific deployable)

Rules:
- `GET /api/v1/rules` (list all rules)
- `POST /api/v1/rules` (create a new rule)
- `GET /api/v1/rules/{id}` (get a specific rule)
- `PUT /api/v1/rules/{id}` (update a rule)
- `DELETE /api/v1/rules/{id}` (delete a rule)

Body:
```
{
  "deployable_id": "string",
  "timestamp": "2026-02-01T22:33:00Z",
  "input_id": "btn-1",
  "event_type": "press",
  "value": {"velocity": 127}
}
```

Responses are JSON; errors look like:
```
{"error":"message"}
```

## WebSocket

Endpoints:
- `GET /ws/state?deployable_id=DEVICE_ID` (state-only subscription for monitoring)
- `GET /ws/deployable` (deployable registration and state updates)

### Deployable WebSocket (`/ws/deployable`)

**Client → Server messages:**
- `hello` - Initial registration with device ID, capabilities, pairing code, etc.
- `assign_role_ack` - Acknowledgment after receiving and validating show logic assignment

**Server → Client messages:**
- `assign_role` - Role and show logic assignment (sent when deployable is assigned)
- `state_update` - Global state changes (sent to all ACTIVE deployables)
- `logic_update_available` - Notification that show logic has been updated (sent to specific deployable)

**Message formats:**

State broadcast (to all active deployables):
```json
{
  "type": "state_update",
  "state": "intro",
  "version": 2,
  "timestamp": "2026-02-01T22:33:00Z",
  "variables": {"score": 3}
}
```

Role assignment:
```json
{
  "type": "assign_role",
  "logic_id": "role-a",
  "server_id": "server-1",
  "profile": { ... },
  "show_logic": { ... }
}
```

Logic update notification:
```json
{"type": "logic_update_available"}
```

If a deployable is ACTIVE (has acknowledged role assignment), it receives state broadcasts. Otherwise, it only receives targeted messages like `assign_role` and `logic_update_available`.

## Data model

Key structs (see `internal/models/models.go`):
- Deployables: registry + capabilities
- ShowLogicPackage: logic JSON + engine version + asset refs
- InputEvent: deployable event payload
- GlobalState: state + variables + timestamp
- Rule: state transition rules

## Persistence

SQLite tables (see `internal/storage/sqlite/store.go`):
- `deployables` (device registry and capabilities)
- `show_logic_packages` (show logic assignments)
- `rules` (state transition rules)
- `events` (event history)
- `state_snapshot` (current global state)

JSON files in `data/` directory (see `internal/storage/jsonstore/store.go`):
- `rules.json` (rule definitions)
- `contexts.json` (rule contexts)
- `cooldowns.json` (rule cooldown tracking)
- `signal_defs.json` (signal definitions)
- `state.json` (state definitions)

The latest `GlobalState` snapshot is stored in `state_snapshot` SQLite table and reloaded on startup.

## Rule engine

Rules are evaluated in order of `created_at` from the database.
Supported operators in `RuleCondition.Op`:
- `eq`, `neq`, `gt`, `gte`, `lt`, `lte`

Fields for conditions:
- `state`
- `variables.<key>`
- `event.deployable_id`
- `event.input_id`
- `event.event_type`
- `event.value`

When a rule matches, it can:
- change state (`then.set_state`)
- set variables (`then.set_variables`)

## Integration checklist

For a new deployable device:
1. `POST /api/v1/register` (or `POST /register`)
2. Wait for role assignment (via operator UI at `/ui/register` or API `POST /api/v1/deployables/{id}/assign`)
3. `GET /api/v1/deployables/{id}/show-logic` (or receive via WebSocket `assign_role` message)
4. Load logic and assets, then `POST /api/v1/deployables/{id}/ack` (or `POST /register/ack`)
5. Send events to `POST /api/v1/events`
6. Subscribe to `GET /ws/deployable` (for state updates and logic updates) or `GET /ws/state?deployable_id=...` (state-only subscription)

## Show logic files

Place show logic JSON files in `State Server/show-logic/`. The registration UI
lists them by `name` (falls back to filename). Use `deployable_id` and `name`
fields so tooling can match the correct file to a device.

## Extending the server (AI/dev guide)

Primary seams for new features:
- `internal/server`: HTTP handlers and routing
- `internal/state`: rule evaluation + loop
- `internal/storage/sqlite`: persistence and migrations
- `internal/ws`: broadcast logic and client handling
- `internal/models`: shared request/response structs

Common patterns:
- Add new API endpoints in `Server.Routes()` and implement handler in
  `internal/server`.
- Add a new DB table in `Store.migrate()` and expose methods on the `Store`
  interface in `internal/server/server.go`.
- Keep new types in `internal/models` for reuse across handlers and storage.
- Prefer small structs with explicit JSON tags for API compatibility.

Safety and validation:
- Show logic is validated by JSON schema (`STATE_SERVER_SCHEMA`) and engine
  contract version checks (`STATE_SERVER_ENGINE_VERS`).
- Untrusted input is decoded with strict JSON and returned as `400` on error.

## Suggested next additions

- Authentication (API keys or mTLS)
- Device heartbeat -> mark deployable `OFFLINE`
- Rules CRUD endpoints
- Pagination for events and deployables
- Asset integrity verification and download endpoints

