package server

import (
	"net/http"
)

const showDesignerHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Server - Show Logic Designer</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; }
    .header { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
    .header select, .header input, .header button { padding: 8px 12px; font-size: 14px; }
    .section { margin: 24px 0; padding: 16px; background: #fafafa; border-radius: 4px; }
    .section h2 { margin-top: 0; font-size: 18px; }
    button { padding: 8px 16px; margin: 4px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px; background: white; }
    button:hover { background: #f0f0f0; }
    button.primary { background: #007bff; color: white; border-color: #007bff; }
    button.primary:hover { background: #0056b3; }
    button.danger { background: #dc3545; color: white; border-color: #dc3545; }
    button.danger:hover { background: #c82333; }
    input, select, textarea { padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    label { display: block; margin: 8px 0 4px 0; font-weight: bold; }
    .form-row { display: flex; gap: 12px; margin: 12px 0; align-items: flex-end; }
    .form-row > * { flex: 1; }
    .form-row button { flex: 0 0 auto; }
    .error { color: #dc3545; margin: 8px 0; padding: 8px; background: #f8d7da; border-radius: 4px; }
    .success { color: #28a745; margin: 8px 0; padding: 8px; background: #d4edda; border-radius: 4px; }
    .state-tabs { display: flex; gap: 4px; margin: 16px 0; border-bottom: 2px solid #ddd; flex-wrap: wrap; }
    .state-tab { padding: 8px 16px; cursor: pointer; border: 1px solid #ddd; border-bottom: none; background: #f5f5f5; border-radius: 4px 4px 0 0; }
    .state-tab.active { background: white; border-bottom: 2px solid white; margin-bottom: -2px; font-weight: bold; }
    .state-tab:hover { background: #e9e9e9; }
    .state-content { display: none; padding: 16px; background: white; border: 1px solid #ddd; border-radius: 0 4px 4px 4px; }
    .state-content.active { display: block; }
    .item-list { margin: 8px 0; }
    .item { background: white; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .item-header strong { font-size: 16px; }
    .param-row { display: flex; gap: 8px; margin: 4px 0; align-items: center; }
    .param-row label { margin: 0; font-weight: normal; width: 120px; }
    .param-row input, .param-row select { flex: 1; }
    .condition-row { display: flex; gap: 8px; margin: 4px 0; align-items: center; }
    .condition-row input { flex: 1; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
    [title] { cursor: help; }
    .tooltip { position: relative; }
    .tooltip:hover::after { content: attr(title); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 6px 10px; border-radius: 4px; font-size: 12px; white-space: nowrap; z-index: 1000; pointer-events: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Show Logic Designer</h1>
    <p><a href="/ui">← Back to Home</a> | <a href="/ui/rules">Rules Editor</a></p>

    <div id="error" class="error" style="display:none;"></div>
    <div id="success" class="success" style="display:none;"></div>

    <div class="header">
      <select id="loadExisting" style="width: 250px;" title="Load an existing show logic file to edit its configuration and states">
        <option value="">Load Existing Show...</option>
      </select>
      <button onclick="createNew()" title="Start creating a new show logic file from scratch with empty states">Create New Show</button>
      <button class="primary" onclick="saveShow()" title="Save the current show logic configuration to a JSON file matching the logic_id">Save Show</button>
      <button onclick="copyShow()" title="Duplicate the current show logic with a new logic_id for reuse">Copy Show</button>
      <span id="currentFile" style="margin-left: auto; color: #666;"></span>
    </div>

    <div class="section">
      <h2>Basic Configuration</h2>
      <div class="form-row">
        <div>
          <label title="Unique identifier for this show logic, used as the filename (logic_id.json)">Logic ID</label>
          <input type="text" id="logicId" required placeholder="e.g., my-show" title="Unique identifier for this show logic, used as the filename (logic_id.json)" />
        </div>
        <div>
          <label title="Human-readable display name for this show logic configuration">Name</label>
          <input type="text" id="name" required placeholder="Display name" title="Human-readable display name for this show logic configuration" />
        </div>
        <div>
          <label title="Optional deployable ID to restrict this show logic to a specific device, leave empty to allow multiple deployables">Deployable ID (optional)</label>
          <input type="text" id="deployableId" placeholder="Leave empty for multi-deployable" title="Optional deployable ID to restrict this show logic to a specific device, leave empty to allow multiple deployables" />
        </div>
        <div>
          <label title="Version number that auto-increments when saving the same logic_id">Version</label>
          <input type="number" id="version" value="1" min="1" title="Version number that auto-increments when saving the same logic_id" />
        </div>
      </div>
    </div>

    <div class="section">
      <h2 title="Define signals that this deployable will send to the server for rules engine evaluation">Signals</h2>
      <button onclick="addSignal()" title="Add a new signal definition that will be sent to the server when sensors trigger">+ Add Signal</button>
      <div id="signalsList" class="item-list"></div>
    </div>

    <div class="section">
      <h2 title="Define states that contain actions, timers, and sensor handlers for different show behaviors">States</h2>
      <button onclick="addState()" title="Add a new state that defines what happens when the global state matches this state name">+ Add State</button>
      <div id="statesContainer">
        <div class="state-tabs" id="stateTabs"></div>
        <div id="statesContent"></div>
      </div>
    </div>
  </div>

  <script>
    let showLogic = {
      logic_id: '',
      name: '',
      deployable_id: '',
      version: 1,
      signals: [],
      states: []
    };
    let existingStates = [];
    let assets = [];
    let hardwareRegistry = { video_outputs: [], audio_outputs: [], inputs: [], serial_devices: [] };
    let showLogicFiles = [];
    let currentLogicId = '';
    let activeStateTabIndex = 0;

    async function loadData() {
      try {
        [existingStates, assets, hardwareRegistry, showLogicFiles] = await Promise.all([
          fetch('/api/v1/states').then(r => r.json()),
          fetch('/api/v1/assets').then(r => r.json()),
          fetch('/api/v1/hardware-registry').then(r => r.json()),
          fetch('/api/v1/show-logic-files').then(r => r.json())
        ]);
        populateLoadDropdown();
      } catch (err) {
        showError('Failed to load data: ' + err.message);
      }
    }

    function populateLoadDropdown() {
      const select = document.getElementById('loadExisting');
      select.innerHTML = '<option value="">Load Existing Show...</option>';
      showLogicFiles.forEach(file => {
        const opt = document.createElement('option');
        opt.value = file.logic_id;
        opt.textContent = file.name + ' (' + file.logic_id + ')';
        select.appendChild(opt);
      });
    }

    document.getElementById('loadExisting').addEventListener('change', async (e) => {
      const logicId = e.target.value;
      if (!logicId) return;
      try {
        const resp = await fetch('/api/v1/show-logic/' + logicId);
        if (!resp.ok) throw new Error('Failed to load');
        showLogic = await resp.json();
        // Ensure arrays are initialized
        if (!showLogic.signals) showLogic.signals = [];
        if (!showLogic.states) showLogic.states = [];
        // Ensure each state has required arrays
        showLogic.states.forEach(state => {
          if (!state.on_enter) state.on_enter = [];
          if (!state.on_exit) state.on_exit = [];
          if (!state.sensor_handlers) state.sensor_handlers = [];
          if (!state.timer_handlers) state.timer_handlers = [];
          if (!state.timers) state.timers = [];
        });
        currentLogicId = logicId;
        populateForm();
        document.getElementById('currentFile').textContent = 'Editing: ' + logicId + '.json';
      } catch (err) {
        showError('Failed to load show logic: ' + err.message);
      }
    });

    function createNew() {
      showLogic = {
        logic_id: '',
        name: '',
        deployable_id: '',
        version: 1,
        signals: [],
        states: []
      };
      currentLogicId = '';
      populateForm();
      document.getElementById('currentFile').textContent = '';
    }

    function populateForm() {
      document.getElementById('logicId').value = showLogic.logic_id || '';
      document.getElementById('name').value = showLogic.name || '';
      document.getElementById('deployableId').value = showLogic.deployable_id || '';
      document.getElementById('version').value = showLogic.version || 1;
      renderSignals();
      renderStates();
    }

    function addSignal() {
      showLogic.signals.push({ name: '', type: 'string' });
      renderSignals();
    }

    function removeSignal(index) {
      showLogic.signals.splice(index, 1);
      renderSignals();
    }

    function renderSignals() {
      const container = document.getElementById('signalsList');
      if (!showLogic.signals || showLogic.signals.length === 0) {
        container.innerHTML = '<p style="color: #666;">No signals defined. Add signals that this deployable will send.</p>';
        return;
      }
      container.innerHTML = showLogic.signals.map((sig, idx) => 
        '<div class="item">' +
          '<div class="form-row">' +
            '<div><label>Signal Name</label><input type="text" value="' + (sig.name || '') + '" onchange="updateSignal(' + idx + ', \'name\', this.value)" placeholder="signal_name" /></div>' +
            '<div><label>Type</label><select onchange="updateSignal(' + idx + ', \'type\', this.value)">' +
              '<option value="bool"' + (sig.type === 'bool' ? ' selected' : '') + '>bool</option>' +
              '<option value="number"' + (sig.type === 'number' ? ' selected' : '') + '>number</option>' +
              '<option value="string"' + (sig.type === 'string' ? ' selected' : '') + '>string</option>' +
              '<option value="vector2"' + (sig.type === 'vector2' ? ' selected' : '') + '>vector2</option>' +
            '</select></div>' +
            '<div><label>&nbsp;</label><button class="danger" onclick="removeSignal(' + idx + ')">Remove</button></div>' +
          '</div>' +
        '</div>'
      ).join('');
    }

    function updateSignal(index, field, value) {
      if (!showLogic.signals[index]) return;
      showLogic.signals[index][field] = value;
    }

    function addState() {
      showLogic.states.push({
        name: '',
        on_enter: [],
        on_exit: [],
        sensor_handlers: [],
        timer_handlers: [],
        timers: []
      });
      // Switch to the newly added state tab
      activeStateTabIndex = showLogic.states.length - 1;
      renderStates();
    }

    function removeState(index) {
      if (!confirm('Remove state "' + (showLogic.states[index].name || 'unnamed') + '"?')) return;
      showLogic.states.splice(index, 1);
      // Adjust active tab index if needed
      if (activeStateTabIndex >= showLogic.states.length) {
        activeStateTabIndex = Math.max(0, showLogic.states.length - 1);
      } else if (activeStateTabIndex > index) {
        activeStateTabIndex--;
      }
      renderStates();
    }

    function renderStates() {
      const tabsContainer = document.getElementById('stateTabs');
      const contentContainer = document.getElementById('statesContent');
      
      // Preserve the currently active tab index
      const currentActiveTab = document.querySelector('.state-tab.active');
      if (currentActiveTab) {
        const tabs = Array.from(document.querySelectorAll('.state-tab'));
        const currentIndex = tabs.indexOf(currentActiveTab);
        if (currentIndex >= 0 && currentIndex < showLogic.states.length) {
          activeStateTabIndex = currentIndex;
        }
      }
      
      // Ensure activeStateTabIndex is valid
      if (activeStateTabIndex < 0 || activeStateTabIndex >= showLogic.states.length) {
        activeStateTabIndex = 0;
      }
      
      if (!showLogic.states || showLogic.states.length === 0) {
        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = '<p style="color: #666;">No states defined. Add a state to begin.</p>';
        activeStateTabIndex = 0;
        return;
      }

      tabsContainer.innerHTML = showLogic.states.map((state, idx) =>
        '<div class="state-tab' + (idx === activeStateTabIndex ? ' active' : '') + '" onclick="switchStateTab(' + idx + ')">' +
          (state.name || 'State ' + (idx + 1)) +
          '<button class="danger" style="margin-left: 8px; padding: 2px 8px; font-size: 12px;" onclick="event.stopPropagation(); removeState(' + idx + ')">×</button>' +
        '</div>'
      ).join('');

      contentContainer.innerHTML = showLogic.states.map((state, idx) =>
        '<div class="state-content' + (idx === activeStateTabIndex ? ' active' : '') + '" id="stateContent' + idx + '">' +
          renderStateContent(state, idx) +
        '</div>'
      ).join('');
    }

    function switchStateTab(index) {
      activeStateTabIndex = index;
      document.querySelectorAll('.state-tab').forEach((tab, idx) => {
        tab.classList.toggle('active', idx === index);
      });
      document.querySelectorAll('.state-content').forEach((content, idx) => {
        content.classList.toggle('active', idx === index);
      });
    }

    function renderStateContent(state, stateIndex) {
      return '<div class="section">' +
        '<h3>State Configuration</h3>' +
        '<div class="form-row">' +
          '<div style="flex: 2;"><label>State Name</label>' +
            '<div style="display: flex; gap: 8px; align-items: center;">' +
              '<input type="text" id="stateName' + stateIndex + '" value="' + (state.name || '') + '" ' +
                'onchange="updateStateName(' + stateIndex + ', this.value)" placeholder="Enter state name" ' +
                'style="flex: 1;" />' +
              '<select id="stateNameSuggest' + stateIndex + '" onchange="suggestStateName(' + stateIndex + ', this.value)" ' +
                'style="width: 200px;" title="Quick select from existing states">' +
                '<option value="">-- Quick Select --</option>' +
                existingStates.map(s => '<option value="' + s + '">' + s + '</option>').join('') +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
        renderActions('On Enter Actions', state.on_enter, stateIndex, 'on_enter') +
        renderActions('On Exit Actions', state.on_exit, stateIndex, 'on_exit') +
        renderTimers(state.timers, stateIndex) +
        renderTimerHandlers(state.timer_handlers, state.timers, stateIndex) +
        renderSensorHandlers(state.sensor_handlers, stateIndex) +
      '</div>';
    }

    function updateStateName(stateIndex, value) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].name = value || '';
      renderStates();
    }

    function suggestStateName(stateIndex, value) {
      if (!value) return;
      const input = document.getElementById('stateName' + stateIndex);
      if (input) {
        input.value = value;
        updateStateName(stateIndex, value);
      }
      // Reset the suggestion dropdown
      const select = document.getElementById('stateNameSuggest' + stateIndex);
      if (select) select.value = '';
    }

    function handleAssetSelect(stateIndex, actionType, actionIndex, paramKey, value, selectId, inputId) {
      const input = document.getElementById(inputId);
      if (value === '__custom__') {
        input.style.display = 'block';
        input.value = '';
        updateActionParam(stateIndex, actionType, actionIndex, paramKey, '');
      } else if (value) {
        input.style.display = 'none';
        updateActionParam(stateIndex, actionType, actionIndex, paramKey, value);
      } else {
        input.style.display = 'none';
        updateActionParam(stateIndex, actionType, actionIndex, paramKey, '');
      }
    }

    function handleTargetSelect(stateIndex, actionType, actionIndex, value, selectId, inputId) {
      const input = document.getElementById(inputId);
      if (value === '__custom__') {
        input.style.display = 'block';
        input.value = '';
        updateAction(stateIndex, actionType, actionIndex, 'target', '');
      } else if (value) {
        input.style.display = 'none';
        updateAction(stateIndex, actionType, actionIndex, 'target', value);
      } else {
        input.style.display = 'none';
        updateAction(stateIndex, actionType, actionIndex, 'target', '');
      }
    }


    function renderActions(title, actions, stateIndex, actionType, parentObj) {
      const isNested = actionType.includes('.');
      const actionsArray = actions || [];
      let titleTooltip = '';
      if (title.includes('On Enter')) {
        titleTooltip = 'Actions executed when this state becomes active, such as playing media or setting volume. You can add multiple actions to play different videos on different outputs simultaneously.';
      } else if (title.includes('On Exit')) {
        titleTooltip = 'Actions executed when leaving this state, typically cleanup like stopping media';
      } else {
        titleTooltip = 'Actions executed when triggered by timers or sensor handlers';
      }
      const videoActions = actionsArray.filter(a => a.action && (a.action.toLowerCase().includes('video') || a.action.toLowerCase().startsWith('media')));
      const hasMultipleVideoTargets = new Set(videoActions.map(a => a.target).filter(t => t)).size > 1;
      const infoText = hasMultipleVideoTargets ? '<p style="color: #28a745; font-size: 12px; margin: 4px 0;"><strong>✓ Multiple videos scheduled:</strong> Different videos will play simultaneously on different outputs.</p>' : '';
      return '<div style="margin: 16px 0;">' +
        '<h4 title="' + titleTooltip + '">' + title + '</h4>' +
        infoText +
        '<button onclick="' + (isNested ? 'addNestedAction' : 'addAction') + '(' + stateIndex + ', \'' + actionType + '\')" title="Add a new action to execute in this context. Add multiple play_video actions with different targets to schedule videos for different outputs simultaneously.">+ Add Action</button>' +
        '<div class="item-list">' +
          actionsArray.map((action, idx) => renderAction(action, stateIndex, actionType, idx)).join('') +
        '</div>' +
      '</div>';
    }

    function renderAction(action, stateIndex, actionType, actionIndex) {
      const actionTypes = [
        'play_video', 'stop_video', 'play_audio', 'stop_audio', 'stop_all',
        'set_volume', 'pause', 'resume', 'fade_volume', 'seek',
        'Change_State'
      ];
      const params = action.params || {};
      const actionTypeLower = (action.action || '').toLowerCase();
      const isVideoAction = actionTypeLower.includes('video');
      const isAudioAction = actionTypeLower.includes('audio');
      const isChangeState = actionTypeLower === 'change_state';
      
      let targetOptions = [];
      let targetPlaceholder = 'display-0, audio-0, etc.';
      let targetTitle = 'Hardware target device ID where this action will execute';
      
      if (isVideoAction) {
        targetOptions = hardwareRegistry.video_outputs || [];
        targetPlaceholder = 'Select video output...';
        targetTitle = 'Video output device ID from registered deployables';
      } else if (isAudioAction) {
        targetOptions = hardwareRegistry.audio_outputs || [];
        targetPlaceholder = 'Select audio output...';
        targetTitle = 'Audio output device ID from registered deployables';
      } else if (isChangeState) {
        targetPlaceholder = 'Not used for Change_State';
        targetTitle = 'Target is not used for Change_State action';
      } else {
        targetOptions = [...(hardwareRegistry.video_outputs || []), ...(hardwareRegistry.audio_outputs || [])];
        targetPlaceholder = 'Select hardware target...';
        targetTitle = 'Hardware target device ID from registered deployables';
      }
      
      const targetSelectId = 'targetSelect' + stateIndex + actionType + actionIndex;
      const targetInputId = 'targetInput' + stateIndex + actionType + actionIndex;
      const hasTargetValue = action.target && action.target !== '';
      const targetInOptions = targetOptions.includes(action.target);
      
      const actionLabel = isVideoAction ? 'Action (Video Output)' : isAudioAction ? 'Action (Audio Output)' : 'Action';
      const targetLabel = isVideoAction ? 'Target (Video Output)' : isAudioAction ? 'Target (Audio Output)' : 'Target';
      return '<div class="item" style="border-left: ' + (isVideoAction ? '3px solid #007bff' : isAudioAction ? '3px solid #28a745' : '3px solid #ddd') + '; padding-left: 12px;">' +
        '<div class="form-row">' +
          '<div><label title="Action type to execute: play media, control volume, change state, etc.">' + actionLabel + '</label><select onchange="updateAction(' + stateIndex + ', \'' + actionType + '\', ' + actionIndex + ', \'action\', this.value)" title="Action type to execute: play media, control volume, change state, etc.">' +
            actionTypes.map(a => '<option value="' + a + '"' + (a === action.action ? ' selected' : '') + '>' + a + '</option>').join('') +
          '</select></div>' +
          '<div><label title="' + targetTitle + (isVideoAction ? '. Add multiple play_video actions with different targets to schedule videos for different outputs simultaneously.' : '') + '">' + targetLabel + '</label>' +
            (targetOptions.length > 0 && !isChangeState ? 
              '<select id="' + targetSelectId + '" onchange="handleTargetSelect(' + stateIndex + ', \'' + actionType + '\', ' + actionIndex + ', this.value, \'' + targetSelectId + '\', \'' + targetInputId + '\')" title="' + targetTitle + '">' +
                '<option value="">-- Select ' + (isVideoAction ? 'Video' : isAudioAction ? 'Audio' : 'Hardware') + ' --</option>' +
                targetOptions.map(t => '<option value="' + t + '"' + (t === action.target ? ' selected' : '') + '>' + t + '</option>').join('') +
                '<option value="__custom__"' + (hasTargetValue && !targetInOptions ? ' selected' : '') + '>-- Custom --</option>' +
              '</select>' +
              '<input type="text" id="' + targetInputId + '" value="' + (hasTargetValue && !targetInOptions ? action.target : '') + '" ' +
                'onchange="updateAction(' + stateIndex + ', \'' + actionType + '\', ' + actionIndex + ', \'target\', this.value)" ' +
                'placeholder="' + targetPlaceholder + '" style="display: ' + (hasTargetValue && !targetInOptions ? 'block' : 'none') + '; margin-top: 4px;" title="' + targetTitle + '" />' :
              '<input type="text" value="' + (action.target || '') + '" onchange="updateAction(' + stateIndex + ', \'' + actionType + '\', ' + actionIndex + ', \'target\', this.value)" placeholder="' + targetPlaceholder + '" title="' + targetTitle + '" />'
            ) +
          '</div>' +
          '<div><label>&nbsp;</label><button class="danger" onclick="removeAction(' + stateIndex + ', \'' + actionType + '\', ' + actionIndex + ')" title="Remove this action from the list">Remove</button></div>' +
        '</div>' +
        renderActionParams(action.action, params, stateIndex, actionType, actionIndex) +
      '</div>';
    }

    function renderActionParams(actionType, params, stateIndex, actionTypeName, actionIndex) {
      let html = '<div style="margin-top: 8px; padding-left: 16px; border-left: 2px solid #ddd;">';
      html += '<strong>Parameters:</strong>';
      
      if (actionType === 'play_video' || actionType === 'play_audio') {
        const fileKey = 'file';
        html += '<div class="param-row">' +
          '<label>' + fileKey + ':</label>' +
          '<select id="assetSelect' + stateIndex + actionTypeName + actionIndex + fileKey + '" onchange="handleAssetSelect(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'' + fileKey + '\', this.value, \'assetSelect' + stateIndex + actionTypeName + actionIndex + fileKey + '\', \'customAsset' + stateIndex + actionTypeName + actionIndex + fileKey + '\')">' +
            '<option value="">-- Select Asset --</option>' +
            assets.map(a => '<option value="' + a + '"' + (params[fileKey] === a ? ' selected' : '') + '>' + a + '</option>').join('') +
            '<option value="__custom__"' + (params[fileKey] && !assets.includes(params[fileKey]) ? ' selected' : '') + '>-- Custom --</option>' +
          '</select>' +
          '<input type="text" id="customAsset' + stateIndex + actionTypeName + actionIndex + fileKey + '" value="' + (params[fileKey] && !assets.includes(params[fileKey]) ? params[fileKey] : '') + '" ' +
            'onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'' + fileKey + '\', this.value)" ' +
            'placeholder="Enter filename" style="display: ' + (params[fileKey] && !assets.includes(params[fileKey]) ? 'block' : 'none') + '; margin-top: 4px;" />' +
        '</div>';
        html += '<div class="param-row"><label>loop:</label><input type="checkbox" ' + (params.loop ? 'checked' : '') + ' onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'loop\', this.checked)" /></div>';
        if (actionType === 'play_audio') {
          html += '<div class="param-row"><label>volume:</label><input type="number" step="0.1" min="0" max="1" value="' + (params.volume || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'volume\', parseFloat(this.value))" /></div>';
        }
        html += '<div class="param-row"><label>fade_in_ms:</label><input type="number" value="' + (params.fade_in_ms || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'fade_in_ms\', parseInt(this.value))" /></div>';
        html += '<div class="param-row"><label>start_ms:</label><input type="number" value="' + (params.start_ms || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'start_ms\', parseInt(this.value))" /></div>';
      } else if (actionType === 'set_volume') {
        html += '<div class="param-row"><label>volume:</label><input type="number" step="0.1" min="0" max="1" value="' + (params.volume || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'volume\', parseFloat(this.value))" /></div>';
      } else if (actionType === 'fade_volume') {
        html += '<div class="param-row"><label>to/target:</label><input type="number" step="0.1" min="0" max="1" value="' + (params.to || params.target || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'to\', parseFloat(this.value))" /></div>';
        html += '<div class="param-row"><label>duration_ms:</label><input type="number" value="' + (params.duration_ms || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'duration_ms\', parseInt(this.value))" /></div>';
      } else if (actionType === 'seek') {
        html += '<div class="param-row"><label>position_ms/start_ms:</label><input type="number" value="' + (params.position_ms || params.start_ms || '') + '" onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'position_ms\', parseInt(this.value))" /></div>';
      } else if (actionType === 'Change_State') {
        // Combine existing states from all shows with states from current show logic
        const allStates = new Set(existingStates || []);
        if (showLogic && showLogic.states) {
          showLogic.states.forEach(state => {
            if (state.name) allStates.add(state.name);
          });
        }
        const statesArray = Array.from(allStates).sort();
        html += '<div class="param-row">' +
          '<label>State:</label>' +
          '<select onchange="updateActionParam(' + stateIndex + ', \'' + actionTypeName + '\', ' + actionIndex + ', \'state\', this.value)">' +
            '<option value="">-- Select State --</option>' +
            statesArray.map(s => '<option value="' + s + '"' + (params.state === s ? ' selected' : '') + '>' + s + '</option>').join('') +
          '</select>' +
        '</div>';
      }
      
      html += '</div>';
      return html;
    }

    function addAction(stateIndex, actionType) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex][actionType].push({
        action: 'play_video',
        target: '',
        params: {}
      });
      // Preserve the active tab when adding actions
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function addNestedAction(stateIndex, actionType) {
      const parts = actionType.split('.');
      let target = showLogic.states[stateIndex];
      // Navigate through the path, handling both property names and array indices
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const idx = parseInt(part);
        if (!isNaN(idx) && idx.toString() === part) {
          // It's a numeric index
          target = target[idx];
        } else {
          // It's a property name
          target = target[part];
        }
      }
      // Last part is the array name
      const arrayName = parts[parts.length - 1];
      if (!target[arrayName]) {
        target[arrayName] = [];
      }
      target[arrayName].push({
        action: 'play_video',
        target: '',
        params: {}
      });
      // Preserve the active tab when adding nested actions
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function updateAction(stateIndex, actionType, actionIndex, field, value) {
      if (actionType.includes('.')) {
        const parts = actionType.split('.');
        let target = showLogic.states[stateIndex];
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const idx = parseInt(part);
          if (!isNaN(idx) && idx.toString() === part) {
            target = target[idx];
          } else {
            target = target[part];
          }
        }
        const arrayName = parts[parts.length - 1];
        if (!target[arrayName] || !target[arrayName][actionIndex]) return;
        target[arrayName][actionIndex][field] = value;
        if (field === 'action') {
          target[arrayName][actionIndex].params = {};
        }
      } else {
        if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex][actionType][actionIndex]) return;
        showLogic.states[stateIndex][actionType][actionIndex][field] = value;
        if (field === 'action') {
          showLogic.states[stateIndex][actionType][actionIndex].params = {};
        }
      }
      renderStates();
    }

    function updateActionParam(stateIndex, actionType, actionIndex, paramKey, value) {
      let actionObj;
      if (actionType.includes('.')) {
        const parts = actionType.split('.');
        let target = showLogic.states[stateIndex];
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const idx = parseInt(part);
          if (!isNaN(idx) && idx.toString() === part) {
            target = target[idx];
          } else {
            target = target[part];
          }
        }
        const arrayName = parts[parts.length - 1];
        if (!target[arrayName] || !target[arrayName][actionIndex]) return;
        actionObj = target[arrayName][actionIndex];
      } else {
        if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex][actionType][actionIndex]) return;
        actionObj = showLogic.states[stateIndex][actionType][actionIndex];
      }
      if (!actionObj.params) {
        actionObj.params = {};
      }
      if (value === '' || value === null || value === undefined) {
        delete actionObj.params[paramKey];
      } else {
        actionObj.params[paramKey] = value;
      }
    }

    function removeAction(stateIndex, actionType, actionIndex) {
      if (actionType.includes('.')) {
        const parts = actionType.split('.');
        let target = showLogic.states[stateIndex];
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const idx = parseInt(part);
          if (!isNaN(idx) && idx.toString() === part) {
            target = target[idx];
          } else {
            target = target[part];
          }
        }
        const arrayName = parts[parts.length - 1];
        if (target[arrayName]) {
          target[arrayName].splice(actionIndex, 1);
        }
      } else {
        if (!showLogic.states[stateIndex]) return;
        showLogic.states[stateIndex][actionType].splice(actionIndex, 1);
      }
      // Preserve the active tab when removing actions
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function renderTimers(timers, stateIndex) {
      const timersArray = timers || [];
      return '<div style="margin: 16px 0;">' +
        '<h4 title="Local timers that start when this state becomes active and trigger handlers after delay, running entirely on the deployable device">Timers</h4>' +
        '<button onclick="addTimer(' + stateIndex + ')" title="Add a local timer that runs on the deployable and triggers after a delay when state becomes active">+ Add Timer</button>' +
        '<div class="item-list">' +
          timersArray.map((timer, idx) =>
            '<div class="item">' +
              '<div class="form-row">' +
                '<div><label title="Unique identifier for this local timer, referenced by timer handlers running on the deployable">Timer ID</label><input type="text" value="' + (timer.timer_id || '') + '" onchange="updateTimer(' + stateIndex + ', ' + idx + ', \'timer_id\', this.value)" placeholder="timer-1" title="Unique identifier for this local timer, referenced by timer handlers running on the deployable" /></div>' +
                '<div><label title="Delay in milliseconds before local timer fires after state becomes active on the deployable">Delay (ms)</label><input type="number" value="' + (timer.delay_ms || '') + '" onchange="updateTimer(' + stateIndex + ', ' + idx + ', \'delay_ms\', parseInt(this.value))" title="Delay in milliseconds before local timer fires after state becomes active on the deployable" /></div>' +
                '<div><label>&nbsp;</label><button class="danger" onclick="removeTimer(' + stateIndex + ', ' + idx + ')" title="Remove this local timer declaration">Remove</button></div>' +
              '</div>' +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
    }

    function addTimer(stateIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].timers.push({ timer_id: '', delay_ms: 0 });
      renderStates();
    }

    function updateTimer(stateIndex, timerIndex, field, value) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].timers[timerIndex]) return;
      showLogic.states[stateIndex].timers[timerIndex][field] = value;
    }

    function removeTimer(stateIndex, timerIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].timers.splice(timerIndex, 1);
      // Also remove timer handlers that reference this timer
      const timerId = showLogic.states[stateIndex].timers[timerIndex]?.timer_id;
      if (timerId) {
        showLogic.states[stateIndex].timer_handlers = showLogic.states[stateIndex].timer_handlers.filter(
          th => th.timer_id !== timerId
        );
      }
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function renderTimerHandlers(handlers, timers, stateIndex) {
      const timerIds = (timers || []).map(t => t && t.timer_id ? t.timer_id : '').filter(id => id);
      return '<div style="margin: 16px 0;">' +
        '<h4 title="Local handlers that execute actions when timers fire after their delay period, running entirely on the deployable device">Timer Handlers</h4>' +
        '<button onclick="addTimerHandler(' + stateIndex + ')" title="Add a local handler that executes actions when a timer fires on the deployable">+ Add Timer Handler</button>' +
        '<div class="item-list">' +
          handlers.map((handler, idx) =>
            '<div class="item">' +
              '<div class="form-row">' +
                '<div><label title="Select which local timer from this state triggers these actions on the deployable">Timer</label><select onchange="updateTimerHandler(' + stateIndex + ', ' + idx + ', \'timer_id\', this.value)" title="Select which local timer from this state triggers these actions on the deployable">' +
                  '<option value="">-- Select Timer --</option>' +
                  timerIds.map(id => '<option value="' + id + '"' + (id === handler.timer_id ? ' selected' : '') + '>' + id + '</option>').join('') +
                '</select></div>' +
                '<div><label>&nbsp;</label><button class="danger" onclick="removeTimerHandler(' + stateIndex + ', ' + idx + ')" title="Remove this local timer handler">Remove</button></div>' +
              '</div>' +
              renderActions('Actions', handler.actions || [], stateIndex, 'timer_handlers.' + idx + '.actions', handler) +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
    }

    function addTimerHandler(stateIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].timer_handlers.push({
        timer_id: '',
        actions: []
      });
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function updateTimerHandler(stateIndex, handlerIndex, field, value) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].timer_handlers[handlerIndex]) return;
      showLogic.states[stateIndex].timer_handlers[handlerIndex][field] = value;
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function removeTimerHandler(stateIndex, handlerIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].timer_handlers.splice(handlerIndex, 1);
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function renderSensorHandlers(handlers, stateIndex) {
      const handlersArray = handlers || [];
      return '<div style="margin: 16px 0;">' +
        '<h4 title="Local handlers that react to hardware sensor events on the deployable and execute actions, also auto-send signals to server">Sensor Handlers</h4>' +
        '<button onclick="addSensorHandler(' + stateIndex + ')" title="Add a local handler that reacts to sensor events on the deployable and executes actions">+ Add Sensor Handler</button>' +
        '<div class="item-list">' +
          handlersArray.map((handler, idx) =>
            '<div class="item">' +
              '<div class="form-row">' +
                '<div><label title="Hardware sensor ID on the deployable that triggers this local handler, also becomes signal name sent to server">Sensor ID</label><input type="text" value="' + (handler.sensor_id || '') + '" onchange="updateSensorHandler(' + stateIndex + ', ' + idx + ', \'sensor_id\', this.value)" placeholder="button-0" title="Hardware sensor ID on the deployable that triggers this local handler, also becomes signal name sent to server" /></div>' +
                '<div><label title="Event type filter for local sensor events: press, release, number, etc. (optional filter)">Event Type</label><input type="text" value="' + (handler.event_type || '') + '" onchange="updateSensorHandler(' + stateIndex + ', ' + idx + ', \'event_type\', this.value)" placeholder="press, release, etc." title="Event type filter for local sensor events: press, release, number, etc. (optional filter)" /></div>' +
                '<div><label>&nbsp;</label><button class="danger" onclick="removeSensorHandler(' + stateIndex + ', ' + idx + ')" title="Remove this local sensor handler">Remove</button></div>' +
              '</div>' +
              renderSensorConditions(handler.condition || {}, stateIndex, idx) +
              renderActions('Actions', handler.actions || [], stateIndex, 'sensor_handlers.' + idx + '.actions', handler) +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
    }

    function renderSensorConditions(condition, stateIndex, handlerIndex) {
      const conditions = Object.entries(condition || {});
      return '<div style="margin: 8px 0; padding-left: 16px; border-left: 2px solid #ddd;">' +
        '<strong title="Additional filters on local sensor event values that must match for handler to trigger on the deployable">Conditions:</strong>' +
        '<div class="item-list">' +
          conditions.map(([key, value], idx) =>
            '<div class="condition-row">' +
              '<input type="text" value="' + key + '" placeholder="Key" onchange="updateSensorConditionKey(' + stateIndex + ', ' + handlerIndex + ', ' + idx + ', this.value, \'' + key + '\')" title="Condition key to check in local sensor event value on the deployable" />' +
              '<input type="text" value="' + value + '" placeholder="Value" onchange="updateSensorConditionValue(' + stateIndex + ', ' + handlerIndex + ', \'' + key + '\', this.value)" title="Expected value that must match for local handler to trigger on the deployable" />' +
              '<button class="danger" onclick="removeSensorCondition(' + stateIndex + ', ' + handlerIndex + ', \'' + key + '\')" title="Remove this condition filter">Remove</button>' +
            '</div>'
          ).join('') +
        '</div>' +
        '<button onclick="addSensorCondition(' + stateIndex + ', ' + handlerIndex + ')" title="Add a condition filter that local sensor event values must match on the deployable">+ Add Condition</button>' +
      '</div>';
    }

    function addSensorHandler(stateIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].sensor_handlers.push({
        sensor_id: '',
        event_type: '',
        condition: {},
        actions: []
      });
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function updateSensorHandler(stateIndex, handlerIndex, field, value) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].sensor_handlers[handlerIndex]) return;
      showLogic.states[stateIndex].sensor_handlers[handlerIndex][field] = value;
    }

    function addSensorCondition(stateIndex, handlerIndex) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].sensor_handlers[handlerIndex]) return;
      if (!showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition) {
        showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition = {};
      }
      showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition['new_key'] = '';
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    function updateSensorConditionKey(stateIndex, handlerIndex, oldIdx, newKey, oldKey) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].sensor_handlers[handlerIndex]) return;
      const condition = showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition;
      if (oldKey !== newKey && condition[oldKey] !== undefined) {
        const value = condition[oldKey];
        delete condition[oldKey];
        condition[newKey] = value;
        const currentActive = activeStateTabIndex;
        renderStates();
        activeStateTabIndex = currentActive;
        switchStateTab(activeStateTabIndex);
      }
    }

    function updateSensorConditionValue(stateIndex, handlerIndex, key, value) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].sensor_handlers[handlerIndex]) return;
      if (!showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition) {
        showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition = {};
      }
      if (value === '' || value === null) {
        delete showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition[key];
      } else {
        showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition[key] = value;
      }
    }

    function removeSensorCondition(stateIndex, handlerIndex, key) {
      if (!showLogic.states[stateIndex] || !showLogic.states[stateIndex].sensor_handlers[handlerIndex]) return;
      if (showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition) {
        delete showLogic.states[stateIndex].sensor_handlers[handlerIndex].condition[key];
        const currentActive = activeStateTabIndex;
        renderStates();
        activeStateTabIndex = currentActive;
        switchStateTab(activeStateTabIndex);
      }
    }

    function removeSensorHandler(stateIndex, handlerIndex) {
      if (!showLogic.states[stateIndex]) return;
      showLogic.states[stateIndex].sensor_handlers.splice(handlerIndex, 1);
      const currentActive = activeStateTabIndex;
      renderStates();
      activeStateTabIndex = currentActive;
      switchStateTab(activeStateTabIndex);
    }

    async function saveShow() {
      hideMessages();
      
      // Collect form data
      const logicId = document.getElementById('logicId').value.trim();
      const name = document.getElementById('name').value.trim();
      const deployableId = document.getElementById('deployableId').value.trim();
      const version = parseInt(document.getElementById('version').value) || 1;

      // Validation
      if (!logicId) {
        showError('Logic ID is required');
        return;
      }
      if (!name) {
        showError('Name is required');
        return;
      }
      if (!showLogic.states || showLogic.states.length === 0) {
        showError('At least one state is required');
        return;
      }
      
      // Validate state names
      const stateNames = showLogic.states.map(s => s.name).filter(n => n);
      if (stateNames.length !== showLogic.states.length) {
        showError('All states must have a name');
        return;
      }
      const uniqueStates = new Set(stateNames);
      if (uniqueStates.size !== stateNames.length) {
        showError('State names must be unique');
        return;
      }

      // Validate timer handlers reference valid timers
      for (let i = 0; i < showLogic.states.length; i++) {
        const state = showLogic.states[i];
        if (!state.timers) state.timers = [];
        if (!state.timer_handlers) state.timer_handlers = [];
        const timerIds = (state.timers || []).map(t => t && t.timer_id ? t.timer_id : '').filter(id => id);
        for (const handler of (state.timer_handlers || [])) {
          if (handler && handler.timer_id && !timerIds.includes(handler.timer_id)) {
            showError('Timer handler references invalid timer: ' + handler.timer_id);
            return;
          }
        }
      }

      // Build show logic object
      const showLogicToSave = {
        logic_id: logicId,
        name: name,
        deployable_id: deployableId || null,
        version: version,
        signals: showLogic.signals.filter(s => s.name),
        states: showLogic.states
      };

      try {
        const isNew = !currentLogicId || currentLogicId !== logicId;
        const url = '/api/v1/show-logic' + (isNew ? '' : '/' + logicId);
        const method = isNew ? 'POST' : 'PUT';
        
        const resp = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(showLogicToSave)
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Save failed');
        }

        const saved = await resp.json();
        showLogic = saved;
        currentLogicId = logicId;
        populateForm();
        showSuccess('Show logic saved successfully! Version: ' + saved.version);
        document.getElementById('currentFile').textContent = 'Saved: ' + logicId + '.json';
        await loadData(); // Reload to update dropdown
      } catch (err) {
        showError('Failed to save show logic: ' + err.message);
      }
    }

    async function copyShow() {
      if (!currentLogicId) {
        showError('No show loaded to copy');
        return;
      }
      const newLogicId = prompt('Enter new Logic ID for copied show:');
      if (!newLogicId || newLogicId.trim() === '') {
        return;
      }
      if (newLogicId === currentLogicId) {
        showError('New Logic ID must be different from current');
        return;
      }
      try {
        const resp = await fetch('/api/v1/show-logic/' + currentLogicId + '/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_logic_id: newLogicId.trim() })
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Copy failed');
        }
        const copied = await resp.json();
        showLogic = copied;
        currentLogicId = newLogicId.trim();
        populateForm();
        showSuccess('Show logic copied successfully!');
        document.getElementById('currentFile').textContent = 'Copied to: ' + newLogicId.trim() + '.json';
        await loadData();
      } catch (err) {
        showError('Failed to copy show logic: ' + err.message);
      }
    }

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

func (s *Server) ShowDesignerUI(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(showDesignerHTML))
}
