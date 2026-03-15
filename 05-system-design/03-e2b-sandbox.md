# E2B Code Sandbox - Project Plan

## 1. Project Overview

A secure code execution sandbox similar to E2B (e2b.dev). This project focuses on the core sandboxing technology - running untrusted code in isolated environments with strict resource limits. You'll learn container isolation, microVM technology (Firecracker), and security-first infrastructure design.

### Core Value Proposition
- Execute arbitrary code safely in isolated environments
- Provide consistent, reproducible execution environments
- Enforce strict resource limits (CPU, memory, time, network)
- Support multiple programming languages

### Key Learning Outcomes
- Container internals and Linux namespaces
- Firecracker microVMs for stronger isolation
- Process management and resource control (cgroups)
- Security hardening and attack surface reduction
- API design for infrastructure services

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] Docker-based code execution sandbox
- [ ] Support for Python, Node.js, Go (3 languages minimum)
- [ ] Resource limits (CPU, memory, execution time)
- [ ] Network isolation (no outbound by default)
- [ ] File system isolation (ephemeral)
- [ ] REST API to submit and execute code
- [ ] Execution output capture (stdout, stderr)
- [ ] Timeout handling

### V2 Features (Nice-to-Have)
- [ ] Firecracker microVM integration
- [ ] Persistent file storage (workspace)
- [ ] Package/dependency installation
- [ ] Concurrent execution pool
- [ ] WebSocket for streaming output
- [ ] Custom runtime environments
- [ ] Execution metrics and logging
- [ ] Rate limiting per client
- [ ] SDK for common languages

---

## 3. Tech Stack

### Core Backend
| Technology | Purpose |
|------------|---------|
| Go | Primary language (performance, Docker SDK) |
| OR Rust | Alternative (memory safety, Firecracker bindings) |
| Docker SDK | Container management |
| Firecracker | MicroVM isolation (v2) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Container runtime |
| containerd | Lower-level container runtime |
| Linux cgroups v2 | Resource limiting |
| Linux namespaces | Process isolation |
| seccomp | System call filtering |
| AppArmor/SELinux | Mandatory access control |

### API & Networking
| Technology | Purpose |
|------------|---------|
| Gin/Echo (Go) | HTTP API framework |
| gRPC | Internal service communication |
| Redis | Job queue, rate limiting |
| PostgreSQL | Execution logs, metadata |

### Monitoring
| Technology | Purpose |
|------------|---------|
| Prometheus | Metrics collection |
| Grafana | Visualization |
| Jaeger | Distributed tracing |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   curl -X POST /execute -d '{"language": "python", "code": "..."}'    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Go HTTP Server                                 │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   /execute   │  │   /status    │  │  /runtimes   │                │  │
│  │  │              │  │              │  │              │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         │                                                              │  │
│  │         ▼                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Execution Manager                             │ │  │
│  │  │  - Validates request                                             │ │  │
│  │  │  - Selects runtime                                               │ │  │
│  │  │  - Manages execution lifecycle                                   │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    │                                         │
│  ┌──────────────┐                  │                  ┌──────────────┐      │
│  │    Redis     │◀─────────────────┼─────────────────▶│  PostgreSQL  │      │
│  │  (Queue)     │                  │                  │   (Logs)     │      │
│  └──────────────┘                  │                  └──────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SANDBOX POOL                                   │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │  │
│  │  │   Container 1   │  │   Container 2   │  │   Container 3   │       │  │
│  │  │   ┌─────────┐   │  │   ┌─────────┐   │  │   ┌─────────┐   │       │  │
│  │  │   │ Python  │   │  │   │ Node.js │   │  │   │   Go    │   │       │  │
│  │  │   │ Runtime │   │  │   │ Runtime │   │  │   │ Runtime │   │       │  │
│  │  │   └─────────┘   │  │   └─────────┘   │  │   └─────────┘   │       │  │
│  │  │                 │  │                 │  │                 │       │  │
│  │  │  CPU: 0.5 core  │  │  CPU: 0.5 core  │  │  CPU: 0.5 core  │       │  │
│  │  │  MEM: 128MB     │  │  MEM: 128MB     │  │  MEM: 128MB     │       │  │
│  │  │  NET: disabled  │  │  NET: disabled  │  │  NET: disabled  │       │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘       │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
1. Client sends code execution request
         │
         ▼
