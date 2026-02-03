package state

import (
	"context"
	"log"
	"reflect"
	"time"

	"state-server/internal/models"
)

type Store interface {
	ListRules(ctx context.Context) ([]models.Rule, error)
	SaveStateSnapshot(ctx context.Context, state models.GlobalState) error
	LoadStateSnapshot(ctx context.Context) (models.GlobalState, bool, error)
	GetRuleLastFired(ctx context.Context, ruleID string) (time.Time, bool, error)
	SetRuleLastFired(ctx context.Context, ruleID string, ts time.Time) error
}

type Broadcaster interface {
	BroadcastState(state models.GlobalState)
}

type Loop struct {
	store       Store
	broadcaster Broadcaster
	initial     models.GlobalState
	overrides   chan StateOverride
}

type StateOverride struct {
	State     string
	Variables map[string]interface{}
}

func NewLoop(store Store, broadcaster Broadcaster, initial models.GlobalState) *Loop {
	return &Loop{
		store:       store,
		broadcaster: broadcaster,
		initial:     initial,
		overrides:   make(chan StateOverride, 16),
	}
}

func (l *Loop) OverrideState(state string, variables map[string]interface{}) bool {
	select {
	case l.overrides <- StateOverride{State: state, Variables: variables}:
		return true
	default:
		return false
	}
}

func (l *Loop) Run(ctx context.Context, eventCh <-chan models.Event) {
	state := l.initial
	if snapshot, ok, err := l.store.LoadStateSnapshot(ctx); err == nil && ok {
		state = snapshot
	}
	if state.Variables == nil {
		state.Variables = map[string]interface{}{}
	}

	for {
		select {
		case <-ctx.Done():
			return
		case override := <-l.overrides:
			next := state
			if override.State != "" {
				next.State = override.State
			}
			if override.Variables != nil {
				next.Variables = override.Variables
			}
			changed := stateChanged(state, next)
			next.Timestamp = time.Now().UTC()
			next.Version = state.Version + 1
			if changed {
				log.Printf("state: override %s -> %s (v%d)", state.State, next.State, next.Version)
			} else {
				log.Printf("state: override (forced) %s (v%d)", next.State, next.Version)
			}
			if err := l.store.SaveStateSnapshot(ctx, next); err == nil {
				l.broadcaster.BroadcastState(next)
			}
			state = next
		case event, ok := <-eventCh:
			if !ok {
				return
			}
			rules, err := l.store.ListRules(ctx)
			if err != nil {
				continue
			}
			next, fired, err := EvaluateRules(state, event, rules,
				func(ruleID string) (time.Time, bool, error) {
					return l.store.GetRuleLastFired(ctx, ruleID)
				},
				func(ruleID string, ts time.Time) error {
					return l.store.SetRuleLastFired(ctx, ruleID, ts)
				},
			)
			if err != nil {
				continue
			}
			if fired {
				next.Timestamp = time.Now().UTC()
				next.Version = state.Version + 1
				log.Printf("state: rule %s -> %s (v%d)", state.State, next.State, next.Version)
				if err := l.store.SaveStateSnapshot(ctx, next); err == nil {
					l.broadcaster.BroadcastState(next)
				}
				state = next
			}
		}
	}
}

func stateChanged(a, b models.GlobalState) bool {
	if a.State != b.State {
		return true
	}
	return !reflect.DeepEqual(a.Variables, b.Variables)
}
