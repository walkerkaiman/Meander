package server

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"state-server/internal/models"
)

func (s *Server) UpsertShowLogic(w http.ResponseWriter, r *http.Request) {
	logicID := parseLogicParam(r)
	if logicID == "" {
		errorJSON(w, http.StatusBadRequest, "logic id required")
		return
	}
	var pkg models.ShowLogicPackage
	if err := decodeJSON(r, &pkg); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid show logic payload")
		return
	}
	if pkg.LogicID == "" {
		pkg.LogicID = logicID
	}
	if pkg.LogicID != logicID {
		errorJSON(w, http.StatusBadRequest, "logic id mismatch")
		return
	}
	if pkg.PackageID == "" {
		pkg.PackageID = uuid.NewString()
	}
	if err := s.validator.Validate(pkg); err != nil {
		errorJSON(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.store.SaveShowLogicPackage(r.Context(), pkg, "operator"); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save show logic")
		return
	}
	if len(pkg.ShowLogic) > 0 && s.rulesStore != nil {
		var def models.ShowLogicDefinition
		if err := json.Unmarshal(pkg.ShowLogic, &def); err == nil {
			if len(def.Signals) > 0 {
				_ = s.rulesStore.SaveSignalDefinitions(r.Context(), pkg.LogicID, def.Signals)
			}
		}
	}
	if deployables, err := s.store.ListDeployables(r.Context()); err == nil {
		for _, dep := range deployables {
			if dep.AssignedLogicID != logicID {
				continue
			}
			_ = s.store.UpdateDeployableStatus(r.Context(), dep.DeployableID, statusRegistering)
			s.hub.SetActive(dep.DeployableID, false)
			s.hub.NotifyLogicUpdate(dep.DeployableID)
		}
	}
	writeJSON(w, http.StatusOK, pkg)
}
