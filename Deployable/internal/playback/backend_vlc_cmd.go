package playback

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"net"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type VLCCommandBackend struct {
	VLCPath string
	Debug   bool
}

func NewVLCCommandBackend(path string) *VLCCommandBackend {
	if strings.TrimSpace(path) == "" {
		path = "vlc"
	}
	return &VLCCommandBackend{VLCPath: path}
}

func NewVLCCommandBackendWithDebug(path string, debug bool) *VLCCommandBackend {
	backend := NewVLCCommandBackend(path)
	backend.Debug = debug
	return backend
}

func (b *VLCCommandBackend) Open(assetPath string, output OutputDevice) (BackendInstance, error) {
	rcPort, err := pickPort()
	if err != nil {
		return nil, err
	}
	bind := fmt.Sprintf("127.0.0.1:%d", rcPort)
	rcArgs := []string{
		"--intf", "dummy",
		"--extraintf", "rc",
		"--rc-host", bind,
		"--quiet",
		"--no-video-title-show",
	}
	if isCVLCPath(b.VLCPath) {
		rcArgs = []string{
			"-I", "rc",
			"--rc-host", bind,
			"--quiet",
			"--no-video-title-show",
		}
	}
	args := rcArgs
	if output.Type == "video" {
		args = append(args, "--fullscreen")
		if idx, ok := parseDisplayIndex(output.ID); ok && !isCVLCPath(b.VLCPath) {
			args = append(args, "--qt-fullscreen-screennumber="+strconv.Itoa(idx))
		}
	}
	args = append(args, assetPath)

	cmd := exec.Command(b.VLCPath, args...)
	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	}
	var stderr bytes.Buffer
	if b.Debug {
		cmd.Stderr = &stderr
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	_ = cmd.Process.Release()
	conn, err := connectRC(rcPort, cmd)
	if err != nil {
		if b.Debug && stderr.Len() > 0 {
			return nil, fmt.Errorf("vlc rc connect failed: %w; stderr: %s", err, strings.TrimSpace(stderr.String()))
		}
		_ = cmd.Process.Kill()
		return nil, err
	}
	return &VLCCommandInstance{
		cmd:      cmd,
		conn:     conn,
		writer:   bufio.NewWriter(conn),
		volume:   1.0,
		paused:   false,
	}, nil
}

type VLCCommandInstance struct {
	mu     sync.Mutex
	cmd    *exec.Cmd
	conn   net.Conn
	writer *bufio.Writer
	volume float64
	paused bool
}

func (v *VLCCommandInstance) Play() error {
	return v.send("play")
}

func (v *VLCCommandInstance) Stop() error {
	return v.send("stop")
}

func (v *VLCCommandInstance) Pause() error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if v.paused {
		return nil
	}
	if err := v.sendLocked("pause"); err != nil {
		return err
	}
	v.paused = true
	return nil
}

func (v *VLCCommandInstance) Resume() error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if !v.paused {
		return nil
	}
	if err := v.sendLocked("pause"); err != nil {
		return err
	}
	v.paused = false
	return nil
}

func (v *VLCCommandInstance) Seek(ms int) error {
	seconds := ms / 1000
	return v.send(fmt.Sprintf("seek %d", seconds))
}

func (v *VLCCommandInstance) SetVolume(vol float64) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	v.volume = vol
	value := int(clampVolume(vol) * 256)
	return v.sendLocked(fmt.Sprintf("volume %d", value))
}

func (v *VLCCommandInstance) SetLoop(loop bool) error {
	if loop {
		return v.send("loop on")
	}
	return v.send("loop off")
}

func (v *VLCCommandInstance) Close() error {
	_ = v.send("stop")
	_ = v.send("quit")
	if v.conn != nil {
		_ = v.conn.Close()
	}
	if v.cmd != nil && v.cmd.Process != nil {
		_ = v.cmd.Process.Kill()
	}
	return nil
}

func (v *VLCCommandInstance) send(command string) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	return v.sendLocked(command)
}

func (v *VLCCommandInstance) sendLocked(command string) error {
	if v.writer == nil {
		return errors.New("vlc rc not connected")
	}
	if _, err := v.writer.WriteString(command + "\n"); err != nil {
		return err
	}
	return v.writer.Flush()
}

func pickPort() (int, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer listener.Close()
	return listener.Addr().(*net.TCPAddr).Port, nil
}

func connectRC(port int, cmd *exec.Cmd) (net.Conn, error) {
	address := fmt.Sprintf("127.0.0.1:%d", port)
	var lastErr error
	for i := 0; i < 50; i++ {
		conn, err := net.DialTimeout("tcp", address, 200*time.Millisecond)
		if err == nil {
			_ = conn.SetDeadline(time.Now().Add(2 * time.Second))
			_, _ = conn.Write([]byte("status\n"))
			_ = conn.SetDeadline(time.Time{})
			return conn, nil
		}
		lastErr = err
		if cmd != nil && cmd.ProcessState != nil && cmd.ProcessState.Exited() {
			return nil, errors.New("vlc exited before rc became available")
		}
		time.Sleep(100 * time.Millisecond)
	}
	if lastErr == nil {
		lastErr = errors.New("failed to connect to vlc rc")
	}
	return nil, lastErr
}

func parseDisplayIndex(id string) (int, bool) {
	id = strings.ToLower(strings.TrimSpace(id))
	if strings.HasPrefix(id, "display-") {
		if idx, err := strconv.Atoi(strings.TrimPrefix(id, "display-")); err == nil {
			return idx, true
		}
	}
	return 0, false
}

func isCVLCPath(path string) bool {
	lower := strings.ToLower(strings.TrimSpace(path))
	return strings.HasSuffix(lower, "cvlc.exe") || strings.HasSuffix(lower, "cvlc")
}

