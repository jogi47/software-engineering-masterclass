# Devin Clone - Autonomous AI Software Engineer Project Plan

## 1. Project Overview

A full-featured autonomous AI software engineer similar to Cognition's Devin. This agent can understand complex software tasks, plan implementations, write code, execute commands in a sandboxed environment, browse documentation, debug issues, and iterate until the task is complete. This is the most comprehensive AI agent project, combining planning, tool use, sandboxed execution, and multi-modal capabilities.

### Core Value Proposition
- Accept natural language software engineering tasks
- Autonomously plan and execute multi-step implementations
- Write, test, and debug code in a real development environment
- Browse web documentation and Stack Overflow for solutions
- Maintain context across long-running tasks
- Provide transparent progress updates and explanations

### Key Learning Outcomes
- Agent planning and task decomposition
- Sandboxed code execution (Docker/E2B)
- Multi-modal agents (vision for screenshots)
- Browser automation with Playwright
- Context window management strategies
- Long-running task orchestration
- File system and git operations

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] Task understanding and clarification
- [ ] Step-by-step planning with visible plan
- [ ] Sandboxed terminal (E2B or Docker)
- [ ] File system operations (read, write, edit, search)
- [ ] Code execution and testing
- [ ] Error detection and debugging loop
- [ ] Progress streaming to user
- [ ] Context management (what code to include)
- [ ] Support for Python, TypeScript, Go projects

### V2 Features (Nice-to-Have)
- [ ] Browser automation (Playwright)
- [ ] Screenshot analysis for visual debugging
- [ ] Git operations (commit, branch, push)
- [ ] Web search and documentation lookup
- [ ] Dependency installation handling
- [ ] Multiple file refactoring
- [ ] Test generation
- [ ] PR creation with descriptions
- [ ] Project scaffolding from templates
- [ ] Persistent workspace across sessions
- [ ] Collaboration mode (human review checkpoints)

---

## 3. Tech Stack

### Core
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Backend orchestration |
| TypeScript | Frontend and SDK |
| Anthropic API | Claude for reasoning |
| OpenAI API | Secondary model provider / fallback |

### Sandbox & Execution
| Technology | Purpose |
|------------|---------|
| E2B SDK | Cloud sandboxes |
| Docker | Local sandboxes |
| Firecracker | microVMs (advanced) |

### Browser & Vision
| Technology | Purpose |
|------------|---------|
| Playwright | Browser automation |
| Vision-capable LLM | Screenshot analysis |
| BeautifulSoup | HTML parsing |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js | Web interface |
| xterm.js | Terminal display |
| Monaco Editor | Code display |
| Socket.io | Real-time updates |

