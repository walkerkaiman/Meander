# Interactive Functions Design Document

## Overview

Interactive Functions are standalone C++ binaries that provide machine learning and sensor processing capabilities to Deployables. Each function is a separate executable that processes hardware inputs (webcams, microphones, serial devices) and outputs standardized signals that integrate with Meander's state management system.

## Architecture

### Integration Pattern

Interactive Functions run as **subprocesses** managed by the Deployable. They communicate via **stdout** using a standardized message format:

```
<signal_name> <timestamp_ms> <payload_json>\n
```

**Components:**
1. **C++ Binary**: Standalone executable (e.g., `webcam_handtracking`, `microphone_stt`)
2. **Deployable Sensor Manager**: Spawns and monitors binaries, parses stdout
3. **Signal Conversion**: Converts binary output to Meander signal format
4. **State Server**: Receives signals via existing event ingestion API

### Message Format Specification

Each line from a binary must follow this format:

```
signal_name timestamp_ms {"key":"value",...}
```

**Fields:**
- `signal_name`: String identifier (e.g., `hand_gesture`, `face_presence`, `speech_text`)
- `timestamp_ms`: Unix timestamp in milliseconds (or `0` for "now")
- `payload_json`: Compact JSON object (no spaces required)

**Example:**
```
hand_gesture 1704067200000 {"gesture":"wave","hand_id":"hand-0","confidence":0.92}
face_presence 0 {"present":true,"count":1,"confidence":0.87}
```

### Binary Lifecycle

1. **Discovery**: Deployable checks show logic for `required_functions` array
2. **Download**: Missing binaries downloaded from State Server (similar to assets)
3. **Configuration**: Deployable loads function configuration from `data/functions/{function_name}.json` (or uses defaults)
4. **Launch**: Deployable spawns binary as subprocess with configuration (command-line args or config file)
5. **Monitoring**: Deployable reads stdout, parses messages, converts to signals
6. **Recovery**: If binary crashes, Deployable can restart it (with backoff)
7. **Shutdown**: On Deployable shutdown, binaries are gracefully terminated

### Binary Storage

- **Location**: `Deployable/bin/` directory (platform-specific subdirectories)
- **Naming**: `{function_name}` (e.g., `webcam_handtracking`, `microphone_stt`)
- **Platforms**: Separate binaries for Windows (`function.exe`), Linux ARM (`function`), Linux ARM64 (`function`)
- **Download URL**: `http://state-server:8081/binaries/{platform}/{function_name}`

## Show Logic Integration

### Referencing Functions in Show Logic

Show logic JSON includes a `required_functions` array at the top level:

```json
{
  "logic_id": "interactive-exhibit",
  "name": "Interactive Exhibit",
  "version": 1,
  "required_functions": [
    "webcam_handtracking",
    "webcam_face_detection",
    "microphone_stt"
  ],
  "signals": [
    {
      "name": "hand_gesture",
      "type": "object"
    },
    {
      "name": "face_presence",
      "type": "object"
    },
    {
      "name": "speech_text",
      "type": "object"
    }
  ],
  "states": [...]
}
```

### Function Download During Registration

During the `assign_role` flow:

1. Deployable receives show logic with `required_functions` array
2. For each function, check if binary exists in `bin/{platform}/`
3. If missing, download from `{assets_source_url}/binaries/{platform}/{function_name}`
4. Make binary executable (Linux) or verify permissions (Windows)
5. Verify binary integrity (optional: checksum validation)
6. Continue with asset verification as before

**Implementation location**: Extend `Deployable/internal/assets/sync.go` or create `Deployable/internal/functions/sync.go`

## Binary Configuration

### Configuration Storage

Each function's configuration is stored in a JSON file:

- **Location**: `Deployable/data/functions/{function_name}.json`
- **Format**: Function-specific JSON schema (see function specifications below)
- **Defaults**: If config file missing, use hardcoded defaults
- **Persistence**: Configs persist across Deployable restarts

### Configuration Web Interface

The Deployable hosts a web interface at `http://localhost:8090/functions` (or configured `DEPLOYABLE_WEB_ADDR`) for configuring interactive functions.

**Endpoints**:
- `GET /functions` - List all configured functions with status
- `GET /functions/{function_name}` - Get configuration for a specific function
- `PUT /functions/{function_name}` - Update function configuration
- `GET /functions/{function_name}/status` - Get runtime status (running, stopped, error)
- `POST /functions/{function_name}/restart` - Restart a function binary

