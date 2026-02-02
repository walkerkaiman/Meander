package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"

	"github.com/santhosh-tekuri/jsonschema/v5"

	"state-server/internal/models"
)

type ShowLogicValidator struct {
	schema              *jsonschema.Schema
	supportedEngineVers map[string]struct{}
}

func NewShowLogicValidator(schemaPath string, supportedVersions []string) (*ShowLogicValidator, error) {
	schemaBytes := []byte(`{"type":"object"}`)
	if schemaPath != "" {
		if data, err := os.ReadFile(schemaPath); err == nil {
			schemaBytes = data
		} else {
			return nil, err
		}
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource("schema.json", bytes.NewReader(schemaBytes)); err != nil {
		return nil, err
	}
	schema, err := compiler.Compile("schema.json")
	if err != nil {
		return nil, err
	}
	supported := make(map[string]struct{}, len(supportedVersions))
	for _, v := range supportedVersions {
		supported[v] = struct{}{}
	}
	return &ShowLogicValidator{
		schema:              schema,
		supportedEngineVers: supported,
	}, nil
}

func (v *ShowLogicValidator) Validate(pkg models.ShowLogicPackage) error {
	if pkg.EngineContractVersion == "" {
		return errors.New("engine_contract_version required")
	}
	if len(v.supportedEngineVers) > 0 {
		if _, ok := v.supportedEngineVers[pkg.EngineContractVersion]; !ok {
			return errors.New("unsupported engine_contract_version")
		}
	}
	if !json.Valid(pkg.ShowLogic) {
		return errors.New("show_logic is not valid json")
	}
	var value interface{}
	if err := json.Unmarshal(pkg.ShowLogic, &value); err != nil {
		return err
	}
	if err := v.schema.Validate(value); err != nil {
		return err
	}
	return nil
}
