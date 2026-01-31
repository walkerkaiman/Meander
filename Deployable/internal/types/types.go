package types

import "time"

type LocalDevice struct {
	DeviceID  string    `json:"device_id"`
	FirstBoot time.Time `json:"first_boot"`
}

type LocalAssignment struct {
	ServerID string `json:"server_id"`

	RoleID string `json:"role_id"`

	ProfileID      string `json:"profile_id"`
	ProfileVersion int    `json:"profile_version"`

	ShowLogicID      string `json:"show_logic_id"`
	ShowLogicVersion int    `json:"show_logic_version"`
}

type CapabilityReport struct {
	VideoOutputs []string         `json:"video_outputs"`
	AudioOutputs []string         `json:"audio_outputs"`
	VideoInputs  []string         `json:"video_inputs"`
	AudioInputs  []string         `json:"audio_inputs"`
	SerialPorts  []string         `json:"serial_ports"`
	USBDevices   []string         `json:"usb_devices"`
	StatusLEDs   []string         `json:"status_leds"`
	VideoOutputDetails []OutputCapability `json:"video_output_details,omitempty"`
	AudioOutputDetails []OutputCapability `json:"audio_output_details,omitempty"`
	Metadata     map[string]any   `json:"metadata"`
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
	LogicID string      `json:"logic_id"`
	Version int         `json:"version"`
	States  []ShowState `json:"states"`
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
	TimerID string         `json:"timer_id"`
	Actions []ActionTemplate `json:"actions"`
}

type GlobalStateUpdate struct {
	State     string    `json:"state"`
	Version   int       `json:"version"`
	Timestamp time.Time `json:"timestamp"`
}

type TimerEvent struct {
	TimerID   string    `json:"timer_id"`
	Timestamp time.Time `json:"timestamp"`
}

type SensorEvent struct {
	DeviceID   string    `json:"device_id"`
	SensorID   string    `json:"sensor_id"`
	SensorType string    `json:"sensor_type"`
	EventType  string    `json:"event_type"`
	Value      any       `json:"value"`
	Timestamp  time.Time `json:"timestamp"`
}

type EngineAction struct {
	Action string         `json:"action"`
	Target string         `json:"target"`
	Params map[string]any `json:"params"`
}

