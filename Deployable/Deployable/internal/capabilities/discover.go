package capabilities

import (
	"os"

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
			"os": os.Getenv("OS"),
		},
	}
	return report, nil
}

