package config

import (
	"flag"
	"os"
	"strings"
)

type Config struct {
	ServerURL       string
	DataDir         string
	AssetsDir       string
	AssetsSourceDir string
	AssetsSourceURL string
	WebListenAddr   string
	AgentVersion    string
}

func Load() Config {
	var cfg Config
	flag.StringVar(&cfg.ServerURL, "server", envOrDefault("DEPLOYABLE_SERVER_URL", "ws://localhost:8080/ws"))
	flag.StringVar(&cfg.DataDir, "data-dir", envOrDefault("DEPLOYABLE_DATA_DIR", "./data"))
	flag.StringVar(&cfg.AssetsDir, "assets-dir", envOrDefault("DEPLOYABLE_ASSETS_DIR", "./Assets"))
	flag.StringVar(&cfg.AssetsSourceDir, "assets-source-dir", envOrDefault("DEPLOYABLE_ASSETS_SOURCE_DIR", ""))
	flag.StringVar(&cfg.AssetsSourceURL, "assets-source-url", envOrDefault("DEPLOYABLE_ASSETS_SOURCE_URL", ""))
	flag.StringVar(&cfg.WebListenAddr, "web", envOrDefault("DEPLOYABLE_WEB_ADDR", ":8090"))
	flag.StringVar(&cfg.AgentVersion, "version", envOrDefault("DEPLOYABLE_VERSION", "dev"))
	flag.Parse()

	cfg.ServerURL = strings.TrimSpace(cfg.ServerURL)
	cfg.DataDir = strings.TrimSpace(cfg.DataDir)
	cfg.AssetsDir = strings.TrimSpace(cfg.AssetsDir)
	cfg.AssetsSourceDir = strings.TrimSpace(cfg.AssetsSourceDir)
	cfg.AssetsSourceURL = strings.TrimSpace(cfg.AssetsSourceURL)
	cfg.WebListenAddr = strings.TrimSpace(cfg.WebListenAddr)
	cfg.AgentVersion = strings.TrimSpace(cfg.AgentVersion)

	return cfg
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

