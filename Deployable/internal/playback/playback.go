package playback

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

type PlaybackService interface {
	ListOutputs() []OutputDevice
	Play(outputID string, req PlayRequest) error
	Stop(outputID string) error
	Pause(outputID string) error
	Resume(outputID string) error
	SetVolume(outputID string, volume float64) error
	FadeVolume(outputID string, target float64, durationMs int) error
	Seek(outputID string, positionMs int) error
	Snapshot() map[string]any
}

type OutputDevice struct {
	ID   string
	Name string
	Type string
}

type PlayRequest struct {
	AssetPath string
	Loop      bool
	StartMs   int
	Volume    *float64
	FadeInMs  int
}

type MediaBackend interface {
	Open(assetPath string, output OutputDevice) (BackendInstance, error)
}

type BackendInstance interface {
	Play() error
	Stop() error
	Pause() error
	Resume() error
	Seek(ms int) error
	SetVolume(vol float64) error
	SetLoop(loop bool) error
	Close() error
}

type Manager struct {
	mu        sync.Mutex
	assetsDir string
	backend   MediaBackend
	outputs   map[string]OutputDevice
	channels  map[string]*channel
	aliases   map[string]string
}

func NewManager(assetsDir string, backend MediaBackend) *Manager {
	return &Manager{
		assetsDir: assetsDir,
		backend:   backend,
		outputs:   make(map[string]OutputDevice),
		channels:  make(map[string]*channel),
		aliases:   make(map[string]string),
	}
}

func (m *Manager) ConfigureOutputs(videoOutputs, audioOutputs []string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.aliases = make(map[string]string)
	for _, name := range videoOutputs {
		id := normalizeID(name, "video")
		m.outputs[id] = OutputDevice{ID: id, Name: name, Type: "video"}
		if _, ok := m.channels[id]; !ok {
			m.channels[id] = newChannel(m.backend, m.assetsDir, m.outputs[id])
		}
	}
	for _, name := range audioOutputs {
		id := normalizeID(name, "audio")
		m.outputs[id] = OutputDevice{ID: id, Name: name, Type: "audio"}
		if _, ok := m.channels[id]; !ok {
			m.channels[id] = newChannel(m.backend, m.assetsDir, m.outputs[id])
		}
	}
}

func (m *Manager) ConfigureOutputDevices(outputs []OutputDevice) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.aliases = make(map[string]string)
	for _, output := range outputs {
		if output.ID == "" {
			output.ID = normalizeID(output.Name, output.Type)
		}
		m.outputs[output.ID] = output
		if _, ok := m.channels[output.ID]; !ok {
			m.channels[output.ID] = newChannel(m.backend, m.assetsDir, output)
		}
	}
}

func (m *Manager) ListOutputs() []OutputDevice {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]OutputDevice, 0, len(m.outputs))
	for _, output := range m.outputs {
		out = append(out, output)
	}
	return out
}

func (m *Manager) Play(outputID string, req PlayRequest) error {
	return m.dispatch(outputID, &playCmd{req: req})
}

func (m *Manager) Stop(outputID string) error {
	return m.dispatch(outputID, &stopCmd{})
}

func (m *Manager) Pause(outputID string) error {
	return m.dispatch(outputID, &pauseCmd{})
}

func (m *Manager) Resume(outputID string) error {
	return m.dispatch(outputID, &resumeCmd{})
}

func (m *Manager) SetVolume(outputID string, volume float64) error {
	return m.dispatch(outputID, &setVolumeCmd{volume: volume})
}

func (m *Manager) FadeVolume(outputID string, target float64, durationMs int) error {
	return m.dispatch(outputID, &fadeVolumeCmd{target: target, durationMs: durationMs})
}

func (m *Manager) Seek(outputID string, positionMs int) error {
	return m.dispatch(outputID, &seekCmd{positionMs: positionMs})
}

func (m *Manager) Snapshot() map[string]any {
	m.mu.Lock()
	defer m.mu.Unlock()
	channels := map[string]any{}
	for id, ch := range m.channels {
		channels[id] = ch.snapshot()
	}
	return map[string]any{
		"outputs":  m.outputs,
		"channels": channels,
	}
}

func (m *Manager) dispatch(outputID string, cmd command) error {
	m.mu.Lock()
	resolved, ok := m.resolveOutputLocked(outputID)
	var ch *channel
	if ok {
		ch = m.channels[resolved]
	}
	m.mu.Unlock()
	if !ok || ch == nil {
		return fmt.Errorf("output not found: %s", outputID)
	}
	resp := make(chan error, 1)
	cmd.setResponse(resp)
	ch.commands <- cmd
	return <-resp
}

