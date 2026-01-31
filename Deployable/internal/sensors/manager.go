package sensors

import (
	"sync"

	"deployable/internal/types"
)

type Sensor interface {
	ID() string
	Type() string
	Capabilities() map[string]any
	Start(eventSink chan<- types.SensorEvent)
	Stop()
}

type Manager struct {
	mu       sync.Mutex
	sensors  []Sensor
	eventOut chan types.SensorEvent
	running  bool
}

func NewManager(eventOut chan types.SensorEvent) *Manager {
	return &Manager{eventOut: eventOut}
}

func (m *Manager) Add(sensor Sensor) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sensors = append(m.sensors, sensor)
	if m.running {
		sensor.Start(m.eventOut)
	}
}

func (m *Manager) Start() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.running = true
	for _, sensor := range m.sensors {
		sensor.Start(m.eventOut)
	}
}

func (m *Manager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.running = false
	for _, sensor := range m.sensors {
		sensor.Stop()
	}
}

func (m *Manager) Snapshot() []map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]map[string]any, 0, len(m.sensors))
	for _, sensor := range m.sensors {
		out = append(out, map[string]any{
			"id":           sensor.ID(),
			"type":         sensor.Type(),
			"capabilities": sensor.Capabilities(),
		})
	}
	return out
}

func (m *Manager) EventChannel() chan types.SensorEvent {
	return m.eventOut
}

