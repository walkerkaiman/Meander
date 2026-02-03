package models

import (
	"encoding/json"
	"time"
)

// ---------- Registration ----------

type RegisterDeployableRequest struct {
	DeployableID string         `json:"deployable_id"`
	Hostname     string         `json:"hostname"`
	Capabilities DeployableCaps `json:"capabilities"`
	AgentVersion string         `json:"agent_version"`
}

type DeployableCaps struct {
	VideoOutputs  []OutputPort `json:"video_outputs"`
	AudioOutputs  []OutputPort `json:"audio_outputs"`
	Inputs        []InputPort  `json:"inputs"`
	SerialDevices []string     `json:"serial_devices"`
	HasDisplay    bool         `json:"has_display"`
	HasAudio      bool         `json:"has_audio"`
}

type OutputPort struct {
	ID   string `json:"id"`
	Type string `json:"type,omitempty"`
}

type InputPort struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

// ---------- Registration response ----------

type RegisterDeployableResponse struct {
	Known        bool   `json:"known"`
	AssignedLogicID string `json:"assigned_logic_id"`
	NeedsAssign  bool   `json:"needs_assignment"`
	Message      string `json:"message"`
}

// ---------- Show logic package ----------

type ShowLogicPackage struct {
	PackageID             string          `json:"package_id"`
	LogicID               string          `json:"logic_id"`
	LogicVersion          string          `json:"logic_version"`
	EngineContractVersion string          `json:"engine_contract_version"`
	ShowLogic             json.RawMessage `json:"show_logic"`
	ReferencedAssets      []string        `json:"referenced_assets"`
}

// ---------- Deployable ACK ----------

type DeployableAckRequest struct {
	DeployableID   string `json:"deployable_id"`
	PackageID      string `json:"package_id"`
	LogicVerified  bool   `json:"logic_verified"`
	AssetsVerified bool   `json:"assets_verified"`
}

// ---------- Event ingestion ----------

type SignalsIngestRequest struct {
	DeployableID string         `json:"deployable_id"`
	Timestamp    int64          `json:"timestamp"`
	Signals      map[string]any `json:"signals"`
}

// ---------- Deployable registry view ----------

type DeployableRecord struct {
	DeployableID string         `json:"deployable_id"`
	AssignedLogicID string      `json:"assigned_logic_id"`
	Status       string         `json:"status"`
	LastSeen     time.Time      `json:"last_seen"`
	Capabilities DeployableCaps `json:"capabilities"`
}

// ---------- Role update ----------

type UpdateDeployableRequest struct {
	AssignedLogicID string `json:"assigned_logic_id"`
}

// ---------- State broadcast ----------

type GlobalState struct {
	State     string                 `json:"state"`
	Variables map[string]interface{} `json:"variables"`
	Timestamp time.Time              `json:"timestamp"`
	Version   int                    `json:"version"`
}

// ---------- Manual state override ----------

type StateOverrideRequest struct {
	State     string                 `json:"state"`
	Variables map[string]interface{} `json:"variables"`
}

// ---------- Deployable registration (WS) ----------

type DeployableHello struct {
	Type             string           `json:"type"`
	DeviceID         string           `json:"device_id"`
	Hostname         string           `json:"hostname"`
	IP               string           `json:"ip"`
	AgentVersion     string           `json:"agent_version"`
	PairingCode      string           `json:"pairing_code,omitempty"`
	AssignedLogicID  string           `json:"assigned_logic_id,omitempty"`
	ProfileVersion   int              `json:"assigned_profile_version,omitempty"`
	ShowLogicVersion int              `json:"assigned_show_logic_version,omitempty"`
	Capabilities     CapabilityReport `json:"capabilities"`
}

type CapabilityReport struct {
	VideoOutputs       []string           `json:"video_outputs"`
	AudioOutputs       []string           `json:"audio_outputs"`
	VideoInputs        []string           `json:"video_inputs"`
	AudioInputs        []string           `json:"audio_inputs"`
	SerialPorts        []string           `json:"serial_ports"`
	USBDevices         []string           `json:"usb_devices"`
	StatusLEDs         []string           `json:"status_leds"`
	VideoOutputDetails []OutputCapability `json:"video_output_details,omitempty"`
	AudioOutputDetails []OutputCapability `json:"audio_output_details,omitempty"`
	Metadata           map[string]any     `json:"metadata"`
}

type OutputCapability struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Type  string `json:"type"`
	Index int    `json:"index"`
}

type ExecutionProfile struct {
	ProfileID string         `json:"profile_id"`
	Version   int            `json:"version"`
	Requires  map[string]any `json:"requires"`
}

type ShowLogicDefinition struct {
	LogicID      string             `json:"logic_id"`
	Name         string             `json:"name"`
	DeployableID string             `json:"deployable_id"`
	Version      int                `json:"version"`
	Signals      []SignalDefinition `json:"signals,omitempty"`
	States       []ShowState        `json:"states"`
}