**Configuration UI Features**:
- **Function list page**: Shows all functions from `required_functions`, their status, and quick links to configure
- **Function configuration page**: Form-based UI for each function's specific parameters
- **Live status**: Show if binary is running, last signal received, error messages
- **Test mode**: Preview configuration without saving (test binary with temporary config)
- **Device discovery**: Auto-detect available cameras/microphones for device selection

### Configuration Passing to Binaries

Binaries receive configuration in one of two ways:

**Option 1: Command-line arguments** (preferred for simple configs)
```go
args := []string{
    "--device", config.DeviceIndex,
    "--fps", strconv.Itoa(config.FPS),
    "--min-confidence", strconv.FormatFloat(config.MinConfidence, 'f', 2, 64),
}
cmd := exec.Command(binaryPath, args...)
```

**Option 2: Configuration file** (for complex configs)
```go
configPath := filepath.Join(dataDir, "functions", functionName+".json")
args := []string{"--config", configPath}
cmd := exec.Command(binaryPath, args...)
```

Each function specification below defines which method it uses and the exact parameter names.

### Configuration Schema Per Function

Each function defines its configuration schema. The Deployable web UI generates forms based on these schemas.

## Function Specifications

### 1. Webcam Hand Tracking

**Executable**: `webcam_handtracking`

**MediaPipe Solution**: Hands

**Hardware Requirements**:
- USB webcam (device index configurable)
- Minimum resolution: 640x480
- Recommended: 1280x720 or higher

**Command Line Arguments**:
```
webcam_handtracking [--device <index>] [--fps <fps>] [--resolution <WxH>]
```
- `--device`: Camera device index (default: `0`)
- `--fps`: Target output FPS (default: `10`)
- `--resolution`: Camera resolution as `WxH` (default: `1280x720`)

