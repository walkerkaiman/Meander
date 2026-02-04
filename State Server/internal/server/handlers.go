package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

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
	needsAssign := record.AssignedLogicID == ""
	resp := models.RegisterDeployableResponse{
		Known:        known,
		AssignedLogicID: record.AssignedLogicID,
		NeedsAssign:  needsAssign,
		Message:      "",
	}
	if needsAssign {
		resp.Message = "awaiting show logic assignment"
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
	logicID := ""
	if ok {
		logicID = record.AssignedLogicID
	} else {
		s.deployableMu.RLock()
		session := s.deployables[id]
		s.deployableMu.RUnlock()
		if session != nil {
			logicID = session.AssignedLogicID
		}
	}
	if logicID == "" {
		errorJSON(w, http.StatusConflict, "deployable has no assigned logic")
		return
	}
	pkg, ok, err := s.store.GetLatestShowLogicForRole(r.Context(), logicID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load show logic")
		return
	}
	if !ok {
		errorJSON(w, http.StatusNotFound, "no show logic package for logic id")
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
	var req models.SignalsIngestRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid event payload")
		return
	}
	if err := ensureDeployableID(req.DeployableID); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable_id required")
		return
	}
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	ctxData, ok, err := s.rulesStore.GetDeployableContext(r.Context(), req.DeployableID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load deployable context")
		return
	}
	if !ok {
		errorJSON(w, http.StatusBadRequest, "deployable context not found")
		return
	}
	defs, ok, err := s.rulesStore.GetSignalDefinitions(r.Context(), ctxData.LogicID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load signal definitions")
		return
	}
	if !ok || len(defs) == 0 {
		fallbackDefs, err := s.signalDefsFromLogic(r, ctxData.LogicID)
		if err != nil {
			errorJSON(w, http.StatusInternalServerError, "failed to load show logic signals")
			return
		}
		if len(fallbackDefs) == 0 {
			fallbackDefs = inferSignalDefs(req.Signals)
		}
		if len(fallbackDefs) == 0 {
			errorJSON(w, http.StatusBadRequest, "signal definitions not found for logic id")
			return
		}
		defs = fallbackDefs
	}

	event := models.Event{
		DeployableID: req.DeployableID,
		LogicID:      ctxData.LogicID,
		Tags:         ctxData.Tags,
		Timestamp:    time.Unix(req.Timestamp, 0).UTC(),
		Signals:      map[string]models.SignalValue{},
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}
	for name, raw := range req.Signals {
		def, ok := defs[name]
		if !ok {
			continue
		}
		value, err := coerceSignalValue(def.Type, raw)
		if err != nil {
			errorJSON(w, http.StatusBadRequest, "signal type mismatch for "+name)
			return
		}
		event.Signals[name] = models.SignalValue{Type: def.Type, Value: value}
	}
	select {
	case s.eventCh <- event:
	default:
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}

func (s *Server) signalDefsFromLogic(r *http.Request, logicID string) (map[string]models.SignalDefinition, error) {
	if logicID == "" {
		return nil, nil
	}
	pkg, ok, err := s.store.GetLatestShowLogicForRole(r.Context(), logicID)
	if err != nil || !ok || len(pkg.ShowLogic) == 0 {
		return nil, err
	}
	var def models.ShowLogicDefinition
	if err := json.Unmarshal(pkg.ShowLogic, &def); err != nil {
		return nil, err
	}
	out := make(map[string]models.SignalDefinition)
	for _, item := range def.Signals {
		if item.Name == "" || item.Type == "" {
			continue
		}
		out[item.Name] = item
	}
	return out, nil
}

func inferSignalDefs(raw map[string]any) map[string]models.SignalDefinition {
	out := map[string]models.SignalDefinition{}
	for name, value := range raw {
		if name == "" {
			continue
		}
		switch v := value.(type) {
		case bool:
			out[name] = models.SignalDefinition{Name: name, Type: models.SignalBool}
		case string:
			out[name] = models.SignalDefinition{Name: name, Type: models.SignalString}
		case float64, float32, int, int64, int32:
			out[name] = models.SignalDefinition{Name: name, Type: models.SignalNumber}
		case []float64:
			if len(v) == 2 {
				out[name] = models.SignalDefinition{Name: name, Type: models.SignalVector2}
			}
		case []any:
			if len(v) == 2 {
				if _, ok := asNumber(v[0]); ok {
					if _, ok := asNumber(v[1]); ok {
						out[name] = models.SignalDefinition{Name: name, Type: models.SignalVector2}
					}
				}
			}
		}
	}
	return out
}

