package server

import (
	"log"
	"net/http"

	"state-server/internal/models"
)

const uiHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>State Server Control</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; }
    h1 { margin-bottom: 8px; }
    .row { margin: 12px 0; }
    button { padding: 8px 14px; margin-right: 8px; }
    input { padding: 6px; width: 220px; }
    textarea { width: 360px; height: 120px; }
    code { background: #f5f5f5; padding: 2px 4px; }
  </style>
</head>
<body>
  <h1>State Server Control</h1>
  <p>Click a button to override the global state.</p>

  <div class="row">
    <button onclick="setState('diagnostic')">diagnostic (Deployable reacts)</button>
    <button onclick="setState('idle')">idle</button>
  </div>

  <div class="row">
    <label>Custom state</label><br/>
    <input id="customState" placeholder="state name"/>
    <button onclick="setCustomState()">Send</button>
  </div>

  <div class="row">
    <label>Variables (optional JSON)</label><br/>
    <textarea id="variables">{}</textarea>
  </div>

  <div class="row">
    <code id="status">ready</code>
  </div>

  <script>
    async function setState(state) {
      const status = document.getElementById('status');
      let variables = {};
      try {
        const raw = document.getElementById('variables').value.trim();
        variables = raw ? JSON.parse(raw) : {};
      } catch (err) {
        status.textContent = 'variables JSON invalid';
        return;
      }
      status.textContent = 'sending...';
      const resp = await fetch('/api/v1/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, variables })
      });
      status.textContent = resp.ok ? 'ok' : ('error ' + resp.status);
    }

    function setCustomState() {
      const state = document.getElementById('customState').value.trim();
      if (!state) return;
      setState(state);
    }
  </script>
</body>
</html>`

func (s *Server) UI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(uiHTML))
}

func (s *Server) SetState(w http.ResponseWriter, r *http.Request) {
	if s.overrideState == nil {
		errorJSON(w, http.StatusNotImplemented, "state override not configured")
		return
	}
	var req models.StateOverrideRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid state payload")
		return
	}
	if req.State == "" {
		errorJSON(w, http.StatusBadRequest, "state required")
		return
	}
	log.Printf("state: request source=%s state=%s", r.RemoteAddr, req.State)
	if ok := s.overrideState(req.State, req.Variables); !ok {
		errorJSON(w, http.StatusServiceUnavailable, "state override queue full")
		return
	}
	log.Printf("state: queued state=%s", req.State)
	writeJSON(w, http.StatusOK, map[string]string{"status": "queued"})
}
