package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"state-server/internal/models"
)

type DeployableSession struct {
	DeviceID         string                  `json:"device_id"`
	Hostname         string                  `json:"hostname"`
	IP               string                  `json:"ip"`
	AgentVersion     string                  `json:"agent_version"`
	PairingCode      string                  `json:"pairing_code"`
	AssignedLogicID  string                  `json:"assigned_logic_id"`
	ProfileVersion   int                     `json:"assigned_profile_version"`
	ShowLogicVersion int                     `json:"assigned_show_logic_version"`
	Capabilities     models.CapabilityReport `json:"capabilities"`
	LastSeen         time.Time               `json:"last_seen"`
	Status           string                  `json:"status"`
	Name             string                  `json:"name"`
	Location         string                  `json:"location"`
	Connected        bool                    `json:"connected"`

	conn    *websocket.Conn
	writeMu sync.Mutex
}

var deployableUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *Server) DeployableWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := deployableUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer func() {
		_ = conn.Close()
	}()

	for {
		var envelope map[string]any
		if err := conn.ReadJSON(&envelope); err != nil {
			s.markDeployableDisconnected(conn)
			return
		}
		msgType, _ := envelope["type"].(string)
		switch msgType {
		case "hello":
			data, _ := json.Marshal(envelope)
			var hello models.DeployableHello
			if err := json.Unmarshal(data, &hello); err != nil {
				continue
			}
			s.upsertDeployableSession(conn, hello)
		case "assign_role_ack":
			data, _ := json.Marshal(envelope)
			var ack models.AssignRoleAck
			if err := json.Unmarshal(data, &ack); err != nil {
				continue
			}
			s.markDeployableAssigned(ack)
		default:
		}
	}
}

func (s *Server) upsertDeployableSession(conn *websocket.Conn, hello models.DeployableHello) {
	if hello.DeviceID == "" {
		return
	}
	s.deployableMu.Lock()
	session := s.deployables[hello.DeviceID]
	if session == nil {
		session = &DeployableSession{DeviceID: hello.DeviceID}
		s.deployables[hello.DeviceID] = session
	}
	session.Hostname = hello.Hostname
	session.IP = hello.IP
	session.AgentVersion = hello.AgentVersion
	session.PairingCode = hello.PairingCode
	session.AssignedLogicID = hello.AssignedLogicID
	session.ProfileVersion = hello.ProfileVersion
	session.ShowLogicVersion = hello.ShowLogicVersion
	session.Capabilities = hello.Capabilities
	session.LastSeen = time.Now().UTC()
	session.Connected = true
	session.conn = conn
	if session.AssignedLogicID == "" {
		session.Status = "PENDING"
	} else {
		session.Status = "ACTIVE"
	}
	log.Printf("registration: hello device_id=%s status=%s pairing=%s logic=%s profile=%d logic_ver=%d",
		session.DeviceID, session.Status, session.PairingCode,
		session.AssignedLogicID, session.ProfileVersion, session.ShowLogicVersion,
	)
	if session.AssignedLogicID != "" {
		log.Printf("registration: online device_id=%s logic=%s", session.DeviceID, session.AssignedLogicID)
	}
	s.notifyUI("upsert", session)
	s.deployableMu.Unlock()
	s.maybeSendAssignOnHello(hello)
}

func (s *Server) maybeSendAssignOnHello(hello models.DeployableHello) {
	if hello.DeviceID == "" || hello.AssignedLogicID == "" {
		return
	}
	pkg, ok, err := s.store.GetLatestShowLogicForRole(context.Background(), hello.AssignedLogicID)
	if err != nil || !ok || len(pkg.ShowLogic) == 0 {
		return
	}
	currentLogicVersion := strconv.Itoa(hello.ShowLogicVersion)
	if hello.ShowLogicVersion != 0 && pkg.LogicVersion == currentLogicVersion && hello.ProfileVersion != 0 {
		return
	}
	var def models.ShowLogicDefinition
	if err := json.Unmarshal(pkg.ShowLogic, &def); err != nil {
		return
	}
	assign := models.AssignRoleMessage{
		Type:     "assign_role",
		LogicID:  hello.AssignedLogicID,
		ServerID: s.serverVersion,
		Profile: models.ExecutionProfile{
			ProfileID: "default",
			Version:   1,
			Requires:  map[string]any{},
		},
		ShowLogic: def,
	}
	s.deployableMu.RLock()
	session := s.deployables[hello.DeviceID]
	s.deployableMu.RUnlock()
	if session == nil || session.conn == nil || !session.Connected {
		return
	}
	session.writeMu.Lock()
	_ = session.conn.WriteJSON(assign)
	session.writeMu.Unlock()
	log.Printf("registration: auto-assign device_id=%s logic=%s pkg=%s@%s",
		hello.DeviceID, hello.AssignedLogicID, pkg.PackageID, pkg.LogicVersion,
	)
}

