package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"

	"state-server/internal/models"
)

// GET /api/v1/show-logic/{logic_id}
func (s *Server) GetShowLogicFile(w http.ResponseWriter, r *http.Request) {
	logicID := mux.Vars(r)["logic_id"]
	if logicID == "" {
		errorJSON(w, http.StatusBadRequest, "logic id required")
		return
	}
	file := logicID + ".json"
	def, err := loadShowLogicFile(file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			errorJSON(w, http.StatusNotFound, "show logic file not found")
			return
		}
		errorJSON(w, http.StatusInternalServerError, "failed to load show logic file")
		return
	}
	writeJSON(w, http.StatusOK, def)
}

// POST /api/v1/show-logic
func (s *Server) CreateShowLogicFile(w http.ResponseWriter, r *http.Request) {
	var def models.ShowLogicDefinition
	if err := decodeJSON(r, &def); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid show logic payload")
		return
	}
	if def.LogicID == "" {
		errorJSON(w, http.StatusBadRequest, "logic_id required")
		return
	}
	if def.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name required")
		return
	}
	if len(def.States) == 0 {
		errorJSON(w, http.StatusBadRequest, "at least one state required")
		return
	}
	file := def.LogicID + ".json"
	if _, err := os.Stat(filepath.Join(showLogicDir, file)); err == nil {
		errorJSON(w, http.StatusConflict, "show logic file already exists")
		return
	}
	if def.Version == 0 {
		def.Version = 1
	}
	if err := s.saveShowLogicFile(def); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save show logic file: "+err.Error())
		return
	}
	s.updateSignalDefinitions(r.Context(), def.LogicID, def.Signals)
	writeJSON(w, http.StatusCreated, def)
}

// PUT /api/v1/show-logic/{logic_id}
func (s *Server) UpdateShowLogicFile(w http.ResponseWriter, r *http.Request) {
	logicID := mux.Vars(r)["logic_id"]
	if logicID == "" {
		errorJSON(w, http.StatusBadRequest, "logic id required")
		return
	}
	var def models.ShowLogicDefinition
	if err := decodeJSON(r, &def); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid show logic payload")
		return
	}
	if def.LogicID == "" {
		def.LogicID = logicID
	}
	if def.LogicID != logicID {
		errorJSON(w, http.StatusBadRequest, "logic id mismatch")
		return
	}
	if def.Name == "" {
		errorJSON(w, http.StatusBadRequest, "name required")
		return
	}
	if len(def.States) == 0 {
		errorJSON(w, http.StatusBadRequest, "at least one state required")
		return
	}
	file := logicID + ".json"
	existing, err := loadShowLogicFile(file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			errorJSON(w, http.StatusNotFound, "show logic file not found")
			return
		}
		errorJSON(w, http.StatusInternalServerError, "failed to load existing show logic")
		return
	}
	if def.LogicID == existing.LogicID {
		def.Version = s.incrementShowLogicVersion(existing.Version)
	} else {
		if def.Version == 0 {
			def.Version = 1
		}
	}
	if err := s.saveShowLogicFile(def); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save show logic file: "+err.Error())
		return
	}
	s.updateSignalDefinitions(r.Context(), def.LogicID, def.Signals)
	writeJSON(w, http.StatusOK, def)
}

// POST /api/v1/show-logic/{logic_id}/copy
func (s *Server) CopyShowLogicFile(w http.ResponseWriter, r *http.Request) {
	logicID := mux.Vars(r)["logic_id"]
	if logicID == "" {
		errorJSON(w, http.StatusBadRequest, "logic id required")
		return
	}
	var req struct {
		NewLogicID string `json:"new_logic_id"`
	}
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if req.NewLogicID == "" {
		errorJSON(w, http.StatusBadRequest, "new_logic_id required")
		return
	}
	if req.NewLogicID == logicID {
		errorJSON(w, http.StatusBadRequest, "new_logic_id must be different")
		return
	}
	file := logicID + ".json"
	existing, err := loadShowLogicFile(file)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			errorJSON(w, http.StatusNotFound, "show logic file not found")
			return
		}
		errorJSON(w, http.StatusInternalServerError, "failed to load show logic file")
		return
	}
	newDef := existing
	newDef.LogicID = req.NewLogicID
	newDef.Version = 1
	newFile := req.NewLogicID + ".json"
	if _, err := os.Stat(filepath.Join(showLogicDir, newFile)); err == nil {
		errorJSON(w, http.StatusConflict, "target show logic file already exists")
		return
	}
	if err := s.saveShowLogicFile(newDef); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save copied show logic file: "+err.Error())
		return
	}
	s.updateSignalDefinitions(r.Context(), newDef.LogicID, newDef.Signals)
	writeJSON(w, http.StatusCreated, newDef)
}

