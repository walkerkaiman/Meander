package ws

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"state-server/internal/models"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = 50 * time.Second
)

type Hub struct {
	mu       sync.RWMutex
	clients  map[string]map[*Client]struct{}
	active   map[string]bool
	upgrader websocket.Upgrader
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]map[*Client]struct{}),
		active:  make(map[string]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	deployableID := r.URL.Query().Get("deployable_id")
	client := &Client{
		hub:          h,
		conn:         conn,
		send:         make(chan []byte, 16),
		deployableID: deployableID,
	}
	h.register(client)
	go client.writeLoop()
	client.readLoop()
}

func (h *Hub) BroadcastState(state models.GlobalState) {
	payload := struct {
		Type      string                 `json:"type"`
		State     string                 `json:"state"`
		Version   int                    `json:"version"`
		Timestamp time.Time              `json:"timestamp"`
		Variables map[string]interface{} `json:"variables"`
	}{
		Type:      "state_update",
		State:     state.State,
		Version:   state.Version,
		Timestamp: state.Timestamp,
		Variables: state.Variables,
	}
	data, _ := json.Marshal(payload)
	h.broadcastAll(data)
}

func (h *Hub) NotifyLogicUpdate(deployableID string) {
	if deployableID == "" {
		return
	}
	payload := map[string]string{"type": "logic_update_available"}
	data, _ := json.Marshal(payload)
	h.broadcastTo(deployableID, data)
}

func (h *Hub) SetActive(deployableID string, active bool) {
	if deployableID == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.active[deployableID] = active
}

func (h *Hub) register(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[client.deployableID] == nil {
		h.clients[client.deployableID] = make(map[*Client]struct{})
	}
	h.clients[client.deployableID][client] = struct{}{}
}

func (h *Hub) unregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[client.deployableID]; ok {
		delete(set, client)
		if len(set) == 0 {
			delete(h.clients, client.deployableID)
		}
	}
}

func (h *Hub) broadcastAll(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, set := range h.clients {
		for client := range set {
			if client.deployableID == "" || h.active[client.deployableID] {
				client.enqueue(message)
			}
		}
	}
}

func (h *Hub) broadcastTo(deployableID string, message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if set, ok := h.clients[deployableID]; ok {
		for client := range set {
			client.enqueue(message)
		}
	}
}

type Client struct {
	hub          *Hub
	conn         *websocket.Conn
	send         chan []byte
	deployableID string
}

func (c *Client) readLoop() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(1024 * 8)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *Client) writeLoop() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) enqueue(message []byte) {
	select {
	case c.send <- message:
	default:
		_ = c.conn.Close()
	}
}
