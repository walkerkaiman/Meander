package runtime

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"deployable/internal/actions"
	"deployable/internal/assets"
	"deployable/internal/capabilities"
	"deployable/internal/engine"
	"deployable/internal/playback"
	"deployable/internal/sensors"
	"deployable/internal/server"
	"deployable/internal/storage"
	"deployable/internal/types"
)

type Runtime struct {
	Device      types.LocalDevice
	Assignment  types.LocalAssignment
	Profile     types.ExecutionProfile
	ShowLogic   types.ShowLogicDefinition
	Capabilities types.CapabilityReport
	PairingCode string

	store   *storage.Store
	syncer  *assets.Syncer
	engine  *engine.Engine
	actions chan types.EngineAction
	sensors *sensors.Manager
	player  *playback.Manager
	actionErrors chan actions.DispatchError

	serverIncoming chan server.Incoming
	serverOutgoing chan any

	lastState      types.GlobalStateUpdate
	lastConnected   time.Time
	supportedActions map[string]bool
	engineStarted  bool
	assetsCleanup  bool
}

type Config struct {
	DataDir         string
	AssetsDir       string
	AssetsSourceDir string
	AssetsSourceURL string
	PlaybackBackend string
	VLCPath         string
	AssetsCleanup  bool
	VLCDebug        bool
}

func NewRuntime(cfg Config) *Runtime {
	store := storage.New(cfg.DataDir, cfg.AssetsDir)
	actionsChan := make(chan types.EngineAction, 256)
	var backend playback.MediaBackend
	backend = playback.NewStubBackend()
	if cfg.PlaybackBackend == "vlc" {
		backend = playback.NewVLCCommandBackendWithDebug(cfg.VLCPath, cfg.VLCDebug)
	} else if cfg.PlaybackBackend == "libvlc" {
		backend = playback.NewVLCBackend()
	}
	player := playback.NewManager(cfg.AssetsDir, backend)
	actionErrors := make(chan actions.DispatchError, 32)
	disp := actions.NewDispatcher(actionsChan, []actions.ActionExecutor{
		actions.PlayVideoExecutor{Player: player},
		actions.StopVideoExecutor{Player: player},
		actions.PlayAudioExecutor{Player: player},
		actions.StopAudioExecutor{Player: player},
		actions.SetVolumeExecutor{Player: player},
		actions.StopAllExecutor{Player: player},
		actions.PauseExecutor{Player: player},
		actions.ResumeExecutor{Player: player},
		actions.FadeVolumeExecutor{Player: player},
		actions.SeekExecutor{Player: player},
		actions.MediaPlayExecutor{Player: player},
		actions.MediaStopExecutor{Player: player},
		actions.MediaPauseExecutor{Player: player},
		actions.MediaResumeExecutor{Player: player},
		actions.MediaSeekExecutor{Player: player},
		actions.MediaSetExecutor{Player: player},
		actions.MediaFadeExecutor{Player: player},
	}, actionErrors)
	engineInstance := engine.NewEngine()
	rt := &Runtime{
		store:   store,
		syncer:  &assets.Syncer{AssetsDir: cfg.AssetsDir, SourceDir: cfg.AssetsSourceDir, SourceURL: cfg.AssetsSourceURL},
		engine:  engineInstance,
		actions: actionsChan,
		sensors: sensors.NewManager(make(chan types.SensorEvent, 256)),
		player:  player,
		actionErrors: actionErrors,
		serverIncoming: make(chan server.Incoming, 32),
		serverOutgoing: make(chan any, 32),
		supportedActions: disp.SupportedActions(),
		assetsCleanup:  cfg.AssetsCleanup,
	}
	go disp.Run(make(chan struct{}))
	go rt.forwardActions()
	go rt.forwardActionErrors()
	return rt
}

