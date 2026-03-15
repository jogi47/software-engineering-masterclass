# Replit Clone - Online IDE Project Plan

## 1. Project Overview

A full-featured online IDE similar to Replit. Users can write, run, and share code directly in the browser with a complete development environment including file system, terminal, package management, and real-time collaboration. This is the most comprehensive DevOps project, combining frontend development with complex container orchestration.

### Core Value Proposition
- Full development environment in the browser
- No local setup required - instant coding
- Real-time collaboration with others
- Support for multiple programming languages
- Persistent workspaces with file storage

### Key Learning Outcomes
- Container orchestration at scale
- WebSocket-based terminal implementation
- Real-time collaboration (OT/CRDT)
- File system abstraction
- Reverse proxy and routing
- Kubernetes deployment

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] User authentication
- [ ] Browser-based code editor (Monaco/CodeMirror)
- [ ] File tree with create/edit/delete
- [ ] Web-based terminal (xterm.js + WebSocket)
- [ ] Code execution in isolated containers
- [ ] Support for Python, Node.js, Go
- [ ] Persistent file storage per project
- [ ] Project management (create, list, delete)

### V2 Features (Nice-to-Have)
- [ ] Real-time collaboration (multiplayer editing)
- [ ] Package manager integration (pip, npm)
- [ ] Git integration
- [ ] Custom domains for web apps
- [ ] Environment variables
- [ ] Secrets management
- [ ] Database provisioning (PostgreSQL, Redis)
- [ ] Preview URL for web apps
- [ ] Templates/boilerplates
- [ ] Vim/Emacs keybindings
- [ ] Extensions/plugins

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React/Next.js | UI framework |
| TypeScript | Type safety |
| Monaco Editor | Code editor (VS Code's editor) |
| xterm.js | Terminal emulator |
| Tailwind CSS | Styling |
| Socket.io Client | WebSocket communication |
| Zustand/Jotai | State management |
| Y.js (v2) | CRDT for collaboration |

### Backend
| Technology | Purpose |
|------------|---------|
| Go | Container orchestration service |
| Node.js | API server, WebSocket handling |
| PostgreSQL | User data, project metadata |
| Redis | Session cache, pub/sub |
| MinIO/S3 | File storage |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Container runtime |
| Kubernetes | Container orchestration |
| Traefik/Nginx | Reverse proxy, routing |
| containerd | Container runtime |
| CoreDNS | Service discovery |

### DevOps
| Technology | Purpose |
|------------|---------|
| Terraform | Infrastructure as Code |
| GitHub Actions | CI/CD |
| Prometheus | Metrics |
| Grafana | Dashboards |
| Loki | Log aggregation |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER CLIENT                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Next.js Frontend                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │    Monaco    │  │   File Tree  │  │   Terminal   │                │  │
│  │  │    Editor    │  │              │  │  (xterm.js)  │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │                      │                      │
         │ HTTP/WS              │ HTTP                 │ WebSocket
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REVERSE PROXY (Traefik)                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Routes:                                                               │  │
│  │  - /api/*        → API Server                                         │  │
│  │  - /ws/terminal  → Workspace Proxy                                    │  │
│  │  - *.preview.app → Workspace Container                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVICES                                │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    API Server    │  │  Workspace Mgr   │  │  Workspace Proxy │          │
│  │    (Node.js)     │  │     (Go)         │  │     (Go)         │          │
│  │                  │  │                  │  │                  │          │
│  │  - Auth          │  │  - Create/delete │  │  - WebSocket     │          │
│  │  - Projects      │  │  - Container     │  │    multiplexing  │          │
│  │  - Files API     │  │    lifecycle     │  │  - Terminal I/O  │          │
│  │  - User mgmt     │  │  - Resource mgmt │  │  - File sync     │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│           │                    │                      │                     │
│           ▼                    ▼                      ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Data Layer                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │  │
│  │  │PostgreSQL│  │  Redis   │  │  MinIO   │  │   etcd   │             │  │
│  │  │  (data)  │  │ (cache)  │  │ (files)  │  │ (k8s)    │             │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KUBERNETES CLUSTER                                 │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   Workspace Pod  │  │   Workspace Pod  │  │   Workspace Pod  │          │
│  │   (user-123)     │  │   (user-456)     │  │   (user-789)     │          │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌────────────┐  │          │
│  │  │  Container │  │  │  │  Container │  │  │  │  Container │  │          │
│  │  │  - bash    │  │  │  │  - bash    │  │  │  │  - bash    │  │          │
│  │  │  - python  │  │  │  │  - node    │  │  │  │  - go      │  │          │
│  │  │  - git     │  │  │  │  - npm     │  │  │  │  - git     │  │          │
│  │  └────────────┘  │  │  └────────────┘  │  │  └────────────┘  │          │
│  │  /home/replit    │  │  /home/replit    │  │  /home/replit    │          │
│  │  (PVC mounted)   │  │  (PVC mounted)   │  │  (PVC mounted)   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workspace Container Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORKSPACE CONTAINER                                   │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Base Image                                     │  │
│  │  - Ubuntu 22.04 LTS                                                   │  │
│  │  - Common tools: git, curl, vim, tmux                                 │  │
│  │  - Language runtimes: python3, node, go                               │  │
│  │  - Package managers: pip, npm, go modules                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Supervisor Process                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │   bash/sh   │  │  LSP Server │  │  File Watch │                   │  │
│  │  │   (TTY)     │  │  (optional) │  │   (sync)    │                   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │         ▲                                                              │  │
│  │         │ PTY                                                          │  │
│  │         ▼                                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Agent Process (Go)                            │  │  │
│  │  │  - WebSocket server on port 8080                                 │  │  │
│  │  │  - PTY management                                                │  │  │
│  │  │  - File operations                                               │  │  │
│  │  │  - Process execution                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Volumes                                        │  │
│  │  /home/replit     - User workspace (PVC, persistent)                  │  │
│  │  /tmp             - Temporary files (emptyDir)                        │  │
│  │  /nix             - Nix packages (optional, shared)                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Ports                                          │  │
│  │  8080  - Agent WebSocket                                              │  │
│  │  3000  - User app (forwarded)                                         │  │
│  │  5432  - PostgreSQL (if provisioned)                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Terminal WebSocket Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │  WS Proxy   │         │  Container  │
│  (xterm.js) │         │    (Go)     │         │   Agent     │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Connect WS        │                       │
       │ ─────────────────────>│                       │
       │                       │                       │
       │                       │  2. Lookup container  │
       │                       │     by project ID     │
       │                       │                       │
       │                       │  3. Connect to agent  │
       │                       │ ─────────────────────>│
       │                       │                       │
       │                       │  4. Create PTY        │
       │                       │<─────────────────────>│
       │                       │                       │
       │  5. Bidirectional     │  6. Bidirectional    │
       │     stdin/stdout      │     PTY I/O          │
       │<─────────────────────>│<─────────────────────>│
       │                       │                       │
       │  "ls -la\n"          │                       │
       │ ─────────────────────>│ ─────────────────────>│
       │                       │                       │
       │                       │  "total 16\n..."     │
       │<─────────────────────│<──────────────────────│
       │                       │                       │
```

---

## 5. Database Design

### PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects (Repls)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    language VARCHAR(50) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    workspace_status VARCHAR(20) DEFAULT 'stopped', -- stopped, starting, running
    container_id VARCHAR(100),
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, slug)
);

-- Project Files (metadata only, content in S3/MinIO)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    is_directory BOOLEAN DEFAULT false,
    size_bytes BIGINT DEFAULT 0,
    content_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, path)
);

-- Environment Variables
CREATE TABLE env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value_encrypted TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, key)
);

-- Collaboration Sessions
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cursor_position JSONB,
    last_active_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_files_project_id ON files(project_id);
```

---

## 6. API Design

### REST Endpoints

**Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

**Projects**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/fork` | Fork project |

**Workspace**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/workspace/start` | Start workspace |
| POST | `/api/projects/:id/workspace/stop` | Stop workspace |
| GET | `/api/projects/:id/workspace/status` | Get status |

**Files**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/files` | List files |
| GET | `/api/projects/:id/files/*path` | Read file |
| PUT | `/api/projects/:id/files/*path` | Write file |
| DELETE | `/api/projects/:id/files/*path` | Delete file |
| POST | `/api/projects/:id/files/mkdir` | Create directory |

### WebSocket Endpoints

**Terminal**
```
ws://api.replit.local/ws/terminal?project_id=xxx&token=yyy

Messages:
→ {"type": "input", "data": "ls -la\n"}
← {"type": "output", "data": "total 16\ndrwxr-xr-x..."}
← {"type": "exit", "code": 0}
→ {"type": "resize", "cols": 120, "rows": 40}
```

**Collaboration (v2)**
```
ws://api.replit.local/ws/collab?project_id=xxx&file=main.py

Messages:
→ {"type": "sync", "version": 1}
← {"type": "state", "content": "...", "version": 5}
→ {"type": "update", "ops": [...], "version": 5}
← {"type": "update", "ops": [...], "version": 6, "user": "alice"}
← {"type": "cursor", "user": "bob", "position": {"line": 10, "ch": 5}}
```

---

## 7. Frontend Structure

### Page Routes

```
/                           → Landing page
/login                      → Login
/signup                     → Register
/dashboard                  → Project list
/new                        → Create project
/@:username/:projectSlug    → Project IDE view
/@:username                 → User profile
/settings                   → User settings
```

### Component Hierarchy

```
app/
├── layout.tsx
├── page.tsx                        # Landing
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (app)/
│   ├── layout.tsx                  # Dashboard layout
│   ├── dashboard/page.tsx
│   ├── new/page.tsx
│   └── @[username]/
│       ├── page.tsx                # User profile
│       └── [project]/
│           └── page.tsx            # IDE View
└── api/

components/
├── ide/
│   ├── IDE.tsx                     # Main IDE container
│   ├── Editor.tsx                  # Monaco editor wrapper
│   ├── FileTree.tsx                # File explorer
│   ├── Terminal.tsx                # xterm.js wrapper
│   ├── Toolbar.tsx                 # Run button, settings
│   ├── Tabs.tsx                    # Open file tabs
│   ├── Preview.tsx                 # Web preview iframe
│   └── Sidebar.tsx                 # Left sidebar
├── dashboard/
│   ├── ProjectCard.tsx
│   ├── ProjectList.tsx
│   └── CreateProjectModal.tsx
├── layout/
│   ├── Header.tsx
│   └── Footer.tsx
└── ui/
    ├── Button.tsx
    ├── Modal.tsx
    └── ...
```

### IDE Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header: Logo | Project Name | [Run ▶] [Stop ■] | Share | Settings | User  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┬────────────────────────────────────────┬──────────────────┐   │
│  │          │  Tabs: [main.py] [utils.py] [+]       │                  │   │
│  │  Files   │─────────────────────────────────────────                 │   │
│  │          │                                        │    Preview      │   │
│  │  ▼ src   │  1│ import os                         │    (optional)   │   │
│  │    main. │  2│                                   │                  │   │
│  │    utils │  3│ def hello():                      │  ┌────────────┐ │   │
│  │  ▼ tests │  4│     print("Hello")                │  │            │ │   │
│  │    test_ │  5│                                   │  │  Localhost │ │   │
│  │          │  6│ if __name__ == "__main__":        │  │   :3000    │ │   │
│  │  package │  7│     hello()                       │  │            │ │   │
│  │  README  │  8│                                   │  └────────────┘ │   │
│  │          │                                        │                  │   │
│  │          │                                        │                  │   │
│  ├──────────┴────────────────────────────────────────┴──────────────────┤   │
│  │  Terminal                                                             │   │
│  │  $ python main.py                                                     │   │
│  │  Hello                                                                │   │
│  │  $                                                                    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Details

### Container Agent (Go)

```go
// agent/main.go
package main

import (
    "os"
    "os/exec"
    "github.com/creack/pty"
    "github.com/gorilla/websocket"
)

type Agent struct {
    ptmx *os.File
    cmd  *exec.Cmd
}

func (a *Agent) HandleTerminal(ws *websocket.Conn) {
    // Start shell
    a.cmd = exec.Command("/bin/bash")
    a.cmd.Env = append(os.Environ(), "TERM=xterm-256color")

    var err error
    a.ptmx, err = pty.Start(a.cmd)
    if err != nil {
        return
    }
    defer a.ptmx.Close()

    // Read from PTY, send to WebSocket
    go func() {
        buf := make([]byte, 4096)
        for {
            n, err := a.ptmx.Read(buf)
            if err != nil {
                return
            }
            ws.WriteMessage(websocket.BinaryMessage, buf[:n])
        }
    }()

    // Read from WebSocket, write to PTY
    for {
        _, msg, err := ws.ReadMessage()
        if err != nil {
            return
        }

        var payload struct {
            Type string `json:"type"`
            Data string `json:"data"`
            Cols int    `json:"cols"`
            Rows int    `json:"rows"`
        }
        json.Unmarshal(msg, &payload)

        switch payload.Type {
        case "input":
            a.ptmx.Write([]byte(payload.Data))
        case "resize":
            pty.Setsize(a.ptmx, &pty.Winsize{
                Rows: uint16(payload.Rows),
                Cols: uint16(payload.Cols),
            })
        }
    }
}

func (a *Agent) HandleFiles(ws *websocket.Conn) {
    // File operations: read, write, list, mkdir, delete
}
```

### Workspace Manager (Go)

```go
// workspace/manager.go
package workspace

import (
    "context"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type WorkspaceManager struct {
    k8sClient *kubernetes.Clientset
    namespace string
}

func (m *WorkspaceManager) CreateWorkspace(ctx context.Context, projectID, language string) error {
    // Create PVC for persistent storage
    pvc := &corev1.PersistentVolumeClaim{
        ObjectMeta: metav1.ObjectMeta{
            Name: fmt.Sprintf("workspace-%s", projectID),
        },
        Spec: corev1.PersistentVolumeClaimSpec{
            AccessModes: []corev1.PersistentVolumeAccessMode{
                corev1.ReadWriteOnce,
            },
            Resources: corev1.ResourceRequirements{
                Requests: corev1.ResourceList{
                    corev1.ResourceStorage: resource.MustParse("1Gi"),
                },
            },
        },
    }

    // Create Pod
    pod := &corev1.Pod{
        ObjectMeta: metav1.ObjectMeta{
            Name: fmt.Sprintf("workspace-%s", projectID),
            Labels: map[string]string{
                "app": "workspace",
                "project": projectID,
            },
        },
        Spec: corev1.PodSpec{
            Containers: []corev1.Container{
                {
                    Name:  "workspace",
                    Image: fmt.Sprintf("replit-workspace-%s:latest", language),
                    Ports: []corev1.ContainerPort{
                        {ContainerPort: 8080, Name: "agent"},
                        {ContainerPort: 3000, Name: "app"},
                    },
                    Resources: corev1.ResourceRequirements{
                        Limits: corev1.ResourceList{
                            corev1.ResourceCPU:    resource.MustParse("1"),
                            corev1.ResourceMemory: resource.MustParse("512Mi"),
                        },
                    },
                    VolumeMounts: []corev1.VolumeMount{
                        {
                            Name:      "workspace",
                            MountPath: "/home/replit",
                        },
                    },
                },
            },
            Volumes: []corev1.Volume{
                {
                    Name: "workspace",
                    VolumeSource: corev1.VolumeSource{
                        PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
                            ClaimName: fmt.Sprintf("workspace-%s", projectID),
                        },
                    },
                },
            },
        },
    }

    _, err := m.k8sClient.CoreV1().Pods(m.namespace).Create(ctx, pod, metav1.CreateOptions{})
    return err
}

func (m *WorkspaceManager) StopWorkspace(ctx context.Context, projectID string) error {
    return m.k8sClient.CoreV1().Pods(m.namespace).Delete(
        ctx,
        fmt.Sprintf("workspace-%s", projectID),
        metav1.DeleteOptions{},
    )
}
```

### Terminal Component (React)

```tsx
// components/ide/Terminal.tsx
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

interface TerminalProps {
  projectId: string;
  token: string;
}

export function TerminalComponent({ projectId, token }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();
    terminalRef.current = terminal;

    // Connect WebSocket
    const ws = new WebSocket(
      `wss://api.replit.local/ws/terminal?project_id=${projectId}&token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      terminal.write('\x1b[32mConnected to workspace\x1b[0m\r\n');
    };

    ws.onmessage = (event) => {
      terminal.write(event.data);
    };

    ws.onclose = () => {
      terminal.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n');
    };

    // Send input to server
    terminal.onData((data) => {
      ws.send(JSON.stringify({ type: 'input', data }));
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      ws.send(JSON.stringify({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows,
      }));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      terminal.dispose();
    };
  }, [projectId, token]);

  return <div ref={containerRef} className="h-full w-full bg-[#1e1e1e]" />;
}
```

---

## 9. Implementation Phases

### Phase 1: Core Frontend
1. Set up Next.js with TypeScript and Tailwind
2. Create authentication flow
3. Build dashboard with project list
4. Set up IDE layout with panels
5. Integrate Monaco Editor
6. Build file tree component
7. Implement basic file operations (local state)

### Phase 2: Backend API
1. Set up Node.js API server
2. Create PostgreSQL schema
3. Implement auth endpoints
4. Build project CRUD API
5. Set up MinIO for file storage
6. Implement file API endpoints
7. Add Redis for caching

### Phase 3: Container Workspaces
1. Create workspace base Docker image
2. Build container agent (Go)
3. Implement PTY handling
4. Set up WebSocket proxy
5. Create workspace manager
6. Implement start/stop workspace API
7. Test terminal functionality

### Phase 4: Kubernetes Deployment
1. Set up local Kubernetes (kind/minikube)
2. Create Kubernetes manifests
3. Implement pod lifecycle management
4. Set up persistent volumes
5. Configure Traefik ingress
6. Add resource limits and quotas

### Phase 5: Integration
1. Connect frontend to backend
2. Implement file sync to container
3. Add "Run" button functionality
4. Web preview with port forwarding
5. Error handling and reconnection

### Phase 6: Polish & Features
1. Add environment variables
2. Implement project forking
3. Add templates/starters
4. Improve UI/UX
5. Add loading states
6. Mobile responsiveness

### Phase 7: Production
1. CI/CD pipeline
2. Monitoring setup (Prometheus/Grafana)
3. Log aggregation (Loki)
4. Auto-scaling
5. Documentation

---

## 10. DevOps Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Bash/Terminal | PTY handling, shell execution |
| 2 | VMs/Baremetal | Understanding underlying infra |
| 3 | Process management | Supervisor, process lifecycle |
| 4 | Certificates | HTTPS, secure WebSockets |
| 5 | ASGs/MIGs | Pod autoscaling |
| 6 | Containers/runtimes | Docker, containerd |
| 7 | Docker | Workspace images |
| 8 | Kubernetes 1 | Pod management, services |
| 9 | Kubernetes 2 | PVCs, ingress, resource quotas |
| 10 | CI/CD | Image building, deployments |
| 11 | Monitoring | Prometheus, Grafana, Loki |
| 12 | IaC | Terraform, Kubernetes manifests |
| 13 | CDNs + Object stores | MinIO/S3 for files |
| 14 | Sandboxing | Container isolation |

---

## 11. Folder Structure

```
replit-clone/
├── apps/
│   ├── web/                        # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   ├── api/                        # Node.js API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── middleware/
│   │   └── package.json
│   ├── workspace-manager/          # Go service
│   │   ├── cmd/
│   │   ├── internal/
│   │   └── go.mod
│   └── workspace-proxy/            # Go WebSocket proxy
│       ├── cmd/
│       ├── internal/
│       └── go.mod
├── images/
│   ├── workspace-base/             # Base workspace image
│   │   └── Dockerfile
│   ├── workspace-python/
│   ├── workspace-nodejs/
│   └── workspace-go/
├── agent/                          # Container agent (Go)
│   ├── main.go
│   └── go.mod
├── deployments/
│   ├── docker-compose.yml          # Local development
│   └── kubernetes/
│       ├── namespace.yaml
│       ├── api-deployment.yaml
│       ├── workspace-manager.yaml
│       ├── traefik-ingress.yaml
│       └── pvc-template.yaml
├── terraform/                      # IaC for cloud
│   ├── main.tf
│   └── variables.tf
├── turbo.json
└── package.json
```

---

## 12. Development Commands

```bash
# Set up monorepo
npx create-turbo@latest replit-clone

# Frontend
cd apps/web && npm install
npm install monaco-editor @monaco-editor/react xterm xterm-addon-fit socket.io-client

# API
cd apps/api && npm install
npm install express prisma socket.io minio

# Go services
cd apps/workspace-manager && go mod init
go get k8s.io/client-go@latest

# Build workspace images
docker build -t workspace-base:latest ./images/workspace-base
docker build -t workspace-python:latest ./images/workspace-python

# Local Kubernetes
kind create cluster --name replit-dev
kubectl apply -f deployments/kubernetes/

# Run everything
docker-compose up
```

---

## Summary

The Replit Clone is the most comprehensive project, touching nearly every aspect of the DevOps roadmap. Start with a basic IDE and terminal, then incrementally add Kubernetes orchestration. The terminal WebSocket implementation is the most critical piece - get that working first.

**Estimated Complexity**: Expert
**Core Skills**: Kubernetes, Go, WebSocket, Container Orchestration
**Unique Challenge**: Scaling stateful workspaces
