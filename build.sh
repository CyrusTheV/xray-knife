#!/bin/bash
# Build script for the Go application
# Usage: ./build.sh <platform> [arch]
#
# Available platforms (OS):
#   - macos (or darwin)
#   - win (or windows)
#   - linux
#   - all (builds for all platforms concurrently)
#
# Available architectures: amd64, arm64, arm (arm only for linux; defaults to armv7hf)
#

# Enable strict error handling
set -euo pipefail

# Configuration
APP_NAME="xray-knife"
BUILD_DIR="build"
SOURCE_FILE="main.go"

# Common build configuration
BUILD_TAGS="with_gvisor,with_quic,with_wireguard,with_ech,with_utls,with_clash_api,with_grpc"
LDFLAGS="-s -w"

# Ensure source file exists
if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file '$SOURCE_FILE' not found."
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Build function
build_app() {
    local platform=$1
    local output_name=$2
    local target_goos=$3
    local target_goarch=$4
    local goarm=${5:-""}  # Optional GOARM for arm builds

    echo "Starting build for $platform ($target_goos/$target_goarch${goarm:+/GOARM=$goarm})..."
    if [ -n "$goarm" ]; then
        GOOS=$target_goos GOARCH=$target_goarch GOARM=$goarm CGO_ENABLED=0 go build \
            -tags="$BUILD_TAGS" \
            -ldflags="$LDFLAGS" \
            -trimpath \
            -o "$BUILD_DIR/$output_name" \
            "$SOURCE_FILE"
    else
        GOOS=$target_goos GOARCH=$target_goarch CGO_ENABLED=0 go build \
            -tags="$BUILD_TAGS" \
            -ldflags="$LDFLAGS" \
            -trimpath \
            -o "$BUILD_DIR/$output_name" \
            "$SOURCE_FILE"
    fi
    echo "✓ Build successful: $BUILD_DIR/$output_name"
}

# Ensure a platform argument is provided
if [ $# -lt 1 ]; then
    echo "Error: Missing platform argument."
    echo "Usage: $0 <platform> [amd64|arm64|arm]"
    exit 1
fi

# Determine architecture: use $2 if provided, otherwise default to amd64
arch_arg=${2:-"amd64"}

if [[ "$arch_arg" != "amd64" && "$arch_arg" != "arm64" && "$arch_arg" != "arm" ]]; then
    echo "Error: Invalid architecture '$arch_arg'. Supported: amd64, arm64, arm (arm only for linux)."
    echo "Usage: $0 <platform> [amd64|arm64|arm]"
    exit 1
fi

# For arm architecture, ensure platform is linux
if [ "$arch_arg" = "arm" ] && [ "$1" != "linux" ]; then
    echo "Error: ARM architecture is only supported for linux platform."
    exit 1
fi

# Process command-line argument
case "$1" in
    "macos"|"darwin")
        build_app "macOS" "${APP_NAME}_darwin_${arch_arg}" "darwin" "$arch_arg"
        ;;
    "win"|"windows")
        build_app "Windows" "${APP_NAME}_windows_${arch_arg}.exe" "windows" "$arch_arg"
        ;;
    "linux")
        if [ "$arch_arg" = "arm" ]; then
            build_app "Linux (armv7hf)" "${APP_NAME}_linux_armv7hf" "linux" "arm" "7"
        else
            build_app "Linux" "${APP_NAME}_linux_${arch_arg}" "linux" "$arch_arg"
        fi
        ;;
    "all")
        echo "Building for all supported OS/architecture combinations concurrently..."

        # Launch each build in the background
        pids=()
        build_app "macOS (amd64)" "${APP_NAME}_darwin_amd64" "darwin" "amd64" & pids+=($!)
        build_app "macOS (arm64)" "${APP_NAME}_darwin_arm64" "darwin" "arm64" & pids+=($!)
        build_app "Windows (amd64)" "${APP_NAME}_windows_amd64.exe" "windows" "amd64" & pids+=($!)
        build_app "Windows (arm64)" "${APP_NAME}_windows_arm64.exe" "windows" "arm64" & pids+=($!)
        build_app "Linux (amd64)" "${APP_NAME}_linux_amd64" "linux" "amd64" & pids+=($!)
        build_app "Linux (arm64)" "${APP_NAME}_linux_arm64" "linux" "arm64" & pids+=($!)
        build_app "Linux (armv7hf)" "${APP_NAME}_linux_armv7hf" "linux" "arm" "7" & pids+=($!)

        # Wait for all builds and capture exit statuses
        exit_status=0
        for pid in "${pids[@]}"; do
            wait "$pid" || { echo "A build failed (PID: $pid)"; exit_status=1; }
        done

        if [ $exit_status -ne 0 ]; then
            echo "One or more builds failed."
            exit 1
        else
            echo "✓ All builds completed successfully!"
        fi
        ;;
    *)
        echo "Error: Invalid or missing platform argument."
        echo "Usage: $0 <platform> [amd64|arm64|arm]"
        echo "Available platforms (OS):"
        echo "  - macos (or darwin)"
        echo "  - win (or windows)"
        echo "  - linux"
        echo "  - all (builds for all OS/arch combinations concurrently)"
        echo "Available architectures: amd64, arm64, arm (arm only for linux; defaults to armv7hf)"
        exit 1
        ;;
esac
