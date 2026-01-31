package actions

import (
	"errors"
	"fmt"
	"strings"

	"deployable/internal/playback"
)

type PlayVideoExecutor struct {
	Player playback.PlaybackService
}

func (e PlayVideoExecutor) ActionName() string {
	return "play_video"
}

func (e PlayVideoExecutor) Execute(target string, params map[string]any) error {
	req, err := playRequestFromParams(params, false)
	if err != nil {
		return err
	}
	return e.Player.Play(target, req)
}

type StopVideoExecutor struct {
	Player playback.PlaybackService
}

func (e StopVideoExecutor) ActionName() string {
	return "stop_video"
}

func (e StopVideoExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Stop(target)
}

type PlayAudioExecutor struct {
	Player playback.PlaybackService
}

func (e PlayAudioExecutor) ActionName() string {
	return "play_audio"
}

func (e PlayAudioExecutor) Execute(target string, params map[string]any) error {
	req, err := playRequestFromParams(params, true)
	if err != nil {
		return err
	}
	return e.Player.Play(target, req)
}

type StopAudioExecutor struct {
	Player playback.PlaybackService
}

func (e StopAudioExecutor) ActionName() string {
	return "stop_audio"
}

func (e StopAudioExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Stop(target)
}

type SetVolumeExecutor struct {
	Player playback.PlaybackService
}

func (e SetVolumeExecutor) ActionName() string {
	return "set_volume"
}

func (e SetVolumeExecutor) Execute(target string, params map[string]any) error {
	volume, err := floatParam(params, "volume", "value")
	if err != nil {
		return err
	}
	return e.Player.SetVolume(target, volume)
}

type StopAllExecutor struct {
	Player playback.PlaybackService
}

func (e StopAllExecutor) ActionName() string {
	return "stop_all"
}

func (e StopAllExecutor) Execute(target string, params map[string]any) error {
	for _, output := range e.Player.ListOutputs() {
		_ = e.Player.Stop(output.ID)
	}
	return nil
}

type PauseExecutor struct {
	Player playback.PlaybackService
}

func (e PauseExecutor) ActionName() string {
	return "pause"
}

func (e PauseExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Pause(target)
}

type ResumeExecutor struct {
	Player playback.PlaybackService
}

func (e ResumeExecutor) ActionName() string {
	return "resume"
}

func (e ResumeExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Resume(target)
}

type FadeVolumeExecutor struct {
	Player playback.PlaybackService
}

func (e FadeVolumeExecutor) ActionName() string {
	return "fade_volume"
}

func (e FadeVolumeExecutor) Execute(target string, params map[string]any) error {
	targetVol, err := floatParam(params, "target", "to")
	if err != nil {
		return err
	}
	durationMs := intParam(params, "duration_ms")
	return e.Player.FadeVolume(target, targetVol, durationMs)
}

type SeekExecutor struct {
	Player playback.PlaybackService
}

func (e SeekExecutor) ActionName() string {
	return "seek"
}

func (e SeekExecutor) Execute(target string, params map[string]any) error {
	position := intParam(params, "position_ms", "start_ms")
	return e.Player.Seek(target, position)
}

type MediaPlayExecutor struct {
	Player playback.PlaybackService
}

func (e MediaPlayExecutor) ActionName() string {
	return "media.play"
}

func (e MediaPlayExecutor) Execute(target string, params map[string]any) error {
	req, err := playRequestFromMediaParams(params)
	if err != nil {
		return err
	}
	return e.Player.Play(target, req)
}

type MediaStopExecutor struct {
	Player playback.PlaybackService
}

func (e MediaStopExecutor) ActionName() string {
	return "media.stop"
}

func (e MediaStopExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Stop(target)
}

type MediaPauseExecutor struct {
	Player playback.PlaybackService
}

func (e MediaPauseExecutor) ActionName() string {
	return "media.pause"
}

func (e MediaPauseExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Pause(target)
}

type MediaResumeExecutor struct {
	Player playback.PlaybackService
}

