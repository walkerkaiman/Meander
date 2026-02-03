package server

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net"
	"os"
	"time"

	"deployable/internal/types"
	"nhooyr.io/websocket"
)

type HelloMessage struct {
	Type              string                 `json:"type"`
	DeviceID          string                 `json:"device_id"`
	Hostname          string                 `json:"hostname"`
	IP                string                 `json:"ip"`
	AgentVersion      string                 `json:"agent_version"`
	PairingCode       string                 `json:"pairing_code,omitempty"`
	AssignedLogicID   string                 `json:"assigned_logic_id,omitempty"`
	ProfileVersion    int                    `json:"assigned_profile_version,omitempty"`
	ShowLogicVersion  int                    `json:"assigned_show_logic_version,omitempty"`
	Capabilities      types.CapabilityReport `json:"capabilities"`
}

type IdentifyMessage struct {
	Type string `json:"type"`
}

type AssignRoleMessage struct {
	Type       string                    `json:"type"`
	LogicID    string                    `json:"logic_id"`
	ServerID   string                    `json:"server_id"`
	Profile    types.ExecutionProfile    `json:"profile"`
	ShowLogic  types.ShowLogicDefinition `json:"show_logic"`
}

type StateUpdateMessage struct {
	Type      string    `json:"type"`
	State     string    `json:"state"`
	Version   int       `json:"version"`
	Timestamp time.Time `json:"timestamp"`
}

type AssignRoleAck struct {
	Type     string `json:"type"`
	DeviceID string `json:"device_id"`
	LogicID  string `json:"logic_id"`
	Status  string `json:"status"`
	Error   string `json:"error,omitempty"`
}

type IdentifyAck struct {
	Type     string `json:"type"`
	DeviceID string `json:"device_id"`
	Supported bool  `json:"supported"`
}

type SensorEventMessage struct {
	Type string `json:"type"`
	types.SensorEvent
}

type Client struct {
	ServerURL string
}

type Incoming struct {
	RawType string
	Payload any
}

func (c *Client) Run(ctx context.Context, hello HelloMessage, incoming chan<- Incoming, outgoing <-chan any, connected chan<- time.Time) {
	backoff := time.Second
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		conn, _, err := websocket.Dial(ctx, c.ServerURL, nil)
		if err != nil {
			log.Printf("server connection failed: %v", err)
			time.Sleep(backoff)
			if backoff < 30*time.Second {
				backoff *= 2
			}
			continue
		}
		backoff = time.Second
		connected <- time.Now().UTC()
		if err := writeJSON(ctx, conn, hello); err != nil {
			log.Printf("hello send failed: %v", err)
			_ = conn.Close(websocket.StatusInternalError, "hello failed")
			continue
		}
		readCtx, cancel := context.WithCancel(ctx)
		readDone := make(chan struct{})
		go func() {
			defer close(readDone)
			for {
				var envelope map[string]any
				if err := readJSON(readCtx, conn, &envelope); err != nil {
					if !errors.Is(err, context.Canceled) {
						log.Printf("server read failed: %v", err)
					}
					return
				}
				msgType, _ := envelope["type"].(string)
				switch msgType {
				case "identify":
					incoming <- Incoming{RawType: msgType, Payload: IdentifyMessage{Type: msgType}}
				case "assign_role":
					data, _ := json.Marshal(envelope)
					var msg AssignRoleMessage
					if err := json.Unmarshal(data, &msg); err != nil {
						log.Printf("assign_role parse failed: %v", err)
						continue
					}
					incoming <- Incoming{RawType: msgType, Payload: msg}
				case "state_update":
					data, _ := json.Marshal(envelope)
					var msg StateUpdateMessage
					if err := json.Unmarshal(data, &msg); err != nil {
						log.Printf("state_update parse failed: %v", err)
						continue
					}
					incoming <- Incoming{RawType: msgType, Payload: msg}
				default:
					log.Printf("unknown message type: %s", msgType)
				}
			}
		}()
		writeDone := make(chan struct{})
		go func() {
			defer close(writeDone)
			for {
				select {
				case <-readCtx.Done():
					return
				case msg := <-outgoing:
					if err := writeJSON(readCtx, conn, msg); err != nil {
						log.Printf("server write failed: %v", err)
						cancel()
						return
					}
				}
			}
		}()
		select {
		case <-readDone:
		case <-writeDone:
		case <-ctx.Done():
		}
		cancel()
		_ = conn.Close(websocket.StatusNormalClosure, "reconnect")
	}
}

func Hostname() string {
	name, _ := os.Hostname()
	return name
}

func LocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}
	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String()
			}
		}
	}
	return ""
}

func writeJSON(ctx context.Context, conn *websocket.Conn, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return conn.Write(ctx, websocket.MessageText, data)
}

func readJSON(ctx context.Context, conn *websocket.Conn, v any) error {
	_, data, err := conn.Read(ctx)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