func (m *Manager) resolveOutputLocked(target string) (string, bool) {
	if target == "" {
		return "", false
	}
	if output, ok := m.outputs[target]; ok {
		return output.ID, true
	}
	if resolved, ok := m.aliases[target]; ok {
		return resolved, true
	}
	lower := strings.ToLower(strings.TrimSpace(target))
	if strings.HasPrefix(lower, "hdmi") || strings.HasPrefix(lower, "display") {
		if idx, ok := parseIndexedSuffix(lower); ok {
			id := "display-" + strconv.Itoa(idx)
			if output, ok := m.outputs[id]; ok {
				m.aliases[target] = output.ID
				return output.ID, true
			}
		}
	}
	if strings.HasPrefix(lower, "audio") {
		if idx, ok := parseIndexedSuffix(lower); ok {
			id := "audio-" + strconv.Itoa(idx)
			if output, ok := m.outputs[id]; ok {
				m.aliases[target] = output.ID
				return output.ID, true
			}
		}
	}
	for _, output := range m.outputs {
		if strings.ToLower(output.Name) == lower {
			m.aliases[target] = output.ID
			return output.ID, true
		}
	}
	return "", false
}

func parseIndexedSuffix(value string) (int, bool) {
	for i := len(value) - 1; i >= 0; i-- {
		if value[i] < '0' || value[i] > '9' {
			if i == len(value)-1 {
				return 0, false
			}
			idx, err := strconv.Atoi(value[i+1:])
			if err != nil {
				return 0, false
			}
			return idx, true
		}
	}
	idx, err := strconv.Atoi(value)
	if err != nil {
		return 0, false
	}
	return idx, true
}

type command interface {
	setResponse(chan<- error)
}

type playCmd struct {
	req  PlayRequest
	resp chan<- error
}

func (c *playCmd) setResponse(resp chan<- error) { c.resp = resp }

type stopCmd struct{ resp chan<- error }
func (c *stopCmd) setResponse(resp chan<- error) { c.resp = resp }

type pauseCmd struct{ resp chan<- error }
func (c *pauseCmd) setResponse(resp chan<- error) { c.resp = resp }

type resumeCmd struct{ resp chan<- error }
func (c *resumeCmd) setResponse(resp chan<- error) { c.resp = resp }

type setVolumeCmd struct {
	volume float64
	resp   chan<- error
}
func (c *setVolumeCmd) setResponse(resp chan<- error) { c.resp = resp }

type fadeVolumeCmd struct {
	target     float64
	durationMs int
	resp       chan<- error
}
func (c *fadeVolumeCmd) setResponse(resp chan<- error) { c.resp = resp }

type seekCmd struct {
	positionMs int
	resp       chan<- error
}
func (c *seekCmd) setResponse(resp chan<- error) { c.resp = resp }

type channel struct {
	output    OutputDevice
	backend   MediaBackend
	assetsDir string
	commands  chan command
	instance  BackendInstance
	volume    float64
	fadeCancel chan struct{}
	mu        sync.Mutex
}

func newChannel(backend MediaBackend, assetsDir string, output OutputDevice) *channel {
	ch := &channel{
		output:    output,
		backend:   backend,
		assetsDir: assetsDir,
		commands:  make(chan command, 16),
		volume:    1.0,
	}
	go ch.run()
	return ch
}

func (c *channel) run() {
	for cmd := range c.commands {
		switch req := cmd.(type) {
		case *playCmd:
			req.resp <- c.handlePlay(req.req)
		case *stopCmd:
			req.resp <- c.handleStop()
		case *pauseCmd:
			req.resp <- c.handlePause()
		case *resumeCmd:
			req.resp <- c.handleResume()
		case *setVolumeCmd:
			req.resp <- c.handleSetVolume(req.volume)
		case *fadeVolumeCmd:
			req.resp <- c.handleFade(req.target, req.durationMs)
		case *seekCmd:
			req.resp <- c.handleSeek(req.positionMs)
		default:
			cmd.setResponse(make(chan error, 1))
		}
	}
}

