package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"state-server/internal/models"
	"state-server/internal/server"
	"state-server/internal/state"
	"state-server/internal/storage/sqlite"
	"state-server/internal/ws"
)

func main() {
	dbPath := getenv("STATE_SERVER_DB", "state-server.db")
	listenAddr := getenv("STATE_SERVER_LISTEN", ":8080")
	schemaPath := getenv("STATE_SERVER_SCHEMA", "")
	engineVersions := strings.Split(getenv("STATE_SERVER_ENGINE_VERS", "1.0.0"), ",")
	serverVersion := getenv("STATE_SERVER_VERSION", "0.1.0")
	assetsDir := getenv("STATE_SERVER_ASSETS_DIR", "Assets")

	store, err := sqlite.NewStore(dbPath)
	if err != nil {
		log.Fatalf("failed to init store: %v", err)
	}
	defer store.Close()

	validator, err := server.NewShowLogicValidator(schemaPath, trimEmpty(engineVersions))
	if err != nil {
		log.Fatalf("failed to init show logic validator: %v", err)
	}

	hub := ws.NewHub()
	eventCh := make(chan models.InputEvent, 128)

	initialState := models.GlobalState{
		State:     "init",
		Variables: map[string]interface{}{},
		Timestamp: time.Now().UTC(),
		Version:   1,
	}
	broadcaster := &server.MultiBroadcaster{Hub: hub}
	loop := state.NewLoop(store, broadcaster, initialState)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go loop.Run(ctx, eventCh)

	srv := server.New(store, hub, eventCh, validator, serverVersion, loop.OverrideState, assetsDir)
	broadcaster.Server = srv
	httpServer := &http.Server{
		Addr:    listenAddr,
		Handler: srv.Routes(),
	}

	go func() {
		log.Printf("state server listening on %s", listenAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	waitForShutdown(ctx, httpServer, cancel)
}

func waitForShutdown(ctx context.Context, httpServer *http.Server, cancel context.CancelFunc) {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-ctx.Done():
	case <-stop:
	}
	cancel()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = httpServer.Shutdown(shutdownCtx)
}

func getenv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func trimEmpty(values []string) []string {
	var out []string
	for _, v := range values {
		if t := strings.TrimSpace(v); t != "" {
			out = append(out, t)
		}
	}
	return out
}
