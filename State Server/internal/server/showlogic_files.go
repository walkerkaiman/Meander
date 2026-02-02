package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"state-server/internal/models"
)

const showLogicDir = "show-logic"

type ShowLogicFileInfo struct {
	File         string `json:"file"`
	Name         string `json:"name"`
	LogicID      string `json:"logic_id"`
	DeployableID string `json:"deployable_id"`
}

func (s *Server) ListShowLogicFiles(w http.ResponseWriter, _ *http.Request) {
	files, err := readShowLogicFiles()
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list show logic files")
		return
	}
	writeJSON(w, http.StatusOK, files)
}

func readShowLogicFiles() ([]ShowLogicFileInfo, error) {
	entries, err := os.ReadDir(showLogicDir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []ShowLogicFileInfo{}, nil
		}
		return nil, err
	}
	out := []ShowLogicFileInfo{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}
		def, err := loadShowLogicFile(entry.Name())
		if err != nil {
			continue
		}
		name := def.Name
		if name == "" {
			name = strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		}
		out = append(out, ShowLogicFileInfo{
			File:         entry.Name(),
			Name:         name,
			LogicID:      def.LogicID,
			DeployableID: def.DeployableID,
		})
	}
	return out, nil
}

func loadShowLogicFile(file string) (models.ShowLogicDefinition, error) {
	if file == "" {
		return models.ShowLogicDefinition{}, errors.New("missing show logic file")
	}
	base := filepath.Base(file)
	path := filepath.Join(showLogicDir, base)
	data, err := os.ReadFile(path)
	if err != nil {
		return models.ShowLogicDefinition{}, err
	}
	var def models.ShowLogicDefinition
	if err := json.Unmarshal(data, &def); err != nil {
		return models.ShowLogicDefinition{}, err
	}
	return def, nil
}