func (r *Runtime) Boot() error {
	log.Printf("boot: starting deployable runtime")
	if err := r.store.EnsureDirs(); err != nil {
		return err
	}
	device, err := r.store.LoadOrCreateDevice()
	if err != nil {
		return err
	}
	r.Device = device
	log.Printf("boot: device id=%s", r.Device.DeviceID)
	assignment, err := r.store.LoadAssignment()
	if err != nil {
		return err
	}
	r.Assignment = assignment
	if assignment.RoleID == "" {
		r.PairingCode = generatePairingCode()
		log.Printf("boot: unassigned, pairing code=%s", r.PairingCode)
	} else {
		log.Printf("boot: assigned role=%s", assignment.RoleID)
	}
	caps, err := capabilities.Discover()
	if err != nil {
		return err
	}
	r.Capabilities = caps
	log.Printf("boot: capabilities video_outputs=%d audio_outputs=%d inputs=%d",
		len(caps.VideoOutputs), len(caps.AudioOutputs), len(caps.VideoInputs)+len(caps.AudioInputs),
	)
	outputs := buildOutputDevices(caps)
	if len(outputs) > 0 {
		r.player.ConfigureOutputDevices(outputs)
	} else {
		r.player.ConfigureOutputs(caps.VideoOutputs, caps.AudioOutputs)
	}
	if profile, err := r.store.LoadProfile(); err == nil {
		r.Profile = profile
		log.Printf("boot: loaded profile id=%s version=%d", profile.ProfileID, profile.Version)
	}
	if def, err := r.store.LoadShowLogic(); err == nil {
		r.ShowLogic = def
		log.Printf("boot: loaded show logic id=%s name=%s version=%d", def.LogicID, def.Name, def.Version)
		if err := r.engine.Load(def); err == nil && assignment.RoleID != "" {
			r.engine.Start(r.lastState.State)
			r.engineStarted = true
			log.Printf("boot: engine started with existing assignment")
		}
	}
	r.sensors.Start()
	go r.forwardSensorEvents()
	log.Printf("boot: complete")
	return nil
}

func (r *Runtime) ServerHello(agentVersion string) server.HelloMessage {
	return server.HelloMessage{
		Type:             "hello",
		DeviceID:         r.Device.DeviceID,
		Hostname:         server.Hostname(),
		IP:               server.LocalIP(),
		AgentVersion:     agentVersion,
		PairingCode:      r.PairingCode,
		AssignedRoleID:   r.Assignment.RoleID,
		ProfileVersion:   r.Assignment.ProfileVersion,
		ShowLogicVersion: r.Assignment.ShowLogicVersion,
		Capabilities:     r.Capabilities,
	}
}

func (r *Runtime) Incoming() chan<- server.Incoming {
	return r.serverIncoming
}

func (r *Runtime) Outgoing() <-chan any {
	return r.serverOutgoing
}

func (r *Runtime) IncomingChannel() <-chan server.Incoming {
	return r.serverIncoming
}

func (r *Runtime) StartOffline() {
	if r.ShowLogic.LogicID == "" || len(r.ShowLogic.States) == 0 {
		log.Printf("offline mode: no show logic loaded")
		return
	}
	if err := r.engine.Load(r.ShowLogic); err != nil {
		log.Printf("offline mode: show logic load failed: %v", err)
		return
	}
	if r.lastState.State == "" {
		r.lastState = types.GlobalStateUpdate{
			State:     r.ShowLogic.States[0].Name,
			Version:   1,
			Timestamp: time.Now().UTC(),
		}
	}
	r.engine.Start(r.lastState.State)
	r.engineStarted = true
	log.Printf("offline mode: started at state %s", r.lastState.State)
}

func (r *Runtime) ApplyDiagnosticShowLogic() error {
	if _, err := os.Stat(r.store.ShowLogicPath()); err == nil {
		log.Printf("diagnostic show logic: existing file found, skipping regeneration")
		return nil
	}
	def := buildDiagnosticShowLogic(r.Capabilities)
	if err := r.store.SaveShowLogic(def); err != nil {
		return err
	}
	r.ShowLogic = def
	if err := r.engine.Load(def); err != nil {
		return err
	}
	if r.engineStarted {
		r.engine.Stop()
		r.engine.Start(r.lastState.State)
	}
	log.Printf("diagnostic show logic generated with %d states", len(def.States))
	return nil
}

func (r *Runtime) SetConnected(ts time.Time) {
	r.lastConnected = ts
}

