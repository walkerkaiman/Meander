package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"deployable/internal/config"
	"deployable/internal/runtime"
	"deployable/internal/server"
	"deployable/internal/web"
)

func main() {
	cfg := config.Load()
	rt := runtime.NewRuntime(runtime.Config{
		DataDir:         cfg.DataDir,
		AssetsDir:       cfg.AssetsDir,
		AssetsSourceDir: cfg.AssetsSourceDir,
		AssetsSourceURL: cfg.AssetsSourceURL,
		PlaybackBackend: cfg.PlaybackBackend,
		VLCPath:         cfg.VLCPath,
		VLCDebug:        cfg.VLCDebug,
	})
	if err := rt.Boot(); err != nil {
		log.Fatalf("boot failed: %v", err)
	}
	if cfg.DiagnosticShowLogic {
		if err := rt.ApplyDiagnosticShowLogic(); err != nil {
			log.Fatalf("diagnostic show logic generation failed: %v", err)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if cfg.Offline {
		rt.StartOffline()
	} else {
		client := &server.Client{ServerURL: cfg.ServerURL}
		connected := make(chan time.Time, 1)
		go client.Run(ctx, func() server.HelloMessage {
			return rt.ServerHello(cfg.AgentVersion)
		}, rt.Incoming(), rt.Outgoing(), connected)
		go func() {
			for ts := range connected {
				rt.SetConnected(ts)
			}
		}()
		go func() {
			for msg := range rt.IncomingChannel() {
				rt.HandleServerMessage(msg)
			}
		}()
	}

	webServer := &web.Server{Runtime: rt}
	go func() {
		if err := webServer.Listen(cfg.WebListenAddr); err != nil {
			log.Printf("web server stopped: %v", err)
		}
	}()

	waitForSignal()
	cancel()
}

func waitForSignal() {
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals
}

