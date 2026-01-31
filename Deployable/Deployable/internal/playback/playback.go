package playback

import (
	"errors"
	"log"
	"sync"
)

type Manager struct {
	mu          sync.Mutex
	videoActive map[string]map[string]any
	audioActive map[string]map[string]any
	volume      map[string]float64
}

func NewManager() *Manager {
	return &Manager{
		videoActive: make(map[string]map[string]any),
		audioActive: make(map[string]map[string]any),
		volume:      make(map[string]float64),
	}
}

func (m *Manager) PlayVideo(target string, params map[string]any) error {
	file, ok := params["file"].(string)
	if !ok || file == "" {
		return errors.New("play_video requires params.file")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.videoActive[target] = params
	log.Printf("play_video target=%s file=%s", target, file)
	return nil
}

func (m *Manager) StopVideo(target string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.videoActive, target)
	log.Printf("stop_video target=%s", target)
	return nil
}

func (m *Manager) PlayAudio(target string, params map[string]any) error {
	file, ok := params["file"].(string)
	if !ok || file == "" {
		return errors.New("play_audio requires params.file")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.audioActive[target] = params
	log.Printf("play_audio target=%s file=%s", target, file)
	return nil
}

func (m *Manager) StopAudio(target string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.audioActive, target)
	log.Printf("stop_audio target=%s", target)
	return nil
}

func (m *Manager) SetVolume(target string, params map[string]any) error {
	value, ok := params["value"].(float64)
	if !ok {
		if i, ok := params["value"].(int); ok {
			value = float64(i)
		} else {
			return errors.New("set_volume requires params.value")
		}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.volume[target] = value
	log.Printf("set_volume target=%s value=%.2f", target, value)
	return nil
}

func (m *Manager) StopAll() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.videoActive = make(map[string]map[string]any)
	m.audioActive = make(map[string]map[string]any)
	log.Printf("stop_all")
	return nil
}

func (m *Manager) Snapshot() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	return map[string]any{
		"video_active": m.videoActive,
		"audio_active": m.audioActive,
		"volume":       m.volume,
	}
}

