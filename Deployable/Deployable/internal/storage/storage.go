package storage

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"

	"deployable/internal/types"
)

type Store struct {
	DataDir   string
	AssetsDir string
}

func New(dataDir, assetsDir string) *Store {
	return &Store{DataDir: dataDir, AssetsDir: assetsDir}
}

func (s *Store) EnsureDirs() error {
	if err := os.MkdirAll(s.DataDir, 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(s.AssetsDir, 0o755); err != nil {
		return err
	}
	return nil
}

func (s *Store) DevicePath() string {
	return filepath.Join(s.DataDir, "device.json")
}

func (s *Store) AssignmentPath() string {
	return filepath.Join(s.DataDir, "assignment.json")
}

func (s *Store) ShowLogicPath() string {
	return filepath.Join(s.DataDir, "show_logic.json")
}

func (s *Store) ProfilePath() string {
	return filepath.Join(s.DataDir, "profile.json")
}

func (s *Store) LoadOrCreateDevice() (types.LocalDevice, error) {
	var device types.LocalDevice
	path := s.DevicePath()
	if _, err := os.Stat(path); err == nil {
		if err := readJSON(path, &device); err != nil {
			return device, err
		}
		if device.DeviceID == "" {
			return device, errors.New("device id missing in device.json")
		}
		return device, nil
	}

	device = types.LocalDevice{
		DeviceID:  newDeviceID(),
		FirstBoot: time.Now().UTC(),
	}
	if err := writeJSON(path, device); err != nil {
		return device, err
	}
	return device, nil
}

func (s *Store) LoadAssignment() (types.LocalAssignment, error) {
	var assignment types.LocalAssignment
	path := s.AssignmentPath()
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return assignment, nil
		}
		return assignment, err
	}
	if err := readJSON(path, &assignment); err != nil {
		return assignment, err
	}
	return assignment, nil
}

func (s *Store) SaveAssignment(assignment types.LocalAssignment) error {
	return writeJSON(s.AssignmentPath(), assignment)
}

func (s *Store) SaveShowLogic(def types.ShowLogicDefinition) error {
	return writeJSON(s.ShowLogicPath(), def)
}

func (s *Store) LoadShowLogic() (types.ShowLogicDefinition, error) {
	var def types.ShowLogicDefinition
	path := s.ShowLogicPath()
	if _, err := os.Stat(path); err != nil {
		return def, err
	}
	if err := readJSON(path, &def); err != nil {
		return def, err
	}
	return def, nil
}

func (s *Store) SaveProfile(profile types.ExecutionProfile) error {
	return writeJSON(s.ProfilePath(), profile)
}

func (s *Store) LoadProfile() (types.ExecutionProfile, error) {
	var profile types.ExecutionProfile
	path := s.ProfilePath()
	if _, err := os.Stat(path); err != nil {
		return profile, err
	}
	if err := readJSON(path, &profile); err != nil {
		return profile, err
	}
	return profile, nil
}

func newDeviceID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func writeJSON(path string, value any) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, "tmp-*.json")
	if err != nil {
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		_ = os.Remove(tmp.Name())
		return err
	}
	_ = os.Remove(path)
	return os.Rename(tmp.Name(), path)
}

func readJSON(path string, value any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, value)
}