func (s *Server) markDeployableAssigned(ack models.AssignRoleAck) {
	if ack.DeviceID == "" {
		return
	}
	s.deployableMu.Lock()
	defer s.deployableMu.Unlock()
	if session := s.deployables[ack.DeviceID]; session != nil {
		if ack.Status == "ok" {
			session.Status = "ACTIVE"
		} else {
			session.Status = "ERROR"
		}
		log.Printf("registration: assign_role_ack device_id=%s status=%s", ack.DeviceID, ack.Status)
		if ack.Status == "ok" {
			log.Printf("registration: complete device_id=%s logic=%s", ack.DeviceID, session.AssignedLogicID)
		}
		s.notifyUI("assign_ack", session)
	}
}

func (s *Server) markDeployableDisconnected(conn *websocket.Conn) {
	s.deployableMu.Lock()
	defer s.deployableMu.Unlock()
	for _, session := range s.deployables {
		if session.conn == conn {
			session.Connected = false
			session.conn = nil
			s.notifyUI("disconnect", session)
			return
		}
	}
}

func (s *Server) ListPendingDeployables(w http.ResponseWriter, _ *http.Request) {
	s.deployableMu.RLock()
	defer s.deployableMu.RUnlock()
	out := []*DeployableSession{}
	for _, session := range s.deployables {
		if session.AssignedLogicID == "" {
			out = append(out, session)
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) AssignDeployable(w http.ResponseWriter, r *http.Request) {
	id := parseIDParam(r)
	if err := ensureDeployableID(id); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable id required")
		return
	}
	var req models.DeployableAssignRequest
	if err := decodeJSON(r, &req); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid assign payload")
		return
	}
	if req.Profile.ProfileID == "" || req.Profile.Version == 0 {
		errorJSON(w, http.StatusBadRequest, "profile_id and version required")
		return
	}
	showLogic := req.ShowLogic
	if showLogic.LogicID == "" && req.ShowLogicFile != "" {
		def, err := loadShowLogicFile(req.ShowLogicFile)
		if err != nil {
			errorJSON(w, http.StatusBadRequest, "show logic file not found or invalid")
			return
		}
		showLogic = def
	}
	if showLogic.LogicID == "" || len(showLogic.States) == 0 {
		errorJSON(w, http.StatusBadRequest, "show_logic required")
		return
	}
	roleID := showLogic.LogicID

	showLogicJSON, marshalErr := json.Marshal(showLogic)
	if marshalErr != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to encode show logic")
		return
	}
	pkg := models.ShowLogicPackage{
		PackageID:             uuid.NewString(),
		LogicID:               roleID,
		LogicVersion:          strconv.Itoa(showLogic.Version),
		EngineContractVersion: "1.0.0",
		ShowLogic:             showLogicJSON,
		ReferencedAssets:      []string{},
	}
	if err := s.store.SaveShowLogicPackage(r.Context(), pkg, "operator"); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save show logic package")
		return
	}

	s.deployableMu.RLock()
	session := s.deployables[id]
	s.deployableMu.RUnlock()
	if session == nil || session.conn == nil || !session.Connected {
		errorJSON(w, http.StatusConflict, "deployable not connected")
		return
	}

	assign := models.AssignRoleMessage{
		Type:      "assign_role",
		LogicID:   roleID,
		ServerID:  s.serverVersion,
		Profile:   req.Profile,
		ShowLogic: showLogic,
		Name:      req.Name,
	}

	session.writeMu.Lock()
	err := session.conn.WriteJSON(assign)
	session.writeMu.Unlock()
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to send assign_role")
		return
	}
	log.Printf("registration: assign_role sent device_id=%s logic=%s name=%s",
		id, roleID, req.Name,
	)

	if s.rulesStore != nil {
		_ = s.rulesStore.SaveDeployableContext(r.Context(), models.DeployableContext{
			DeployableID: id,
			LogicID:      roleID,
			Tags:         req.Tags,
		})
		if len(showLogic.Signals) > 0 {
			_ = s.rulesStore.SaveSignalDefinitions(r.Context(), roleID, showLogic.Signals)
		}
	}

	s.deployableMu.Lock()
	if req.Name != "" {
		session.Name = req.Name
	} else if showLogic.Name != "" {
		session.Name = showLogic.Name
	}
	session.Location = ""
	session.AssignedLogicID = roleID
	session.Status = "ASSIGN_SENT"
	s.deployableMu.Unlock()
	s.notifyUI("assign_sent", session)

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func (s *Server) BroadcastStateToDeployables(state models.GlobalState) {
	payload := map[string]any{
		"type":      "state_update",
		"state":     state.State,
		"version":   state.Version,
		"timestamp": state.Timestamp,
	}
	s.deployableMu.RLock()
	defer s.deployableMu.RUnlock()
	count := 0
	ids := []string{}
	for _, session := range s.deployables {
		if session.conn == nil || !session.Connected {
			continue
		}
		session.writeMu.Lock()
		_ = session.conn.WriteJSON(payload)
		session.writeMu.Unlock()
		count++
		ids = append(ids, session.DeviceID)
	}
	if count == 0 {
		log.Printf("state: broadcast to deployables state=%s v=%d count=0", state.State, state.Version)
		return
	}
	log.Printf("state: broadcast to deployables state=%s v=%d count=%d ids=%v", state.State, state.Version, count, ids)
}