### Storage
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Tasks, sessions |
| Redis | Real-time state |
| S3/MinIO | File snapshots |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB INTERFACE                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Next.js Frontend                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │    Chat     │  │   Planner   │  │  Terminal   │  │   Editor    │  │  │
│  │  │   Input     │  │    View     │  │   Stream    │  │    View     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket / REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORCHESTRATOR SERVICE                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Agent Orchestrator                             │  │
│  │                                                                        │  │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │  │
│  │  │   Planner    │───▶│   Executor   │───▶│   Verifier   │            │  │
│  │  │              │    │              │    │              │            │  │
│  │  │  - Decompose │    │  - Run tools │    │  - Check     │            │  │
│  │  │  - Estimate  │    │  - Handle    │    │    output    │            │  │
│  │  │  - Prioritize│    │    errors    │    │  - Validate  │            │  │
│  │  └──────────────┘    └──────────────┘    └──────────────┘            │  │
│  │         │                   │                    │                    │  │
│  │         └───────────────────┴────────────────────┘                    │  │
│  │                             │                                          │  │
│  │                    ┌────────┴────────┐                                │  │
│  │                    │  Context Manager │                                │  │
│  │                    │  - File index    │                                │  │
│  │                    │  - Token budget  │                                │  │
│  │                    │  - Relevance     │                                │  │
│  │                    └─────────────────┘                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOOL LAYER                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Terminal │  │   File   │  │  Editor  │  │ Browser  │  │   Git    │      │
│  │   Tool   │  │   Tool   │  │   Tool   │  │   Tool   │  │   Tool   │      │
│  │          │  │          │  │          │  │          │  │          │      │
│  │ - run    │  │ - read   │  │ - view   │  │ - goto   │  │ - status │      │
│  │ - ctrl+c │  │ - write  │  │ - edit   │  │ - click  │  │ - commit │      │
│  │          │  │ - search │  │ - scroll │  │ - type   │  │ - push   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SANDBOX ENVIRONMENT                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       E2B Sandbox / Docker                             │  │
│  │                                                                        │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │   │   /home/    │  │   Shell     │  │   Browser   │                   │  │
│  │   │   project/  │  │   (bash)    │  │ (Playwright)│                   │  │
│  │   │             │  │             │  │             │                   │  │
│  │   │   src/      │  │   python    │  │   Chromium  │                   │  │
│  │   │   tests/    │  │   node      │  │             │                   │  │
│  │   │   ...       │  │   go        │  │             │                   │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │                                                                        │  │
│  │   Ports: 3000 (app), 5432 (db), 8080 (api)                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Loop (Planner-Executor Pattern)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVIN AGENT LOOP                                     │
│                                                                              │
│    ┌──────────┐                                                             │
│    │   Task   │  "Add user authentication to the Flask app"                 │
│    └────┬─────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                      PLANNER PHASE                                │     │
│    │                                                                   │     │
│    │  1. Analyze task requirements                                    │     │
│    │  2. Explore codebase (list files, read key files)               │     │
│    │  3. Create step-by-step plan:                                   │     │
│    │     □ Install flask-login, flask-bcrypt                         │     │
│    │     □ Create User model in models/user.py                       │     │
│    │     □ Add login/register routes                                 │     │
│    │     □ Create templates for auth pages                           │     │
│    │     □ Update app.py with login manager                          │     │
│    │     □ Write tests                                               │     │
│    │     □ Run tests and fix issues                                  │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                     EXECUTOR LOOP                                 │     │
│    │                                                                   │     │
│    │    For each step in plan:                                        │     │
│    │    ┌─────────────────────────────────────────────────────────┐   │     │
│    │    │  1. Select appropriate tool                              │   │     │
│    │    │  2. Execute tool with parameters                         │   │     │
│    │    │  3. Observe result                                       │   │     │
│    │    │  4. If error: debug and retry (max 3 attempts)          │   │     │
│    │    │  5. Update context with new information                  │   │     │
│    │    │  6. Mark step complete or blocked                        │   │     │
│    │    └─────────────────────────────────────────────────────────┘   │     │
│    │                                                                   │     │
│    │    Example execution:                                            │     │
│    │    → terminal.run("pip install flask-login flask-bcrypt")       │     │
│    │    ← "Successfully installed flask-login-0.6.3..."             │     │
│    │    → file.write("models/user.py", "from flask_login...")       │     │
│    │    ← "File created successfully"                                │     │
│    │    → terminal.run("python -m pytest tests/")                    │     │
│    │    ← "FAILED test_auth.py::test_login - ImportError..."        │     │
│    │    → (debug: read error, identify fix, edit file)              │     │
│    │    → terminal.run("python -m pytest tests/")                    │     │
│    │    ← "4 passed in 0.32s"                                        │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────────────────────────────────────────────────────────────┐     │
│    │                    VERIFICATION PHASE                             │     │
│    │                                                                   │     │
│    │  1. Run all tests                                                │     │
│    │  2. Check for linting errors                                    │     │
│    │  3. Verify functionality manually if needed                     │     │
│    │  4. If issues found → return to Executor                        │     │
│    │  5. Generate summary of changes                                 │     │
│    └──────────────────────────────────────────────────────────────────┘     │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────┐                                                             │
│    │  DONE    │  "Authentication complete. Created 5 files, ran 4 tests."   │
│    └──────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Context Management Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTEXT WINDOW MANAGEMENT                             │
│                                                                              │
│   Token Budget: 100,000 tokens                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  System Prompt          │████████████████│  5,000 tokens            │   │
│   │  Task Description       │████████│         2,000 tokens             │   │
│   │  Current Plan           │████████████│     3,000 tokens             │   │
│   │  Relevant Files         │████████████████████████████│  40,000 tok  │   │
│   │  Recent Actions         │████████████████│  15,000 tokens           │   │
│   │  Tool Results (recent)  │████████████████████│  20,000 tokens       │   │
│   │  [Reserved for response]│████████████████│  15,000 tokens           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   File Relevance Scoring:                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Score = (mention_count * 3) + (recent_edit * 5) + (import_ref * 2) │   │
│   │                                                                      │   │
│   │  Files sorted by score:                                             │   │
│   │  1. app.py              → 15 (editing now)                          │   │
│   │  2. models/user.py      → 12 (just created)                         │   │
│   │  3. routes/auth.py      → 10 (mentioned in plan)                    │   │
│   │  4. tests/test_auth.py  → 8  (running tests)                        │   │
│   │  5. config.py           → 4  (imported by app.py)                   │   │
│   │  ...                                                                 │   │
│   │  20. README.md          → 0  (not relevant)                         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Compression Strategies:                                                   │
│   - Summarize old tool results: "Modified 15 files, tests passing"         │
│   - Truncate large file outputs (show first/last 100 lines)               │
│   - Remove redundant conversation turns                                    │
│   - Index-only mode for large directories                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Models

