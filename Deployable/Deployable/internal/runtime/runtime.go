package runtime

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"path/filepath"
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

	serverIncoming chan server.Incoming
	serverOutgoing chan any

	lastState      types.GlobalStateUpdate
	lastConnected  time.Time
	supportedActions map[string]bool
}

type Config struct {
	DataDir         string
	AssetsDir       string
	AssetsSourceDir string
	AssetsSourceURL string
}

func NewRuntime(cfg Config) *Runtime {
	store := storage.New(cfg.DataDir, cfg.AssetsDir)
	actionsChan := make(chan types.EngineAction, 256)
	player := playback.NewManager()
	disp := actions.NewDispatcher(actionsChan, []actions.ActionExecutor{
		actions.PlayVideoExecutor{Player: player},
		actions.StopVideoExecutor{Player: player},
		actions.PlayAudioExecutor{Player: player},
		actions.StopAudioExecutor{Player: player},
		actions.SetVolumeExecutor{Player: player},
		actions.StopAllExecutor{Player: player},
	})
	engineInstance := engine.NewEngine()
	rt := &Runtime{
		store:   store,
		syncer:  &assets.Syncer{AssetsDir: cfg.AssetsDir, SourceDir: cfg.AssetsSourceDir, SourceURL: cfg.AssetsSourceURL},
		engine:  engineInstance,
		actions: actionsChan,
		sensors: sensors.NewManager(make(chan types.SensorEvent, 256)),
		player:  player,
		serverIncoming: make(chan server.Incoming, 32),
		serverOutgoing: make(chan any, 32),
		supportedActions: disp.SupportedActions(),
	}
	go disp.Run(make(chan struct{}))
	go rt.forwardActions()
	return rt
}

func (r *Runtime) Boot() error {
	if err := r.store.EnsureDirs(); err != nil {
		return err
	}
	device, err := r.store.LoadOrCreateDevice()
	if err != nil {
		return err
	}
	r.Device = device
	assignment, err := r.store.LoadAssignment()
	if err != nil {
		return err
	}
	r.Assignment = assignment
	if assignment.RoleID == "" {
		r.PairingCode = generatePairingCode()
	}
	caps, err := capabilities.Discover()
	if err != nil {
		return err
	}
	r.Capabilities = caps
	if assignment.RoleID != "" {
		if profile, err := r.store.LoadProfile(); err == nil {
			r.Profile = profile
		}
		if def, err := r.store.LoadShowLogic(); err == nil {
			r.ShowLogic = def
			if err := r.engine.Load(def); err == nil {
				r.engine.Start(r.lastState.State)
			}
		}
	}
	r.sensors.Start()
	go r.forwardSensorEvents()
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

func (r *Runtime) SetConnected(ts time.Time) {
	r.lastConnected = ts
}

func (r *Runtime) HandleServerMessage(msg server.Incoming) {
	switch payload := msg.Payload.(type) {
	case server.IdentifyMessage:
		supported := r.TriggerIdentify()
		r.serverOutgoing <- server.IdentifyAck{
			Type:      "identify_ack",
			DeviceID:  r.Device.DeviceID,
			Supported: supported,
		}
	case server.AssignRoleMessage:
		if err := r.handleAssign(payload); err != nil {
			r.serverOutgoing <- server.AssignRoleAck{
				Type:     "assign_role_ack",
				DeviceID: r.Device.DeviceID,
				RoleID:   payload.RoleID,
				Status:   "error",
				Error:    err.Error(),
			}
		} else {
			r.serverOutgoing <- server.AssignRoleAck{
				Type:     "assign_role_ack",
				DeviceID: r.Device.DeviceID,
				RoleID:   payload.RoleID,
				Status:   "ok",
			}
		}
	case server.StateUpdateMessage:
		update := types.GlobalStateUpdate{
			State:     payload.State,
			Version:   payload.Version,
			Timestamp: payload.Timestamp,
		}
		r.handleStateUpdate(update)
	}
}

func (r *Runtime) handleAssign(msg server.AssignRoleMessage) error {
	if err := validateProfile(msg.Profile, r.Capabilities); err != nil {
		return err
	}
	if err := r.store.SaveProfile(msg.Profile); err != nil {
		return err
	}
	if err := r.store.SaveShowLogic(msg.ShowLogic); err != nil {
		return err
	}
	if err := validateShowLogic(msg.ShowLogic, r.supportedActions); err != nil {
		return err
	}
	requiredAssets := requiredAssetsFromLogic(msg.ShowLogic)
	if err := r.syncer.EnsureAssets(requiredAssets); err != nil {
		return err
	}
	if err := r.syncer.CleanupAssets(requiredAssets); err != nil {
		return err
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
	r.Assignment = assignment
	r.Profile = msg.Profile
	r.ShowLogic = msg.ShowLogic

	r.engine.Stop()
	if err := r.engine.Load(msg.ShowLogic); err != nil {
		return err
	}
	r.engine.Start(r.lastState.State)
	return nil
}

func (r *Runtime) handleStateUpdate(update types.GlobalStateUpdate) {
	if update.Version <= r.lastState.Version {
		return
	}
	r.lastState = update
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

