package playback

import (
	"log"
	"sync"
)

type StubBackend struct{}

func NewStubBackend() *StubBackend {
	return &StubBackend{}
}

func (b *StubBackend) Open(assetPath string, output OutputDevice) (BackendInstance, error) {
	return &StubInstance{
		assetPath: assetPath,
		output:    output,
		volume:    1.0,
	}, nil
}

type StubInstance struct {
	mu        sync.Mutex
	assetPath string
	output    OutputDevice
	loop      bool
	volume    float64
}

func (s *StubInstance) Play() error {
	log.Printf("backend play output=%s asset=%s", s.output.ID, s.assetPath)
	return nil
}

func (s *StubInstance) Stop() error {
	log.Printf("backend stop output=%s", s.output.ID)
	return nil
}

func (s *StubInstance) Pause() error {
	log.Printf("backend pause output=%s", s.output.ID)
	return nil
}

func (s *StubInstance) Resume() error {
	log.Printf("backend resume output=%s", s.output.ID)
	return nil
}

func (s *StubInstance) Seek(ms int) error {
	log.Printf("backend seek output=%s position=%dms", s.output.ID, ms)
	return nil
}

func (s *StubInstance) SetVolume(vol float64) error {
	s.mu.Lock()
	s.volume = vol
	s.mu.Unlock()
	log.Printf("backend set_volume output=%s volume=%.2f", s.output.ID, vol)
	return nil
}

func (s *StubInstance) SetLoop(loop bool) error {
	s.mu.Lock()
	s.loop = loop
	s.mu.Unlock()
	log.Printf("backend set_loop output=%s loop=%v", s.output.ID, loop)
	return nil
}

func (s *StubInstance) Close() error {
	log.Printf("backend close output=%s", s.output.ID)
	return nil
}

