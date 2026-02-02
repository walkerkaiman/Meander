package server

import (
	"net/http"

	"state-server/internal/models"
)

const (
	statusNew         = "NEW"
	statusAssigned    = "ASSIGNED"
	statusRegistering = "REGISTERING"
	statusActive      = "ACTIVE"
	statusOffline     = "OFFLINE"
	statusError       = "ERROR"
)

func (s *Server) RegisterDeployable(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterDeployableRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid registration payload")
		return
	}
	if err := ensureDeployableID(req.DeployableID); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable_id required")
		return
	}
	record, known, err := s.store.UpsertDeployable(r.Context(), req)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to register deployable")
		return
	}
	if record.Status == statusActive {
		s.hub.SetActive(record.DeployableID, true)
	} else {
		s.hub.SetActive(record.DeployableID, false)
	}
	needsAssign := record.AssignedRole == ""
	resp := models.RegisterDeployableResponse{
		Known:        known,
		AssignedRole: record.AssignedRole,
		NeedsAssign:  needsAssign,
		Message:      "",
	}
	if needsAssign {
		resp.Message = "awaiting role assignment"
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) GetShowLogic(w http.ResponseWriter, r *http.Request) {
	id := parseIDParam(r)
	if err := ensureDeployableID(id); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable id required")
		return
	}
	record, ok, err := s.store.GetDeployable(r.Context(), id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load deployable")
		return
	}
	if !ok {
		errorJSON(w, http.StatusNotFound, "deployable not found")
		return
	}
	if record.AssignedRole == "" {
		errorJSON(w, http.StatusConflict, "deployable has no assigned role")
		return
	}
	pkg, ok, err := s.store.GetLatestShowLogicForRole(r.Context(), record.AssignedRole)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load show logic")
		return
	}
	if !ok {
		errorJSON(w, http.StatusNotFound, "no show logic package for role")
		return
	}
	writeJSON(w, http.StatusOK, pkg)
}

func (s *Server) DeployableAck(w http.ResponseWriter, r *http.Request) {
	id := parseIDParam(r)
	var req models.DeployableAckRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid ack payload")
		return
	}
	if req.DeployableID == "" {
		req.DeployableID = id
	}
	if req.DeployableID == "" {
		errorJSON(w, http.StatusBadRequest, "deployable_id required")
		return
	}
	if id != "" && id != req.DeployableID {
		errorJSON(w, http.StatusBadRequest, "deployable id mismatch")
		return
	}
	if !req.LogicVerified || !req.AssetsVerified {
		_ = s.store.UpdateDeployableStatus(r.Context(), req.DeployableID, statusError)
		s.hub.SetActive(req.DeployableID, false)
		writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
		return
	}
	if req.PackageID != "" {
		if pkg, ok, _ := s.store.GetShowLogicByID(r.Context(), req.PackageID); ok {
			_ = s.store.UpdateDeployableLogicVersion(r.Context(), req.DeployableID, pkg.LogicVersion)
		}
	}
	_ = s.store.UpdateDeployableStatus(r.Context(), req.DeployableID, statusActive)
	s.hub.SetActive(req.DeployableID, true)
	writeJSON(w, http.StatusOK, map[string]string{"status": "active"})
}

func (s *Server) IngestEvent(w http.ResponseWriter, r *http.Request) {
	var event models.InputEvent
	if err := decodeJSON(r, &event); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid event payload")
		return
	}
	if err := ensureDeployableID(event.DeployableID); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable_id required")
		return
	}
	event.Timestamp = normalizeTimestamp(event.Timestamp)
	if err := s.store.InsertEvent(r.Context(), event); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to persist event")
		return
	}
	select {
	case s.eventCh <- event:
	default:
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

func (s *Server) ListDeployables(w http.ResponseWriter, r *http.Request) {
	records, err := s.store.ListDeployables(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list deployables")
		return
	}
	writeJSON(w, http.StatusOK, records)
}

func (s *Server) UpdateDeployable(w http.ResponseWriter, r *http.Request) {
	id := parseIDParam(r)
	if err := ensureDeployableID(id); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable id required")
		return
	}
	var req models.UpdateDeployableRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid payload")
		return
	}
	current, ok, err := s.store.GetDeployable(r.Context(), id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load deployable")
		return
	}
	if !ok {
		errorJSON(w, http.StatusNotFound, "deployable not found")
		return
	}
	changed := current.AssignedRole != req.AssignedRole
	if err := s.store.UpdateDeployableRole(r.Context(), id, req.AssignedRole); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to update role")
		return
	}
	if changed {
		_ = s.store.UpdateDeployableStatus(r.Context(), id, statusRegistering)
		s.hub.SetActive(id, false)
		s.hub.NotifyLogicUpdate(id)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) StateWebSocket(w http.ResponseWriter, r *http.Request) {
	deployableID := parseDeployableID(r)
	if deployableID != "" {
		if rec, ok, _ := s.store.GetDeployable(r.Context(), deployableID); ok {
			s.hub.SetActive(deployableID, rec.Status == statusActive)
		}
	}
	s.hub.ServeWS(w, r)
}
