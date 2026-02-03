package state

import (
	"errors"
	"sort"
	"strings"
	"time"

	"state-server/internal/models"
)

type RuleIndex struct {
	bySignal map[string][]models.Rule
	stateOnly []models.Rule
}

func BuildRuleIndex(rules []models.Rule) RuleIndex {
	index := RuleIndex{
		bySignal: make(map[string][]models.Rule),
		stateOnly: []models.Rule{},
	}
	for _, rule := range rules {
		signals := ruleSignals(rule)
		if len(signals) == 0 {
			index.stateOnly = append(index.stateOnly, rule)
			continue
		}
		for _, sig := range signals {
			index.bySignal[sig] = append(index.bySignal[sig], rule)
		}
	}
	return index
}

func EvaluateRules(current models.GlobalState, event models.Event, rules []models.Rule, getLastFired func(string) (time.Time, bool, error), setLastFired func(string, time.Time) error) (models.GlobalState, bool, error) {
	candidates := collectCandidates(event, rules)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].ID < candidates[j].ID
	})
	for _, rule := range candidates {
		if !rule.Enabled {
			continue
		}
		if !matches(rule, current, event) {
			continue
		}
		if rule.Timing != nil && rule.Timing.CooldownMS > 0 {
			last, ok, err := getLastFired(rule.ID)
			if err != nil {
				return current, false, err
			}
			if ok {
				cooldown := time.Duration(rule.Timing.CooldownMS) * time.Millisecond
				if event.Timestamp.Before(last.Add(cooldown)) {
					continue
				}
			}
		}
		if rule.Then.SetState != "" {
			current.State = rule.Then.SetState
		}
		if err := setLastFired(rule.ID, event.Timestamp); err != nil {
			return current, false, err
		}
		return current, true, nil
	}
	return current, false, nil
}

func collectCandidates(event models.Event, rules []models.Rule) []models.Rule {
	index := BuildRuleIndex(rules)
	seen := map[string]models.Rule{}
	for signal := range event.Signals {
		for _, rule := range index.bySignal[signal] {
			seen[rule.ID] = rule
		}
	}
	for _, rule := range index.stateOnly {
		seen[rule.ID] = rule
	}
	out := make([]models.Rule, 0, len(seen))
	for _, rule := range seen {
		out = append(out, rule)
	}
	return out
}

func matches(rule models.Rule, state models.GlobalState, event models.Event) bool {
	group := rule.When
	if len(group.All) == 0 && len(group.Any) == 0 {
		return false
	}
	if len(group.All) > 0 {
		for _, cond := range group.All {
			if !conditionMatch(cond, state, event) {
				return false
			}
		}
		return true
	}
	for _, cond := range group.Any {
		if conditionMatch(cond, state, event) {
			return true
		}
	}
	return false
}

func conditionMatch(cond models.Condition, state models.GlobalState, event models.Event) bool {
	if cond.StateIs != nil {
		return state.State == *cond.StateIs
	}
	if cond.Signal == "" {
		return false
	}
	if cond.Source != nil {
		if len(cond.Source.Tags) > 0 && !hasOverlap(cond.Source.Tags, event.Tags) {
			return false
		}
		if len(cond.Source.LogicIDs) > 0 && !contains(cond.Source.LogicIDs, event.LogicID) {
			return false
		}
		if len(cond.Source.DeployableIDs) > 0 && !contains(cond.Source.DeployableIDs, event.DeployableID) {
			return false
		}
	}
	val, ok := event.Signals[cond.Signal]
	if !ok {
		return false
	}
	return compare(val, strings.ToLower(cond.Op), cond.Value)
}

func ruleSignals(rule models.Rule) []string {
	signals := []string{}
	conds := rule.When.All
	if len(conds) == 0 {
		conds = rule.When.Any
	}
	for _, cond := range conds {
		if cond.Signal != "" {
			signals = append(signals, cond.Signal)
		}
	}
	return signals
}

func compare(signal models.SignalValue, op string, rhs any) bool {
	switch op {
	case "equals":
		return equals(signal, rhs)
	case "gt":
		return compareNumber(signal, rhs, ">")
	case "lt":
		return compareNumber(signal, rhs, "<")
	case "all":
		return compareAll(signal, rhs)
	default:
		return false
	}
}

func equals(signal models.SignalValue, rhs any) bool {
	switch signal.Type {
	case models.SignalBool:
		val, ok := signal.Value.(bool)
		rhsBool, rok := rhs.(bool)
		return ok && rok && val == rhsBool
	case models.SignalNumber:
		val, ok := signal.Value.(float64)
		rhsNum, rok := asNumber(rhs)
		return ok && rok && val == rhsNum
	case models.SignalString:
		val, ok := signal.Value.(string)
		rhsStr, rok := rhs.(string)
		return ok && rok && val == rhsStr
	case models.SignalVector2:
		val, ok := signal.Value.([]float64)
		rhsVec, rok := asVector2(rhs)
		return ok && rok && val[0] == rhsVec[0] && val[1] == rhsVec[1]
	default:
		return false
	}
}

func compareNumber(signal models.SignalValue, rhs any, op string) bool {
	if signal.Type != models.SignalNumber {
		return false
	}
	val, ok := signal.Value.(float64)
	rhsNum, rok := asNumber(rhs)
	if !ok || !rok {
		return false
	}
	switch op {
	case ">":
		return val > rhsNum
	case "<":
		return val < rhsNum
	default:
		return false
	}
}

func compareAll(signal models.SignalValue, rhs any) bool {
	if signal.Type != models.SignalVector2 {
		return false
	}
	val, ok := signal.Value.([]float64)
	if !ok || len(val) != 2 {
		return false
	}
	rhsVec, err := rhsVector(rhs)
	if err != nil {
		return false
	}
	return val[0] >= rhsVec[0] && val[1] >= rhsVec[1]
}

func rhsVector(rhs any) ([]float64, error) {
	if num, ok := asNumber(rhs); ok {
		return []float64{num, num}, nil
	}
	if vec, ok := asVector2(rhs); ok {
		return vec, nil
	}
	return nil, errors.New("invalid vector rhs")
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

func asVector2(v any) ([]float64, bool) {
	switch vec := v.(type) {
	case []float64:
		if len(vec) == 2 {
			return vec, true
		}
	case []any:
		if len(vec) == 2 {
			x, xok := asNumber(vec[0])
			y, yok := asNumber(vec[1])
			if xok && yok {
				return []float64{x, y}, true
			}
		}
	}
	return nil, false
}

func hasOverlap(a, b []string) bool {
	for _, item := range a {
		if contains(b, item) {
			return true
		}
	}
	return false
}

func contains(list []string, value string) bool {
	for _, item := range list {
		if item == value {
			return true
		}
	}
	return false
}
