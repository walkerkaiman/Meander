package sqlite

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	_ "modernc.org/sqlite"

	"state-server/internal/models"
)

const (
	statusNew         = "NEW"
	statusAssigned    = "ASSIGNED"
	statusRegistering = "REGISTERING"
	statusActive      = "ACTIVE"
	statusOffline     = "OFFLINE"
	statusError       = "ERROR"
)

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	store := &Store{db: db}
	if err := store.migrate(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,
		`CREATE TABLE IF NOT EXISTS deployables (
			deployable_id TEXT PRIMARY KEY,
			hostname TEXT,
			assigned_role TEXT,
			status TEXT NOT NULL,
			last_seen TEXT,
			capabilities_json TEXT,
			agent_version TEXT,
			logic_version TEXT,
			updated_at TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS show_logic_packages (
			package_id TEXT PRIMARY KEY,
			role TEXT NOT NULL,
			logic_version TEXT,
			engine_contract_version TEXT,
			show_logic_json TEXT,
			referenced_assets_json TEXT,
			created_at TEXT,
			created_by TEXT,
			checksum TEXT
		);`,
		`CREATE INDEX IF NOT EXISTS idx_show_logic_role ON show_logic_packages(role);`,
		`CREATE TABLE IF NOT EXISTS rules (
			rule_id TEXT PRIMARY KEY,
			rule_json TEXT NOT NULL,
			created_at TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			deployable_id TEXT,
			timestamp TEXT,
			input_id TEXT,
			event_type TEXT,
			value_json TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS state_snapshot (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			state_json TEXT NOT NULL,
			updated_at TEXT
		);`,
	}
	for _, stmt := range stmts {
		if _, err := s.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) UpsertDeployable(ctx context.Context, req models.RegisterDeployableRequest) (models.DeployableRecord, bool, error) {
	existing, known, err := s.GetDeployable(ctx, req.DeployableID)
	if err != nil {
		return models.DeployableRecord{}, false, err
	}
	capsJSON, err := json.Marshal(req.Capabilities)
	if err != nil {
		return models.DeployableRecord{}, false, err
	}
	now := time.Now().UTC()
	status := statusNew
	assignedRole := ""
	if known {
		status = existing.Status
		assignedRole = existing.AssignedRole
		if assignedRole != "" {
			status = statusRegistering
		}
	} else {
		if assignedRole != "" {
			status = statusRegistering
		}
	}
	if !known {
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO deployables (
				deployable_id, hostname, assigned_role, status, last_seen, capabilities_json,
				agent_version, logic_version, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
			req.DeployableID, req.Hostname, assignedRole, status, now.Format(time.RFC3339Nano),
			string(capsJSON), req.AgentVersion, "", now.Format(time.RFC3339Nano),
		)
		if err != nil {
			return models.DeployableRecord{}, false, err
		}
	} else {
		_, err = s.db.ExecContext(ctx, `
			UPDATE deployables
			SET hostname = ?, last_seen = ?, capabilities_json = ?, agent_version = ?, status = ?, updated_at = ?
			WHERE deployable_id = ?;`,
			req.Hostname, now.Format(time.RFC3339Nano), string(capsJSON), req.AgentVersion,
			status, now.Format(time.RFC3339Nano), req.DeployableID,
		)
		if err != nil {
			return models.DeployableRecord{}, false, err
		}
	}
	record, _, err := s.GetDeployable(ctx, req.DeployableID)
	return record, known, err
}

func (s *Store) GetDeployable(ctx context.Context, id string) (models.DeployableRecord, bool, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT deployable_id, assigned_role, status, last_seen, capabilities_json
		FROM deployables WHERE deployable_id = ?;`, id)
	var rec models.DeployableRecord
	var capsJSON sql.NullString
	var lastSeen sql.NullString
	err := row.Scan(&rec.DeployableID, &rec.AssignedRole, &rec.Status, &lastSeen, &capsJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return models.DeployableRecord{}, false, nil
	}
	if err != nil {
		return models.DeployableRecord{}, false, err
	}
	if lastSeen.Valid {
		if ts, err := time.Parse(time.RFC3339Nano, lastSeen.String); err == nil {
			rec.LastSeen = ts
		}
	}
	if capsJSON.Valid {
		_ = json.Unmarshal([]byte(capsJSON.String), &rec.Capabilities)
	}
	return rec, true, nil
}

func (s *Store) ListDeployables(ctx context.Context) ([]models.DeployableRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT deployable_id, assigned_role, status, last_seen, capabilities_json
		FROM deployables ORDER BY deployable_id ASC;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.DeployableRecord
	for rows.Next() {
		var rec models.DeployableRecord
		var capsJSON sql.NullString
		var lastSeen sql.NullString
		if err := rows.Scan(&rec.DeployableID, &rec.AssignedRole, &rec.Status, &lastSeen, &capsJSON); err != nil {
			return nil, err
		}
		if lastSeen.Valid {
			if ts, err := time.Parse(time.RFC3339Nano, lastSeen.String); err == nil {
				rec.LastSeen = ts
			}
		}
		if capsJSON.Valid {
			_ = json.Unmarshal([]byte(capsJSON.String), &rec.Capabilities)
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (s *Store) UpdateDeployableRole(ctx context.Context, id, role string) error {
	status := statusAssigned
	if role == "" {
		status = statusNew
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE deployables SET assigned_role = ?, status = ?, updated_at = ?
		WHERE deployable_id = ?;`,
		role, status, time.Now().UTC().Format(time.RFC3339Nano), id,
	)
	return err
}

