package web

import (
	"encoding/json"
	"net/http"
	"time"

	"deployable/internal/runtime"
)

type Server struct {
	Runtime *runtime.Runtime
}

func (s *Server) Listen(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", s.handleIndex)
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/identify", s.handleIdentify)
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	return server.ListenAndServe()
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	status := s.Runtime.Status()
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte("<html><head><title>Deployable - Status</title></head><body>"))
	_, _ = w.Write([]byte("<h1>Deployable Status</h1><pre>"))
	encoded, _ := json.MarshalIndent(status, "", "  ")
	_, _ = w.Write(encoded)
	_, _ = w.Write([]byte("</pre></body></html>"))
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	status := s.Runtime.Status()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(status)
}

func (s *Server) handleIdentify(w http.ResponseWriter, r *http.Request) {
	supported := s.Runtime.TriggerIdentify()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"supported": supported,
	})
}