2. API validates request:
   ├── Language supported?
   ├── Code size within limits?
   ├── Client not rate-limited?
   └── Valid API key?
         │
         ▼
3. Execution Manager:
   ├── Create unique execution ID
   ├── Select container image for language
   └── Add to execution queue
         │
         ▼
4. Sandbox Worker picks up job:
   ├── Create new container with limits
   ├── Mount code as read-only
   ├── Start execution with timeout
   └── Capture stdout/stderr
         │
         ▼
5. Execution completes or times out:
   ├── Collect output
   ├── Record metrics (time, memory)
   ├── Destroy container
   └── Return results
         │
         ▼
6. Client receives response:
   {
     "id": "exec_123",
     "status": "success",
     "output": "Hello, World!\n",
     "execution_time_ms": 45,
     "memory_used_kb": 8192
   }
```

### Isolation Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Container Isolation (Docker)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Separate PID namespace (can't see host processes)      │  │
│  │  - Separate network namespace (isolated network)          │  │
│  │  - Separate mount namespace (own filesystem view)         │  │
│  │  - Separate user namespace (non-root UID mapping)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 2: Resource Limits (cgroups v2)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - CPU: 50% of 1 core (cpu.max)                           │  │
│  │  - Memory: 128MB hard limit (memory.max)                  │  │
│  │  - PIDs: Max 50 processes (pids.max)                      │  │
│  │  - I/O: Throttled disk access                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 3: System Call Filtering (seccomp)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Whitelist only required syscalls                       │  │
│  │  - Block dangerous calls (ptrace, mount, etc.)            │  │
│  │  - Log suspicious activity                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 4: Filesystem Restrictions                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Read-only root filesystem                              │  │
│  │  - tmpfs for /tmp (size-limited)                          │  │
│  │  - No access to host paths                                │  │
│  │  - Drop all capabilities                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Layer 5 (V2): MicroVM Isolation (Firecracker)                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Hardware-level isolation via KVM                       │  │
│  │  - Minimal attack surface (~50 syscalls)                  │  │
│  │  - Sub-second boot times                                  │  │
│  │  - Memory ballooning for efficiency                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API Design

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/execute` | Execute code |
| GET | `/api/v1/execute/:id` | Get execution result |
| GET | `/api/v1/execute/:id/stream` | Stream execution output (WebSocket) |
| GET | `/api/v1/runtimes` | List available runtimes |
| GET | `/api/v1/health` | Health check |

### Request/Response Examples

**Execute Code**
```bash
POST /api/v1/execute
Content-Type: application/json

{
  "language": "python",
  "code": "print('Hello, World!')",
  "timeout_ms": 5000,
  "memory_limit_mb": 128
}
```

**Response**
```json
{
  "id": "exec_abc123",
  "status": "completed",
  "output": "Hello, World!\n",
  "error": null,
  "exit_code": 0,
  "execution_time_ms": 42,
  "memory_used_mb": 12,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Response**
```json
{
  "id": "exec_def456",
  "status": "timeout",
  "output": "",
  "error": "Execution exceeded time limit of 5000ms",
  "exit_code": -1,
  "execution_time_ms": 5000,
  "memory_used_mb": 45
}
```

---

## 6. Implementation Details

### Docker Container Configuration

```go
// sandbox/container.go
package sandbox

import (
    "context"
    "github.com/docker/docker/api/types/container"
    "github.com/docker/docker/client"
)

type ContainerConfig struct {
    Image       string
    MemoryLimit int64  // bytes
    CPUQuota    int64  // microseconds per 100ms
    Timeout     time.Duration
    NetworkMode string
}

