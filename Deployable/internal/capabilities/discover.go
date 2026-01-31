package capabilities

import (
	"errors"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"deployable/internal/types"
)

func Discover() (types.CapabilityReport, error) {
	report := types.CapabilityReport{
		VideoOutputs: []string{},
		AudioOutputs: []string{},
		VideoInputs:  []string{},
		AudioInputs:  []string{},
		SerialPorts:  []string{},
		USBDevices:   []string{},
		StatusLEDs:   []string{},
		Metadata: map[string]any{
			"os": runtime.GOOS,
		},
	}

	switch runtime.GOOS {
	case "windows":
		populateWindows(&report)
	default:
		report.Metadata["capability_warning"] = "capability discovery not implemented for this OS"
	}
	return report, nil
}

func populateWindows(report *types.CapabilityReport) {
	if lines, err := runPowerShellLines("Get-PnpDevice -Class Monitor -PresentOnly | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.VideoOutputs = uniqueStrings(lines)
		for i, name := range report.VideoOutputs {
			report.VideoOutputDetails = append(report.VideoOutputDetails, types.OutputCapability{
				ID:    formatDisplayID(i),
				Name:  name,
				Type:  "video",
				Index: i,
			})
		}
	} else {
		report.Metadata["video_outputs_error"] = err.Error()
	}

	if lines, err := runPowerShellLines("Get-PnpDevice -Class AudioEndpoint -PresentOnly | Where-Object { $_.FriendlyName -notmatch 'Microphone|Line' } | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.AudioOutputs = uniqueStrings(lines)
		for i, name := range report.AudioOutputs {
			report.AudioOutputDetails = append(report.AudioOutputDetails, types.OutputCapability{
				ID:    formatAudioID(i),
				Name:  name,
				Type:  "audio",
				Index: i,
			})
		}
	} else {
		report.Metadata["audio_outputs_error"] = err.Error()
	}

	if lines, err := runPowerShellLines("Get-PnpDevice -Class Camera -PresentOnly | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.VideoInputs = uniqueStrings(lines)
	} else {
		report.Metadata["video_inputs_error"] = err.Error()
	}

	if lines, err := runPowerShellLines("Get-PnpDevice -Class AudioEndpoint -PresentOnly | Where-Object { $_.FriendlyName -match 'Microphone|Line' } | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.AudioInputs = uniqueStrings(lines)
	} else {
		report.Metadata["audio_inputs_error"] = err.Error()
	}

	if lines, err := runPowerShellLines("Get-PnpDevice -Class Ports -PresentOnly | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.SerialPorts = uniqueStrings(lines)
	} else {
		report.Metadata["serial_ports_error"] = err.Error()
	}

	if lines, err := runPowerShellLines("Get-PnpDevice -Class USB -PresentOnly | Select-Object -ExpandProperty FriendlyName"); err == nil {
		report.USBDevices = uniqueStrings(lines)
	} else {
		report.Metadata["usb_devices_error"] = err.Error()
	}
}

func runPowerShellLines(command string) ([]string, error) {
	cmd := exec.Command("powershell", "-NoProfile", "-Command", command)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	text := strings.TrimSpace(string(output))
	if text == "" {
		return nil, errors.New("no results")
	}
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = strings.TrimSpace(line)
	}
	return lines, nil
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]bool)
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func formatDisplayID(index int) string {
	return "display-" + fmtInt(index)
}

func formatAudioID(index int) string {
	return "audio-" + fmtInt(index)
}

func fmtInt(value int) string {
	return strconv.Itoa(value)
}

