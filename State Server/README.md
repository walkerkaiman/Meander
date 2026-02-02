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
- HTTP: `:8080`
- DB: `state-server.db` (SQLite, created if missing)

## Configuration

Environment variables:
- `STATE_SERVER_DB`: SQLite file path (default `state-server.db`)
- `STATE_SERVER_LISTEN`: HTTP listen address (default `:8080`)
- `STATE_SERVER_SCHEMA`: optional JSON schema file for show logic
- `STATE_SERVER_ENGINE_VERS`: comma-separated allowed engine versions
  (default `1.0.0`)
- `STATE_SERVER_VERSION`: server version string (default `0.1.0`)

## HTTP API

Base URL: `http://localhost:8080`

Health:
- `GET /health`

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
- `GET /api/v1/deployables`
- `PATCH /api/v1/deployables/{id}`

Patch body:
```
{"assigned_role": "role-a"}
```

Show logic:
- `PUT /api/v1/show-logic/{role}`
- `GET /api/v1/deployables/{id}/show-logic`

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
- `POST /api/v1/events`

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

Endpoint:
- `GET /ws/state?deployable_id=DEVICE_ID`

Messages:
- State broadcast:
```
{"state":"intro","variables":{"score":3}}
```
- Logic update signal (targeted to deployable ID):
```
{"type":"logic_update_available"}
```

If a deployable is ACTIVE, it receives state broadcasts; otherwise it only gets
targeted messages like `logic_update_available`.

## Data model

Key structs (see `internal/models/models.go`):
- Deployables: registry + capabilities
- ShowLogicPackage: logic JSON + engine version + asset refs
- InputEvent: deployable event payload
- GlobalState: state + variables + timestamp
- Rule: state transition rules

## Persistence

SQLite tables (see `internal/storage/sqlite/store.go`):
- `deployables`
- `show_logic_packages`
- `rules`
- `events`
- `state_snapshot`

The latest `GlobalState` snapshot is stored in `state_snapshot` and reloaded on
startup.

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
1. `POST /api/v1/register`
2. Wait for role assignment (via operator or API)
3. `GET /api/v1/deployables/{id}/show-logic`
4. Load logic and assets, then `POST /api/v1/deployables/{id}/ack`
5. Send events to `POST /api/v1/events`
6. Subscribe to `GET /ws/state?deployable_id=...`

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

