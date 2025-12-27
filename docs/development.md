# Development Guide

This guide covers local development setup for Continuum, including GPU-accelerated inference.

## Prerequisites

- **Bun 1.3.5+** (runtime)
- **Rust 1.77.2+** (for Tauri backend)
- **Node.js 20+** (for tooling compatibility)

## CUDA Build Support (GPU Acceleration)

Continuum supports GPU-accelerated inference via CUDA for significantly improved performance. CPU inference runs at ~1-2 tokens/sec, while CUDA achieves ~22 tokens/sec.

### Requirements

| Component | Minimum Version | Notes |
|-----------|-----------------|-------|
| NVIDIA GPU | Compute 5.0+ | Maxwell architecture or newer |
| CUDA Toolkit | 11.8+ | [Download](https://developer.nvidia.com/cuda-toolkit) |
| cuDNN | 8.5.0+ | [Download](https://developer.nvidia.com/cudnn) (requires NVIDIA account) |
| NVIDIA Driver | 525+ | Must match CUDA toolkit version |

### Linux Setup (Ubuntu/Debian)

1. **Install NVIDIA Driver**
   ```bash
   # Check current driver
   nvidia-smi

   # Install/update if needed
   sudo apt update
   sudo apt install nvidia-driver-535
   ```

2. **Install CUDA Toolkit**
   ```bash
   # Add NVIDIA package repository (Ubuntu 22.04 example)
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
   sudo dpkg -i cuda-keyring_1.1-1_all.deb
   sudo apt update
   sudo apt install cuda-toolkit-11-8

   # Add to PATH
   echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
   echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Install cuDNN**
   ```bash
   # Download cuDNN from NVIDIA (requires account)
   # Extract and copy files
   sudo cp cudnn-*-archive/include/* /usr/local/cuda/include/
   sudo cp cudnn-*-archive/lib/* /usr/local/cuda/lib64/
   ```

4. **Symlink cuDNN Headers (CRITICAL for Linux)**
   ```bash
   # Required for Rust CUDA bindings to find cuDNN
   sudo ln -sf /usr/include/x86_64-linux-gnu/cudnn*.h /usr/include/

   # Verify symlinks exist
   ls -la /usr/include/cudnn*.h
   ```

### Windows Setup

1. Install NVIDIA GPU driver from [NVIDIA Drivers](https://www.nvidia.com/Download/index.aspx)
2. Install CUDA Toolkit from [CUDA Downloads](https://developer.nvidia.com/cuda-downloads)
3. Install cuDNN from [cuDNN Downloads](https://developer.nvidia.com/cudnn) (copy to CUDA directory)
4. Ensure `CUDA_PATH` environment variable is set

### macOS

CUDA is not supported on macOS. Use CPU inference or Metal acceleration (not yet implemented).

## Building with CUDA

### Via package.json (Recommended)

```bash
# From project root or apps/web
cd apps/web

# Development with CUDA
bun run desktop:dev:cuda

# Production build with CUDA
bun run desktop:build:cuda
```

### Via Cargo (Direct)

```bash
# Navigate to Tauri directory
cd apps/web/src-tauri

# CPU-only build (default)
cargo build --release

# CUDA-accelerated build
cargo build --release --features cuda

# Development with CUDA
cargo run --features cuda

# Check CUDA build without full compilation
cargo check --features cuda
```

## Verifying CUDA Setup

```bash
# Check NVIDIA driver and GPU
nvidia-smi

# Check CUDA version
nvcc --version

# Verify cuDNN
cat /usr/local/cuda/include/cudnn_version.h | grep CUDNN_MAJOR -A 2

# Test Kalosm CUDA inference (from project root)
cd apps/web/src-tauri
cargo run --features cuda
```

## Troubleshooting

### "cuDNN not found" or bindgen errors

**Problem**: CUDA build fails with cuDNN header not found errors.

**Solution** (Linux):
```bash
# Create symlinks for cuDNN headers
sudo ln -sf /usr/include/x86_64-linux-gnu/cudnn*.h /usr/include/

# Verify headers are accessible
ls /usr/include/cudnn*.h
```

### "CUDA driver version is insufficient"

**Problem**: GPU detected but CUDA operations fail.

**Solution**: Update NVIDIA driver to match CUDA toolkit:
```bash
# Check current driver version
nvidia-smi

# Update driver (Ubuntu/Debian)
sudo apt update
sudo apt install nvidia-driver-535
sudo reboot
```

### Build succeeds but inference still slow

**Problem**: Built with `--features cuda` but performance is ~1-2 tok/sec.

**Possible Causes**:
1. GPU not being used - check `nvidia-smi` during inference for GPU utilization
2. Model not CUDA-enabled - ensure model supports GPU acceleration
3. VRAM insufficient - some models require 4GB+ VRAM

**Debug**:
```bash
# Monitor GPU usage during inference
watch -n 1 nvidia-smi
```

### "libcuda.so not found"

**Problem**: CUDA library not in path.

**Solution**:
```bash
# Add CUDA libs to path
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH

# Make permanent
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
```

### Compilation takes forever

**Problem**: CUDA kernel compilation is slow.

**Note**: First CUDA build compiles GPU kernels which takes 5-10 minutes. Subsequent builds use cached kernels and are much faster.

## Build Size Reference

| Build | Binary Size | Notes |
|-------|-------------|-------|
| CPU only | ~25 MB | Default build |
| CUDA | ~36 MB | `--features cuda`, +11MB |

ADR-BUILD-1 constraint: CUDA build must be ≤60MB (PASS)

## Performance Reference

| Configuration | Inference Speed | Notes |
|---------------|-----------------|-------|
| CPU only | ~1-2 tok/sec | Default build |
| CUDA (RTX 3090) | ~22 tok/sec | `--features cuda` |
| CUDA (RTX 4090) | ~35 tok/sec | Estimated |

NFR3 compliance requires >=10 tok/sec for acceptable user experience.

## MCP Bridge Integration (E2E Testing)

Continuum uses `tauri-plugin-mcp-bridge` to enable E2E testing of Tauri IPC commands via the Model Context Protocol.

### Overview

The MCP bridge exposes Tauri's IPC commands to external tools (like Claude Code's Tauri MCP server), enabling:
- Automated testing of IPC commands without UI interaction
- Debugging IPC communication in real-time
- Integration testing in CI/CD pipelines

### Configuration

The MCP bridge is **enabled only in debug builds** to avoid production overhead:

```rust
// src-tauri/src/lib.rs
.setup(|app| {
    if cfg!(debug_assertions) {
        app.handle().plugin(tauri_plugin_mcp_bridge::init())?;
    }
    Ok(())
})
```

**Required settings** (`tauri.conf.json`):
```json
{
  "app": {
    "withGlobalTauri": true
  }
}
```

**Capabilities** (`capabilities/default.json`):
```json
{
  "permissions": ["core:default", "mcp-bridge:default"]
}
```

### Available IPC Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `load_model` | Load inference model into memory | None |
| `generate` | Generate text from prompt | `{ prompt: string }` |
| `abort_inference` | Cancel ongoing generation | None |
| `get_model_status` | Check if model is loaded | None |
| `unload_model` | Unload model from memory | None |

### Using MCP Tools for Testing

The MCP bridge runs a WebSocket server on port 9223 (range 9223-9322) when the app starts in debug mode.

**With Claude Code** (recommended):
```bash
# Install the Tauri MCP server
bunx -y install-mcp @hypothesi/tauri-mcp-server --client claude-code

# Or run directly
bunx @hypothesi/tauri-mcp-server
```

**Available MCP Tools:**

#### `tauri_ipc_execute_command`
Execute any registered Tauri IPC command:
```typescript
// Example: Load the model
tauri_ipc_execute_command({ command: "load_model" })

// Example: Generate text
tauri_ipc_execute_command({
  command: "generate",
  args: { prompt: "Hello, world!" }
})

// Example: Check model status
tauri_ipc_execute_command({ command: "get_model_status" })
```

#### `tauri_ipc_monitor`
Start/stop monitoring IPC traffic for debugging:
```typescript
// Start monitoring
tauri_ipc_monitor({ action: "start" })

// Stop monitoring
tauri_ipc_monitor({ action: "stop" })
```

#### `tauri_ipc_get_captured`
Retrieve captured IPC traffic (requires monitoring to be active):
```typescript
// Get all captured IPC calls
tauri_ipc_get_captured()

// Filter by command name
tauri_ipc_get_captured({ filter: "generate" })
```

#### `tauri_ipc_get_backend_state`
Get Tauri app metadata and state:
```typescript
tauri_ipc_get_backend_state()
// Returns: { appName, tauriVersion, environment, ... }
```

### Manual Testing Workflow

1. **Start the app in debug mode:**
   ```bash
   cd apps/web
   bun run desktop:dev
   ```

2. **Connect MCP server** (in another terminal):
   ```bash
   bunx @hypothesi/tauri-mcp-server
   ```

3. **Execute IPC commands** via Claude Code or MCP client

### CI Integration

The `.github/workflows/tauri-ipc-tests.yml` workflow verifies:
- Cargo.toml structure (features, dependencies)
- IPC commands are registered in lib.rs
- `cargo check` passes for both CPU and CUDA builds

Full E2E IPC testing with xvfb is planned for future iterations.
