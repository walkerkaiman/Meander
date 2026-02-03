package jsonstore

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"state-server/internal/models"
)

type Store struct {
	dir string
	mu  sync.Mutex
}

func NewStore(dir string) (*Store, error) {
	if dir == "" {
		return nil, errors.New("jsonstore: data dir required")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	return &Store{dir: dir}, nil
}

func (s *Store) ListRules(_ context.Context) ([]models.Rule, error) {
	var rules []models.Rule
	if err := s.readJSON(s.rulesPath(), &rules); err != nil {
		if os.IsNotExist(err) {
			return []models.Rule{}, nil
		}
		return nil, err
	}
	sort.Slice(rules, func(i, j int) bool { return rules[i].ID < rules[j].ID })
	return rules, nil
}

func (s *Store) SaveRules(_ context.Context, rules []models.Rule) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.writeJSON(s.rulesPath(), rules)
}

func (s *Store) SaveStateSnapshot(_ context.Context, state models.GlobalState) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.writeJSON(s.statePath(), state)
}

func (s *Store) LoadStateSnapshot(_ context.Context) (models.GlobalState, bool, error) {
	var state models.GlobalState
	if err := s.readJSON(s.statePath(), &state); err != nil {
		if os.IsNotExist(err) {
			return models.GlobalState{}, false, nil
		}
		return models.GlobalState{}, false, err
	}
	return state, true, nil
}

func (s *Store) GetRuleLastFired(_ context.Context, ruleID string) (time.Time, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	timestamps, err := s.loadCooldowns()
	if err != nil {
		return time.Time{}, false, err
	}
	ts, ok := timestamps[ruleID]
	return ts, ok, nil
}

func (s *Store) SetRuleLastFired(_ context.Context, ruleID string, ts time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	timestamps, err := s.loadCooldowns()
	if err != nil {
		return err
	}
	timestamps[ruleID] = ts
	return s.writeJSON(s.cooldownsPath(), timestamps)
}

func (s *Store) SaveDeployableContext(_ context.Context, ctx models.DeployableContext) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	all, err := s.loadContexts()
	if err != nil {
		return err
	}
	all[ctx.DeployableID] = ctx
	return s.writeJSON(s.contextsPath(), all)
}

func (s *Store) GetDeployableContext(_ context.Context, id string) (models.DeployableContext, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	all, err := s.loadContexts()
	if err != nil {
		return models.DeployableContext{}, false, err
	}
	ctx, ok := all[id]
	return ctx, ok, nil
}

func (s *Store) SaveSignalDefinitions(_ context.Context, role string, defs []models.SignalDefinition) error {
	if role == "" {
		return errors.New("logic id required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	all, err := s.loadSignalDefs()
	if err != nil {
		return err
	}
	all[role] = defs
	return s.writeJSON(s.signalDefsPath(), all)
}

func (s *Store) GetSignalDefinitions(_ context.Context, role string) (map[string]models.SignalDefinition, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	all, err := s.loadSignalDefs()
	if err != nil {
		return nil, false, err
	}
	defs, ok := all[role]
	if !ok {
		return nil, false, nil
	}
	out := make(map[string]models.SignalDefinition, len(defs))
	for _, def := range defs {
		out[def.Name] = def
	}
	return out, true, nil
}

func (s *Store) rulesPath() string    { return filepath.Join(s.dir, "rules.json") }
func (s *Store) statePath() string    { return filepath.Join(s.dir, "state.json") }
func (s *Store) contextsPath() string { return filepath.Join(s.dir, "contexts.json") }
func (s *Store) cooldownsPath() string { return filepath.Join(s.dir, "cooldowns.json") }
func (s *Store) signalDefsPath() string { return filepath.Join(s.dir, "signal_defs.json") }

func (s *Store) readJSON(path string, dst any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, dst)
}

func (s *Store) writeJSON(path string, value any) error {
	tmp := path + ".tmp"
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *Store) loadContexts() (map[string]models.DeployableContext, error) {
	all := map[string]models.DeployableContext{}
	if err := s.readJSON(s.contextsPath(), &all); err != nil {
		if os.IsNotExist(err) {
			return all, nil
		}
		return nil, err
	}
	return all, nil
}

func (s *Store) loadCooldowns() (map[string]time.Time, error) {
	all := map[string]time.Time{}
	if err := s.readJSON(s.cooldownsPath(), &all); err != nil {
		if os.IsNotExist(err) {
			return all, nil
		}
		return nil, err
	}
	return all, nil
}

func (s *Store) loadSignalDefs() (map[string][]models.SignalDefinition, error) {
	all := map[string][]models.SignalDefinition{}
	if err := s.readJSON(s.signalDefsPath(), &all); err != nil {
		if os.IsNotExist(err) {
			return all, nil
		}
		return nil, err
	}
	return all, nil
}
