package server

import (
	"log"
	"net/http"

	"state-server/internal/models"
)

const landingPageHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Meander State Server</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
      margin: 0; 
      padding: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { 
      margin: 0 0 8px 0;
      font-size: 32px;
      color: #333;
    }
    .subtitle {
      color: #666;
      margin-bottom: 40px;
      font-size: 16px;
    }
    .ui-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    .ui-card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .ui-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .ui-card h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #007bff;
    }
    .ui-card p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
    .icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Meander State Server</h1>
    <p class="subtitle">Control panel and management interfaces</p>
    
    <div class="ui-grid">
      <a href="/ui/control" class="ui-card">
        <div class="icon">🎮</div>
        <h2>State Control</h2>
        <p>Manually override global state and trigger state changes for testing and control.</p>
      </a>
      
      <a href="/ui/state" class="ui-card">
        <div class="icon">📊</div>
        <h2>State Monitor</h2>
        <p>Live monitoring of global state changes with real-time WebSocket updates.</p>
      </a>
      
      <a href="/ui/monitor" class="ui-card">
        <div class="icon">🖥️</div>
        <h2>System Monitor</h2>
        <p>Live status of all deployables, including online/offline state and last seen times.</p>
      </a>
      
      <a href="/ui/rules" class="ui-card">
        <div class="icon">⚙️</div>
        <h2>Rules Editor</h2>
        <p>Create and manage rules that trigger state transitions based on signals and events.</p>
      </a>
      
      <a href="/ui/show-designer" class="ui-card">
        <div class="icon">🎨</div>
        <h2>Show Logic Designer</h2>
        <p>Design and edit show logic files that define behavior for deployable devices.</p>
      </a>
      
      <a href="/ui/register" class="ui-card">
        <div class="icon">📱</div>
        <h2>Device Registration</h2>
        <p>Register deployable devices, assign roles, and distribute show logic to devices.</p>
      </a>
    </div>
  </div>
</body>
</html>`

const controlPanelHTML = `<!doctype html>
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
    .back-link { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="back-link"><a href="/ui">← Back to Home</a></div>
  <h1>State Server Control</h1>
  <p>Click a button to override the global state.</p>
  <p><a href="/ui/state">Open live state monitor</a></p>

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
	_, _ = w.Write([]byte(landingPageHTML))
}

func (s *Server) ControlPanelUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(controlPanelHTML))
}

const systemMonitorHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>System Monitor - Meander State Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 28px;
      color: #333;
    }
    .back-link {
      margin-bottom: 16px;
    }
    .deployable-list {
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }
    .deployable-card {
      background: #fff;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .deployable-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .deployable-id {
      font-weight: 600;
      color: #333;
    }
    .deployable-meta {
      font-size: 12px;
      color: #666;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-online {
      background: #d4edda;
      color: #155724;
    }
    .status-offline {
      background: #f8d7da;
      color: #721c24;
    }
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    .status-error {
      background: #f8d7da;
      color: #721c24;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      font-size: 12px;
    }
    .controls a {
      color: #007bff;
      text-decoration: none;
    }
    .controls a:hover {
      text-decoration: underline;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #555;
    }
    .summary-item {
      background: #fff;
      border-radius: 999px;
      padding: 6px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .refresh-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #555;
    }
    .refresh-button {
      background: #007bff;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .refresh-button:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="back-link"><a href="/ui">← Back to Home</a></div>
    <h1>System Monitor</h1>

    <div class="refresh-row">
      <label>
        <input type="checkbox" id="autoRefresh" checked />
        Auto-refresh every 5 seconds
      </label>
      <button class="refresh-button" onclick="refreshDeployables()">Refresh now</button>
      <span id="lastUpdated" style="font-size: 12px; color: #777;"></span>
    </div>

    <div id="summary" class="summary"></div>

    <div id="deployables" class="deployable-list">
      Loading deployables...
    </div>
  </div>

  <script>
    let refreshTimer = null;

    function formatTimestamp(ts) {
      if (!ts) return 'never';
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'invalid';
        return d.toLocaleString();
      } catch {
        return 'invalid';
      }
    }

    function formatDuration(from) {
      if (!from) return 'n/a';
      const start = new Date(from);
      if (isNaN(start.getTime())) return 'n/a';
      const diffMs = Date.now() - start.getTime();
      if (diffMs < 0) return 'just now';
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return days + 'd ' + (hours % 24) + 'h';
      if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
      if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
      return seconds + 's';
    }

    function deriveStatus(rec) {
      const raw = (rec.status || '').toUpperCase();
      if (raw === 'ACTIVE') return { label: 'ONLINE', cls: 'status-online', kind: 'online' };
      if (raw === 'ERROR') return { label: 'ERROR', cls: 'status-error', kind: 'error' };
      if (raw === 'OFFLINE') return { label: 'OFFLINE', cls: 'status-offline', kind: 'offline' };
      // NEW, ASSIGNED, REGISTERING, etc.
      return { label: raw || 'PENDING', cls: 'status-pending', kind: 'pending' };
    }

    async function refreshDeployables() {
      try {
        const resp = await fetch('/api/v1/deployables');
        if (!resp.ok) {
          document.getElementById('deployables').innerHTML = '<p>Failed to load deployables (HTTP ' + resp.status + ')</p>';
          return;
        }
        const records = await resp.json();
        renderDeployables(records);
        renderSummary(records);
        const ts = new Date().toLocaleTimeString();
        document.getElementById('lastUpdated').textContent = 'Last updated: ' + ts;
      } catch (err) {
        console.error('Failed to load deployables', err);
        document.getElementById('deployables').innerHTML = '<p>Failed to load deployables.</p>';
      }
    }

    function renderSummary(records) {
      const summaryEl = document.getElementById('summary');
      if (!Array.isArray(records) || records.length === 0) {
        summaryEl.innerHTML = '<span class="summary-item">No deployables registered.</span>';
        return;
      }
      let online = 0, offline = 0, pending = 0, error = 0;
      records.forEach(r => {
        const st = deriveStatus(r);
        if (st.kind === 'online') online++;
        else if (st.kind === 'offline') offline++;
        else if (st.kind === 'error') error++;
        else pending++;
      });
      summaryEl.innerHTML =
        '<span class="summary-item">Total: ' + records.length + '</span>' +
        '<span class="summary-item">Online: ' + online + '</span>' +
        '<span class="summary-item">Pending: ' + pending + '</span>' +
        '<span class="summary-item">Offline: ' + offline + '</span>' +
        '<span class="summary-item">Error: ' + error + '</span>';
    }

    function getHumanReadableName(rec) {
      const name = rec.name || '';
      const location = rec.location || '';
      if (name && location) {
        return name + ' - ' + location;
      } else if (name) {
        return name;
      } else if (location) {
        return location;
      }
      return rec.deployable_id || rec.DeployableID || '';
    }

    function renderDeployables(records) {
      const list = document.getElementById('deployables');
      if (!Array.isArray(records) || records.length === 0) {
        list.innerHTML = '<p>No deployables registered.</p>';
        return;
      }
      const now = Date.now();
      list.innerHTML = records.map(rec => {
        const st = deriveStatus(rec);
        const lastSeen = rec.last_seen || '';
        const duration = lastSeen ? formatDuration(lastSeen) : 'n/a';
        const durationLabel = (st.kind === 'online' ? 'Online for ' : 'Last seen ') + duration;
        const logic = rec.assigned_logic_id || 'None';
        const id = rec.deployable_id || rec.DeployableID || '';
        const humanName = getHumanReadableName(rec);
        
        // Construct link to Deployable's web interface
        // Prefer hostname or private network IPs (192.168.x.x, 10.x.x.x) over link-local (169.254.x.x)
        let controlLink = '/ui/register'; // fallback
        const ip = rec.ip || '';
        const hostname = rec.hostname || '';
        
        // Check if IP is link-local (169.254.x.x) - prefer hostname in that case
        const isLinkLocal = ip && ip.startsWith('169.254.');
        
        if (hostname && !isLinkLocal) {
          // Prefer hostname if IP is not link-local
          controlLink = 'http://' + hostname + ':8090/';
        } else if (ip && !isLinkLocal) {
          // Use IP if it's not link-local
          controlLink = 'http://' + ip + ':8090/';
        } else if (hostname) {
          // Fallback to hostname even if IP is link-local
          controlLink = 'http://' + hostname + ':8090/';
        } else if (ip) {
          // Last resort: use IP even if link-local
          controlLink = 'http://' + ip + ':8090/';
        }
        
        return (
          '<div class="deployable-card">' +
            '<div class="deployable-main">' +
              '<div class="deployable-id">' + humanName + '</div>' +
              '<div class="deployable-meta" style="font-size:0.85em;color:#999;font-family:monospace;">' + id + '</div>' +
              '<div class="deployable-meta">' +
                'Logic: ' + logic + ' | Last seen: ' + formatTimestamp(lastSeen) +
              '</div>' +
              '<div class="deployable-meta">' + durationLabel + '</div>' +
              (st.kind === 'error'
                ? '<div class="deployable-meta" style="color:#dc3545;font-weight:600;">Error status</div>'
                : '') +
              '<div class="controls">' +
                '<a href="' + controlLink + '" target="_blank">Open Control Panel</a>' +
              '</div>' +
            '</div>' +
            '<span class="status-badge ' + st.cls + '">' + st.label + '</span>' +
          '</div>'
        );
      }).join('');
    }

    document.getElementById('autoRefresh').addEventListener('change', function (e) {
      if (e.target.checked) {
        if (!refreshTimer) {
          refreshTimer = setInterval(refreshDeployables, 5000);
        }
      } else {
        if (refreshTimer) {
          clearInterval(refreshTimer);
          refreshTimer = null;
        }
      }
    });

    // Initial load - refresh immediately when page opens
    refreshDeployables();
    // Set up auto-refresh if enabled
    if (document.getElementById('autoRefresh').checked) {
      refreshTimer = setInterval(refreshDeployables, 5000);
    }
  </script>
