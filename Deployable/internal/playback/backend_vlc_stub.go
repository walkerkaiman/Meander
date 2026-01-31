//go:build !libvlc || !cgo

package playback

import "errors"

type VLCBackend struct{}

func NewVLCBackend() *VLCBackend {
	return &VLCBackend{}
}

func (b *VLCBackend) Open(assetPath string, output OutputDevice) (BackendInstance, error) {
	return nil, errors.New("libvlc backend not built: rebuild with -tags libvlc and ensure VLC is installed")
}

