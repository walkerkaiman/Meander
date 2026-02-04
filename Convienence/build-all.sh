#!/bin/bash
# Cross-compilation script for Windows and Raspberry Pi
# Builds both State Server and Deployable for multiple platforms

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATE_SERVER_DIR="$ROOT_DIR/State Server"
DEPLOYABLE_DIR="$ROOT_DIR/Deployable"
OUTPUT_DIR="$ROOT_DIR/build"

echo "Building for multiple platforms..."
echo ""

# Create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Function to build for a specific platform
build_platform() {
    local GOOS=$1
    local GOARCH=$2
    local PLATFORM_NAME=$3
    local EXTENSION=${4:-""}
    
    echo "Building for $PLATFORM_NAME ($GOOS/$GOARCH)..."
    
    export GOOS=$GOOS
    export GOARCH=$GOARCH
    
    # Build State Server
    cd "$STATE_SERVER_DIR"
    STATE_SERVER_OUTPUT="$OUTPUT_DIR/state-server-$PLATFORM_NAME$EXTENSION"
    go build -o "$STATE_SERVER_OUTPUT" ./cmd/state-server
    if [ $? -ne 0 ]; then
        echo "Failed to build State Server for $PLATFORM_NAME" >&2
        exit 1
    fi
    
    # Build Deployable
    cd "$DEPLOYABLE_DIR"
    DEPLOYABLE_OUTPUT="$OUTPUT_DIR/deployable-$PLATFORM_NAME$EXTENSION"
    go build -o "$DEPLOYABLE_OUTPUT" ./cmd/deployable
    if [ $? -ne 0 ]; then
        echo "Failed to build Deployable for $PLATFORM_NAME" >&2
        exit 1
    fi
    
    echo "  ✓ State Server: state-server-$PLATFORM_NAME$EXTENSION"
    echo "  ✓ Deployable: deployable-$PLATFORM_NAME$EXTENSION"
    echo ""
}

# Build for Windows (amd64)
build_platform "windows" "amd64" "windows-amd64" ".exe"

# Build for Raspberry Pi (ARMv7 - 32-bit, most common)
build_platform "linux" "arm" "rpi-armv7" ""

# Build for Raspberry Pi (ARM64 - 64-bit, newer models)
build_platform "linux" "arm64" "rpi-arm64" ""

# Clean up environment variables
unset GOOS
unset GOARCH

echo "Build complete! All binaries are in: $OUTPUT_DIR"
echo ""
echo "Built binaries:"
ls -lh "$OUTPUT_DIR" | awk '{if (NR>1) print "  " $9 " (" $5 ")"}'