// GET /api/v1/assets
func (s *Server) ListAssets(w http.ResponseWriter, r *http.Request) {
	if s.assetsDir == "" {
		writeJSON(w, http.StatusOK, []string{})
		return
	}
	entries, err := os.ReadDir(s.assetsDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			writeJSON(w, http.StatusOK, []string{})
			return
		}
		errorJSON(w, http.StatusInternalServerError, "failed to read assets directory")
		return
	}
	assets := []string{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		assets = append(assets, entry.Name())
	}
	writeJSON(w, http.StatusOK, assets)
}

// GET /api/v1/hardware-registry
func (s *Server) GetHardwareRegistry(w http.ResponseWriter, r *http.Request) {
	registry := s.buildHardwareRegistry(r.Context())
	writeJSON(w, http.StatusOK, registry)
}

type HardwareRegistry struct {
	VideoOutputs  []string `json:"video_outputs"`
	AudioOutputs  []string `json:"audio_outputs"`
	Inputs        []string `json:"inputs"`
	SerialDevices []string `json:"serial_devices"`
}

func (s *Server) buildHardwareRegistry(ctx context.Context) HardwareRegistry {
	registry := HardwareRegistry{
		VideoOutputs:  []string{},
		AudioOutputs:  []string{},
		Inputs:        []string{},
		SerialDevices: []string{},
	}
	deployables, err := s.store.ListDeployables(ctx)
	if err != nil {
		return registry
	}
	videoMap := make(map[string]bool)
	audioMap := make(map[string]bool)
	inputMap := make(map[string]bool)
	serialMap := make(map[string]bool)
	for _, dep := range deployables {
		for _, output := range dep.Capabilities.VideoOutputs {
			if output.ID != "" {
				videoMap[output.ID] = true
			}
		}
		for _, output := range dep.Capabilities.AudioOutputs {
			if output.ID != "" {
				audioMap[output.ID] = true
			}
		}
		for _, input := range dep.Capabilities.Inputs {
			if input.ID != "" {
				inputMap[input.ID] = true
			}
		}
		for _, serial := range dep.Capabilities.SerialDevices {
			if serial != "" {
				serialMap[serial] = true
			}
		}
	}
	for id := range videoMap {
		registry.VideoOutputs = append(registry.VideoOutputs, id)
	}
	for id := range audioMap {
		registry.AudioOutputs = append(registry.AudioOutputs, id)
	}
	for id := range inputMap {
		registry.Inputs = append(registry.Inputs, id)
	}
	for id := range serialMap {
		registry.SerialDevices = append(registry.SerialDevices, id)
	}
	return registry
}

func (s *Server) saveShowLogicFile(def models.ShowLogicDefinition) error {
	if err := os.MkdirAll(showLogicDir, 0o755); err != nil {
		return err
	}
	file := def.LogicID + ".json"
	path := filepath.Join(showLogicDir, file)
	data, err := json.MarshalIndent(def, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *Server) incrementShowLogicVersion(currentVersion int) int {
	return currentVersion + 1
}

func (s *Server) updateSignalDefinitions(ctx context.Context, logicID string, signals []models.SignalDefinition) {
	if s.rulesStore == nil || len(signals) == 0 {
		return
	}
	_ = s.rulesStore.SaveSignalDefinitions(ctx, logicID, signals)
}
