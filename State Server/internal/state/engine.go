package state

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

	"state-server/internal/models"
)

func ApplyRules(current models.GlobalState, event models.InputEvent, rules []models.Rule) models.GlobalState {
	next := current
	if next.Variables == nil {
		next.Variables = map[string]interface{}{}
	}
	for _, rule := range rules {
		if !ruleMatches(rule, next, event) {
			continue
		}
		if rule.Then.SetState != "" {
			next.State = rule.Then.SetState
		}
		for key, value := range rule.Then.SetVariables {
			next.Variables[key] = value
		}
	}
	return next
}

func ruleMatches(rule models.Rule, state models.GlobalState, event models.InputEvent) bool {
	if rule.When.State != "" && rule.When.State != state.State {
		return false
	}
	for _, cond := range rule.When.Conditions {
		if !evaluateCondition(cond, state, event) {
			return false
		}
	}
	return true
}

func evaluateCondition(cond models.RuleCondition, state models.GlobalState, event models.InputEvent) bool {
	fieldValue, ok := resolveField(cond.Field, state, event)
	if !ok {
		return false
	}
	switch strings.ToLower(cond.Op) {
	case "eq":
		return compareEqual(fieldValue, cond.Value)
	case "neq":
		return !compareEqual(fieldValue, cond.Value)
	case "gt":
		return compareFloat(fieldValue, cond.Value, ">")
	case "gte":
		return compareFloat(fieldValue, cond.Value, ">=")
	case "lt":
		return compareFloat(fieldValue, cond.Value, "<")
	case "lte":
		return compareFloat(fieldValue, cond.Value, "<=")
	default:
		return false
	}
}

func resolveField(field string, state models.GlobalState, event models.InputEvent) (interface{}, bool) {
	field = strings.TrimSpace(field)
	if field == "" {
		return nil, false
	}
	if field == "state" {
		return state.State, true
	}
	if strings.HasPrefix(field, "variables.") {
		key := strings.TrimPrefix(field, "variables.")
		value, ok := state.Variables[key]
		return value, ok
	}
	if strings.HasPrefix(field, "event.") {
		key := strings.TrimPrefix(field, "event.")
		switch key {
		case "deployable_id":
			return event.DeployableID, true
		case "input_id":
			return event.InputID, true
		case "event_type":
			return event.EventType, true
		case "value":
			return event.Value, true
		default:
			return nil, false
		}
	}
	return nil, false
}

func compareEqual(a, b interface{}) bool {
	if reflect.DeepEqual(a, b) {
		return true
	}
	if af, aok := coerceFloat(a); aok {
		if bf, bok := coerceFloat(b); bok {
			return af == bf
		}
	}
	if ab, aok := coerceBool(a); aok {
		if bb, bok := coerceBool(b); bok {
			return ab == bb
		}
	}
	return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
}

func compareFloat(a, b interface{}, op string) bool {
	af, aok := coerceFloat(a)
	bf, bok := coerceFloat(b)
	if !aok || !bok {
		return false
	}
	switch op {
	case ">":
		return af > bf
	case ">=":
		return af >= bf
	case "<":
		return af < bf
	case "<=":
		return af <= bf
	default:
		return false
	}
}

func coerceFloat(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case int32:
		return float64(v), true
	case jsonNumber:
		if f, err := v.Float64(); err == nil {
			return f, true
		}
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f, true
		}
	}
	return 0, false
}

func coerceBool(value interface{}) (bool, bool) {
	switch v := value.(type) {
	case bool:
		return v, true
	case string:
		if b, err := strconv.ParseBool(v); err == nil {
			return b, true
		}
	}
	return false, false
}

// jsonNumber mirrors encoding/json.Number without importing encoding/json.
type jsonNumber interface {
	Float64() (float64, error)
}