**Configuration Schema** (`data/functions/webcam_handtracking.json`):
```json
{
  "device_index": 0,
  "fps": 10,
  "resolution": {
    "width": 1280,
    "height": 720
  },
  "min_hand_confidence": 0.5,
  "enable_gesture_detection": true,
  "enable_position_tracking": true
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available cameras (auto-detected)
- **FPS Slider**: 1-30 FPS (default: 10)
- **Resolution Dropdown**: Common resolutions (320x240, 640x480, 1280x720, 1920x1080)
- **Min Confidence Slider**: 0.0-1.0 (default: 0.5)
- **Enable Gesture Detection**: Checkbox (default: true)
- **Enable Position Tracking**: Checkbox (default: true)
- **Test Button**: Preview configuration with live camera feed (optional)

**Signals Emitted**:

1. **`hand_presence`** (object)
   ```json
   {
     "present": true,
     "count": 2,
     "confidence": 0.95
   }
   ```
   - Emitted: When hand presence changes or every 1 second if stable
   - Use case: Detect if someone is interacting

2. **`hand_gesture`** (object)
   ```json
   {
     "gesture": "wave",
     "hand_id": "hand-0",
     "confidence": 0.92,
     "landmarks": [[x,y,z], ...]
   }
   ```
   - Gesture values: `"point"`, `"wave"`, `"fist"`, `"open"`, `"thumbs_up"`, `"peace"`
   - Emitted: When gesture changes or every 500ms if stable
   - Use case: Gesture-based navigation, pointing interactions

3. **`hand_position`** (object)
   ```json
   {
     "hand_id": "hand-0",
     "x": 0.45,
     "y": 0.62,
     "z": 0.3,
     "normalized": true
   }
   ```
   - Coordinates normalized 0-1 (x, y) and relative depth (z)
   - Emitted: Every frame (throttled to 10 FPS)
   - Use case: Virtual touch, pointing at specific screen regions

**Implementation Notes**:
- Use MediaPipe Hands solution
- Track hand IDs across frames (simple ID assignment)
- Gesture classification: map landmark positions to gesture types
- Output throttling: Don't emit identical signals repeatedly

---

### 2. Webcam Face Detection

**Executable**: `webcam_face_detection`

**MediaPipe Solution**: Face Detection

**Hardware Requirements**:
- USB webcam
- Minimum resolution: 320x240
- Recommended: 640x480 or higher

**Command Line Arguments**:
```
webcam_face_detection [--device <index>] [--fps <fps>] [--min-confidence <0.0-1.0>]
```
- `--device`: Camera device index (default: `0`)
- `--fps`: Target output FPS (default: `5`)
- `--min-confidence`: Minimum detection confidence (default: `0.5`)

**Configuration Schema** (`data/functions/webcam_face_detection.json`):
```json
{
  "device_index": 0,
  "fps": 5,
  "min_confidence": 0.5,
  "enable_position_tracking": true,
  "max_faces": 10
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available cameras
- **FPS Slider**: 1-15 FPS (default: 5)
- **Min Confidence Slider**: 0.0-1.0 (default: 0.5)
- **Enable Position Tracking**: Checkbox (default: true)
- **Max Faces**: Number input (default: 10, max: 50)

**Signals Emitted**:

1. **`face_presence`** (object)
   ```json
   {
     "present": true,
     "count": 1,
     "confidence": 0.87
   }
   ```
   - Emitted: When presence changes or every 2 seconds if stable
   - Use case: Idle → active transitions, engagement detection

2. **`face_position`** (object)
   ```json
   {
     "face_id": "face-0",
     "x": 0.52,
     "y": 0.48,
     "size": 0.15,
     "bbox": {"x": 0.45, "y": 0.40, "w": 0.14, "h": 0.16}
   }
   ```
   - Normalized coordinates 0-1
   - Emitted: Every frame (throttled to 5 FPS)
   - Use case: Track face position for gaze estimation, zone detection

**Implementation Notes**:
- Use MediaPipe Face Detection (lightweight, fast)
- Face ID tracking: assign stable IDs across frames
- Bounding box: provide normalized coordinates for zone detection

---

### 3. Webcam Person Counter

**Executable**: `webcam_person_counter`

**MediaPipe Solution**: Selfie Segmentation or Object Detection (person class)

**Hardware Requirements**:
- USB webcam
- Wide-angle lens recommended for counting
- Minimum resolution: 640x480

**Command Line Arguments**:
```
webcam_person_counter [--device <index>] [--fps <fps>] [--method <segmentation|detection>]
```
- `--device`: Camera device index (default: `0`)
- `--fps`: Target output FPS (default: `2`)
- `--method`: `segmentation` (faster, less accurate) or `detection` (slower, more accurate)

**Configuration Schema** (`data/functions/webcam_person_counter.json`):
```json
{
  "device_index": 0,
  "fps": 2,
  "method": "segmentation",
  "zone_id": "front",
  "min_person_confidence": 0.5
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available cameras
- **FPS Slider**: 1-5 FPS (default: 2)
- **Method Selection**: Radio buttons - "Segmentation" (fast) or "Detection" (accurate)
- **Zone ID**: Text input (optional, for multi-zone setups)
- **Min Person Confidence**: Slider 0.0-1.0 (default: 0.5)

**Signals Emitted**:

1. **`person_count`** (object)
   ```json
   {
     "count": 3,
     "zone_id": "front",
     "confidence": 0.89
   }
   ```
   - Emitted: When count changes or every 5 seconds if stable
   - Use case: Occupancy-based content, crowd detection

2. **`person_presence`** (object)
   ```json
   {
     "present": true,
     "count": 3
   }
   ```
   - Emitted: When presence changes
   - Use case: Simple presence detection

**Implementation Notes**:
- Selfie Segmentation: faster, works well for foreground/background separation
- Object Detection: more accurate counting but slower
- Zone detection: optional, if camera covers multiple zones

---

### 4. Webcam Pose Estimation

**Executable**: `webcam_pose_estimation`

**MediaPipe Solution**: Pose

**Hardware Requirements**:
- USB webcam
- Full-body view recommended
- Minimum resolution: 640x480

**Command Line Arguments**:
```
webcam_pose_estimation [--device <index>] [--fps <fps>] [--min-pose-score <0.0-1.0>]
```
- `--device`: Camera device index (default: `0`)
- `--fps`: Target output FPS (default: `10`)
- `--min-pose-score`: Minimum pose detection confidence (default: `0.5`)

**Configuration Schema** (`data/functions/webcam_pose_estimation.json`):
```json
{
  "device_index": 0,
  "fps": 10,
  "min_pose_score": 0.5,
  "enable_activity_tracking": true,
  "enable_stance_detection": true,
  "activity_threshold_low": 0.1,
  "activity_threshold_high": 0.7
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available cameras
- **FPS Slider**: 5-30 FPS (default: 10)
- **Min Pose Score**: Slider 0.0-1.0 (default: 0.5)
- **Enable Activity Tracking**: Checkbox (default: true)
- **Enable Stance Detection**: Checkbox (default: true)
- **Activity Thresholds**: Two sliders for low/high thresholds

**Signals Emitted**:

1. **`pose_activity`** (object)
   ```json
   {
     "person_id": "person-0",
     "activity_level": "high",
     "movement_score": 0.75,
     "keypoints": {"nose": [x,y], "left_shoulder": [x,y], ...}
   }
   ```
   - Activity levels: `"low"`, `"medium"`, `"high"` (based on keypoint velocity)
   - Emitted: Every frame (throttled to 10 FPS)
   - Use case: Activity-based content, dance/movement games

2. **`pose_position`** (object)
   ```json
   {
     "person_id": "person-0",
     "center_x": 0.5,
     "center_y": 0.6,
     "stance": "standing"
   }
   ```
   - Stance: `"standing"`, `"sitting"`, `"lying"`
   - Emitted: When position/stance changes
   - Use case: Position tracking, stance detection

**Implementation Notes**:
- Use MediaPipe Pose solution
- Activity calculation: measure keypoint velocity between frames
- Stance detection: analyze keypoint relationships (shoulders vs hips)

---

### 5. Microphone Speech-to-Text

**Executable**: `microphone_stt`

**Library**: Whisper.cpp (C++ port of OpenAI Whisper)

**Hardware Requirements**:
- USB microphone or built-in audio input
- Minimum sample rate: 16kHz
- Recommended: 16kHz mono

**Command Line Arguments**:
```
microphone_stt [--device <index>] [--model <tiny|base|small|medium>] [--lang <lang_code>] [--vad]
```
- `--device`: Audio input device index (default: `0`)
- `--model`: Whisper model size (default: `base`)
- `--lang`: Language code (default: `en`)
- `--vad`: Enable voice activity detection (only process when speech detected)

**Configuration Schema** (`data/functions/microphone_stt.json`):
```json
{
  "device_index": 0,
  "model": "base",
  "language": "en",
  "enable_vad": true,
  "keywords": ["start", "stop", "next", "help"],
  "min_confidence": 0.7,
  "sample_rate": 16000
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available audio input devices
- **Model Selection**: Dropdown (tiny, base, small, medium) with performance notes
- **Language Selection**: Dropdown of supported language codes
- **Enable VAD**: Checkbox (default: true) with explanation
- **Keywords**: Multi-input field for keyword detection list
- **Min Confidence**: Slider 0.0-1.0 (default: 0.7)
- **Sample Rate**: Dropdown (8000, 16000, 44100, 48000) - default: 16000

**Signals Emitted**:

1. **`speech_text`** (object)
   ```json
   {
     "text": "show me the dinosaurs",
     "is_final": true,
     "confidence": 0.87,
     "lang": "en-US",
     "keywords": ["dinosaurs", "show"]
   }
   ```
   - `is_final`: `true` for complete utterances, `false` for partial
   - Keywords: extracted common words (optional)
   - Emitted: On utterance completion or partial updates
   - Use case: Voice commands, conversational exhibits

2. **`speech_keyword`** (object)
   ```json
   {
     "keyword": "start",
     "raw_text": "start the show please",
     "confidence": 0.92
   }
   ```
   - Emitted: When a recognized keyword is detected
   - Use case: Simple keyword triggers without full STT

**Implementation Notes**:
- Use Whisper.cpp for on-device STT
- Voice Activity Detection (VAD): optional but recommended for efficiency
- Keyword extraction: simple keyword matching from recognized text
- Partial results: emit `is_final: false` for real-time feedback

---

### 6. Microphone Sound Level

**Executable**: `microphone_sound_level`

**Library**: Simple audio processing (no ML needed)

**Hardware Requirements**:
- USB microphone or built-in audio input
- Sample rate: 16kHz or higher

**Command Line Arguments**:
```
microphone_sound_level [--device <index>] [--window-ms <ms>] [--threshold-db <db>]
```
- `--device`: Audio input device index (default: `0`)
- `--window-ms`: Analysis window in milliseconds (default: `100`)
- `--threshold-db`: Threshold for impulse detection (default: `-20`)

**Configuration Schema** (`data/functions/microphone_sound_level.json`):
```json
{
  "device_index": 0,
  "window_ms": 100,
  "threshold_db": -20,
  "quiet_threshold_db": 40,
  "loud_threshold_db": 70,
  "enable_impulse_detection": true,
  "impulse_min_duration_ms": 50
}
```

**Web UI Configuration Form**:
- **Device Selection**: Dropdown of available audio input devices
- **Analysis Window**: Number input in ms (default: 100, range: 10-1000)
- **Impulse Threshold**: Number input in dB (default: -20, range: -60 to 0)
- **Quiet Threshold**: Number input in dB (default: 40) - below this = "quiet"
- **Loud Threshold**: Number input in dB (default: 70) - above this = "loud"
- **Enable Impulse Detection**: Checkbox (default: true)
- **Impulse Min Duration**: Number input in ms (default: 50) - minimum spike duration
- **Live Audio Level**: Visual meter showing current dB level (for calibration)

**Signals Emitted**:

1. **`sound_level`** (object)
   ```json
   {
     "db": 68.5,
     "bucket": "normal",
     "rms": 0.42
   }
   ```
   - Buckets: `"quiet"` (< 40dB), `"normal"` (40-70dB), `"loud"` (> 70dB)
   - Emitted: Every 500ms
   - Use case: Audio-reactive visuals, quiet/loud mode switching

2. **`impulse`** (object)
   ```json
   {
     "kind": "clap",
     "strength": 0.81,
     "timestamp_ms": 1704067200123
   }
   ```
   - Kinds: `"clap"`, `"bang"`, `"pop"` (detected via transient analysis)
   - Emitted: On impulse detection
   - Use case: Clap-to-start, beat detection, simple rhythm games

**Implementation Notes**:
- RMS calculation: simple root mean square of audio samples
- dB conversion: `20 * log10(rms / reference)`
- Impulse detection: detect sudden amplitude spikes
- No ML required: pure signal processing

---

### 7. OSC Listener

**Executable**: `osc_listener`

**Library**: C++ OSC library (e.g., `liblo` or `oscpack`)

**Hardware Requirements**:
- Network interface (UDP socket)
- No special hardware required

**Command Line Arguments**:
```
osc_listener [--port <port>] [--address <address_pattern>] [--type <type>]
```
- `--port`: UDP port to listen on (default: `57120`)
- `--address`: OSC address pattern to match (default: `/*` - matches all)
- `--type`: Signal type mapping (`auto`, `direct`, `custom`) (default: `auto`)

**Configuration Schema** (`data/functions/osc_listener.json`):
```json
{
  "port": 57120,
  "address_patterns": [
    {
      "pattern": "/sensor/*",
      "signal_name": "osc_sensor",
      "type": "object"
    },
    {
      "pattern": "/button/*",
      "signal_name": "osc_button",
      "type": "bool"
    },
    {
      "pattern": "/position",
      "signal_name": "osc_position",
      "type": "vector2"
    }
  ],
  "default_signal_name": "osc_message",
  "default_type": "object",
  "enable_address_forwarding": true,
  "coalesce_interval_ms": 10
}
```

**Web UI Configuration Form**:
- **Port**: Number input (default: 57120, range: 1024-65535)
- **Address Pattern Rules**: 
  - Add/remove address pattern mappings
  - Each mapping has:
    - **Pattern**: OSC address pattern (e.g., `/sensor/*`, `/button/1`, `/position`)
    - **Signal Name**: Meander signal name to emit (e.g., `osc_sensor`, `osc_button`)
    - **Type**: Dropdown (auto, bool, number, string, vector2, object)
  - Pattern matching supports wildcards (`*` matches one segment, `**` matches multiple)
- **Default Signal Name**: Text input (used when no pattern matches)
- **Default Type**: Dropdown (auto, bool, number, string, vector2, object)
- **Enable Address Forwarding**: Checkbox - include OSC address in signal payload (default: true)
- **Coalesce Interval**: Number input in ms (default: 10) - batch messages within this window
- **Test Mode**: Button to send test OSC message and preview signal output

**Signals Emitted**:

1. **`osc_message`** (or configured signal name) (type varies)
   ```json
   {
     "address": "/sensor/temperature",
     "value": 23.5,
     "type": "float32",
     "timestamp_osc": 1704067200.123
   }
   ```
   - Emitted: On each OSC message received
   - Value type: Automatically converted based on OSC argument type
   - Use case: Generic OSC message forwarding

2. **Type-specific signals** (when pattern matches):
   - **Bool signals**: `{"value": true, "address": "/button/1"}`
   - **Number signals**: `{"value": 42, "address": "/counter"}`
   - **String signals**: `{"value": "start", "address": "/command"}`
   - **Vector2 signals**: `{"value": [0.5, 0.3], "address": "/position"}`
   - **Object signals**: `{"value": {"x": 0.5, "y": 0.3, "z": 0.1}, "address": "/position3d"}`

**OSC Argument Type Mapping**:
- `int32`, `int64` → `number` (Meander)
- `float32`, `float64` → `number` (Meander)
- `string` → `string` (Meander)
- `bool` → `bool` (Meander)
- `blob` → `string` (base64 encoded)
- Multiple arguments → `object` with indexed keys (`arg0`, `arg1`, etc.) or named keys if provided

**Implementation Notes**:
- Implement in C++ using OSC library (e.g., `liblo` or `oscpack`)
- Listen on UDP socket for OSC messages
- Parse OSC address and match against configured patterns
- Convert OSC arguments to Meander signal format
- Support wildcard pattern matching (`*` for single segment, `**` for multiple)
- Coalesce rapid messages to prevent signal spam
- Include original OSC address in payload when `enable_address_forwarding` is true
- Handle bundle messages (process all messages in bundle)
- Log invalid/malformed OSC messages but continue running
- Use JSON library (e.g., `nlohmann/json`) for payload formatting

**Use Cases**:
- Integration with external controllers (TouchDesigner, Max/MSP, Processing)
- Receiving sensor data from OSC-enabled hardware
- Inter-device communication in multi-Deployable setups
- Integration with interactive art software
- Receiving input from OSC controllers (MIDI-to-OSC, game controllers, etc.)

---

## Implementation Guide for AI Agents

### Step 1: Create Binary Executable

**Note**: Most functions are C++ binaries, but some (like `osc_listener`) are implemented in Go for easier network protocol handling.

#### For C++ Functions (MediaPipe, etc.)

1. **Set up C++ project structure**:
   ```
   functions/
   ├── webcam_handtracking/
   │   ├── CMakeLists.txt
   │   ├── src/
   │   │   └── main.cpp
   │   └── README.md
   ```

2. **Dependencies**:
   - MediaPipe C++ (or alternative ML library)
   - OpenCV (for camera access)
   - JSON library (for output formatting)
   - Platform-specific build tools

3. **Main loop structure**:
   ```cpp
   int main(int argc, char** argv) {
       // Parse command line arguments
       Config config = parseArgs(argc, argv);
       
       // Initialize MediaPipe/ML model
       auto detector = initializeDetector(config);
       
       // Initialize camera/audio input
       auto input = initializeInput(config);
       
       // Main processing loop
       while (running) {
           // Capture frame/audio
           auto frame = input->capture();
           
           // Process with ML model
           auto results = detector->process(frame);
           
           // Emit signals in standard format
           emitSignals(results);
           
           // Throttle output
           sleep(100ms / config.fps);
       }
       
       return 0;
   }
   ```

4. **Signal emission function**:
   ```cpp
   void emitSignal(const std::string& signalName, 
                   const json& payload) {
       int64_t timestamp = getCurrentTimestampMs();
       std::cout << signalName << " " << timestamp 
                 << " " << payload.dump() << std::endl;
       std::cout.flush();  // Important: flush immediately
   }
   ```

#### C++ OSC Listener Example

1. **Main function structure**:
   ```cpp
   #include <iostream>
   #include <string>
   #include <vector>
   #include <chrono>
   #include <lo/lo.h>
   #include <nlohmann/json.hpp>
   
   using json = nlohmann::json;
   
   void emitSignal(const std::string& signalName, const json& payload) {
       auto now = std::chrono::system_clock::now();
       auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
           now.time_since_epoch()).count();
       std::cout << signalName << " " << timestamp 
                 << " " << payload.dump() << std::endl;
       std::cout.flush();
   }
   
   int oscMessageHandler(const char* path, const char* types, 
                        lo_arg** argv, int argc, void* user_data) {
       json payload;
       payload["address"] = path;
       
       std::vector<json> values;
       for (int i = 0; i < argc; i++) {
           switch (types[i]) {
               case 'i':
                   values.push_back(argv[i]->i);
                   break;
               case 'f':
                   values.push_back(argv[i]->f);
                   break;
               case 's':
                   values.push_back(std::string(&argv[i]->s));
                   break;
               case 'T':
                   values.push_back(true);
                   break;
               case 'F':
                   values.push_back(false);
                   break;
               // Add more type handlers as needed
           }
       }
       
       if (values.size() == 1) {
           payload["value"] = values[0];
       } else {
           payload["value"] = values;
       }
       
       emitSignal("osc_message", payload);
       return 0;
   }
   
   int main(int argc, char** argv) {
       int port = 57120;
       std::string addressPattern = "/*";
       
       // Parse command line arguments
       for (int i = 1; i < argc; i++) {
           if (std::string(argv[i]) == "--port" && i + 1 < argc) {
               port = std::stoi(argv[++i]);
           } else if (std::string(argv[i]) == "--address" && i + 1 < argc) {
               addressPattern = argv[++i];
           }
       }
       
       lo_server_thread server = lo_server_thread_new(std::to_string(port).c_str(), nullptr);
       if (!server) {
           std::cerr << "Failed to create OSC server on port " << port << std::endl;
           return 1;
       }
       
       lo_server_thread_add_method(server, addressPattern.c_str(), nullptr, 
                                   oscMessageHandler, nullptr);
       
       std::cout << "OSC listener starting on port " << port << std::endl;
       lo_server_thread_start(server);
       
       // Keep running
       while (true) {
           std::this_thread::sleep_for(std::chrono::seconds(1));
       }
       
       lo_server_thread_free(server);
       return 0;
   }
   ```

### Step 2: Cross-Compilation

Build for multiple platforms using CMake/cross-compilation toolchains:
- **Windows (amd64)**: `windows-amd64/osc_listener.exe`
- **Linux ARMv7**: `linux-armv7/osc_listener`
- **Linux ARM64**: `linux-arm64/osc_listener`

**Dependencies for OSC Listener**:
- `liblo` or `oscpack` (OSC library)
- `nlohmann/json` or similar JSON library
- Standard C++ networking libraries

### Step 3: Deployable Integration

1. **Extend show logic model** to include `required_functions`:
   ```go
   type ShowLogicDefinition struct {
       // ... existing fields ...
       RequiredFunctions []string `json:"required_functions,omitempty"`
   }
   ```

2. **Create function syncer** (similar to asset syncer):
   ```go
   // Deployable/internal/functions/sync.go
   type FunctionSyncer struct {
       BinDir    string
       SourceURL string
       Platform  string  // "windows-amd64", "linux-armv7", etc.
   }
   
   func (s *FunctionSyncer) EnsureFunctions(required []string) error {
       // Check each function, download if missing
   }
   ```

3. **Create configuration manager**:
   ```go
   // Deployable/internal/functions/config.go
   type FunctionConfigManager struct {
       DataDir string
   }
   
   func (m *FunctionConfigManager) LoadConfig(functionName string) (map[string]interface{}, error) {
       // Load from data/functions/{function_name}.json or return defaults
   }
   
   func (m *FunctionConfigManager) SaveConfig(functionName string, config map[string]interface{}) error {
       // Save to data/functions/{function_name}.json
   }
   
   func (m *FunctionConfigManager) BuildArgs(functionName string, config map[string]interface{}) []string {
       // Convert config to command-line arguments based on function schema
   }
   ```

4. **Create sensor manager**:
   ```go
   // Deployable/internal/sensors/mediapipe.go
   type MediaPipeSensor struct {
       cmd      *exec.Cmd
       scanner  *bufio.Scanner
       signalCh chan SignalEvent
       config   map[string]interface{}
   }
   
   func NewMediaPipeSensor(binaryPath string, config map[string]interface{}) (*MediaPipeSensor, error) {
       // Build args from config, spawn binary, read stdout, parse messages
       args := configManager.BuildArgs(functionName, config)
       cmd := exec.Command(binaryPath, args...)
       // ...
   }
   ```

5. **Add web interface for configuration**:
   ```go
   // Deployable/internal/web/functions.go
   func (s *Server) handleFunctionsList(w http.ResponseWriter, r *http.Request) {
       // List all functions from show logic, show status
   }
   
   func (s *Server) handleFunctionConfig(w http.ResponseWriter, r *http.Request) {
       // GET: Return current config, POST: Update config and restart binary
   }
   ```

6. **Integrate into registration flow**:
   ```go
   // In handleAssign() or similar
   requiredFunctions := extractRequiredFunctions(msg.ShowLogic)
   if err := functionSyncer.EnsureFunctions(requiredFunctions); err != nil {
       return err
   }
   // Load or create default configs for each function
   for _, fn := range requiredFunctions {
       config, _ := configManager.LoadConfig(fn)
       // Start sensor with config
   }
   ```

### Step 4: State Server Binary Hosting

1. **Add binary storage directory**: `State Server/binaries/{platform}/`
2. **Add binary serving endpoint**: `GET /binaries/{platform}/{function_name}`
3. **Add binary listing endpoint**: `GET /api/v1/binaries?platform={platform}`

## Signal Type Definitions

All signals must be defined in show logic `signals` array with appropriate types:

- **`bool`**: Simple true/false values
- **`number`**: Numeric values (integers or floats)
- **`string`**: Text values
- **`vector2`**: Two-element arrays `[x, y]`
- **`object`**: Complex JSON objects (most common for ML outputs)

## Error Handling

### Binary Crashes

- Deployable should detect process exit
- Log error with stderr output
- Optionally restart binary (with exponential backoff)
- Mark sensor as unavailable, continue operation

### Missing Binaries

- During registration: fail assignment if required binary unavailable
- Log clear error message with download URL
- Provide fallback behavior if binary optional

### Invalid Messages

- Skip malformed lines (log warning)
- Continue processing subsequent messages
- Don't crash Deployable on bad input

## Testing

### Unit Testing Binary Output

Test binaries by capturing stdout:
```bash
./webcam_handtracking --device 0 > test_output.txt
# Verify format: signal_name timestamp_ms {json}
```

### Integration Testing

1. Start Deployable with test show logic
2. Verify binaries download correctly
3. Verify signals appear in State Server events
4. Verify rules can trigger on signals

## Configuration Web Interface Details

### UI Structure

**Main Functions Page** (`/functions`):
- List all functions from `required_functions` in show logic
- Show status for each: Running, Stopped, Error, Not Configured
- Quick actions: Configure, Restart, View Logs
- Link to individual function configuration pages

**Function Configuration Page** (`/functions/{function_name}`):
- Form with all configurable parameters for the function
- Device discovery: Auto-populate dropdowns with available hardware
- Live preview: Show current signal output (if binary running)
- Save button: Persist config and restart binary with new settings
- Test button: Temporarily apply config without saving (for testing)
- Reset button: Restore defaults
- Status panel: Show binary process status, last signal received, errors

### Configuration Persistence

- **Storage**: `Deployable/data/functions/{function_name}.json`
- **Format**: Function-specific JSON schema
- **Loading**: On Deployable boot, load configs for all `required_functions`
- **Defaults**: If config missing, use hardcoded defaults from function specification
- **Validation**: Validate config against schema before saving/using

### Device Discovery

The web UI should provide device discovery endpoints:

- `GET /api/devices/cameras` - List available video input devices
- `GET /api/devices/audio` - List available audio input devices
- `GET /api/devices/serial` - List available serial ports

These can be implemented by:
- Querying system (Windows: DirectShow, Linux: v4l2, ALSA)
- Parsing capabilities from Deployable's capability report
- Running discovery binaries/scripts

### Configuration Schema Registry

Each function should define its configuration schema. The Deployable can maintain a registry:

```go
// Deployable/internal/functions/schemas.go
var FunctionSchemas = map[string]FunctionSchema{
    "webcam_handtracking": {
        Fields: []ConfigField{
            {Name: "device_index", Type: "number", Default: 0, Min: 0, Max: 10},
            {Name: "fps", Type: "number", Default: 10, Min: 1, Max: 30},
            {Name: "resolution", Type: "object", Default: map[string]int{"width": 1280, "height": 720}},
            // ...
        },
    },
    // ...
}
```

The web UI can use these schemas to generate forms dynamically.

### Configuration Application Flow

1. User opens `/functions/{function_name}` in browser
2. Deployable loads current config (or defaults)
3. User modifies parameters in form
4. User clicks "Save" or "Test"
5. Deployable validates configuration
6. If valid:
   - Save to `data/functions/{function_name}.json` (if "Save")
   - Build command-line arguments from config
   - Stop existing binary process (if running)
   - Start binary with new arguments
   - Return success/error status
7. UI updates to show new status

### Runtime Configuration Updates

- Configuration can be updated while Deployable is running
- Changing config automatically restarts the affected binary
- Binary restart is graceful: stop process, wait for cleanup, start new process
- If restart fails, previous config is retained and error shown in UI

## Future Enhancements

- **Binary versioning**: Support multiple versions of same function
- **Configuration presets**: Save/load configuration presets
- **Health checks**: Binaries can emit health status signals
- **Performance metrics**: Binaries can report FPS, latency
- **GPU acceleration**: Support CUDA/OpenCL for faster processing
- **Configuration templates**: Pre-configured setups for common scenarios
- **Remote configuration**: Allow State Server to push config updates
- **Configuration validation**: Real-time validation with helpful error messages

## Maintenance

Each function should have:
- **README.md**: Usage, requirements, signal documentation
- **CHANGELOG.md**: Version history, breaking changes
- **Tests**: Unit tests for signal formatting
- **Examples**: Example show logic using the function

Functions are developed and maintained independently, allowing incremental feature additions without affecting other functions.
