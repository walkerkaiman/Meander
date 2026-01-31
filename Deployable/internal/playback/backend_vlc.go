//go:build libvlc && cgo

package playback

import (
	"strconv"
	"strings"
	"sync"

	libvlc "github.com/adrg/libvlc-go/v3"
)

type VLCBackend struct {
	initOnce sync.Once
	initErr  error
}

func NewVLCBackend() *VLCBackend {
	return &VLCBackend{}
}

func (b *VLCBackend) Open(assetPath string, output OutputDevice) (BackendInstance, error) {
	if err := b.init(); err != nil {
		return nil, err
	}
	player, err := libvlc.NewPlayer()
	if err != nil {
		return nil, err
	}
	media, err := libvlc.NewMediaFromPath(assetPath)
	if err != nil {
		player.Release()
		return nil, err
	}
	if err := player.SetMedia(media); err != nil {
		media.Release()
		player.Release()
		return nil, err
	}
	if output.Type == "video" {
		_ = media.AddOption("--fullscreen")
		_ = media.AddOption("--no-video-title-show")
		if idx, ok := parseDisplayIndex(output.ID); ok {
			_ = media.AddOption("--screen=" + strconv.Itoa(idx))
		}
	}
	return &VLCInstance{
		player: player,
		media:  media,
	}, nil
}

func (b *VLCBackend) init() error {
	b.initOnce.Do(func() {
		b.initErr = libvlc.Init("--no-video-title-show")
	})
	return b.initErr
}

type VLCInstance struct {
	player *libvlc.Player
	media  *libvlc.Media
}

func (v *VLCInstance) Play() error {
	return v.player.Play()
}

func (v *VLCInstance) Stop() error {
	return v.player.Stop()
}

func (v *VLCInstance) Pause() error {
	return v.player.SetPause(true)
}

func (v *VLCInstance) Resume() error {
	return v.player.SetPause(false)
}

func (v *VLCInstance) Seek(ms int) error {
	return v.player.SetTime(int64(ms))
}

func (v *VLCInstance) SetVolume(vol float64) error {
	value := int(vol * 100)
	if value < 0 {
		value = 0
	}
	if value > 100 {
		value = 100
	}
	return v.player.AudioSetVolume(value)
}

func (v *VLCInstance) SetLoop(loop bool) error {
	if err := v.player.SetLoop(loop); err == nil {
		return nil
	}
	if loop {
		return v.media.AddOption("input-repeat=-1")
	}
	return v.media.AddOption("input-repeat=0")
}

func (v *VLCInstance) Close() error {
	if v.media != nil {
		v.media.Release()
	}
	if v.player != nil {
		v.player.Release()
	}
	return nil
}

func parseDisplayIndex(id string) (int, bool) {
	id = strings.ToLower(strings.TrimSpace(id))
	if strings.HasPrefix(id, "display-") {
		if idx, err := strconv.Atoi(strings.TrimPrefix(id, "display-")); err == nil {
			return idx, true
		}
	}
	return 0, false
}

