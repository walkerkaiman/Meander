package server

import (
	"net/http"

	"github.com/google/uuid"

	"state-server/internal/models"
)

func (s *Server) UpsertShowLogic(w http.ResponseWriter, r *http.Request) {
	role := parseRoleParam(r)
	if role == "" {
		errorJSON(w, http.StatusBadRequest, "role required")
		return
	}
	var pkg models.ShowLogicPackage
	if err := decodeJSON(r, &pkg); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid show logic payload")
		return
	}
	if pkg.Role == "" {
		pkg.Role = role
	}
	if pkg.Role != role {
		errorJSON(w, http.StatusBadRequest, "role mismatch")
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
	if deployables, err := s.store.ListDeployables(r.Context()); err == nil {
		for _, dep := range deployables {
			if dep.AssignedRole != role {
				continue
			}
			_ = s.store.UpdateDeployableStatus(r.Context(), dep.DeployableID, statusRegistering)
			s.hub.SetActive(dep.DeployableID, false)
			s.hub.NotifyLogicUpdate(dep.DeployableID)
		}
	}
	writeJSON(w, http.StatusOK, pkg)
}