### Database Schema

```sql
-- Sessions (a task/conversation)
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID,
    task TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, failed, paused
    sandbox_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Plans (decomposed steps)
CREATE TABLE plans (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    version INTEGER DEFAULT 1,
    steps JSONB NOT NULL,  -- [{step, status, description}]
    created_at TIMESTAMP DEFAULT NOW()
);

-- Actions (tool executions)
CREATE TABLE actions (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    plan_step INTEGER,
    tool_name VARCHAR(50) NOT NULL,
    tool_input JSONB,
    tool_output TEXT,
    is_error BOOLEAN DEFAULT FALSE,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Files (workspace state snapshots)
CREATE TABLE file_snapshots (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    action_id UUID REFERENCES actions(id),
    file_path VARCHAR(500) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages (chat history)
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_actions_session ON actions(session_id);
CREATE INDEX idx_plans_session ON plans(session_id);
CREATE INDEX idx_messages_session ON messages(session_id);
```

### Pydantic Models

```python
# models/core.py
from pydantic import BaseModel, Field
from typing import Literal, Any
from datetime import datetime
from enum import Enum

class TaskStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

class PlanStep(BaseModel):
    index: int
    description: str
    status: StepStatus = StepStatus.PENDING
    substeps: list[str] = Field(default_factory=list)
    error_message: str | None = None

class Plan(BaseModel):
    steps: list[PlanStep]
    current_step: int = 0
    version: int = 1

class Session(BaseModel):
    id: str
    task: str
    status: TaskStatus = TaskStatus.ACTIVE
    plan: Plan | None = None
    sandbox_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.now)

class ToolCall(BaseModel):
    name: str
    arguments: dict[str, Any]

class ToolResult(BaseModel):
    success: bool
    output: str
    error: str | None = None
    duration_ms: int

class FileInfo(BaseModel):
    path: str
    content: str | None = None  # None = not loaded
    size: int
    last_modified: datetime
    relevance_score: float = 0.0
```

---

## 6. API Design

### REST Endpoints

**Sessions**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new session with task |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete session |
| POST | `/api/sessions/:id/pause` | Pause session |
| POST | `/api/sessions/:id/resume` | Resume session |

