package web

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"deployable/internal/runtime"
)

type Server struct {
	Runtime    *runtime.Runtime
	EventsURL  string
	httpClient *http.Client
}

func (s *Server) Listen(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", s.handleIndex)
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/identify", s.handleIdentify)
	mux.HandleFunc("/api/mock_event", s.handleMockEvent)
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	if s.httpClient == nil {
		s.httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return server.ListenAndServe()
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(indexHTML))
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	status := s.Runtime.Status()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(status)
}

func (s *Server) handleIdentify(w http.ResponseWriter, r *http.Request) {
	supported := s.Runtime.TriggerIdentify()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"supported": supported,
	})
}

type mockEventRequest struct {
	Signals   map[string]any `json:"signals"`
	Timestamp int64          `json:"timestamp"`
}

func (s *Server) handleMockEvent(w http.ResponseWriter, r *http.Request) {
	if s.EventsURL == "" {
		http.Error(w, "events endpoint not configured", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req mockEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if len(req.Signals) == 0 {
		http.Error(w, "signals required", http.StatusBadRequest)
		return
	}
	ts := req.Timestamp
	if ts == 0 {
		ts = time.Now().Unix()
	}
	payload := map[string]any{
		"deployable_id": s.Runtime.Device.DeviceID,
		"timestamp":     ts,
		"signals":       req.Signals,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "failed to encode payload", http.StatusInternalServerError)
		return
	}
	resp, err := s.httpClient.Post(s.EventsURL, "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, "events post failed: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, "events post returned "+resp.Status, resp.StatusCode)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "queued",
	})
}

const indexHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Deployable Mock Interactions</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; }
    h1 { margin-bottom: 8px; }
    .row { margin: 14px 0; }
    .panel { border: 1px solid #ddd; padding: 12px; margin: 12px 0; border-radius: 6px; }
    button { padding: 6px 12px; margin-right: 6px; }
    input, select { padding: 6px; margin-right: 6px; }
    code { background: #f5f5f5; padding: 2px 4px; }
    pre { background: #f8f8f8; padding: 12px; border-radius: 6px; overflow: auto; }
  </style>
</head>
<body>
  <h1>Deployable Mock Interactions</h1>
  <p>Send mock signals to the State Server rules engine.</p>

  <div class="panel">
    <div class="row">
      <strong>Boolean signal</strong>
    </div>
    <div class="row">
      <input id="boolName" placeholder="signal name" value="button_pressed"/>
      <button onclick="sendBool(true)">Send true</button>
      <button onclick="sendBool(false)">Send false</button>
    </div>
  </div>

  <div class="panel">
    <div class="row">
      <strong>Number signal</strong>
    </div>
    <div class="row">
      <input id="numName" placeholder="signal name" value="counter"/>
      <input id="numValue" type="number" value="0" step="1"/>
      <button onclick="sendNumber()">Send value</button>
      <button onclick="incrementNumber()">Increment</button>
    </div>
  </div>

  <div class="panel">
    <div class="row">
      <strong>Vector2 signal</strong>
    </div>
    <div class="row">
      <input id="vecName" placeholder="signal name" value="position"/>
      <input id="vecX" type="number" value="0" step="0.1"/>
      <input id="vecY" type="number" value="0" step="0.1"/>
      <button onclick="sendVector()">Send vector</button>
    </div>
  </div>

  <div class="panel">
    <div class="row">
      <strong>String signal</strong>
    </div>
    <div class="row">
      <input id="strName" placeholder="signal name" value="mode"/>
      <input id="strValue" placeholder="value" value="start"/>
      <button onclick="sendString()">Send string</button>
    </div>
  </div>

  <div class="row">
    <code id="status">ready</code>
  </div>

  <div class="panel">
    <div class="row">
      <strong>Runtime status</strong>
      <button onclick="refreshStatus()">Refresh</button>
    </div>
    <pre id="runtimeStatus">{}</pre>
  </div>

  <script>
    async function postSignals(signals) {
      const status = document.getElementById('status');
      status.textContent = 'sending...';
      try {
        const resp = await fetch('/api/mock_event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signals })
        });
        status.textContent = resp.ok ? 'ok' : ('error ' + resp.status);
      } catch (err) {
        status.textContent = 'network error';
      }
    }

    function sendBool(value) {
      const name = document.getElementById('boolName').value.trim();
      if (!name) return;
      postSignals({ [name]: value });
    }

    function sendNumber() {
      const name = document.getElementById('numName').value.trim();
      const value = Number(document.getElementById('numValue').value);
      if (!name || Number.isNaN(value)) return;
      postSignals({ [name]: value });
    }

    function incrementNumber() {
      const input = document.getElementById('numValue');
      const current = Number(input.value);
      const next = Number.isNaN(current) ? 1 : current + 1;
      input.value = next;
      sendNumber();
    }

    function sendVector() {
      const name = document.getElementById('vecName').value.trim();
      const x = Number(document.getElementById('vecX').value);
      const y = Number(document.getElementById('vecY').value);
      if (!name || Number.isNaN(x) || Number.isNaN(y)) return;
      postSignals({ [name]: [x, y] });
    }

    function sendString() {
      const name = document.getElementById('strName').value.trim();
      const value = document.getElementById('strValue').value;
      if (!name) return;
      postSignals({ [name]: value });
    }

    async function refreshStatus() {
      const box = document.getElementById('runtimeStatus');
      try {
        const resp = await fetch('/api/status');
        const data = await resp.json();
        box.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        box.textContent = '{}';
      }
    }
    refreshStatus();
  </script>
</body>
</html>`
