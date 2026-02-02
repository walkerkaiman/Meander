package server

import "state-server/internal/models"

type MultiBroadcaster struct {
	Hub    Broadcaster
	Server *Server
}

type Broadcaster interface {
	BroadcastState(state models.GlobalState)
}

func (b *MultiBroadcaster) BroadcastState(state models.GlobalState) {
	if b.Hub != nil {
		b.Hub.BroadcastState(state)
	}
	if b.Server != nil {
		b.Server.BroadcastStateToDeployables(state)
	}
}
