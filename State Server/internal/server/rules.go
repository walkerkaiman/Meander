package server

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"

	"state-server/internal/models"
)

type RulesEngineStore interface {
	ListRules(ctx context.Context) ([]models.Rule, error)
	SaveRules(ctx context.Context, rules []models.Rule) error
}

// GET /api/v1/rules
func (s *Server) ListRules(w http.ResponseWriter, r *http.Request) {
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	rulesStore, ok := s.rulesStore.(RulesEngineStore)
	if !ok {
		errorJSON(w, http.StatusInternalServerError, "rules store does not support listing")
		return
	}
	rules, err := rulesStore.ListRules(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list rules")
		return
	}
	writeJSON(w, http.StatusOK, rules)
}

// GET /api/v1/rules/{id}
func (s *Server) GetRule(w http.ResponseWriter, r *http.Request) {
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	rulesStore, ok := s.rulesStore.(RulesEngineStore)
	if !ok {
		errorJSON(w, http.StatusInternalServerError, "rules store does not support listing")
		return
	}
	id := mux.Vars(r)["id"]
	rules, err := rulesStore.ListRules(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list rules")
		return
	}
	for _, rule := range rules {
		if rule.ID == id {
			writeJSON(w, http.StatusOK, rule)
			return
		}
	}
	errorJSON(w, http.StatusNotFound, "rule not found")
}

// POST /api/v1/rules
func (s *Server) CreateRule(w http.ResponseWriter, r *http.Request) {
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	rulesStore, ok := s.rulesStore.(RulesEngineStore)
	if !ok {
		errorJSON(w, http.StatusInternalServerError, "rules store does not support saving")
		return
	}
	var rule models.Rule
	if err := decodeJSON(r, &rule); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid rule payload")
		return
	}
	if rule.ID == "" {
		errorJSON(w, http.StatusBadRequest, "rule id required")
		return
	}
	if rule.Then.SetState == "" {
		errorJSON(w, http.StatusBadRequest, "target state required")
		return
	}
	if len(rule.When.All) == 0 {
		errorJSON(w, http.StatusBadRequest, "at least one condition required")
		return
	}
	rules, err := rulesStore.ListRules(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list rules")
		return
	}
	for _, existing := range rules {
		if existing.ID == rule.ID {
			errorJSON(w, http.StatusConflict, "rule id already exists")
			return
		}
	}
	rules = append(rules, rule)
	if err := rulesStore.SaveRules(r.Context(), rules); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save rule")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

// PUT /api/v1/rules/{id}
func (s *Server) UpdateRule(w http.ResponseWriter, r *http.Request) {
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	rulesStore, ok := s.rulesStore.(RulesEngineStore)
	if !ok {
		errorJSON(w, http.StatusInternalServerError, "rules store does not support saving")
		return
	}
	id := mux.Vars(r)["id"]
	var rule models.Rule
	if err := decodeJSON(r, &rule); err != nil {
		errorJSON(w, http.StatusBadRequest, "invalid rule payload")
		return
	}
	if rule.ID != "" && rule.ID != id {
		errorJSON(w, http.StatusBadRequest, "rule id mismatch")
		return
	}
	rule.ID = id
	if rule.Then.SetState == "" {
		errorJSON(w, http.StatusBadRequest, "target state required")
		return
	}
	if len(rule.When.All) == 0 {
		errorJSON(w, http.StatusBadRequest, "at least one condition required")
		return
	}
	rules, err := rulesStore.ListRules(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list rules")
		return
	}
	found := false
	for i, existing := range rules {
		if existing.ID == id {
			rules[i] = rule
			found = true
			break
		}
	}
	if !found {
		errorJSON(w, http.StatusNotFound, "rule not found")
		return
	}
	if err := rulesStore.SaveRules(r.Context(), rules); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save rule")
		return
	}
	writeJSON(w, http.StatusOK, rule)
}

// DELETE /api/v1/rules/{id}
func (s *Server) DeleteRule(w http.ResponseWriter, r *http.Request) {
	if s.rulesStore == nil {
		errorJSON(w, http.StatusInternalServerError, "rules store not configured")
		return
	}
	rulesStore, ok := s.rulesStore.(RulesEngineStore)
	if !ok {
		errorJSON(w, http.StatusInternalServerError, "rules store does not support saving")
		return
	}
	id := mux.Vars(r)["id"]
	rules, err := rulesStore.ListRules(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list rules")
		return
	}
	found := false
	filtered := make([]models.Rule, 0, len(rules))
	for _, rule := range rules {
		if rule.ID == id {
			found = true
		} else {
			filtered = append(filtered, rule)
		}
	}
	if !found {
		errorJSON(w, http.StatusNotFound, "rule not found")
		return
	}
	if err := rulesStore.SaveRules(r.Context(), filtered); err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to save rules")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GET /api/v1/deployables-with-logic
func (s *Server) ListDeployablesWithLogic(w http.ResponseWriter, r *http.Request) {
	deployables, err := s.store.ListDeployables(r.Context())
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to list deployables")
		return
	}
	type DeployableWithLogic struct {
		DeployableID string `json:"deployable_id"`
		LogicID      string `json:"logic_id"`
		Status       string `json:"status"`
		Tags         []string `json:"tags"`
	}
	result := make([]DeployableWithLogic, 0, len(deployables))
	for _, dep := range deployables {
		ctx, ok, err := s.rulesStore.GetDeployableContext(r.Context(), dep.DeployableID)
		if err != nil || !ok {
			ctx = models.DeployableContext{
				DeployableID: dep.DeployableID,
				LogicID:      dep.AssignedLogicID,
			}
		}
		result = append(result, DeployableWithLogic{
			DeployableID: dep.DeployableID,
			LogicID:      ctx.LogicID,
			Status:       dep.Status,
			Tags:         ctx.Tags,
		})
	}
	writeJSON(w, http.StatusOK, result)
}