func CreateSandbox(ctx context.Context, cfg ContainerConfig, code string) (string, error) {
    cli, err := client.NewClientWithOpts(client.FromEnv)
    if err != nil {
        return "", err
    }

    hostConfig := &container.HostConfig{
        // Resource limits
        Resources: container.Resources{
            Memory:     cfg.MemoryLimit,      // 128MB
            MemorySwap: cfg.MemoryLimit,      // No swap
            CPUQuota:   cfg.CPUQuota,         // 50000 = 50% of 1 CPU
            CPUPeriod:  100000,               // 100ms period
            PidsLimit:  ptr(int64(50)),       // Max 50 processes
        },

        // Security settings
        SecurityOpt: []string{
            "no-new-privileges:true",
            "seccomp=/etc/docker/seccomp-sandbox.json",
        },

        // Filesystem
        ReadonlyRootfs: true,
        Tmpfs: map[string]string{
            "/tmp": "size=10M,noexec,nosuid,nodev",
        },

        // Network isolation
        NetworkMode: container.NetworkMode("none"),

        // Drop all capabilities
        CapDrop: []string{"ALL"},

        // Auto-remove when done
        AutoRemove: true,
    }

    containerConfig := &container.Config{
        Image:        cfg.Image,
        Cmd:          []string{"/sandbox/run.sh"},
        WorkingDir:   "/sandbox",
        User:         "nobody:nogroup",
        Tty:          false,
        AttachStdout: true,
        AttachStderr: true,
    }

    resp, err := cli.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, "")
    if err != nil {
        return "", err
    }

    return resp.ID, nil
}
```

### Seccomp Profile

```json
// /etc/docker/seccomp-sandbox.json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat", "fstat",
        "lstat", "poll", "lseek", "mmap", "mprotect", "munmap",
        "brk", "rt_sigaction", "rt_sigprocmask", "ioctl",
        "access", "pipe", "select", "sched_yield", "mremap",
        "msync", "mincore", "madvise", "dup", "dup2",
        "nanosleep", "getpid", "exit", "exit_group",
        "uname", "fcntl", "flock", "fsync", "fdatasync",
        "getcwd", "readdir", "getdents", "getdents64",
        "arch_prctl", "set_tid_address", "set_robust_list",
        "futex", "clock_gettime", "clock_getres",
        "getrandom", "openat", "readlinkat"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

### Runtime Images

```dockerfile
# runtimes/python/Dockerfile
FROM python:3.11-slim

# Create sandbox user
RUN useradd -r -s /bin/false sandbox

# Create workspace
WORKDIR /sandbox
RUN chown sandbox:sandbox /sandbox

# Entrypoint script
COPY run.sh /sandbox/run.sh
RUN chmod +x /sandbox/run.sh

USER sandbox
```

```bash
#!/bin/bash
# runtimes/python/run.sh
exec timeout ${TIMEOUT:-5} python3 /sandbox/code.py 2>&1
```

### Execution Manager

```go
// execution/manager.go
package execution

type ExecutionManager struct {
    pool      *ContainerPool
    queue     *redis.Client
    db        *sql.DB
    runtimes  map[string]RuntimeConfig
}

type ExecutionRequest struct {
    ID          string        `json:"id"`
    Language    string        `json:"language"`
    Code        string        `json:"code"`
    TimeoutMs   int           `json:"timeout_ms"`
    MemoryMB    int           `json:"memory_limit_mb"`
}

type ExecutionResult struct {
    ID              string    `json:"id"`
    Status          string    `json:"status"`
    Output          string    `json:"output"`
    Error           string    `json:"error,omitempty"`
    ExitCode        int       `json:"exit_code"`
    ExecutionTimeMs int64     `json:"execution_time_ms"`
    MemoryUsedMB    int       `json:"memory_used_mb"`
    CreatedAt       time.Time `json:"created_at"`
}

func (m *ExecutionManager) Execute(ctx context.Context, req ExecutionRequest) (*ExecutionResult, error) {
    // Validate runtime exists
    runtime, ok := m.runtimes[req.Language]
    if !ok {
        return nil, fmt.Errorf("unsupported language: %s", req.Language)
    }

    // Create container
    containerID, err := m.pool.Acquire(ctx, runtime)
    if err != nil {
        return nil, err
    }
    defer m.pool.Release(containerID)

    // Write code to container
    if err := m.writeCode(ctx, containerID, req.Code); err != nil {
        return nil, err
    }

    // Execute with timeout
    startTime := time.Now()
    timeout := time.Duration(req.TimeoutMs) * time.Millisecond

    execCtx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    output, exitCode, err := m.runInContainer(execCtx, containerID)
    execTime := time.Since(startTime)

    result := &ExecutionResult{
        ID:              req.ID,
        ExecutionTimeMs: execTime.Milliseconds(),
        CreatedAt:       time.Now(),
    }

    if execCtx.Err() == context.DeadlineExceeded {
        result.Status = "timeout"
        result.Error = fmt.Sprintf("Execution exceeded time limit of %dms", req.TimeoutMs)
        result.ExitCode = -1
    } else if err != nil {
        result.Status = "error"
        result.Error = err.Error()
        result.ExitCode = -1
    } else {
        result.Status = "completed"
        result.Output = output
        result.ExitCode = exitCode
    }

    // Get memory usage
    result.MemoryUsedMB = m.getMemoryUsage(containerID)

    // Log execution
    m.logExecution(result)

    return result, nil
}
```

