package assets

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type Syncer struct {
	AssetsDir       string
	SourceDir       string
	SourceURL       string
}

func (s *Syncer) EnsureAssets(required []string) error {
	missing := []string{}
	for _, asset := range required {
		path := filepath.Join(s.AssetsDir, asset)
		if _, err := os.Stat(path); err != nil {
			if os.IsNotExist(err) {
				missing = append(missing, asset)
				continue
			}
			return err
		}
	}
	for _, asset := range missing {
		if err := s.fetchAsset(asset); err != nil {
			return err
		}
	}
	return nil
}

func (s *Syncer) CleanupAssets(required []string) error {
	requiredSet := make(map[string]bool)
	for _, asset := range required {
		requiredSet[filepath.Clean(asset)] = true
	}
	return filepath.WalkDir(s.AssetsDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(s.AssetsDir, path)
		if err != nil {
			return err
		}
		if !requiredSet[rel] {
			return os.Remove(path)
		}
		return nil
	})
}

func (s *Syncer) fetchAsset(asset string) error {
	if s.SourceDir != "" {
		return s.copyFromDir(asset)
	}
	if s.SourceURL != "" {
		return s.downloadFromURL(asset)
	}
	return errors.New("asset missing and no source configured: " + asset)
}

func (s *Syncer) copyFromDir(asset string) error {
	src := filepath.Join(s.SourceDir, asset)
	dst := filepath.Join(s.AssetsDir, asset)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func (s *Syncer) downloadFromURL(asset string) error {
	url := strings.TrimRight(s.SourceURL, "/") + "/" + asset
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("asset download failed: %s", resp.Status)
	}
	dst := filepath.Join(s.AssetsDir, asset)
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, resp.Body); err != nil {
		return err
	}
	return out.Sync()
}

