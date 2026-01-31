package actions

import "deployable/internal/playback"

type PlayVideoExecutor struct {
	Player *playback.Manager
}

func (e PlayVideoExecutor) ActionName() string {
	return "play_video"
}

func (e PlayVideoExecutor) Execute(target string, params map[string]any) error {
	return e.Player.PlayVideo(target, params)
}

type StopVideoExecutor struct {
	Player *playback.Manager
}

func (e StopVideoExecutor) ActionName() string {
	return "stop_video"
}

func (e StopVideoExecutor) Execute(target string, params map[string]any) error {
	return e.Player.StopVideo(target)
}

type PlayAudioExecutor struct {
	Player *playback.Manager
}

func (e PlayAudioExecutor) ActionName() string {
	return "play_audio"
}

func (e PlayAudioExecutor) Execute(target string, params map[string]any) error {
	return e.Player.PlayAudio(target, params)
}

type StopAudioExecutor struct {
	Player *playback.Manager
}

func (e StopAudioExecutor) ActionName() string {
	return "stop_audio"
}

func (e StopAudioExecutor) Execute(target string, params map[string]any) error {
	return e.Player.StopAudio(target)
}

type SetVolumeExecutor struct {
	Player *playback.Manager
}

func (e SetVolumeExecutor) ActionName() string {
	return "set_volume"
}

func (e SetVolumeExecutor) Execute(target string, params map[string]any) error {
	return e.Player.SetVolume(target, params)
}

type StopAllExecutor struct {
	Player *playback.Manager
}

func (e StopAllExecutor) ActionName() string {
	return "stop_all"
}

func (e StopAllExecutor) Execute(target string, params map[string]any) error {
	return e.Player.StopAll()
}