---

## 7. Firecracker Integration (V2)

### Why Firecracker?

```
Docker Container vs Firecracker MicroVM:

┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Pros:                          Cons:                      │  │
│  │  + Fast startup                 - Shared kernel            │  │
│  │  + Low overhead                 - Kernel exploits = escape │  │
│  │  + Easy to use                  - Complex seccomp needed   │  │
│  │  + Rich ecosystem               - Namespace limits         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                    Firecracker MicroVM                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Pros:                          Cons:                      │  │
│  │  + Separate kernel              - Typically slower startup │  │
│  │  + Hardware isolation (KVM)     - Needs KVM support        │  │
│  │  + Minimal attack surface       - More complex setup       │  │
│  │  + Used in systems like AWS Lambda - Requires rootfs prep  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Firecracker Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          HOST                                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Firecracker VMM                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │                   MicroVM                             │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐ │  │  │
│  │  │  │              Guest Kernel (5.10)                │ │  │  │
│  │  │  └─────────────────────────────────────────────────┘ │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐ │  │  │
│  │  │  │              Guest Rootfs                       │ │  │  │
│  │  │  │  ┌───────────────────────────────────────────┐ │ │  │  │
│  │  │  │  │            Python Runtime                 │ │ │  │  │
│  │  │  │  │            + User Code                    │ │ │  │  │
│  │  │  │  └───────────────────────────────────────────┘ │ │  │  │
│  │  │  └─────────────────────────────────────────────────┘ │  │  │
│  │  │                                                       │  │  │
│  │  │  Resources: 1 vCPU, 128MB RAM                        │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                           │                                 │  │
│  │                           │ virtio-vsock                    │  │
│  │                           ▼                                 │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              API Socket                               │  │  │
│  │  │  - Start/stop VM                                      │  │  │
│  │  │  - Configure resources                                │  │  │
│  │  │  - Network setup                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     KVM (Kernel)                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Firecracker Setup

```bash
# Download Firecracker
wget https://github.com/firecracker-microvm/firecracker/releases/download/v1.5.0/firecracker-v1.5.0-x86_64.tgz
tar -xzf firecracker-v1.5.0-x86_64.tgz

# Create socket and start Firecracker
./firecracker --api-sock /tmp/firecracker.sock

# Configure VM via API
curl --unix-socket /tmp/firecracker.sock -X PUT \
  http://localhost/machine-config \
  -d '{
    "vcpu_count": 1,
    "mem_size_mib": 128
  }'

# Set kernel
curl --unix-socket /tmp/firecracker.sock -X PUT \
  http://localhost/boot-source \
  -d '{
    "kernel_image_path": "/path/to/vmlinux",
    "boot_args": "console=ttyS0 reboot=k panic=1 pci=off"
  }'

# Set rootfs
curl --unix-socket /tmp/firecracker.sock -X PUT \
  http://localhost/drives/rootfs \
  -d '{
    "drive_id": "rootfs",
    "path_on_host": "/path/to/rootfs.ext4",
    "is_root_device": true,
    "is_read_only": true
  }'

# Start the VM
curl --unix-socket /tmp/firecracker.sock -X PUT \
  http://localhost/actions \
  -d '{"action_type": "InstanceStart"}'