func (e MediaResumeExecutor) ActionName() string {
	return "media.resume"
}

func (e MediaResumeExecutor) Execute(target string, params map[string]any) error {
	return e.Player.Resume(target)
}

type MediaSeekExecutor struct {
	Player playback.PlaybackService
}

func (e MediaSeekExecutor) ActionName() string {
	return "media.seek"
}

func (e MediaSeekExecutor) Execute(target string, params map[string]any) error {
	position := intParam(params, "position_ms", "start_ms")
	return e.Player.Seek(target, position)
}

type MediaSetExecutor struct {
	Player playback.PlaybackService
}

func (e MediaSetExecutor) ActionName() string {
	return "media.set"
}

func (e MediaSetExecutor) Execute(target string, params map[string]any) error {
	if volume, ok := params["volume"]; ok {
		value, err := floatParam(map[string]any{"volume": volume}, "volume")
		if err != nil {
			return err
		}
		return e.Player.SetVolume(target, value)
	}
	return errors.New("media.set requires supported params")
}

type MediaFadeExecutor struct {
	Player playback.PlaybackService
}

func (e MediaFadeExecutor) ActionName() string {
	return "media.fade"
}

func (e MediaFadeExecutor) Execute(target string, params map[string]any) error {
	targetVol, err := floatParam(params, "to", "target")
	if err != nil {
		return err
	}
	durationMs := intParam(params, "duration_ms")
	return e.Player.FadeVolume(target, targetVol, durationMs)
}

func playRequestFromParams(params map[string]any, allowVolume bool) (playback.PlayRequest, error) {
	file, ok := params["file"].(string)
	if !ok || file == "" {
		return playback.PlayRequest{}, errors.New("play requires params.file")
	}
	req := playback.PlayRequest{
		AssetPath: file,
		Loop:      boolParam(params, "loop"),
		StartMs:   intParam(params, "start_ms"),
		FadeInMs:  intParam(params, "fade_in_ms"),
	}
	if allowVolume {
		if volume, err := optionalFloatParam(params, "volume"); err != nil {
			return playback.PlayRequest{}, err
		} else if volume != nil {
			req.Volume = volume
		}
	}
	return req, nil
}

func playRequestFromMediaParams(params map[string]any) (playback.PlayRequest, error) {
	asset, ok := params["asset"].(string)
	if !ok || asset == "" {
		return playback.PlayRequest{}, errors.New("media.play requires params.asset")
	}
	req := playback.PlayRequest{
		AssetPath: asset,
		Loop:      boolParam(params, "loop"),
		StartMs:   intParam(params, "start_ms"),
		FadeInMs:  intParam(params, "fade_in_ms"),
	}
	if volume, err := optionalFloatParam(params, "volume"); err != nil {
		return playback.PlayRequest{}, err
	} else if volume != nil {
		req.Volume = volume
	}
	return req, nil
}

func boolParam(params map[string]any, key string) bool {
	if raw, ok := params[key]; ok {
		if value, ok := raw.(bool); ok {
			return value
		}
	}
	return false
}

func intParam(params map[string]any, keys ...string) int {
	for _, key := range keys {
		if raw, ok := params[key]; ok {
			switch value := raw.(type) {
			case float64:
				return int(value)
			case int:
				return value
			case int32:
				return int(value)
			case int64:
				return int(value)
			}
		}
	}
	return 0
}

func optionalFloatParam(params map[string]any, key string) (*float64, error) {
	if raw, ok := params[key]; ok {
		value, err := toFloat(raw)
		if err != nil {
			return nil, err
		}
		return &value, nil
	}
	return nil, nil
}

func floatParam(params map[string]any, keys ...string) (float64, error) {
	for _, key := range keys {
		if raw, ok := params[key]; ok {
			return toFloat(raw)
		}
	}
	return 0, fmt.Errorf("missing numeric param: %s", strings.Join(keys, "/"))
}

func toFloat(value any) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case int32:
		return float64(v), nil
	default:
		return 0, fmt.Errorf("invalid numeric param: %v", value)
	}
}