// ---- Registration UI subscribers ----

type RegUIClient struct {
	conn    *websocket.Conn
	writeMu sync.Mutex
}

var regUIUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *Server) RegisterUISocket(w http.ResponseWriter, r *http.Request) {
	conn, err := regUIUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &RegUIClient{conn: conn}
	s.addUIClient(client)
	s.sendPendingSnapshot(client)

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
	s.removeUIClient(client)
	_ = conn.Close()
}

func (s *Server) sendPendingSnapshot(client *RegUIClient) {
	items := s.allSessions()
	payload := map[string]any{
		"type":  "snapshot",
		"items": items,
	}
	client.writeMu.Lock()
	_ = client.conn.WriteJSON(payload)
	client.writeMu.Unlock()
}

func (s *Server) pendingSessions() []*DeployableSession {
	s.deployableMu.RLock()
	defer s.deployableMu.RUnlock()
	out := []*DeployableSession{}
	for _, session := range s.deployables {
		if session.AssignedLogicID == "" {
			out = append(out, session)
		}
	}
	return out
}

func (s *Server) allSessions() []*DeployableSession {
	s.deployableMu.RLock()
	defer s.deployableMu.RUnlock()
	out := make([]*DeployableSession, 0, len(s.deployables))
	for _, session := range s.deployables {
		out = append(out, session)
	}
	return out
}

func (s *Server) addUIClient(client *RegUIClient) {
	s.uiMu.Lock()
	defer s.uiMu.Unlock()
	if s.uiClients == nil {
		s.uiClients = make(map[*RegUIClient]struct{})
	}
	s.uiClients[client] = struct{}{}
}

func (s *Server) removeUIClient(client *RegUIClient) {
	s.uiMu.Lock()
	defer s.uiMu.Unlock()
	delete(s.uiClients, client)
}

func (s *Server) notifyUI(event string, session *DeployableSession) {
	s.uiMu.RLock()
	defer s.uiMu.RUnlock()
	for client := range s.uiClients {
		client.writeMu.Lock()
		_ = client.conn.WriteJSON(map[string]any{
			"type": event,
			"item": session,
		})
		client.writeMu.Unlock()
	}
}
