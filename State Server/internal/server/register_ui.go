package server

import "net/http"

const registerUIHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Device Registration - Meander State Server</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; }
    h1 { margin-bottom: 6px; }
    .back-link { margin-bottom: 16px; }
    .card { border: 1px solid #ddd; padding: 12px; margin: 12px 0; border-radius: 6px; }
    .row { margin: 8px 0; }
    label { display: block; font-weight: 600; margin-bottom: 4px; }
    input, textarea, select { width: 100%; padding: 6px; box-sizing: border-box; }
    textarea { height: 120px; font-family: Consolas, monospace; }
    button { padding: 8px 14px; margin-right: 8px; }
    code { background: #f5f5f5; padding: 2px 4px; }
    .meta { color: #666; font-size: 0.9em; }
    .device-id { font-size: 0.85em; color: #999; font-family: monospace; }
  </style>
</head>
<body>
  <div class="back-link"><a href="/ui">← Back to Home</a></div>
  <h1>Device Registration</h1>
  <div class="meta">Deployables update live.</div>
  <h2>Pending Deployables</h2>
  <div id="pending-list"></div>
  <h2>Online Deployables</h2>
  <div id="online-list"></div>

  <script>
    const cards = new Map();
    const onlineCards = new Map();
    const onlineItems = new Map();

    let showLogicFiles = [];

    function getHumanReadableName(item) {
      const name = item.name || '';
      const location = item.location || '';
      if (name && location) {
        return name + ' - ' + location;
      } else if (name) {
        return name;
      } else if (location) {
        return location;
      }
      return item.device_id;
    }

    async function loadShowLogicFiles() {
      try {
        const resp = await fetch('/api/v1/show-logic-files');
        if (!resp.ok) return;
        showLogicFiles = await resp.json();
      } catch (err) {
      }
    }

    function renderShowLogicOptions(select, currentValue) {
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select show logic';
      select.appendChild(placeholder);
      for (const file of showLogicFiles) {
        const opt = document.createElement('option');
        opt.value = file.file;
        opt.textContent = file.name || file.file;
        if (currentValue && file.file === currentValue) {
          opt.selected = true;
        }
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
      return !item.assigned_logic_id;
    }

    function isOnline(item) {
      return item.assigned_logic_id && item.connected;
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
      const humanName = getHumanReadableName(item);
      card.innerHTML =
        '<div><strong>' + humanName + '</strong></div>' +
        '<div class="device-id">Device ID: ' + item.device_id + '</div>' +
        '<div class="meta" data-field="meta"></div>' +
        '<div class="row">' +
          '<label>Name</label>' +
          '<input type="text" data-field="name" value="' + (item.name || '') + '" placeholder="Device name"/>' +
        '</div>' +
        '<div class="row">' +
          '<label>Location</label>' +
          '<input type="text" data-field="location" value="' + (item.location || '') + '" placeholder="Device location"/>' +
        '</div>' +
        '<div class="row">' +
          '<label>Show Logic</label>' +
          '<select data-field="show_logic_file"></select>' +
        '</div>' +
        '<div class="row">' +
          '<label>Profile JSON</label>' +
          '<textarea data-field="profile">{ "profile_id": "default", "version": 1, "requires": {} }</textarea>' +
        '</div>' +
        '<div class="row">' +
          '<button data-field="update">Update Name/Location</button>' +
          '<button data-field="reassign">Reassign Show Logic</button>' +
          '<code data-field="status">ready</code>' +
        '</div>';

      const showLogicSelect = card.querySelector('select[data-field="show_logic_file"]');
      renderShowLogicOptions(showLogicSelect, item.assigned_logic_id);

      const updateBtn = card.querySelector('button[data-field="update"]');
      const reassignBtn = card.querySelector('button[data-field="reassign"]');
      const status = card.querySelector('code[data-field="status"]');

      updateBtn.addEventListener('click', async () => {
        const name = card.querySelector('input[data-field="name"]').value.trim();
        const location = card.querySelector('input[data-field="location"]').value.trim();
        status.textContent = 'updating...';
        const resp = await fetch('/api/v1/deployables/' + item.device_id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, location })
        });
        if (resp.ok) {
          status.textContent = 'updated';
          // Update the in-memory item
          item.name = name;
          item.location = location;
          onlineItems.set(item.device_id, item);
          // Update the display name
          const nameEl = card.querySelector('strong');
          const newHumanName = getHumanReadableName(item);
          nameEl.textContent = newHumanName;
        } else {
          status.textContent = 'error ' + resp.status;
        }
      });

      reassignBtn.addEventListener('click', async () => {
        const showLogicFile = card.querySelector('select[data-field="show_logic_file"]').value;
        const name = card.querySelector('input[data-field="name"]').value.trim();
        const location = card.querySelector('input[data-field="location"]').value.trim();
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
            name,
            location,
            profile,
            show_logic_file: showLogicFile
          })
        });
        if (resp.ok) {
          status.textContent = 'sent';
          // Update the in-memory item
          item.name = name;
          item.location = location;
          onlineItems.set(item.device_id, item);
          // Update the display name
          const nameEl = card.querySelector('strong');
          const newHumanName = getHumanReadableName(item);
          nameEl.textContent = newHumanName;
        } else {
          status.textContent = 'error ' + resp.status;
        }
      });

      return card;
    }

    function updateOnlineMeta(card, item) {
      const meta = card.querySelector('[data-field="meta"]');
      meta.textContent =
        'show logic: ' + (item.assigned_logic_id || 'n/a') +
        ' | status: ' + (item.status || 'ACTIVE') +
        ' | connected: ' + item.connected;
    }

    function upsertOnline(item) {
      const list = document.getElementById('online-list');
      let card = onlineCards.get(item.device_id);
      if (!card) {
        card = createOnlineCard(item);
        onlineCards.set(item.device_id, card);
        list.appendChild(card);
      } else {
        updateOnlineMeta(card, item);
        // Update form fields if they changed
        const nameInput = card.querySelector('input[data-field="name"]');
        const locationInput = card.querySelector('input[data-field="location"]');
        if (nameInput.value !== (item.name || '')) {
          nameInput.value = item.name || '';
        }
        if (locationInput.value !== (item.location || '')) {
          locationInput.value = item.location || '';
        }
        // Update display name
        const nameEl = card.querySelector('strong');
        const humanName = getHumanReadableName(item);
        if (nameEl.textContent !== humanName) {
          nameEl.textContent = humanName;
        }
      }
      onlineItems.set(item.device_id, item);
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
    }

    async function connect() {
      await loadShowLogicFiles();
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
  </script>
</body>
</html>`;

func (s *Server) RegisterUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(registerUIHTML))
}