</body>
</html>`

func (s *Server) SystemMonitorUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(systemMonitorHTML))
}

const stateMonitorHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Server - State Server Monitor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; }
    h1 { margin-bottom: 8px; }
    code { background: #f5f5f5; padding: 2px 4px; }
    pre { background: #f8f8f8; padding: 12px; border-radius: 6px; overflow: auto; }
    .row { margin: 12px 0; }
  </style>
</head>
<body>
  <div style="margin-bottom: 20px;"><a href="/ui">← Back to Home</a></div>
  <h1>State Server Monitor</h1>
  <div class="row">
    <code id="status">connecting...</code>
  </div>
  <pre id="state">{}</pre>

  <script>
    const statusEl = document.getElementById('status');
    const stateEl = document.getElementById('state');
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = protocol + '://' + window.location.host + '/ws/state';
    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      statusEl.textContent = 'connected';
    });
    socket.addEventListener('close', () => {
      statusEl.textContent = 'disconnected';
    });
    socket.addEventListener('error', () => {
      statusEl.textContent = 'error';
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.type === 'state_update') {
          stateEl.textContent = JSON.stringify(payload, null, 2);
        }
      } catch (err) {
        statusEl.textContent = 'invalid message';
      }
    });
  </script>
</body>
</html>`

func (s *Server) StateMonitorUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(stateMonitorHTML))
}

const rulesEditorHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Server - Rules Editor</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; }
    .section { margin: 24px 0; padding: 16px; background: #fafafa; border-radius: 4px; }
    .section h2 { margin-top: 0; font-size: 18px; }
    button { padding: 8px 16px; margin: 4px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; }
    button:hover { background: #f0f0f0; }
    button.primary { background: #007bff; color: white; border-color: #007bff; }
    button.primary:hover { background: #0056b3; }
    button.danger { background: #dc3545; color: white; border-color: #dc3545; }
    button.danger:hover { background: #c82333; }
    input, select, textarea { padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    input[type="checkbox"] { width: auto; }
    label { display: block; margin: 8px 0 4px 0; font-weight: bold; }
    .form-row { display: flex; gap: 12px; margin: 12px 0; align-items: flex-end; }
    .form-row > * { flex: 1; }
    .form-row button { flex: 0 0 auto; }
    .condition { background: white; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; }
    .rule-item { background: white; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
    .rule-info { flex: 1; }
    .rule-actions { display: flex; gap: 8px; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .status.enabled { background: #d4edda; color: #155724; }
    .status.disabled { background: #f8d7da; color: #721c24; }
    .error { color: #dc3545; margin: 8px 0; }
    .success { color: #28a745; margin: 8px 0; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
    .tag-input { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; min-height: 32px; }
    .tag { background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
    .tag .remove { cursor: pointer; font-weight: bold; }
    .tag-input input { border: none; outline: none; flex: 1; min-width: 100px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Rules Editor</h1>
    <p><a href="/ui">← Back to Home</a> | <a href="/ui/state">State Monitor</a></p>

    <div id="error" class="error" style="display:none;"></div>
    <div id="success" class="success" style="display:none;"></div>

    <div class="section">
      <h2>Existing Rules</h2>
      <div id="rulesList"></div>
    </div>

    <div class="section">
      <h2 id="formTitle">Create New Rule</h2>
      <form id="ruleForm">
        <input type="hidden" id="ruleId" />
        
        <label>Rule ID</label>
        <select id="id" required>
          <option value="">Select or create new rule...</option>
        </select>
        <input type="text" id="idNew" style="display:none; margin-top: 4px;" placeholder="Enter new rule ID" />
        <button type="button" onclick="toggleNewRuleId()" style="margin-top: 4px;">Create New Rule ID</button>
        
        <label>Enabled</label>
        <input type="checkbox" id="enabled" checked />
        
        <label>Target Deployables</label>
        <div>
          <label style="font-weight: normal;">
            <input type="radio" name="targetType" value="deployables" checked />
            By Deployable ID
          </label>
          <label style="font-weight: normal;">
            <input type="radio" name="targetType" value="tags" />
            By Tags
          </label>
        </div>
        
        <div id="deployableTargets" style="margin-top: 8px;">
          <label>Deployable IDs</label>
          <select id="deployableIds" multiple size="5" style="width: 100%; padding: 6px;">
          </select>
          <small style="color: #666;">Hold Ctrl/Cmd to select multiple</small>
        </div>
        
        <div id="tagTargets" style="margin-top: 8px; display: none;">
          <label>Tags</label>
          <div class="tag-input" id="tagsContainer">
            <input type="text" id="tagInput" placeholder="Type tag and press Enter" />
          </div>
        </div>
        
        <label>Conditions (ALL must be true)</label>
        <div id="conditions"></div>
        <button type="button" onclick="addCondition()">+ Add Condition</button>
        
        <label>Target State</label>
        <select id="targetState" required></select>
        
        <label>Cooldown (milliseconds, optional)</label>
        <input type="number" id="cooldown" min="0" placeholder="0" />
        
        <div style="margin-top: 16px;">
          <button type="submit" class="primary">Save Rule</button>
          <button type="button" onclick="resetForm()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let deployables = [];
    let states = [];
    let rules = [];
    let allSignals = [];
    let selectedTags = [];

    async function loadData() {
      try {
        [deployables, states, rules, allSignals] = await Promise.all([
          fetch('/api/v1/deployables-with-logic').then(r => r.json()),
          fetch('/api/v1/states').then(r => r.json()),
          fetch('/api/v1/rules').then(r => r.json()),
          fetch('/api/v1/signals').then(r => r.json())
        ]);
        renderRules();
        populateStates();
        populateDeployables();
        populateRuleIds();
      } catch (err) {
        showError('Failed to load data: ' + err.message);
      }
    }

    function populateStates() {
      const select = document.getElementById('targetState');
      select.innerHTML = '<option value="">Select state...</option>';
      states.sort().forEach(state => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        select.appendChild(opt);
      });
    }

    function populateDeployables() {
      const select = document.getElementById('deployableIds');
      select.innerHTML = '';
      deployables.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep.deployable_id;
        opt.textContent = dep.deployable_id + (dep.logic_id ? ' (' + dep.logic_id + ')' : '');
        select.appendChild(opt);
      });
    }

    function populateRuleIds() {
      const select = document.getElementById('id');
      const existingOptions = Array.from(select.options).map(o => o.value);
      rules.forEach(rule => {
        if (!existingOptions.includes(rule.id)) {
          const opt = document.createElement('option');
          opt.value = rule.id;
          opt.textContent = rule.id;
          select.appendChild(opt);
        }
      });
    }

    function toggleNewRuleId() {
      const select = document.getElementById('id');
      const input = document.getElementById('idNew');
      if (input.style.display === 'none') {
        select.style.display = 'none';
        input.style.display = 'block';
        input.required = true;
        select.required = false;
        input.value = '';
      } else {
        select.style.display = 'block';
        input.style.display = 'none';
        input.required = false;
        select.required = true;
        input.value = '';
      }
    }

    function renderRules() {
      const container = document.getElementById('rulesList');
      if (rules.length === 0) {
        container.innerHTML = '<p>No rules defined.</p>';
        return;
      }
      container.innerHTML = rules.map(rule => {
        const conditions = rule.when.all || rule.when.any || [];
        const source = conditions[0]?.source || {};
        const targetType = source.tags?.length > 0 ? 'tags' : 'deployables';
        const targets = targetType === 'tags' 
          ? (source.tags || []).map(t => '<code>' + t + '</code>').join(', ')
          : (source.deployable_ids || []).map(id => '<code>' + id + '</code>').join(', ') || '<em>all</em>';
        const cooldown = rule.timing?.cooldown_ms ? '<br/><small>Cooldown: ' + rule.timing.cooldown_ms + 'ms</small>' : '';
        return '<div class="rule-item">' +
          '<div class="rule-info">' +
          '<strong>' + rule.id + '</strong> ' +
          '<span class="status ' + (rule.enabled ? 'enabled' : 'disabled') + '">' + (rule.enabled ? 'Enabled' : 'Disabled') + '</span>' +
          '<br/>' +
          '<small>When ' + conditions.length + ' condition(s) from ' + targets + ' are true → Set state to <code>' + rule.then.set_state + '</code></small>' +
          cooldown +
          '</div>' +
          '<div class="rule-actions">' +
          '<button onclick="editRule(\'' + rule.id + '\')">Edit</button> ' +
          '<button class="danger" onclick="deleteRule(\'' + rule.id + '\')">Delete</button>' +
          '</div>' +
          '</div>';
      }).join('');
    }

    document.querySelectorAll('input[name="targetType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const type = e.target.value;
        document.getElementById('deployableTargets').style.display = type === 'deployables' ? 'block' : 'none';
        document.getElementById('tagTargets').style.display = type === 'tags' ? 'block' : 'none';
      });
    });

    document.getElementById('tagInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = e.target.value.trim();
        if (tag && !selectedTags.includes(tag)) {
          selectedTags.push(tag);
          renderTags();
          e.target.value = '';
        }
      }
    });

    function renderTags() {
      const container = document.getElementById('tagsContainer');
      const input = document.getElementById('tagInput');
      container.innerHTML = selectedTags.map(tag => 
        '<span class="tag">' +
          tag +
          ' <span class="remove" onclick="removeTag(\'' + tag + '\')">×</span>' +
        '</span>'
      ).join('');
      container.appendChild(input);
    }

    function removeTag(tag) {
      selectedTags = selectedTags.filter(t => t !== tag);
      renderTags();
    }

    let conditionCount = 0;
    async function addCondition(deployableId = '', signal = '', op = 'equals', value = '') {
      const container = document.getElementById('conditions');
      const id = 'cond' + conditionCount++;
      const div = document.createElement('div');
      div.className = 'condition';
      div.id = id;
      const deployableOptions = deployables.map(d => 
        '<option value="' + d.deployable_id + '"' + (d.deployable_id === deployableId ? ' selected' : '') + '>' + 
        d.deployable_id + ' (' + (d.logic_id || 'no logic') + ')</option>'
      ).join('');
      const opEquals = op === 'equals' ? ' selected' : '';
      const opGt = op === 'gt' ? ' selected' : '';
      const opLt = op === 'lt' ? ' selected' : '';
      const opAll = op === 'all' ? ' selected' : '';
      div.innerHTML = 
        '<div class="form-row">' +
          '<div>' +
            '<label>Deployable</label>' +
            '<select class="deployable-select" onchange="loadSignals(this, \'' + id + '\')">' +
              '<option value="">Select deployable...</option>' +
              deployableOptions +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label>Signal</label>' +
            '<select class="signal-select" required>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label>Operator</label>' +
            '<select class="op-select" required>' +
              '<option value="equals"' + opEquals + '>equals</option>' +
              '<option value="gt"' + opGt + '>></option>' +
              '<option value="lt"' + opLt + '><</option>' +
              '<option value="all"' + opAll + '>all (vector2)</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label>Value</label>' +
            '<input type="text" class="value-input" placeholder="true, 42, \'text\', [1,2]" value="' + value.replace(/"/g, '&quot;') + '" required />' +
          '</div>' +
          '<button type="button" onclick="removeCondition(\'' + id + '\')">Remove</button>' +
        '</div>';
      container.appendChild(div);
      const signalSelect = div.querySelector('.signal-select');
      populateSignalDropdown(signalSelect, signal);
      if (deployableId) {
        const deployableSelect = div.querySelector('.deployable-select');
        deployableSelect.value = deployableId;
        await loadSignals(deployableSelect, id);
      }
    }

    function populateSignalDropdown(signalSelect, selectedSignal = '') {
      signalSelect.innerHTML = '<option value="">Select signal...</option>';
      if (allSignals && Array.isArray(allSignals) && allSignals.length > 0) {
        allSignals.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(sig => {
          if (sig && sig.name) {
            const opt = document.createElement('option');
            opt.value = sig.name;
            opt.textContent = sig.name + ' (' + (sig.type || 'unknown') + ')';
            if (sig.name === selectedSignal) {
              opt.selected = true;
            }
            signalSelect.appendChild(opt);
          }
        });
      } else {
        console.warn('No signals available. allSignals:', allSignals);
      }
    }

    async function loadSignals(select, conditionId) {
      const deployableId = select.value;
      const condition = document.getElementById(conditionId);
      if (!condition) return;
      const signalSelect = condition.querySelector('.signal-select');
      const currentValue = signalSelect.value;
      
      if (deployableId) {
        signalSelect.innerHTML = '<option value="">Loading...</option>';
        try {
          const resp = await fetch('/api/v1/deployables/' + deployableId + '/signals');
          if (!resp.ok) {
            throw new Error('HTTP ' + resp.status);
          }
          const signals = await resp.json();
          signalSelect.innerHTML = '<option value="">Select signal...</option>';
          if (signals && signals.length > 0) {
            signals.forEach(sig => {
              const opt = document.createElement('option');
              opt.value = sig.name;
              opt.textContent = sig.name + ' (' + sig.type + ')';
              if (sig.name === currentValue) {
                opt.selected = true;
              }
              signalSelect.appendChild(opt);
            });
          } else {
            populateSignalDropdown(signalSelect, currentValue);
          }
        } catch (err) {
          console.error('Failed to load deployable signals, using all signals:', err);
          populateSignalDropdown(signalSelect, currentValue);
        }
      } else {
        populateSignalDropdown(signalSelect, currentValue);
      }
    }

    function removeCondition(id) {
      document.getElementById(id).remove();
    }

    async function editRule(ruleId) {
      const rule = rules.find(r => r.id === ruleId);
      if (!rule) return;
      
      document.getElementById('ruleId').value = rule.id;
      const idSelect = document.getElementById('id');
      const idInput = document.getElementById('idNew');
      idSelect.value = rule.id;
      idSelect.style.display = 'block';
      idInput.style.display = 'none';
      idSelect.required = true;
      idInput.required = false;
      document.getElementById('enabled').checked = rule.enabled;
      document.getElementById('targetState').value = rule.then.set_state;
      document.getElementById('cooldown').value = rule.timing?.cooldown_ms || '';
      
      const conditions = rule.when.all || rule.when.any || [];
      if (conditions.length > 0) {
        const source = conditions[0].source || {};
        if (source.tags && source.tags.length > 0) {
          document.querySelector('input[name="targetType"][value="tags"]').checked = true;
          document.getElementById('deployableTargets').style.display = 'none';
          document.getElementById('tagTargets').style.display = 'block';
          selectedTags = [...source.tags];
          renderTags();
        } else {
          document.querySelector('input[name="targetType"][value="deployables"]').checked = true;
          document.getElementById('deployableTargets').style.display = 'block';
          document.getElementById('tagTargets').style.display = 'none';
          const deployableSelect = document.getElementById('deployableIds');
          Array.from(deployableSelect.options).forEach(opt => {
            opt.selected = (source.deployable_ids || []).includes(opt.value);
          });
        }
      }
      
      document.getElementById('conditions').innerHTML = '';
      conditionCount = 0;
      let ruleLevelDeployableIds = [];
      if (conditions.length > 0) {
        const source = conditions[0].source || {};
        ruleLevelDeployableIds = source.deployable_ids || [];
      }
      for (const cond of conditions) {
        let deployableId = cond.source?.deployable_ids?.[0] || '';
        if (!deployableId && ruleLevelDeployableIds.length > 0) {
          deployableId = ruleLevelDeployableIds[0];
        }
        if (!deployableId && deployables.length > 0) {
          deployableId = deployables[0].deployable_id;
        }
        await addCondition(deployableId, cond.signal, cond.op, JSON.stringify(cond.value));
      }
      
      document.getElementById('formTitle').textContent = 'Edit Rule';
      document.getElementById('ruleForm').scrollIntoView({ behavior: 'smooth' });
    }

    function resetForm() {
      document.getElementById('ruleForm').reset();
      document.getElementById('ruleId').value = '';
      const idSelect = document.getElementById('id');
      const idInput = document.getElementById('idNew');
      idSelect.value = '';
      idSelect.style.display = 'block';
      idInput.style.display = 'none';
      idSelect.required = true;
      idInput.required = false;
      document.getElementById('conditions').innerHTML = '';
      document.getElementById('formTitle').textContent = 'Create New Rule';
      selectedTags = [];
      renderTags();
      conditionCount = 0;
      const deployableSelect = document.getElementById('deployableIds');
      Array.from(deployableSelect.options).forEach(opt => opt.selected = false);
    }

    async function deleteRule(ruleId) {
      if (!confirm('Delete rule ' + ruleId + '?')) return;
      try {
        const resp = await fetch('/api/v1/rules/' + ruleId, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Delete failed');
        showSuccess('Rule deleted');
        await loadData();
      } catch (err) {
        showError('Failed to delete rule: ' + err.message);
      }
    }

    document.getElementById('ruleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideMessages();
      
      const ruleId = document.getElementById('ruleId').value;
      const idSelect = document.getElementById('id');
      const idInput = document.getElementById('idNew');
      const id = idSelect.style.display !== 'none' ? idSelect.value : idInput.value;
      if (!id) {
        showError('Rule ID is required');
        return;
      }
      const enabled = document.getElementById('enabled').checked;
      const targetState = document.getElementById('targetState').value;
      const cooldown = parseInt(document.getElementById('cooldown').value) || 0;
      const targetType = document.querySelector('input[name="targetType"]:checked').value;
      
      const conditions = [];
      document.querySelectorAll('.condition').forEach(cond => {
        const deployableSelect = cond.querySelector('.deployable-select');
        const signalSelect = cond.querySelector('.signal-select');
        const opSelect = cond.querySelector('.op-select');
        const valueInput = cond.querySelector('.value-input');
        
        if (!signalSelect.value || !opSelect.value || !valueInput.value) return;
        
        let value;
        try {
          value = JSON.parse(valueInput.value);
        } catch {
          value = valueInput.value;
        }
        
        const source = {};
        if (targetType === 'tags') {
          source.tags = selectedTags;
        } else {
          const deployableSelect = document.getElementById('deployableIds');
          const ids = Array.from(deployableSelect.selectedOptions).map(opt => opt.value).filter(s => s);
          if (ids.length > 0) {
            source.deployable_ids = ids;
          }
        }
        
        conditions.push({
          source: Object.keys(source).length > 0 ? source : undefined,
          signal: signalSelect.value,
          op: opSelect.value,
          value: value
        });
      });
      
      if (conditions.length === 0) {
        showError('At least one condition is required');
        return;
      }
      
      const rule = {
        id: id,
        enabled: enabled,
        when: { all: conditions },
        then: { set_state: targetState }
      };
      
      if (cooldown > 0) {
        rule.timing = { cooldown_ms: cooldown };
      }
      
      try {
        const url = '/api/v1/rules' + (ruleId ? '/' + ruleId : '');
        const method = ruleId ? 'PUT' : 'POST';
        const resp = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rule)
        });
        
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Save failed');
        }
        
        showSuccess('Rule saved');
        resetForm();
        await loadData();
      } catch (err) {
        showError('Failed to save rule: ' + err.message);
      }
    });

    function showError(msg) {
      const el = document.getElementById('error');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 5000);
    }

    function showSuccess(msg) {
      const el = document.getElementById('success');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 5000);
    }

    function hideMessages() {
      document.getElementById('error').style.display = 'none';
      document.getElementById('success').style.display = 'none';
    }

    loadData();
  </script>
</body>
</html>`

func (s *Server) RulesEditorUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(rulesEditorHTML))
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