func (r *Runtime) HandleServerMessage(msg server.Incoming) {
	switch payload := msg.Payload.(type) {
	case server.IdentifyMessage:
		log.Printf("registration: identify requested")
		supported := r.TriggerIdentify()
		log.Printf("registration: identify supported=%t", supported)
		r.serverOutgoing <- server.IdentifyAck{
			Type:      "identify_ack",
			DeviceID:  r.Device.DeviceID,
			Supported: supported,
		}
	case server.AssignRoleMessage:
		log.Printf("registration: assign_role received role=%s profile=%s@%d logic=%s@%d",
			payload.RoleID, payload.Profile.ProfileID, payload.Profile.Version,
			payload.ShowLogic.LogicID, payload.ShowLogic.Version,
		)
		if err := r.handleAssign(payload); err != nil {
			log.Printf("registration: assign_role failed: %v", err)
			r.serverOutgoing <- server.AssignRoleAck{
				Type:     "assign_role_ack",
				DeviceID: r.Device.DeviceID,
				RoleID:   payload.RoleID,
				Status:   "error",
				Error:    err.Error(),
			}
		} else {
			log.Printf("registration: assign_role success, acking")
			r.serverOutgoing <- server.AssignRoleAck{
				Type:     "assign_role_ack",
				DeviceID: r.Device.DeviceID,
				RoleID:   payload.RoleID,
				Status:   "ok",
			}
		}
	case server.StateUpdateMessage:
		log.Printf("state: update received state=%s v=%d", payload.State, payload.Version)
		update := types.GlobalStateUpdate{
			State:     payload.State,
			Version:   payload.Version,
			Timestamp: payload.Timestamp,
		}
		r.handleStateUpdate(update)
	}
}

func (r *Runtime) handleAssign(msg server.AssignRoleMessage) error {
	log.Printf("registration: validating profile")
	if err := validateProfile(msg.Profile, r.Capabilities); err != nil {
		return err
	}
	log.Printf("registration: saving profile")
	if err := r.store.SaveProfile(msg.Profile); err != nil {
		return err
	}
	log.Printf("registration: saving show logic")
	if err := r.store.SaveShowLogic(msg.ShowLogic); err != nil {
		return err
	}
	log.Printf("registration: validating show logic")
	if err := validateShowLogic(msg.ShowLogic, r.supportedActions); err != nil {
		return err
	}
	requiredAssets := requiredAssetsFromLogic(msg.ShowLogic)
	log.Printf("registration: verifying assets count=%d", len(requiredAssets))
	if err := r.syncer.EnsureAssets(requiredAssets); err != nil {
		return err
	}
	if r.assetsCleanup {
		log.Printf("registration: cleaning up assets")
		if err := r.syncer.CleanupAssets(requiredAssets); err != nil {
			return err
		}
	} else {
		log.Printf("registration: assets cleanup disabled")
	}
	assignment := types.LocalAssignment{
		ServerID:         msg.ServerID,
		RoleID:           msg.RoleID,
		ProfileID:        msg.Profile.ProfileID,
		ProfileVersion:   msg.Profile.Version,
		ShowLogicID:      msg.ShowLogic.LogicID,
		ShowLogicVersion: msg.ShowLogic.Version,
	}
	if err := r.store.SaveAssignment(assignment); err != nil {
		return err
	}
	log.Printf("registration: saved assignment role=%s profile=%s@%d logic=%s@%d",
		assignment.RoleID, assignment.ProfileID, assignment.ProfileVersion,
		assignment.ShowLogicID, assignment.ShowLogicVersion,
	)
	r.Assignment = assignment
	r.Profile = msg.Profile
	r.ShowLogic = msg.ShowLogic
	r.PairingCode = ""

	log.Printf("registration: restarting engine with assigned logic")
	r.engine.Stop()
	r.engineStarted = false
	if err := r.engine.Load(msg.ShowLogic); err != nil {
		return err
	}
	r.engine.Start(r.lastState.State)
	r.engineStarted = true
	log.Printf("registration: complete")
	return nil
}

