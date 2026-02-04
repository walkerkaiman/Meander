package actions

import (
	"log"

	"deployable/internal/types"
)

type ActionExecutor interface {
	ActionName() string
	Execute(target string, params map[string]any) error
}

type Dispatcher struct {
	executors map[string]ActionExecutor
	incoming  <-chan types.EngineAction
	errorSink chan<- DispatchError
}

// UpdateExecutor allows updating an executor after creation (e.g., to set DeviceID)
func (d *Dispatcher) UpdateExecutor(actionName string, executor ActionExecutor) {
	d.executors[actionName] = executor
}

type DispatchError struct {
	Action types.EngineAction
	Err    error
}

func NewDispatcher(incoming <-chan types.EngineAction, executors []ActionExecutor, errorSink chan<- DispatchError) *Dispatcher {
	execMap := make(map[string]ActionExecutor)
	for _, exec := range executors {
		execMap[exec.ActionName()] = exec
	}
	return &Dispatcher{
		executors: execMap,
		incoming:  incoming,
		errorSink: errorSink,
	}
}

func (d *Dispatcher) Run(stop <-chan struct{}) {
	for {
		select {
		case <-stop:
			return
		case action := <-d.incoming:
			exec, ok := d.executors[action.Action]
			if !ok {
				log.Printf("action executor not found: %s", action.Action)
				continue
			}
			if err := exec.Execute(action.Target, action.Params); err != nil {
				log.Printf("action %s failed: %v", action.Action, err)
				if d.errorSink != nil {
					d.errorSink <- DispatchError{Action: action, Err: err}
				}
			}
		}
	}
}

func (d *Dispatcher) SupportedActions() map[string]bool {
	supported := make(map[string]bool, len(d.executors))
	for name := range d.executors {
		supported[name] = true
	}
	return supported
}

