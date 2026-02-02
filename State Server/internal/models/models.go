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
