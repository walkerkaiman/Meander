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
	AssignedRole string `json:"assigned_role"`
	NeedsAssign  bool   `json:"needs_assignment"`
	Message      string `json:"message"`
}

// ---------- Show logic package ----------

type ShowLogicPackage struct {
	PackageID             string          `json:"package_id"`
	Role                  string          `json:"role"`
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

type InputEvent struct {
	DeployableID string      `json:"deployable_id"`
	Timestamp    time.Time   `json:"timestamp"`
	InputID      string      `json:"input_id"`
	EventType    string      `json:"event_type"`
	Value        interface{} `json:"value"`
}

// ---------- Deployable registry view ----------

type DeployableRecord struct {
	DeployableID string         `json:"deployable_id"`
	AssignedRole string         `json:"assigned_role"`
	Status       string         `json:"status"`
	LastSeen     time.Time      `json:"last_seen"`
	Capabilities DeployableCaps `json:"capabilities"`
}

// ---------- Role update ----------

type UpdateDeployableRequest struct {
	AssignedRole string `json:"assigned_role"`
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
	AssignedRoleID   string           `json:"assigned_role_id,omitempty"`
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
	LogicID      string      `json:"logic_id"`
	Name         string      `json:"name"`
	DeployableID string      `json:"deployable_id"`
	Version      int         `json:"version"`
	States       []ShowState `json:"states"`
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
	SensorID  string         `json:"sensor_id"`
	EventType string         `json:"event_type"`
	Condition map[string]any `json:"condition"`
	Actions   []ActionTemplate `json:"actions"`
}

type TimerHandler struct {
	TimerID string           `json:"timer_id"`
	Actions []ActionTemplate `json:"actions"`
}

type AssignRoleMessage struct {
	Type      string           `json:"type"`
	RoleID    string           `json:"role_id"`
	ServerID  string           `json:"server_id"`
	Profile   ExecutionProfile `json:"profile"`
	ShowLogic ShowLogicDefinition `json:"show_logic"`
	Name      string           `json:"name,omitempty"`
	Location  string           `json:"location,omitempty"`
}

type AssignRoleAck struct {
	Type     string `json:"type"`
	DeviceID string `json:"device_id"`
	RoleID   string `json:"role_id"`
	Status   string `json:"status"`
	Error    string `json:"error,omitempty"`
}

type DeployableAssignRequest struct {
	Name          string              `json:"name"`
	Location      string              `json:"location"`
	RoleID        string              `json:"role_id"`
	Profile       ExecutionProfile    `json:"profile"`
	ShowLogic     ShowLogicDefinition `json:"show_logic"`
	ShowLogicFile string              `json:"show_logic_file"`
}

// ---------- Rules ----------

type Rule struct {
	RuleID string   `json:"rule_id"`
	When   RuleWhen `json:"when"`
	Then   RuleThen `json:"then"`
}

type RuleWhen struct {
	State      string          `json:"state"`
	Conditions []RuleCondition `json:"conditions"`
}

type RuleCondition struct {
	Field string      `json:"field"`
	Op    string      `json:"op"`
	Value interface{} `json:"value"`
}

type RuleThen struct {
	SetState     string                 `json:"set_state"`
	SetVariables map[string]interface{} `json:"set_variables"`
}
