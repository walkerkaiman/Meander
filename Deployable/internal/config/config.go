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
	Offline         bool
	PlaybackBackend string
	VLCPath         string
	DiagnosticShowLogic bool
	AssetsCleanup  bool
	VLCDebug        bool
}

func Load() Config {
	var cfg Config
	flag.StringVar(&cfg.ServerURL, "server", envOrDefault("DEPLOYABLE_SERVER_URL", "ws://localhost:8081/ws/deployable"), "State server websocket URL")
	flag.StringVar(&cfg.DataDir, "data-dir", envOrDefault("DEPLOYABLE_DATA_DIR", "./data"), "Persistent data directory")
	flag.StringVar(&cfg.AssetsDir, "assets-dir", envOrDefault("DEPLOYABLE_ASSETS_DIR", "./Assets"), "Assets directory")
	flag.StringVar(&cfg.AssetsSourceDir, "assets-source-dir", envOrDefault("DEPLOYABLE_ASSETS_SOURCE_DIR", ""), "Source directory for assets (optional)")
	flag.StringVar(&cfg.AssetsSourceURL, "assets-source-url", envOrDefault("DEPLOYABLE_ASSETS_SOURCE_URL", ""), "Source URL for assets (optional)")
	flag.StringVar(&cfg.WebListenAddr, "web", envOrDefault("DEPLOYABLE_WEB_ADDR", ":8090"), "Web GUI listen address")
	flag.StringVar(&cfg.AgentVersion, "version", envOrDefault("DEPLOYABLE_VERSION", "dev"), "Agent version string")
	flag.BoolVar(&cfg.Offline, "offline", envBool("DEPLOYABLE_OFFLINE", false), "Run without a State Server")
	flag.StringVar(&cfg.PlaybackBackend, "playback-backend", envOrDefault("DEPLOYABLE_PLAYBACK_BACKEND", "vlc"), "Playback backend: vlc, libvlc, or stub")
	flag.StringVar(&cfg.VLCPath, "vlc-path", envOrDefault("DEPLOYABLE_VLC_PATH", "vlc"), "Path to VLC executable (for vlc backend)")
	flag.BoolVar(&cfg.DiagnosticShowLogic, "diagnostic-showlogic", envBool("DEPLOYABLE_DIAGNOSTIC_SHOWLOGIC", false), "Generate and use diagnostic show logic based on discovered outputs")
	flag.BoolVar(&cfg.VLCDebug, "vlc-debug", envBool("DEPLOYABLE_VLC_DEBUG", false), "Enable VLC stderr logging for RC debugging")
	flag.Parse()

	cfg.ServerURL = strings.TrimSpace(cfg.ServerURL)
	cfg.DataDir = strings.TrimSpace(cfg.DataDir)
	cfg.AssetsDir = strings.TrimSpace(cfg.AssetsDir)
	cfg.AssetsSourceDir = strings.TrimSpace(cfg.AssetsSourceDir)
	cfg.AssetsSourceURL = strings.TrimSpace(cfg.AssetsSourceURL)
	cfg.WebListenAddr = strings.TrimSpace(cfg.WebListenAddr)
	cfg.AgentVersion = strings.TrimSpace(cfg.AgentVersion)
	cfg.PlaybackBackend = strings.ToLower(strings.TrimSpace(cfg.PlaybackBackend))
	cfg.VLCPath = strings.TrimSpace(cfg.VLCPath)

	return cfg
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		v = strings.ToLower(strings.TrimSpace(v))
		return v == "1" || v == "true" || v == "yes" || v == "y"
	}
	return def
}