func (r *Runtime) handleStateUpdate(update types.GlobalStateUpdate) {
	if update.Version <= r.lastState.Version {
		log.Printf("state: update ignored (stale) current=%d incoming=%d", r.lastState.Version, update.Version)
		return
	}
	if !r.engineStarted && r.ShowLogic.LogicID != "" {
		log.Printf("state: engine start on first update state=%s", update.State)
		r.engine.Start(update.State)
		r.engineStarted = true
		r.lastState = update
		return
	}
	r.lastState = update
	log.Printf("state: apply update state=%s v=%d", update.State, update.Version)
	r.engine.OnGlobalState(update)
}

func (r *Runtime) forwardActions() {
	for action := range r.engine.Actions() {
		r.actions <- action
	}
}

func (r *Runtime) forwardSensorEvents() {
	for event := range r.sensors.EventChannel() {
		r.engine.OnSensorEvent(event)
		r.serverOutgoing <- server.SensorEventMessage{
			Type:        "sensor_event",
			SensorEvent: event,
		}
	}
}

func (r *Runtime) forwardActionErrors() {
	for failure := range r.actionErrors {
		r.serverOutgoing <- server.PlaybackErrorMessage{
			Type:      "playback_error",
			DeviceID:  r.Device.DeviceID,
			Action:    failure.Action,
			Error:     failure.Err.Error(),
			Timestamp: time.Now().UTC(),
		}
	}
}

func (r *Runtime) TriggerIdentify() bool {
	supported := len(r.Capabilities.VideoOutputs) > 0 || len(r.Capabilities.AudioOutputs) > 0 || len(r.Capabilities.StatusLEDs) > 0
	if supported {
		log.Printf("identify requested: flashing outputs")
	}
	return supported
}

func (r *Runtime) Status() map[string]any {
	return map[string]any{
		"device":       r.Device,
		"assignment":   r.Assignment,
		"profile":      r.Profile,
		"show_logic":   r.ShowLogic,
		"capabilities": r.Capabilities,
		"pairing_code": r.PairingCode,
		"last_state":   r.lastState,
		"last_connected": r.lastConnected,
		"outputs": map[string]any{
			"playback": r.player.Snapshot(),
		},
		"sensors": r.sensors.Snapshot(),
	}
}

func buildOutputDevices(caps types.CapabilityReport) []playback.OutputDevice {
	outputs := []playback.OutputDevice{}
	for _, item := range caps.VideoOutputDetails {
		outputs = append(outputs, playback.OutputDevice{
			ID:    item.ID,
			Name:  item.Name,
			Type:  item.Type,
		})
	}
	for _, item := range caps.AudioOutputDetails {
		outputs = append(outputs, playback.OutputDevice{
			ID:    item.ID,
			Name:  item.Name,
			Type:  item.Type,
		})
	}
	return outputs
}

