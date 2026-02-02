package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"state-server/internal/models"
	"state-server/internal/ws"
)

type Store interface {
	UpsertDeployable(ctx context.Context, req models.RegisterDeployableRequest) (models.DeployableRecord, bool, error)
	GetDeployable(ctx context.Context, id string) (models.DeployableRecord, bool, error)
	ListDeployables(ctx context.Context) ([]models.DeployableRecord, error)
	UpdateDeployableRole(ctx context.Context, id, role string) error
	UpdateDeployableStatus(ctx context.Context, id, status string) error
	UpdateDeployableLogicVersion(ctx context.Context, id, version string) error
	InsertEvent(ctx context.Context, event models.InputEvent) error
	GetLatestShowLogicForRole(ctx context.Context, role string) (models.ShowLogicPackage, bool, error)
	GetShowLogicByID(ctx context.Context, packageID string) (models.ShowLogicPackage, bool, error)
	SaveShowLogicPackage(ctx context.Context, pkg models.ShowLogicPackage, createdBy string) error
}

type Server struct {
	store         Store
	hub           *ws.Hub
	eventCh       chan models.InputEvent
	validator     *ShowLogicValidator
	serverVersion string
}

func New(store Store, hub *ws.Hub, eventCh chan models.InputEvent, validator *ShowLogicValidator, serverVersion string) *Server {
	return &Server{
		store:         store,
		hub:           hub,
		eventCh:       eventCh,
		validator:     validator,
		serverVersion: serverVersion,
	}
}

func (s *Server) Routes() http.Handler {
	router := mux.NewRouter()

	router.HandleFunc("/health", s.health).Methods(http.MethodGet)

	router.HandleFunc("/register", s.RegisterDeployable).Methods(http.MethodPost)
	router.HandleFunc("/register/ack", s.DeployableAck).Methods(http.MethodPost)

	api := router.PathPrefix("/api/v1").Subrouter()
	api.HandleFunc("/register", s.RegisterDeployable).Methods(http.MethodPost)
	api.HandleFunc("/deployables", s.ListDeployables).Methods(http.MethodGet)
	api.HandleFunc("/deployables/{id}", s.UpdateDeployable).Methods(http.MethodPatch)
	api.HandleFunc("/deployables/{id}/show-logic", s.GetShowLogic).Methods(http.MethodGet)
	api.HandleFunc("/deployables/{id}/ack", s.DeployableAck).Methods(http.MethodPost)
	api.HandleFunc("/events", s.IngestEvent).Methods(http.MethodPost)
	api.HandleFunc("/show-logic/{role}", s.UpsertShowLogic).Methods(http.MethodPut)

	router.HandleFunc("/ws/state", s.StateWebSocket)

	return router
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func decodeJSON(r *http.Request, dst interface{}) error {
	dec := json.NewDecoder(r.Body)
	return dec.Decode(dst)
}

func errorJSON(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func parseIDParam(r *http.Request) string {
	return mux.Vars(r)["id"]
}

func parseRoleParam(r *http.Request) string {
	return mux.Vars(r)["role"]
}

func parseDeployableID(r *http.Request) string {
	if id := r.URL.Query().Get("deployable_id"); id != "" {
		return id
	}
	return ""
}

var errBadRequest = errors.New("bad request")

func ensureDeployableID(id string) error {
	if id == "" {
		return errBadRequest
	}
	return nil
}

func normalizeTimestamp(ts time.Time) time.Time {
	if ts.IsZero() {
		return time.Now().UTC()
	}
	return ts.UTC()
}
