package engine

import (
	"errors"
	"log"
	"sync"
	"time"

	"deployable/internal/types"
)

type ShowLogicEngine interface {
	Load(def types.ShowLogicDefinition) error
	Start(initialState string)
	Stop()
	OnGlobalState(update types.GlobalStateUpdate)
	OnSensorEvent(event types.SensorEvent)
	OnTimer(event types.TimerEvent)
	Actions() <-chan types.EngineAction
}

type Engine struct {
	mu           sync.Mutex
	definition   types.ShowLogicDefinition
	stateIndex   map[string]types.ShowState
	currentState string
	actions      chan types.EngineAction
	timers       map[string]*time.Timer
	running      bool
}

func NewEngine() *Engine {
	return &Engine{
		actions: make(chan types.EngineAction, 256),
		timers:  make(map[string]*time.Timer),
	}
}

func (e *Engine) Load(def types.ShowLogicDefinition) error {
	if def.LogicID == "" {
		return errors.New("show logic missing logic_id")
	}
	index := make(map[string]types.ShowState)
	for _, state := range def.States {
		if state.Name == "" {
			return errors.New("show state missing name")
		}
		if _, exists := index[state.Name]; exists {
			return errors.New("duplicate show state name: " + state.Name)
		}
		index[state.Name] = state
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.definition = def
	e.stateIndex = index
	return nil
}

func (e *Engine) Start(initialState string) {
	e.mu.Lock()
	e.running = true
	e.mu.Unlock()
	if initialState != "" {
		e.OnGlobalState(types.GlobalStateUpdate{
			State:     initialState,
			Version:   0,
			Timestamp: time.Now().UTC(),
		})
	}
}

func (e *Engine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, timer := range e.timers {
		timer.Stop()
	}
	e.timers = make(map[string]*time.Timer)
	e.running = false
	e.currentState = ""
}

func (e *Engine) Actions() <-chan types.EngineAction {
	return e.actions
}

func (e *Engine) OnGlobalState(update types.GlobalStateUpdate) {
	e.mu.Lock()
	if !e.running {
		e.mu.Unlock()
		return
	}
	if update.State == e.currentState {
		e.mu.Unlock()
		return
	}
	prevStateName := e.currentState
	nextStateName := update.State
	prevState, _ := e.stateIndex[prevStateName]
	nextState, ok := e.stateIndex[nextStateName]
	e.mu.Unlock()
	if !ok {
		log.Printf("state %s not in show logic", nextStateName)
		return
	}

	if prevStateName != "" {
		e.executeActions(prevState.OnExit)
		e.cancelTimers()
	}

	e.mu.Lock()
	e.currentState = nextStateName
	e.mu.Unlock()

	e.executeActions(nextState.OnEnter)
	e.armTimers(nextState)
}

func (e *Engine) OnSensorEvent(event types.SensorEvent) {
	e.mu.Lock()
	if !e.running {
		e.mu.Unlock()
		return
	}
	state := e.stateIndex[e.currentState]
	e.mu.Unlock()
	for _, handler := range state.SensorHandlers {
		if handler.SensorID != "" && handler.SensorID != event.SensorID {
			continue
		}
		if handler.EventType != "" && handler.EventType != event.EventType {
			continue
		}
		if !evaluateCondition(handler.Condition, event.Value) {
			continue
		}
		e.executeActions(handler.Actions)
	}
}

func (e *Engine) OnTimer(event types.TimerEvent) {
	e.mu.Lock()
	if !e.running {
		e.mu.Unlock()
		return
	}
	state := e.stateIndex[e.currentState]
	e.mu.Unlock()
	for _, handler := range state.TimerHandlers {
		if handler.TimerID == event.TimerID {
			e.executeActions(handler.Actions)
		}
	}
}

func (e *Engine) executeActions(actions []types.ActionTemplate) {
	for _, action := range actions {
		e.actions <- types.EngineAction{
			Action: action.Action,
			Target: action.Target,
			Params: action.Params,
		}
	}
}

func (e *Engine) armTimers(state types.ShowState) {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, timer := range state.Timers {
		timerID := timer.TimerID
		delay := time.Duration(timer.DelayMs) * time.Millisecond
		if delay <= 0 {
			continue
		}
		t := time.AfterFunc(delay, func() {
			e.OnTimer(types.TimerEvent{
				TimerID:   timerID,
				Timestamp: time.Now().UTC(),
			})
		})
		e.timers[timerID] = t
	}
}

func (e *Engine) cancelTimers() {
	e.mu.Lock()
	defer e.mu.Unlock()
	for _, timer := range e.timers {
		timer.Stop()
	}
	e.timers = make(map[string]*time.Timer)
}

func evaluateCondition(condition map[string]any, value any) bool {
	if len(condition) == 0 {
		return true
	}
	eq, ok := condition["eq"]
	if ok {
		return eq == value
	}
	return true
}