**Actions**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions/:id/message` | Send message/feedback |
| GET | `/api/sessions/:id/plan` | Get current plan |
| GET | `/api/sessions/:id/files` | List workspace files |
| GET | `/api/sessions/:id/files/*path` | Get file content |

### WebSocket Events

```typescript
// Client → Server
interface ClientMessage {
  type: 'task' | 'message' | 'interrupt' | 'approve';
  payload: {
    content?: string;  // for task/message
    action_id?: string;  // for approve
  };
}

// Server → Client
interface ServerEvent {
  type: 'thinking' | 'plan' | 'tool_call' | 'tool_result' |
        'file_change' | 'terminal_output' | 'error' | 'complete';
  payload: any;
}

// Examples:
// Plan created
{ type: 'plan', payload: { steps: [...], current: 0 } }

// Tool being called
{ type: 'tool_call', payload: { name: 'terminal', args: { command: 'npm install' } } }

// Terminal output streaming
{ type: 'terminal_output', payload: { output: 'added 150 packages...' } }

// File modified
{ type: 'file_change', payload: { path: 'src/app.py', action: 'modified' } }

// Task complete
{ type: 'complete', payload: { summary: 'Created auth system with 5 files...' } }
```

---

## 7. Core Implementation

### Tool Definitions

```python
# tools/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any

class Tool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]:
        pass

    @abstractmethod
    async def execute(self, sandbox, **kwargs) -> str:
        pass
```

### Terminal Tool

```python
# tools/terminal.py
from tools.base import Tool

class TerminalTool(Tool):
    name = "terminal"
    description = """Execute a shell command in the sandbox terminal.
    Use this to:
    - Install packages (pip install, npm install)
    - Run scripts (python script.py, npm run dev)
    - Run tests (pytest, npm test)
    - Check status (git status, ls)

    Commands run in bash. Long-running commands will timeout after 120s.
    Use background flag for servers that need to keep running."""

    parameters = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The shell command to execute"
            },
            "timeout": {
                "type": "integer",
                "description": "Timeout in seconds (default: 120)",
                "default": 120
            },
            "background": {
                "type": "boolean",
                "description": "Run in background (for servers)",
                "default": False
            }
        },
        "required": ["command"]
    }

    async def execute(self, sandbox, command: str, timeout: int = 120, background: bool = False) -> str:
        try:
            if background:
                # Start process in background
                process = await sandbox.process.start(
                    command,
                    on_stdout=lambda x: None,  # Discard output
                    on_stderr=lambda x: None
                )
                return f"Started background process (PID: {process.pid})"

            # Run with timeout
            result = await sandbox.process.start_and_wait(
                command,
                timeout=timeout
            )

            output = result.stdout + result.stderr
            if result.exit_code != 0:
                return f"Command failed (exit code {result.exit_code}):\n{output}"

            return output if output else "(no output)"

        except TimeoutError:
            return f"Command timed out after {timeout}s"
        except Exception as e:
            return f"Error executing command: {str(e)}"
```

### File Tools

```python
# tools/file.py
from tools.base import Tool

class FileReadTool(Tool):
    name = "file_read"
    description = """Read the contents of a file.
    Returns the full file content for files under 50KB.
    For larger files, returns first and last 500 lines."""

    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file (relative to workspace root)"
            }
        },
        "required": ["path"]
    }

    async def execute(self, sandbox, path: str) -> str:
        try:
            content = await sandbox.filesystem.read(path)

            # Handle large files
            lines = content.split('\n')
            if len(lines) > 1000:
                head = '\n'.join(lines[:500])
                tail = '\n'.join(lines[-500:])
                return f"{head}\n\n... [{len(lines) - 1000} lines omitted] ...\n\n{tail}"

            return content
        except Exception as e:
            return f"Error reading file: {str(e)}"


class FileWriteTool(Tool):
    name = "file_write"
    description = """Write content to a file.
    Creates the file if it doesn't exist.
    Creates parent directories as needed.
    Overwrites existing content."""

    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file"
            },
            "content": {
                "type": "string",
                "description": "Content to write"
            }
        },
        "required": ["path", "content"]
    }

    async def execute(self, sandbox, path: str, content: str) -> str:
        try:
            # Create parent directories
            parent = '/'.join(path.split('/')[:-1])
            if parent:
                await sandbox.filesystem.make_dir(parent)

            await sandbox.filesystem.write(path, content)
            return f"Successfully wrote {len(content)} bytes to {path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"


class FileEditTool(Tool):
    name = "file_edit"
    description = """Edit a specific part of a file by replacing old content with new.
    Use this for targeted edits instead of rewriting entire files.
    The old_content must match exactly (including whitespace)."""

    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file"
            },
            "old_content": {
                "type": "string",
                "description": "Exact content to replace"
            },
            "new_content": {
                "type": "string",
                "description": "New content to insert"
            }
        },
        "required": ["path", "old_content", "new_content"]
    }

    async def execute(self, sandbox, path: str, old_content: str, new_content: str) -> str:
        try:
            content = await sandbox.filesystem.read(path)

            if old_content not in content:
                return f"Error: Could not find the specified content in {path}"

            # Count occurrences
            count = content.count(old_content)
            if count > 1:
                return f"Warning: Found {count} occurrences. Please provide more context to make it unique."

            new_file_content = content.replace(old_content, new_content, 1)
            await sandbox.filesystem.write(path, new_file_content)

            return f"Successfully edited {path}"
        except Exception as e:
            return f"Error editing file: {str(e)}"


class FileSearchTool(Tool):
    name = "file_search"
    description = """Search for files or content in the workspace.
    Can search by filename pattern or by content (grep-like)."""

    parameters = {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "Search pattern (filename glob or content regex)"
            },
            "search_type": {
                "type": "string",
                "enum": ["filename", "content"],
                "description": "Whether to search filenames or file contents"
            },
            "path": {
                "type": "string",
                "description": "Directory to search in (default: workspace root)",
                "default": "."
            }
        },
        "required": ["pattern", "search_type"]
    }

    async def execute(self, sandbox, pattern: str, search_type: str, path: str = ".") -> str:
        try:
            if search_type == "filename":
                result = await sandbox.process.start_and_wait(
                    f"find {path} -name '{pattern}' -type f | head -50"
                )
            else:
                result = await sandbox.process.start_and_wait(
                    f"grep -r '{pattern}' {path} --include='*.py' --include='*.ts' --include='*.js' -n | head -50"
                )

            return result.stdout if result.stdout else "No matches found"
        except Exception as e:
            return f"Error searching: {str(e)}"
```

### Browser Tool (V2)

```python
# tools/browser.py
from tools.base import Tool

class BrowserTool(Tool):
    name = "browser"
    description = """Control a web browser for research and testing.
    Actions:
    - goto: Navigate to a URL
    - click: Click an element by selector
    - type: Type text into an input
    - screenshot: Take a screenshot
    - read: Extract text content from the page"""

    parameters = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["goto", "click", "type", "screenshot", "read"],
                "description": "Browser action to perform"
            },
            "url": {
                "type": "string",
                "description": "URL for goto action"
            },
            "selector": {
                "type": "string",
                "description": "CSS selector for click/type actions"
            },
            "text": {
                "type": "string",
                "description": "Text to type"
            }
        },
        "required": ["action"]
    }

    async def execute(self, sandbox, action: str, **kwargs) -> str:
        browser = sandbox.browser  # Playwright browser instance

        try:
            if action == "goto":
                await browser.page.goto(kwargs["url"], wait_until="networkidle")
                title = await browser.page.title()
                return f"Navigated to: {title}"

            elif action == "click":
                await browser.page.click(kwargs["selector"])
                return f"Clicked element: {kwargs['selector']}"

            elif action == "type":
                await browser.page.fill(kwargs["selector"], kwargs["text"])
                return f"Typed into: {kwargs['selector']}"

            elif action == "screenshot":
                screenshot = await browser.page.screenshot()
                # Store and return reference
                return "[Screenshot captured - analyze with vision]"

            elif action == "read":
                content = await browser.page.content()
                # Extract main text (simplified)
                text = await browser.page.evaluate("document.body.innerText")
                if len(text) > 5000:
                    text = text[:5000] + "\n...[truncated]"
                return text

        except Exception as e:
            return f"Browser error: {str(e)}"
```

### Sandbox Manager (E2B)

```python
# sandbox/manager.py
from e2b_code_interpreter import Sandbox
import asyncio

class SandboxManager:
    """Manage E2B sandbox lifecycle."""

    def __init__(self):
        self.sandboxes: dict[str, Sandbox] = {}

    async def create(self, session_id: str, template: str = "base") -> Sandbox:
        """Create a new sandbox for a session."""
        sandbox = await Sandbox.create(
            template=template,
            timeout=3600,  # 1 hour
            metadata={"session_id": session_id}
        )

        # Install common tools
        await sandbox.process.start_and_wait("pip install pytest black ruff")

        self.sandboxes[session_id] = sandbox
        return sandbox

    async def get(self, session_id: str) -> Sandbox | None:
        """Get existing sandbox for a session."""
        return self.sandboxes.get(session_id)

    async def destroy(self, session_id: str):
        """Destroy a sandbox."""
        sandbox = self.sandboxes.pop(session_id, None)
        if sandbox:
            await sandbox.close()

    async def keep_alive(self, session_id: str):
        """Extend sandbox timeout."""
        sandbox = self.sandboxes.get(session_id)
        if sandbox:
            await sandbox.set_timeout(3600)  # Reset to 1 hour
```

### Agent Orchestrator

```python
# agent/orchestrator.py
import asyncio
from typing import AsyncIterator
import anthropic
from models.core import Session, Plan, PlanStep, StepStatus, ToolCall
from tools.registry import ToolRegistry
from sandbox.manager import SandboxManager
from context.manager import ContextManager

SYSTEM_PROMPT = """You are Devin, an autonomous AI software engineer.

You can:
1. Execute terminal commands (install packages, run scripts, tests)
2. Read, write, and edit files
3. Search the codebase
4. Browse the web for documentation

Approach tasks systematically:
1. Understand the requirements
2. Explore the existing codebase
3. Create a step-by-step plan
4. Execute each step, verifying as you go
5. Handle errors by debugging and retrying

Always explain your reasoning. When stuck, try a different approach.

Tools available: {tools}"""


class AgentOrchestrator:
    def __init__(
        self,
        session: Session,
        sandbox_manager: SandboxManager,
        model: str = "your-provider-model-id"
    ):
        self.session = session
        self.sandbox_manager = sandbox_manager
        self.client = anthropic.AsyncAnthropic()
        self.model = model
        self.context = ContextManager(max_tokens=80000)
        self.tools = ToolRegistry.get_all()

    async def run(self, task: str) -> AsyncIterator[dict]:
        """Run the agent on a task, yielding events."""

        # Create sandbox
        sandbox = await self.sandbox_manager.create(self.session.id)
        yield {"type": "status", "message": "Sandbox created"}

        # Initialize context with task
        self.context.add_task(task)

        # Planning phase
        yield {"type": "thinking", "message": "Creating plan..."}
        plan = await self._create_plan(task, sandbox)
        self.session.plan = plan
        yield {"type": "plan", "plan": plan.model_dump()}

        # Execution phase
        for step_idx, step in enumerate(plan.steps):
            step.status = StepStatus.IN_PROGRESS
            yield {"type": "step_start", "step": step_idx, "description": step.description}

            try:
                async for event in self._execute_step(step, sandbox):
                    yield event

                step.status = StepStatus.COMPLETED
                yield {"type": "step_complete", "step": step_idx}

            except Exception as e:
                step.status = StepStatus.FAILED
                step.error_message = str(e)
                yield {"type": "step_failed", "step": step_idx, "error": str(e)}

                # Try to recover
                recovery = await self._attempt_recovery(step, str(e), sandbox)
                if not recovery:
                    yield {"type": "error", "message": f"Failed to recover from error: {e}"}
                    break

        # Verification phase
        yield {"type": "thinking", "message": "Verifying changes..."}
        verification = await self._verify(sandbox)
        yield {"type": "verification", "result": verification}

        # Summary
        summary = await self._generate_summary()
        yield {"type": "complete", "summary": summary}

    async def _create_plan(self, task: str, sandbox) -> Plan:
        """Create a plan for the task."""

        # First, explore the codebase
        file_list = await sandbox.process.start_and_wait("find . -type f -name '*.py' -o -name '*.ts' | head -30")

        planning_prompt = f"""Task: {task}

Current files in workspace:
{file_list.stdout}

Create a step-by-step plan to complete this task.
Each step should be concrete and actionable.
Consider:
- What files need to be created or modified?
- What packages need to be installed?
- What tests should be written?
- What order makes sense (dependencies first)?

Respond with a JSON plan:
{{"steps": [{{"description": "...", "substeps": ["...", "..."]}}]}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": planning_prompt}]
        )

        # Parse plan from response
        import json
        plan_text = response.content[0].text
        # Extract JSON from response
        plan_data = json.loads(plan_text)

        steps = [
            PlanStep(index=i, description=s["description"], substeps=s.get("substeps", []))
            for i, s in enumerate(plan_data["steps"])
        ]

        return Plan(steps=steps)

    async def _execute_step(self, step: PlanStep, sandbox) -> AsyncIterator[dict]:
        """Execute a single plan step."""

        # Build context for this step
        context = self.context.build_context(
            current_step=step.description,
            relevant_files=await self._get_relevant_files(step, sandbox)
        )

        tools = [t.to_definition() for t in self.tools]

        execution_prompt = f"""Current step: {step.description}

{context}

Execute this step using the available tools.
If something fails, try to debug and fix it.
Explain your actions as you go."""

        messages = [{"role": "user", "content": execution_prompt}]
        max_iterations = 10

        for i in range(max_iterations):
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT.format(tools=", ".join(t.name for t in self.tools)),
                messages=messages,
                tools=tools
            )

            # Process response
            assistant_content = []
            tool_calls = []

            for block in response.content:
                if block.type == "text":
                    yield {"type": "thinking", "message": block.text}
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    tool_calls.append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })

            messages.append({"role": "assistant", "content": assistant_content})

            if not tool_calls:
                # No more tool calls, step is done
                break

            # Execute tools
            tool_results = []
            for tc in tool_calls:
                yield {"type": "tool_call", "name": tc["name"], "input": tc["input"]}

                tool = ToolRegistry.get(tc["name"])
                if tool:
                    result = await tool.execute(sandbox, **tc["input"])
                else:
                    result = f"Unknown tool: {tc['name']}"

                yield {"type": "tool_result", "name": tc["name"], "output": result[:500]}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": result
                })

                # Update context with result
                self.context.add_tool_result(tc["name"], tc["input"], result)

            messages.append({"role": "user", "content": tool_results})

    async def _get_relevant_files(self, step: PlanStep, sandbox) -> list[str]:
        """Get files relevant to the current step."""
        # Simple heuristic: look for file mentions in step description
        import re
        file_patterns = re.findall(r'[\w/]+\.\w+', step.description)
        return file_patterns

    async def _attempt_recovery(self, step: PlanStep, error: str, sandbox) -> bool:
        """Try to recover from a failed step."""
        recovery_prompt = f"""Step failed: {step.description}
Error: {error}

Analyze the error and suggest a fix. Then retry the step."""

        # Simplified recovery attempt
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            messages=[{"role": "user", "content": recovery_prompt}]
        )

        # Check if recovery seems viable
        return "fix" in response.content[0].text.lower()

    async def _verify(self, sandbox) -> dict:
        """Verify the implementation."""
        # Run tests
        test_result = await sandbox.process.start_and_wait("python -m pytest -v 2>&1 || npm test 2>&1", timeout=60)

        # Run linter
        lint_result = await sandbox.process.start_and_wait("ruff check . 2>&1 || eslint . 2>&1", timeout=30)

        return {
            "tests": {
                "output": test_result.stdout,
                "passed": test_result.exit_code == 0
            },
            "lint": {
                "output": lint_result.stdout,
                "passed": lint_result.exit_code == 0
            }
        }

    async def _generate_summary(self) -> str:
        """Generate a summary of what was done."""
        summary_prompt = f"""Summarize what was accomplished:
Task: {self.session.task}
Plan steps: {[s.description for s in self.session.plan.steps]}

Provide a concise summary of:
1. What was created/modified
2. Key decisions made
3. Any remaining issues"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[{"role": "user", "content": summary_prompt}]
        )

        return response.content[0].text
```

### Context Manager

```python
# context/manager.py
from dataclasses import dataclass, field
from typing import Any

@dataclass
class ContextManager:
    """Manage context window for the agent."""

    max_tokens: int = 80000
    task: str = ""
    plan_summary: str = ""
    file_contents: dict[str, str] = field(default_factory=dict)
    recent_actions: list[dict] = field(default_factory=list)
    file_index: dict[str, int] = field(default_factory=dict)  # path -> relevance score

    def add_task(self, task: str):
        self.task = task

    def add_tool_result(self, tool: str, input: dict, output: str):
        self.recent_actions.append({
            "tool": tool,
            "input": input,
            "output": output[:2000]  # Truncate large outputs
        })

        # Keep only recent actions
        if len(self.recent_actions) > 20:
            self.recent_actions = self.recent_actions[-20:]

        # Update file relevance if file was accessed
        if "path" in input:
            path = input["path"]
            self.file_index[path] = self.file_index.get(path, 0) + 5

    def update_file_content(self, path: str, content: str):
        self.file_contents[path] = content
        self.file_index[path] = self.file_index.get(path, 0) + 3

    def build_context(self, current_step: str, relevant_files: list[str]) -> str:
        """Build context string within token budget."""
        sections = []

        # Task (always included)
        sections.append(f"## Task\n{self.task}")

        # Current step
        sections.append(f"## Current Step\n{current_step}")

        # Relevant files (sorted by relevance)
        sorted_files = sorted(
            self.file_index.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]  # Top 10 files

        if sorted_files:
            file_section = "## Relevant Files\n"
            for path, score in sorted_files:
                if path in self.file_contents:
                    content = self.file_contents[path]
                    if len(content) > 3000:
                        content = content[:3000] + "\n...[truncated]"
                    file_section += f"\n### {path}\n```\n{content}\n```\n"
            sections.append(file_section)

        # Recent actions (summarized)
        if self.recent_actions:
            actions_section = "## Recent Actions\n"
            for action in self.recent_actions[-5:]:
                actions_section += f"- {action['tool']}: {str(action['input'])[:100]}\n"
            sections.append(actions_section)

        return "\n\n".join(sections)
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure
1. Set up Python project structure
2. Create data models
3. Set up E2B sandbox integration
4. Implement basic terminal tool
5. Implement file tools (read, write, edit)
6. Test sandbox lifecycle

### Phase 2: Agent Loop
1. Implement planning phase
2. Build executor loop
3. Add tool execution
4. Implement context manager
5. Add error handling and retries
6. Test on simple tasks

### Phase 3: Frontend
1. Set up Next.js project
2. Create session management UI
3. Implement WebSocket connection
4. Build terminal display (xterm.js)
5. Add plan visualization
6. Add file tree viewer

### Phase 4: Advanced Tools
1. Implement file search tool
2. Add git tool
3. Build browser tool (Playwright)
4. Add screenshot analysis
5. Implement dependency detection

### Phase 5: Context & Memory
1. Implement file relevance scoring
2. Add context compression
3. Build workspace state snapshots
4. Add session persistence
5. Implement resume functionality

### Phase 6: Production
1. Add authentication
2. Implement rate limiting
3. Add cost tracking
4. Build monitoring dashboard
5. Documentation and examples

---

## 9. AI/ML Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Agent Planning | Task decomposition |
| 2 | Tool Use | Terminal, file, browser tools |
| 3 | Context Management | Token budget, relevance scoring |
| 4 | Error Recovery | Debug loops, retry strategies |
| 5 | Multi-modal AI | Screenshot analysis |
| 6 | Sandboxed Execution | E2B, Docker isolation |
| 7 | Streaming | Real-time progress updates |
| 8 | State Management | Plan tracking, workspace state |
| 9 | Long-running Tasks | Session persistence |
| 10 | Human-in-the-loop | Approval checkpoints |

---

## 10. Folder Structure

```
devin-clone/
├── apps/
│   ├── backend/                    # Python orchestrator
│   │   ├── src/
│   │   │   ├── agent/
│   │   │   │   ├── orchestrator.py
│   │   │   │   └── planner.py
│   │   │   ├── tools/
│   │   │   │   ├── base.py
│   │   │   │   ├── terminal.py
│   │   │   │   ├── file.py
│   │   │   │   ├── browser.py
│   │   │   │   └── git.py
│   │   │   ├── sandbox/
│   │   │   │   └── manager.py
│   │   │   ├── context/
│   │   │   │   └── manager.py
│   │   │   ├── models/
│   │   │   │   └── core.py
│   │   │   └── api/
│   │   │       ├── main.py
│   │   │       └── routes/
│   │   ├── pyproject.toml
│   │   └── Dockerfile
│   └── frontend/                   # Next.js UI
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx
│       │   │   └── session/[id]/
│       │   ├── components/
│       │   │   ├── Terminal.tsx
│       │   │   ├── PlanView.tsx
│       │   │   ├── FileTree.tsx
│       │   │   └── Chat.tsx
│       │   └── lib/
│       │       └── websocket.ts
│       └── package.json
├── docker-compose.yml
└── README.md
```

---

## 11. Development Commands

```bash
# Backend setup
cd apps/backend
uv init && uv add anthropic e2b-code-interpreter fastapi uvicorn websockets
uv add playwright pydantic python-dotenv
uv add --dev pytest pytest-asyncio ruff

# Install Playwright browsers
uv run playwright install

# Frontend setup
cd apps/frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install xterm @xterm/addon-fit socket.io-client @monaco-editor/react

# Set up environment
echo "ANTHROPIC_API_KEY=your-key" > .env
echo "E2B_API_KEY=your-key" >> .env

# Run backend
cd apps/backend
uv run uvicorn src.api.main:app --reload --port 8000

# Run frontend
cd apps/frontend
npm run dev

# Run with Docker
docker-compose up
```

---

## 12. Example Session

```
User: Create a REST API for a todo app with SQLite database in Python

Devin: I'll create a REST API for a todo app. Let me start by planning the implementation.

📋 Plan:
1. Set up project structure with FastAPI
2. Create SQLite database schema
3. Implement CRUD endpoints for todos
4. Add input validation with Pydantic
5. Write tests
6. Test the API manually

🔧 Step 1: Setting up project...
$ pip install fastapi uvicorn sqlalchemy pydantic
Successfully installed fastapi-0.109.0...

📝 Creating main.py...
[File created: main.py - 45 lines]

📝 Creating models.py...
[File created: models.py - 28 lines]

📝 Creating database.py...
[File created: database.py - 15 lines]

🔧 Step 5: Running tests...
$ pytest tests/ -v
test_create_todo PASSED
test_get_todos PASSED
test_update_todo PASSED
test_delete_todo PASSED
4 passed in 0.45s

✅ Complete!

Created a FastAPI todo app with:
- SQLite database (todos.db)
- CRUD endpoints: POST/GET/PUT/DELETE /todos
- Pydantic validation
- 4 passing tests

Run with: uvicorn main:app --reload
```

---

## Summary

The Devin Clone is the most ambitious AI project, combining planning, tool use, sandboxed execution, and context management into an autonomous software engineer. You'll learn how to build agents that can take complex tasks, break them down, and execute them iteratively while handling errors and maintaining context. This is the frontier of what AI agents can do.

**Estimated Complexity**: Expert
**Core Skills**: Agent Architecture, Sandboxing, Context Management, Multi-modal AI
**Key Challenge**: Reliable execution of complex, multi-step tasks