```

---

## 8. Implementation Phases

### Phase 1: Basic Docker Sandbox
1. Set up Go project structure
2. Integrate Docker SDK
3. Create basic container execution
4. Implement resource limits (memory, CPU)
5. Add timeout handling
6. Create simple REST API
7. Test with Python runtime

### Phase 2: Security Hardening
1. Implement seccomp profiles
2. Add capability dropping
3. Configure read-only filesystem
4. Network isolation
5. User namespace mapping
6. Test security boundaries

### Phase 3: Multi-Language Support
1. Create Python runtime image
2. Create Node.js runtime image
3. Create Go runtime image
4. Build runtime selection logic
5. Test all runtimes

### Phase 4: Production Features
1. Add execution queue (Redis)
2. Implement container pool (pre-warming)
3. Add logging and metrics
4. Rate limiting
5. API authentication
6. WebSocket output streaming

### Phase 5: Firecracker (Advanced)
1. Set up Firecracker binary
2. Create minimal rootfs images
3. Implement VM lifecycle management
4. Add vsock communication
5. Memory ballooning
6. Benchmark vs Docker

### Phase 6: Deployment
1. Containerize the API server
2. Set up Kubernetes deployment
3. Configure monitoring (Prometheus/Grafana)
4. Load testing
5. Documentation

---

## 9. DevOps Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Bash/Terminal | Runtime scripts, container commands |
| 2 | VMs/Baremetal | Firecracker requires bare metal or nested virt |
| 3 | Process management | Container process lifecycle, signals |
| 4 | Certificates | HTTPS for API (optional) |
| 5 | ASGs/MIGs | - |
| 6 | Containers/runtimes | Core concept - containerd, runc |
| 7 | Docker | Primary isolation mechanism |
| 8 | Kubernetes 1 | Deployment of sandbox service |
| 9 | Kubernetes 2 | Pod security, resource quotas |
| 10 | CI/CD | Building runtime images |
| 11 | Monitoring | Prometheus metrics, execution logs |
| 12 | IaC | Terraform for infra (optional) |
| 13 | CDNs + Object stores | - |
| 14 | Sandboxing/Firecracker | Core concept - security isolation |

---

## 10. Folder Structure

```
e2b-sandbox/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
├── internal/
│   ├── api/
│   │   ├── handlers.go             # HTTP handlers
│   │   ├── routes.go               # Route definitions
│   │   └── middleware.go           # Auth, rate limiting
│   ├── sandbox/
│   │   ├── docker.go               # Docker sandbox
│   │   ├── firecracker.go          # Firecracker sandbox
│   │   ├── container.go            # Container management
│   │   └── pool.go                 # Container pool
│   ├── execution/
│   │   ├── manager.go              # Execution orchestration
│   │   ├── queue.go                # Job queue
│   │   └── result.go               # Result handling
│   └── runtime/
│       ├── python.go               # Python runtime config
│       ├── nodejs.go               # Node.js runtime config
│       └── golang.go               # Go runtime config
├── runtimes/
│   ├── python/
│   │   ├── Dockerfile
│   │   └── run.sh
│   ├── nodejs/
│   │   ├── Dockerfile
│   │   └── run.sh
│   └── golang/
│       ├── Dockerfile
│       └── run.sh
├── configs/
│   ├── seccomp-sandbox.json        # Seccomp profile
│   └── config.yaml                 # App config
├── scripts/
│   ├── build-runtimes.sh           # Build runtime images
│   └── setup-firecracker.sh        # Firecracker setup
├── deployments/
│   ├── docker-compose.yml
│   └── kubernetes/
│       ├── deployment.yaml
│       └── service.yaml
├── go.mod
├── go.sum
└── README.md
```

---

## 11. Development Commands

```bash
# Initialize Go project
go mod init github.com/yourusername/e2b-sandbox

# Install dependencies
go get github.com/docker/docker/client
go get github.com/gin-gonic/gin
go get github.com/redis/go-redis/v9

# Build runtime images
docker build -t sandbox-python:latest ./runtimes/python
docker build -t sandbox-nodejs:latest ./runtimes/nodejs
docker build -t sandbox-golang:latest ./runtimes/golang

# Run locally
go run cmd/server/main.go

# Test execution
curl -X POST http://localhost:8080/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "code": "print(sum(range(10)))"}'
```

---

## 12. Security Checklist

- [ ] Containers run as non-root user
- [ ] Read-only root filesystem
- [ ] No network access by default
- [ ] Resource limits enforced (CPU, memory, PIDs)
- [ ] Seccomp profile applied
- [ ] All capabilities dropped
- [ ] No privileged containers
- [ ] Execution timeout enforced
- [ ] Input validation on code size
- [ ] Rate limiting enabled
- [ ] Audit logging for all executions

---

## Summary

The E2B Sandbox project teaches core DevOps concepts around containerization, security, and process isolation. Start with Docker-based isolation and progressively add security layers. Firecracker is an advanced topic that provides stronger isolation at the cost of complexity.

**Estimated Complexity**: Intermediate-Advanced
**Core Skills**: Go/Rust, Docker, Linux Security, Process Management
**Unique Challenge**: Balancing security with execution speed
