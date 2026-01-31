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
	})
	if err := rt.Boot(); err != nil {
		log.Fatalf("boot failed: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	client := &server.Client{ServerURL: cfg.ServerURL}
	hello := rt.ServerHello(cfg.AgentVersion)
	connected := make(chan time.Time, 1)
	go client.Run(ctx, hello, rt.Incoming(), rt.Outgoing(), connected)
	go func() {
		for ts := range connected {
			rt.SetConnected(ts)
		}
	}()

	webServer := &web.Server{Runtime: rt}
	go func() {
		if err := webServer.Listen(cfg.WebListenAddr); err != nil {
			log.Printf("web server stopped: %v", err)
		}
	}()

	go func() {
		for msg := range rt.IncomingChannel() {
			rt.HandleServerMessage(msg)
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