// GET /api/v1/states
func (s *Server) ListStates(w http.ResponseWriter, r *http.Request) {
	states := make(map[string]bool)
	files, err := readShowLogicFiles()
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to read show logic files")
		return
	}
	for _, file := range files {
		def, err := loadShowLogicFile(file.File)
		if err != nil {
			continue
		}
		for _, state := range def.States {
			if state.Name != "" {
				states[state.Name] = true
			}
		}
	}
	stateList := make([]string, 0, len(states))
	for state := range states {
		stateList = append(stateList, state)
	}
	writeJSON(w, http.StatusOK, stateList)
}

// GET /api/v1/signals
func (s *Server) ListAllSignals(w http.ResponseWriter, r *http.Request) {
	signalsMap := make(map[string]models.SignalDefinition)
	
	// First, get signals from show logic files
	files, err := readShowLogicFiles()
	if err == nil {
		for _, file := range files {
			def, err := loadShowLogicFile(file.File)
			if err != nil {
				continue
			}
			for _, sig := range def.Signals {
				if sig.Name != "" && sig.Type != "" {
					signalsMap[sig.Name] = sig
				}
			}
		}
	}
	
	// Also get signals from signal_defs.json (stored signal definitions)
	// Try to read signal_defs.json directly
	if s.rulesStore != nil {
		// We need to get the data directory path - try to infer it from the store
		// For now, try common locations or read from signal_defs.json in data directory
		signalDefsPath := filepath.Join("data", "signal_defs.json")
		if data, err := os.ReadFile(signalDefsPath); err == nil {
			var allSignalDefs map[string][]models.SignalDefinition
			if err := json.Unmarshal(data, &allSignalDefs); err == nil {
				for _, defs := range allSignalDefs {
					for _, sig := range defs {
						if sig.Name != "" && sig.Type != "" {
							signalsMap[sig.Name] = sig
						}
					}
				}
			}
		}
	}
	
	// Also infer signals from existing rules (extract signal names from rule conditions)
	if s.rulesStore != nil {
		rulesStore, ok := s.rulesStore.(RulesEngineStore)
		if ok {
			rules, err := rulesStore.ListRules(r.Context())
			if err == nil {
				for _, rule := range rules {
					// Check both "all" and "any" conditions
					conditions := rule.When.All
					if len(conditions) == 0 {
						conditions = rule.When.Any
					}
					for _, cond := range conditions {
						if cond.Signal != "" {
							// If we don't have a type for this signal, infer it as "string" as default
							if _, exists := signalsMap[cond.Signal]; !exists {
								signalsMap[cond.Signal] = models.SignalDefinition{
									Name: cond.Signal,
									Type: models.SignalString, // Default type
								}
							}
						}
					}
				}
			}
		}
	}
	
	signalList := make([]models.SignalDefinition, 0, len(signalsMap))
	for _, sig := range signalsMap {
		signalList = append(signalList, sig)
	}
	writeJSON(w, http.StatusOK, signalList)
}

// GET /api/v1/deployables/{id}/signals
func (s *Server) GetDeployableSignals(w http.ResponseWriter, r *http.Request) {
	id := parseIDParam(r)
	if err := ensureDeployableID(id); err != nil {
		errorJSON(w, http.StatusBadRequest, "deployable id required")
		return
	}
	ctx, ok, err := s.rulesStore.GetDeployableContext(r.Context(), id)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load deployable context")
		return
	}
	if !ok || ctx.LogicID == "" {
		errorJSON(w, http.StatusNotFound, "deployable has no assigned logic")
		return
	}
	defs, ok, err := s.rulesStore.GetSignalDefinitions(r.Context(), ctx.LogicID)
	if err != nil {
		errorJSON(w, http.StatusInternalServerError, "failed to load signal definitions")
		return
	}
	if !ok || len(defs) == 0 {
		defs, err = s.signalDefsFromLogic(r, ctx.LogicID)
		if err != nil {
			errorJSON(w, http.StatusInternalServerError, "failed to load show logic signals")
			return
		}
	}
	signalList := make([]models.SignalDefinition, 0, len(defs))
	for _, def := range defs {
		signalList = append(signalList, def)
	}
	writeJSON(w, http.StatusOK, signalList)
}