func (s *Store) UpdateDeployableStatus(ctx context.Context, id, status string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE deployables SET status = ?, updated_at = ? WHERE deployable_id = ?;`,
		status, time.Now().UTC().Format(time.RFC3339Nano), id,
	)
	return err
}

func (s *Store) UpdateDeployableLogicVersion(ctx context.Context, id, version string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE deployables SET logic_version = ?, updated_at = ? WHERE deployable_id = ?;`,
		version, time.Now().UTC().Format(time.RFC3339Nano), id,
	)
	return err
}

func (s *Store) InsertEvent(ctx context.Context, event models.InputEvent) error {
	valueJSON, err := json.Marshal(event.Value)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO events (deployable_id, timestamp, input_id, event_type, value_json)
		VALUES (?, ?, ?, ?, ?);`,
		event.DeployableID, event.Timestamp.UTC().Format(time.RFC3339Nano), event.InputID, event.EventType, string(valueJSON),
	)
	return err
}

func (s *Store) SaveShowLogicPackage(ctx context.Context, pkg models.ShowLogicPackage, createdBy string) error {
	checksum := sha256.Sum256(pkg.ShowLogic)
	assetsJSON, err := json.Marshal(pkg.ReferencedAssets)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO show_logic_packages (
			package_id, role, logic_version, engine_contract_version, show_logic_json,
			referenced_assets_json, created_at, created_by, checksum
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
		pkg.PackageID, pkg.Role, pkg.LogicVersion, pkg.EngineContractVersion, string(pkg.ShowLogic),
		string(assetsJSON), time.Now().UTC().Format(time.RFC3339Nano), createdBy, hex.EncodeToString(checksum[:]),
	)
	return err
}

func (s *Store) GetLatestShowLogicForRole(ctx context.Context, role string) (models.ShowLogicPackage, bool, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT package_id, role, logic_version, engine_contract_version, show_logic_json, referenced_assets_json
		FROM show_logic_packages WHERE role = ? ORDER BY created_at DESC LIMIT 1;`, role)
	var pkg models.ShowLogicPackage
	var logicJSON sql.NullString
	var assetsJSON sql.NullString
	err := row.Scan(&pkg.PackageID, &pkg.Role, &pkg.LogicVersion, &pkg.EngineContractVersion, &logicJSON, &assetsJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return models.ShowLogicPackage{}, false, nil
	}
	if err != nil {
		return models.ShowLogicPackage{}, false, err
	}
	if logicJSON.Valid {
		pkg.ShowLogic = json.RawMessage(logicJSON.String)
	}
	if assetsJSON.Valid {
		_ = json.Unmarshal([]byte(assetsJSON.String), &pkg.ReferencedAssets)
	}
	return pkg, true, nil
}

func (s *Store) GetShowLogicByID(ctx context.Context, packageID string) (models.ShowLogicPackage, bool, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT package_id, role, logic_version, engine_contract_version, show_logic_json, referenced_assets_json
		FROM show_logic_packages WHERE package_id = ? LIMIT 1;`, packageID)
	var pkg models.ShowLogicPackage
	var logicJSON sql.NullString
	var assetsJSON sql.NullString
	err := row.Scan(&pkg.PackageID, &pkg.Role, &pkg.LogicVersion, &pkg.EngineContractVersion, &logicJSON, &assetsJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return models.ShowLogicPackage{}, false, nil
	}
	if err != nil {
		return models.ShowLogicPackage{}, false, err
	}
	if logicJSON.Valid {
		pkg.ShowLogic = json.RawMessage(logicJSON.String)
	}
	if assetsJSON.Valid {
		_ = json.Unmarshal([]byte(assetsJSON.String), &pkg.ReferencedAssets)
	}
	return pkg, true, nil
}

func (s *Store) SaveStateSnapshot(ctx context.Context, state models.GlobalState) error {
	stateJSON, err := json.Marshal(state)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO state_snapshot (id, state_json, updated_at)
		VALUES (1, ?, ?)
		ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at;`,
		string(stateJSON), time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (s *Store) LoadStateSnapshot(ctx context.Context) (models.GlobalState, bool, error) {
	row := s.db.QueryRowContext(ctx, `SELECT state_json FROM state_snapshot WHERE id = 1;`)
	var stateJSON string
	if err := row.Scan(&stateJSON); errors.Is(err, sql.ErrNoRows) {
		return models.GlobalState{}, false, nil
	} else if err != nil {
		return models.GlobalState{}, false, err
	}
	var state models.GlobalState
	if err := json.Unmarshal([]byte(stateJSON), &state); err != nil {
		return models.GlobalState{}, false, err
	}
	return state, true, nil
}

func (s *Store) ListRules(ctx context.Context) ([]models.Rule, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT rule_json FROM rules ORDER BY created_at ASC;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Rule
	for rows.Next() {
		var ruleJSON string
		if err := rows.Scan(&ruleJSON); err != nil {
			return nil, err
		}
		var rule models.Rule
		if err := json.Unmarshal([]byte(ruleJSON), &rule); err != nil {
			return nil, err
		}
		out = append(out, rule)
	}
	return out, rows.Err()
}

func (s *Store) SaveRule(ctx context.Context, rule models.Rule) error {
	ruleJSON, err := json.Marshal(rule)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO rules (rule_id, rule_json, created_at)
		VALUES (?, ?, ?)
		ON CONFLICT(rule_id) DO UPDATE SET rule_json = excluded.rule_json;`,
		rule.RuleID, string(ruleJSON), time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (s *Store) MarkDeployableOffline(ctx context.Context, id string) error {
	return s.UpdateDeployableStatus(ctx, id, statusOffline)
}

func (s *Store) StatusValues() map[string]string {
	return map[string]string{
		"NEW":         statusNew,
		"ASSIGNED":    statusAssigned,
		"REGISTERING": statusRegistering,
		"ACTIVE":      statusActive,
		"OFFLINE":     statusOffline,
		"ERROR":       statusError,
	}
}