func buildDiagnosticShowLogic(caps types.CapabilityReport) types.ShowLogicDefinition {
	videoTargets := []string{}
	audioTargets := []string{}
	for _, item := range caps.VideoOutputDetails {
		if item.ID != "" {
			videoTargets = append(videoTargets, item.ID)
		}
	}
	for _, item := range caps.AudioOutputDetails {
		if item.ID != "" {
			audioTargets = append(audioTargets, item.ID)
		}
	}
	if len(videoTargets) == 0 {
		for i := range caps.VideoOutputs {
			videoTargets = append(videoTargets, "display-"+strconv.Itoa(i))
		}
	}
	if len(audioTargets) == 0 {
		for i := range caps.AudioOutputs {
			audioTargets = append(audioTargets, "audio-"+strconv.Itoa(i))
		}
	}

	enterActions := []types.ActionTemplate{}
	exitActions := []types.ActionTemplate{}
	for _, target := range videoTargets {
		enterActions = append(enterActions, types.ActionTemplate{
			Action: "play_video",
			Target: target,
			Params: map[string]any{
				"file":       "diagnostic_video.mp4",
				"loop":       true,
				"fade_in_ms": 250,
			},
		})
		exitActions = append(exitActions, types.ActionTemplate{
			Action: "stop_video",
			Target: target,
			Params: map[string]any{},
		})
	}
	for _, target := range audioTargets {
		enterActions = append(enterActions, types.ActionTemplate{
			Action: "play_audio",
			Target: target,
			Params: map[string]any{
				"file":   "diagnostic_audio.mp3",
				"loop":   true,
				"volume": 0.8,
			},
		})
		exitActions = append(exitActions, types.ActionTemplate{
			Action: "stop_audio",
			Target: target,
			Params: map[string]any{},
		})
	}
	if len(enterActions) == 0 {
		enterActions = append(enterActions, types.ActionTemplate{
			Action: "stop_all",
			Target: "",
			Params: map[string]any{},
		})
	}

	return types.ShowLogicDefinition{
		LogicID:      "diagnostic",
		Name:         "Diagnostic",
		DeployableID: "diagnostic",
		Version:      1,
		States: []types.ShowState{
			{
				Name:       "diagnostic",
				OnEnter:    enterActions,
				OnExit:     exitActions,
				Timers:     []types.TimerDeclaration{},
				TimerHandlers:  []types.TimerHandler{},
				SensorHandlers: []types.SensorHandler{},
			},
			{
				Name: "idle",
				OnEnter: []types.ActionTemplate{
					{Action: "stop_all", Target: "", Params: map[string]any{}},
				},
				OnExit:         []types.ActionTemplate{},
				Timers:         []types.TimerDeclaration{},
				TimerHandlers:  []types.TimerHandler{},
				SensorHandlers: []types.SensorHandler{},
			},
		},
	}
}

func validateProfile(profile types.ExecutionProfile, caps types.CapabilityReport) error {
	if profile.ProfileID == "" {
		return errors.New("profile missing profile_id")
	}
	if profile.Version == 0 {
		return errors.New("profile missing version")
	}
	req, ok := profile.Requires["video_outputs"]
	if ok {
		if min, ok := req.(float64); ok && len(caps.VideoOutputs) < int(min) {
			return errors.New("profile requires video outputs")
		}
	}
	return nil
}

func validateShowLogic(def types.ShowLogicDefinition, supported map[string]bool) error {
	if def.LogicID == "" {
		return errors.New("show logic missing logic_id")
	}
	stateSet := map[string]bool{}
	for _, state := range def.States {
		if state.Name == "" {
			return errors.New("show state missing name")
		}
		if stateSet[state.Name] {
			return errors.New("duplicate state " + state.Name)
		}
		stateSet[state.Name] = true
		timerSet := map[string]bool{}
		for _, t := range state.Timers {
			if t.TimerID == "" {
				return errors.New("timer missing timer_id")
			}
			timerSet[t.TimerID] = true
		}
		for _, handler := range state.TimerHandlers {
			if !timerSet[handler.TimerID] {
				return errors.New("timer handler references unknown timer: " + handler.TimerID)
			}
		}
		for _, action := range gatherActions(state) {
			if action.Action == "" {
				return errors.New("action missing action name")
			}
			if !supported[action.Action] {
				return errors.New("unsupported action: " + action.Action)
			}
		}
	}
	return nil
}

func requiredAssetsFromLogic(def types.ShowLogicDefinition) []string {
	assets := map[string]bool{}
	for _, state := range def.States {
		for _, action := range gatherActions(state) {
			if file, ok := action.Params["file"].(string); ok && file != "" {
				assets[filepath.Clean(file)] = true
			}
		}
	}
	list := make([]string, 0, len(assets))
	for asset := range assets {
		list = append(list, asset)
	}
	return list
}

func gatherActions(state types.ShowState) []types.ActionTemplate {
	var actions []types.ActionTemplate
	actions = append(actions, state.OnEnter...)
	actions = append(actions, state.OnExit...)
	for _, handler := range state.SensorHandlers {
		actions = append(actions, handler.Actions...)
	}
	for _, handler := range state.TimerHandlers {
		actions = append(actions, handler.Actions...)
	}
	return actions
}

func generatePairingCode() string {
	var buf [4]byte
	_, _ = rand.Read(buf[:])
	code := int(buf[0])<<16 | int(buf[1])<<8 | int(buf[2])
	code = code % 1000000
	return fmt.Sprintf("%06d", code)
}