func (c *channel) handlePlay(req PlayRequest) error {
	if req.AssetPath == "" {
		return errors.New("asset_path required")
	}
	fullPath, err := validateAssetPath(c.assetsDir, req.AssetPath)
	if err != nil {
		return err
	}
	if err := c.stopInstance(); err != nil {
		return err
	}
	instance, err := c.backend.Open(fullPath, c.output)
	if err != nil {
		return err
	}
	c.instance = instance
	if err := instance.SetLoop(req.Loop); err != nil {
		_ = c.stopInstance()
		return err
	}
	if req.Volume != nil {
		c.volume = clampVolume(*req.Volume)
		if err := instance.SetVolume(c.volume); err != nil {
			_ = c.stopInstance()
			return err
		}
	}
	if req.StartMs > 0 {
		if err := instance.Seek(req.StartMs); err != nil {
			_ = c.stopInstance()
			return err
		}
	}
	if req.FadeInMs > 0 {
		target := c.volume
		if req.Volume == nil {
			target = 1.0
			c.volume = target
		}
		_ = instance.SetVolume(0)
		c.startFade(0, target, req.FadeInMs)
	}
	if err := instance.Play(); err != nil {
		_ = c.stopInstance()
		return err
	}
	return nil
}

func (c *channel) handleStop() error {
	return c.stopInstance()
}

func (c *channel) handlePause() error {
	if c.instance == nil {
		return errors.New("no active media")
	}
	return c.instance.Pause()
}

func (c *channel) handleResume() error {
	if c.instance == nil {
		return errors.New("no active media")
	}
	return c.instance.Resume()
}

func (c *channel) handleSetVolume(volume float64) error {
	if c.instance == nil {
		return errors.New("no active media")
	}
	c.volume = clampVolume(volume)
	return c.instance.SetVolume(c.volume)
}

func (c *channel) handleFade(target float64, durationMs int) error {
	if c.instance == nil {
		return errors.New("no active media")
	}
	if durationMs <= 0 {
		c.volume = clampVolume(target)
		return c.instance.SetVolume(c.volume)
	}
	c.startFade(c.volume, clampVolume(target), durationMs)
	return nil
}

func (c *channel) handleSeek(positionMs int) error {
	if c.instance == nil {
		return errors.New("no active media")
	}
	return c.instance.Seek(positionMs)
}

func (c *channel) stopInstance() error {
	c.stopFade()
	if c.instance == nil {
		return nil
	}
	_ = c.instance.Stop()
	err := c.instance.Close()
	c.instance = nil
	return err
}

func (c *channel) startFade(from, to float64, durationMs int) {
	c.stopFade()
	cancel := make(chan struct{})
	c.fadeCancel = cancel
	steps := durationMs / 50
	if steps < 1 {
		steps = 1
	}
	stepDur := time.Duration(durationMs/steps) * time.Millisecond
	delta := (to - from) / float64(steps)
	go func(instance BackendInstance, start float64) {
		value := start
		ticker := time.NewTicker(stepDur)
		defer ticker.Stop()
		for i := 0; i < steps; i++ {
			select {
			case <-cancel:
				return
			case <-ticker.C:
				value += delta
				_ = instance.SetVolume(clampVolume(value))
			}
		}
		_ = instance.SetVolume(clampVolume(to))
		c.mu.Lock()
		c.volume = clampVolume(to)
		c.mu.Unlock()
	}(c.instance, from)
}

func (c *channel) stopFade() {
	if c.fadeCancel != nil {
		close(c.fadeCancel)
		c.fadeCancel = nil
	}
}

func (c *channel) snapshot() map[string]any {
	c.mu.Lock()
	defer c.mu.Unlock()
	return map[string]any{
		"output": c.output,
		"active": c.instance != nil,
		"volume": c.volume,
	}
}

func validateAssetPath(assetsDir, asset string) (string, error) {
	clean := filepath.Clean(asset)
	if clean == "." || clean == string(filepath.Separator) {
		return "", errors.New("invalid asset path")
	}
	if filepath.IsAbs(clean) {
		return "", errors.New("absolute asset path not allowed")
	}
	if strings.HasPrefix(clean, "..") || strings.Contains(clean, ".."+string(filepath.Separator)) {
		return "", errors.New("asset path traversal not allowed")
	}
	full := filepath.Join(assetsDir, clean)
	if rel, err := filepath.Rel(assetsDir, full); err != nil || strings.HasPrefix(rel, "..") {
		return "", errors.New("asset path escapes assets directory")
	}
	info, err := os.Stat(full)
	if err != nil {
		return "", fmt.Errorf("asset not found: %s", clean)
	}
	if info.IsDir() {
		return "", fmt.Errorf("asset path is a directory: %s", clean)
	}
	return full, nil
}

func clampVolume(volume float64) float64 {
	if volume < 0 {
		return 0
	}
	if volume > 1 {
		return 1
	}
	return volume
}

func normalizeID(name, kind string) string {
	id := strings.ToLower(strings.TrimSpace(name))
	id = strings.ReplaceAll(id, " ", "-")
	if id == "" {
		id = kind + "-" + runtime.GOOS
	}
	return kind + ":" + id
}