func asNumber(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case int32:
		return float64(n), true
	default:
		return 0, false
	}
}

func coerceSignalValue(valueType models.SignalValueType, raw any) (any, error) {
	switch valueType {
	case models.SignalBool:
		if v, ok := raw.(bool); ok {
			return v, nil
		}
		return nil, errors.New("expected bool")
	case models.SignalNumber:
		switch v := raw.(type) {
		case float64:
			return v, nil
		case float32:
			return float64(v), nil
		case int:
			return float64(v), nil
		case int64:
			return float64(v), nil
		case int32:
			return float64(v), nil
		default:
			return nil, errors.New("expected number")
		}
	case models.SignalString:
		if v, ok := raw.(string); ok {
			return v, nil
		}
		return nil, errors.New("expected string")
	case models.SignalVector2:
		switch v := raw.(type) {
		case []any:
			if len(v) != 2 {
				return nil, errors.New("expected vector2")
			}
			x, xok := v[0].(float64)
			y, yok := v[1].(float64)
			if xok && yok {
				return []float64{x, y}, nil
			}
			return nil, errors.New("expected vector2 numbers")
		case []float64:
			if len(v) != 2 {
				return nil, errors.New("expected vector2")
			}
			return v, nil
		default:
			return nil, errors.New("expected vector2")
		}
	default:
		return nil, errors.New("unknown signal type")
	}
}

func (s *Server) ListDeployables(w http.ResponseWriter, r *http.Request) {
	records, err := s.store.ListDeployables(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list deployables")
		return
	}
	// Merge session data (IP, hostname) with records
	s.deployableMu.RLock()
	sessions := make(map[string]*DeployableSession)
	for _, session := range s.deployables {
		sessions[session.DeviceID] = session
	}
	s.deployableMu.RUnlock()
	
	// Enhance records with session data
	enhanced := make([]map[string]interface{}, len(records))
	for i, rec := range records {
		enhanced[i] = map[string]interface{}{
			"deployable_id":     rec.DeployableID,
			"assigned_logic_id": rec.AssignedLogicID,
			"status":            rec.Status,
			"last_seen":         rec.LastSeen.Format(time.RFC3339Nano),
			"capabilities":      rec.Capabilities,
			"name":              rec.Name,
			"location":          rec.Location,
		}
		if session, ok := sessions[rec.DeployableID]; ok {
			enhanced[i]["ip"] = session.IP
			enhanced[i]["hostname"] = session.Hostname
			enhanced[i]["connected"] = session.Connected
			// Prefer session name/location if available (might be more recent)
			if session.Name != "" {
				enhanced[i]["name"] = session.Name
			}
			if session.Location != "" {
				enhanced[i]["location"] = session.Location
			}
		}
	}
	writeJSON(w, http.StatusOK, enhanced)
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
	
	// Update role if provided
	if req.AssignedLogicID != "" {
		changed := current.AssignedLogicID != req.AssignedLogicID
		if err := s.store.UpdateDeployableRole(r.Context(), id, req.AssignedLogicID); err != nil {
			errorJSON(w, http.StatusInternalServerError, "failed to update logic id")
			return
		}
		if changed {
			_ = s.store.UpdateDeployableStatus(r.Context(), id, statusRegistering)
			s.hub.SetActive(id, false)
			s.hub.NotifyLogicUpdate(id)
		}
	}
	
	// Update name and location if provided
	if req.Name != "" || req.Location != "" {
		name := req.Name
		location := req.Location
		if name == "" {
			name = current.Name
		}
		if location == "" {
			location = current.Location
		}
		if err := s.store.UpdateDeployableNameLocation(r.Context(), id, name, location); err != nil {
			errorJSON(w, http.StatusInternalServerError, "failed to update name/location")
			return
		}
		
		// Update in-memory session
		s.deployableMu.Lock()
		if session := s.deployables[id]; session != nil {
			session.Name = name
			session.Location = location
			s.notifyUI("upsert", session)
		}
		s.deployableMu.Unlock()
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
