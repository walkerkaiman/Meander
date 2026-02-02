package server

import "net/http"

const registerUIHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Deployable Registration</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; }
    h1 { margin-bottom: 6px; }
    .card { border: 1px solid #ddd; padding: 12px; margin: 12px 0; border-radius: 6px; }
    .row { margin: 8px 0; }
    label { display: block; font-weight: 600; margin-bottom: 4px; }
    input, textarea, select { width: 100%; padding: 6px; }
    textarea { height: 120px; font-family: Consolas, monospace; }
    button { padding: 8px 14px; }
    code { background: #f5f5f5; padding: 2px 4px; }
    .meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Deployable Registration</h1>
  <div class="meta">Deployables update live.</div>
  <h2>Pending Deployables</h2>
  <div id="pending-list"></div>
  <h2>Online Deployables</h2>
  <div id="online-list"></div>
  <h2>Reassign Online Deployable</h2>
  <div class="card">
    <div class="row">
      <label>Deployable</label>
      <select id="reassignDeployable"></select>
    </div>
    <div class="row">
      <label>Show Logic</label>
      <select id="reassignShowLogic"></select>
    </div>
    <div class="row">
      <label>Location</label>
      <input id="reassignLocation" placeholder="Location"/>
    </div>
    <div class="row">
      <label>Role ID</label>
      <input id="reassignRoleId" placeholder="role-a"/>
    </div>
    <div class="row">
      <label>Profile JSON</label>
      <textarea id="reassignProfile">{ "profile_id": "default", "version": 1, "requires": {} }</textarea>
    </div>
    <div class="row">
      <button id="reassignButton">Reassign</button>
      <code id="reassignStatus">ready</code>
    </div>
  </div>

  <script>
    const cards = new Map();
    const onlineCards = new Map();
    const onlineItems = new Map();

    let showLogicFiles = [];

    async function loadShowLogicFiles() {
      try {
        const resp = await fetch('/api/v1/show-logic-files');
        if (!resp.ok) return;
        showLogicFiles = await resp.json();
      } catch (err) {
      }
    }

    function renderShowLogicOptions(select) {
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select show logic';
      select.appendChild(placeholder);
      for (const file of showLogicFiles) {
        const opt = document.createElement('option');
        opt.value = file.file;
        opt.textContent = file.name || file.file;
        select.appendChild(opt);
      }
    }

    function renderReassignDeployables() {
      const select = document.getElementById('reassignDeployable');
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select deployable';
      select.appendChild(placeholder);
      for (const [id, item] of onlineItems.entries()) {
        const opt = document.createElement('option');
        opt.value = id;
        const label = (item.name ? item.name + ' ' : '') + '(' + id + ')';
        opt.textContent = label;
        select.appendChild(opt);
      }
    }

    function createCard(item) {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-device-id', item.device_id);
      card.innerHTML =
        '<div><strong>' + item.device_id + '</strong> <span class="meta">' +
          (item.hostname || '') + ' ' + (item.ip || '') +
        '</span></div>' +
        '<div class="meta" data-field="meta"></div>' +
        '<div class="row">' +
          '<label>Show Logic</label>' +
          '<select data-field="show_logic_file"></select>' +
        '</div>' +
        '<div class="row">' +
          '<label>Location</label>' +
          '<input data-field="location" placeholder="Location"/>' +
        '</div>' +
        '<div class="row">' +
          '<label>Role ID</label>' +
          '<input data-field="role_id" placeholder="role-a"/>' +
        '</div>' +
        '<div class="row">' +
          '<label>Profile JSON</label>' +
          '<textarea data-field="profile">{ "profile_id": "default", "version": 1, "requires": {} }</textarea>' +
        '</div>' +
        '<div class="row">' +
          '<button data-field="assign">Assign + Send</button>' +
          '<code data-field="status">ready</code>' +
        '</div>';

      const showLogicSelect = card.querySelector('select[data-field="show_logic_file"]');
      renderShowLogicOptions(showLogicSelect);

      const btn = card.querySelector('button[data-field="assign"]');
      const status = card.querySelector('code[data-field="status"]');
      btn.addEventListener('click', async () => {
        const location = card.querySelector('input[data-field="location"]').value.trim();
        const roleId = card.querySelector('input[data-field="role_id"]').value.trim();
        const showLogicFile = card.querySelector('select[data-field="show_logic_file"]').value;
        let profile;
        try {
          profile = JSON.parse(card.querySelector('textarea[data-field="profile"]').value);
        } catch (err) {
          status.textContent = 'profile JSON invalid';
          return;
        }
        if (!showLogicFile) {
          status.textContent = 'select show logic';
          return;
        }
        status.textContent = 'sending...';
        const resp = await fetch('/api/v1/deployables/' + item.device_id + '/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location,
            role_id: roleId,
            profile,
            show_logic_file: showLogicFile
          })
        });
        status.textContent = resp.ok ? 'sent' : ('error ' + resp.status);
      });

      return card;
    }

    function updateMeta(card, item) {
      const meta = card.querySelector('[data-field="meta"]');
      meta.textContent =
        'pairing: ' + (item.pairing_code || 'n/a') +
        ' | status: ' + (item.status || 'PENDING') +
        ' | connected: ' + item.connected;
    }

    function isPending(item) {
      return !item.assigned_role_id;
    }

    function isOnline(item) {
      return item.assigned_role_id && item.connected;
    }

    function upsert(item) {
      const list = document.getElementById('pending-list');
      let card = cards.get(item.device_id);
      if (!card) {
        card = createCard(item);
        cards.set(item.device_id, card);
        list.appendChild(card);
      }
      updateMeta(card, item);
    }

    function remove(item) {
      const card = cards.get(item.device_id);
      if (!card) return;
      card.remove();
      cards.delete(item.device_id);
      if (!cards.size) {
        document.getElementById('pending-list').innerHTML = '<p>No pending deployables.</p>';
      }
    }

    function createOnlineCard(item) {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-device-id', item.device_id);
      card.innerHTML =
        '<div><strong>' + item.device_id + '</strong> <span class="meta">' +
          (item.name || '') +
        '</span></div>' +
        '<div class="meta">' +
          'role: ' + (item.assigned_role_id || 'n/a') +
          ' | status: ' + (item.status || 'ACTIVE') +
          ' | connected: ' + item.connected +
        '</div>' +
        '<div class="meta">location: ' + (item.location || '') + '</div>';
      return card;
    }

    function upsertOnline(item) {
      const list = document.getElementById('online-list');
      let card = onlineCards.get(item.device_id);
      if (!card) {
        card = createOnlineCard(item);
        onlineCards.set(item.device_id, card);
        list.appendChild(card);
      } else {
        card.querySelector('.meta').textContent =
          'role: ' + (item.assigned_role_id || 'n/a') +
          ' | status: ' + (item.status || 'ACTIVE') +
          ' | connected: ' + item.connected;
      }
      onlineItems.set(item.device_id, item);
      renderReassignDeployables();
    }

    function removeOnline(item) {
      const card = onlineCards.get(item.device_id);
      if (!card) return;
      card.remove();
      onlineCards.delete(item.device_id);
      onlineItems.delete(item.device_id);
      if (!onlineCards.size) {
        document.getElementById('online-list').innerHTML = '<p>No online deployables.</p>';
      }
      renderReassignDeployables();
    }

    async function connect() {
      await loadShowLogicFiles();
      renderShowLogicOptions(document.getElementById('reassignShowLogic'));
      const ws = new WebSocket('ws://' + location.host + '/ws/ui/register');
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'snapshot') {
          document.getElementById('pending-list').innerHTML = '';
          document.getElementById('online-list').innerHTML = '';
          cards.clear();
          onlineCards.clear();
          onlineItems.clear();
          for (const item of msg.items || []) {
            if (isPending(item)) {
              upsert(item);
            } else if (isOnline(item)) {
              upsertOnline(item);
            }
          }
          if (!cards.size) {
            document.getElementById('pending-list').innerHTML = '<p>No pending deployables.</p>';
          }
          if (!onlineCards.size) {
            document.getElementById('online-list').innerHTML = '<p>No online deployables.</p>';
          }
          renderReassignDeployables();
        } else if (msg.type === 'upsert' || msg.type === 'disconnect') {
          if (isPending(msg.item)) {
            removeOnline(msg.item);
            upsert(msg.item);
          } else if (isOnline(msg.item)) {
            remove(msg.item);
            upsertOnline(msg.item);
          } else {
            removeOnline(msg.item);
          }
        } else if (msg.type === 'assign_sent' || msg.type === 'assign_ack') {
          remove(msg.item);
          if (isOnline(msg.item)) {
            upsertOnline(msg.item);
          }
        }
      };
      ws.onclose = () => {
        setTimeout(connect, 2000);
      };
    }

    connect();

    document.getElementById('reassignButton').addEventListener('click', async () => {
      const status = document.getElementById('reassignStatus');
      const deployableId = document.getElementById('reassignDeployable').value;
      const roleId = document.getElementById('reassignRoleId').value.trim();
      const location = document.getElementById('reassignLocation').value.trim();
      const showLogicFile = document.getElementById('reassignShowLogic').value;
      let profile;
      if (!deployableId) {
        status.textContent = 'select deployable';
        return;
      }
      if (!showLogicFile) {
        status.textContent = 'select show logic';
        return;
      }
      try {
        profile = JSON.parse(document.getElementById('reassignProfile').value);
      } catch (err) {
        status.textContent = 'profile JSON invalid';
        return;
      }
      status.textContent = 'sending...';
      const resp = await fetch('/api/v1/deployables/' + deployableId + '/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          role_id: roleId,
          profile,
          show_logic_file: showLogicFile
        })
      });
      status.textContent = resp.ok ? 'sent' : ('error ' + resp.status);
    });
  </script>
</body>
</html>`;

func (s *Server) RegisterUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(registerUIHTML))
}