type ShowState struct {
	Name string `json:"name"`

	OnEnter []ActionTemplate `json:"on_enter"`
	OnExit  []ActionTemplate `json:"on_exit"`

	SensorHandlers []SensorHandler `json:"sensor_handlers"`
	TimerHandlers  []TimerHandler  `json:"timer_handlers"`

	Timers []TimerDeclaration `json:"timers"`
}

type ActionTemplate struct {
	Action string         `json:"action"`
	Target string         `json:"target"`
	Params map[string]any `json:"params"`
}

type TimerDeclaration struct {
	TimerID string `json:"timer_id"`
	DelayMs int    `json:"delay_ms"`
}

type SensorHandler struct {
	SensorID  string           `json:"sensor_id"`
	EventType string           `json:"event_type"`
	Condition map[string]any   `json:"condition"`
	Actions   []ActionTemplate `json:"actions"`
}

type TimerHandler struct {
	TimerID string           `json:"timer_id"`
	Actions []ActionTemplate `json:"actions"`
}

type AssignRoleMessage struct {
	Type      string              `json:"type"`
	LogicID   string              `json:"logic_id"`
	ServerID  string              `json:"server_id"`
	Profile   ExecutionProfile    `json:"profile"`
	ShowLogic ShowLogicDefinition `json:"show_logic"`
	Name      string              `json:"name,omitempty"`
}

type AssignRoleAck struct {
	Type     string `json:"type"`
	DeviceID string `json:"device_id"`
	LogicID  string `json:"logic_id"`
	Status   string `json:"status"`
	Error    string `json:"error,omitempty"`
}

type DeployableAssignRequest struct {
	Name          string              `json:"name"`
	LogicID       string              `json:"logic_id"`
	Tags          []string            `json:"tags,omitempty"`
	Profile       ExecutionProfile    `json:"profile"`
	ShowLogic     ShowLogicDefinition `json:"show_logic"`
	ShowLogicFile string              `json:"show_logic_file"`
}

// ---------- Rules ----------

type SignalValueType string

const (
	SignalBool    SignalValueType = "bool"
	SignalNumber  SignalValueType = "number"
	SignalVector2 SignalValueType = "vector2"
	SignalString  SignalValueType = "string"
)

type SignalValue struct {
	Type  SignalValueType `json:"type"`
	Value any             `json:"value"`
}

type SignalDefinition struct {
	Name string          `json:"name"`
	Type SignalValueType `json:"type"`
}

type DeployableContext struct {
	DeployableID string   `json:"deployable_id"`
	LogicID      string   `json:"logic_id"`
	Tags         []string `json:"tags"`
}

func (c *DeployableContext) UnmarshalJSON(data []byte) error {
	type alias DeployableContext
	var raw struct {
		alias
		Role string `json:"role"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	*c = DeployableContext(raw.alias)
	if c.LogicID == "" {
		c.LogicID = raw.Role
	}
	return nil
}

type Event struct {
	DeployableID string                 `json:"deployable_id"`
	LogicID      string                 `json:"logic_id"`
	Tags         []string               `json:"tags"`
	Timestamp    time.Time              `json:"timestamp"`
	Signals      map[string]SignalValue `json:"signals"`
}

type Rule struct {
	ID      string         `json:"id"`
	Enabled bool           `json:"enabled"`
	When    ConditionGroup `json:"when"`
	Then    Action         `json:"then"`
	Timing  *Timing        `json:"timing,omitempty"`
}

type ConditionGroup struct {
	All []Condition `json:"all,omitempty"`
	Any []Condition `json:"any,omitempty"`
}

type Condition struct {
	Source  *SourceSelector `json:"source,omitempty"`
	Signal  string          `json:"signal,omitempty"`
	Op      string          `json:"op,omitempty"`
	Value   any             `json:"value,omitempty"`
	StateIs *string         `json:"state_is,omitempty"`
}

type SourceSelector struct {
	Tags         []string `json:"tags,omitempty"`
	LogicIDs     []string `json:"logic_ids,omitempty"`
	DeployableIDs []string `json:"deployable_ids,omitempty"`
}

func (s *SourceSelector) UnmarshalJSON(data []byte) error {
	type alias SourceSelector
	var raw struct {
		alias
		Roles []string `json:"roles,omitempty"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	*s = SourceSelector(raw.alias)
	if len(s.LogicIDs) == 0 {
		s.LogicIDs = raw.Roles
	}
	return nil
}

type Timing struct {
	CooldownMS int64 `json:"cooldown_ms"`
}

type Action struct {
	SetState string `json:"set_state"`
}

type State struct {
	Name string `json:"name"`
}
