# Agent Framework - ReAct-style AI Agent Project Plan

## 1. Project Overview

A production-ready agent framework implementing the ReAct (Reasoning + Acting) pattern. Agents observe their environment, reason about what to do, take actions using tools, and iterate until they complete a task. This project teaches you how modern tool-using assistants and LangChain-style agents work under the hood.

### Core Value Proposition
- Execute complex multi-step tasks autonomously
- Use tools (web search, code execution, file operations) to interact with the world
- Maintain conversation context and memory
- Handle errors gracefully and retry with different strategies

### Key Learning Outcomes
- Prompt engineering for tool use and reasoning
- Function/tool calling with JSON schemas
- Agent execution loops and state management
- Error handling, retries, and fallback strategies
- Streaming responses for real-time feedback
- Token management and context window optimization

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] ReAct agent loop (Observe → Think → Act → Observe)
- [ ] Tool registry with JSON schema definitions
- [ ] Built-in tools: web search, code execution, file read/write
- [ ] Conversation memory (last N messages)
- [ ] Streaming output support
- [ ] Error handling and automatic retries
- [ ] CLI interface for testing
- [ ] Support for OpenAI and Anthropic APIs

### V2 Features (Nice-to-Have)
- [ ] Multi-agent orchestration (manager + workers)
- [ ] Planning step before execution
- [ ] Human-in-the-loop approval for dangerous actions
- [ ] Tool result caching
- [ ] Parallel tool execution
- [ ] Custom tool plugin system
- [ ] Web UI dashboard
- [ ] Persistent conversation storage
- [ ] Rate limiting and cost tracking
- [ ] Agent templates (research agent, coding agent, etc.)

---

## 3. Tech Stack

### Core
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Primary language |
| Anthropic SDK | Claude API access |
| OpenAI SDK | GPT API access |
| Pydantic | Data validation and schemas |
| httpx | Async HTTP client |

### Tools & Execution
| Technology | Purpose |
|------------|---------|
| Docker | Sandboxed code execution |
| subprocess | Local command execution |
| aiofiles | Async file operations |
| beautifulsoup4 | Web scraping |
| duckduckgo-search | Web search API |

### API & Storage
| Technology | Purpose |
|------------|---------|
| FastAPI | REST API server |
| SQLite/PostgreSQL | Conversation storage |
| Redis | Caching, rate limiting |

### DevOps
| Technology | Purpose |
|------------|---------|
| pytest | Testing |
| Rich | CLI formatting |
| python-dotenv | Environment management |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │     CLI       │  │   REST API    │  │    Web UI     │                   │
│  │  (Rich TUI)   │  │   (FastAPI)   │  │   (React)     │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENT CORE                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Agent Executor                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Message   │  │    LLM      │  │    Tool     │  │    State    │  │  │
│  │  │   Manager   │  │   Client    │  │  Executor   │  │   Manager   │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Tool Registry                                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │   Web    │  │   Code   │  │   File   │  │  Shell   │  │ Custom │  │  │
│  │  │  Search  │  │   Exec   │  │   Ops    │  │   Exec   │  │  Tools │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Provider A│  │Provider B│  │  Docker  │  │  Search  │  │  File    │      │
│  │   API    │  │   API    │  │ Sandbox  │  │   APIs   │  │  System  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ReAct Agent Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ReAct AGENT LOOP                                   │
│                                                                              │
│    ┌──────────┐                                                             │
│    │  START   │                                                             │
│    └────┬─────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────┐     ┌──────────────────────────────────────────────────┐   │
│    │ Receive  │     │ Messages:                                         │   │
│    │  Input   │────▶│ [system prompt, user message, tool results...]   │   │
│    └────┬─────┘     └──────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────┐     ┌──────────────────────────────────────────────────┐   │
│    │   LLM    │     │ Prompt: "Think step by step. If you need         │   │
│    │  Think   │◀───▶│ information, use tools. Output your reasoning."  │   │
│    └────┬─────┘     └──────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│    ┌──────────────────────────────────┐                                     │
│    │  Response contains tool call?    │                                     │
│    └──────────┬───────────────────────┘                                     │
│               │                                                              │
│       ┌───────┴───────┐                                                     │
│       │               │                                                      │
│      YES              NO                                                     │
│       │               │                                                      │
│       ▼               ▼                                                      │
│  ┌──────────┐   ┌──────────┐                                                │
│  │ Execute  │   │  Return  │                                                │
│  │  Tools   │   │  Answer  │                                                │
│  └────┬─────┘   └──────────┘                                                │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │  Append  │                                                               │
│  │ Results  │──────────────────┐                                            │
│  └──────────┘                  │                                            │
│                                │                                            │
│       ┌────────────────────────┘                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────┐                                                               │
│  │ Max iter │───YES───▶ Return partial answer                               │
│  │ reached? │                                                               │
│  └────┬─────┘                                                               │
│       │ NO                                                                   │
│       │                                                                      │
│       └──────────────▶ Loop back to "LLM Think"                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tool Execution Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│     LLM     │         │    Tool     │         │   Tool      │
│   Response  │         │  Executor   │         │  Handler    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Tool call JSON    │                       │
       │ ─────────────────────>│                       │
       │                       │                       │
       │                       │  2. Validate schema   │
       │                       │────────┐              │
       │                       │        │              │
       │                       │<───────┘              │
       │                       │                       │
       │                       │  3. Execute tool      │
       │                       │ ─────────────────────>│
       │                       │                       │
       │                       │                       │  4. Run
       │                       │                       │────────┐
       │                       │                       │        │
       │                       │                       │<───────┘
       │                       │                       │
       │                       │  5. Return result     │
       │                       │<──────────────────────│
       │                       │                       │
       │  6. Format as message │                       │
       │<──────────────────────│                       │
       │                       │                       │
```

---

## 5. Data Models

### Core Types

```python
# models/core.py
from pydantic import BaseModel, Field
from typing import Literal, Any
from enum import Enum

class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"

class Message(BaseModel):
    role: Role
    content: str
    tool_call_id: str | None = None
    tool_calls: list["ToolCall"] | None = None

class ToolCall(BaseModel):
    id: str
    name: str
    arguments: dict[str, Any]

class ToolResult(BaseModel):
    tool_call_id: str
    content: str
    is_error: bool = False

class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema

class AgentConfig(BaseModel):
    model: str = "your-provider-model-id"
    max_iterations: int = 10
    max_tokens: int = 4096
    temperature: float = 0.7
    tools: list[str] = Field(default_factory=list)
    system_prompt: str | None = None

class AgentState(BaseModel):
    messages: list[Message] = Field(default_factory=list)
    iteration: int = 0
    total_tokens: int = 0
    status: Literal["running", "completed", "error", "max_iterations"] = "running"
```

### Database Schema (SQLite)

```sql
-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    title TEXT,
    agent_config JSON
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_call_id TEXT,
    tool_calls JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tool Executions (for debugging/audit)
CREATE TABLE tool_executions (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    tool_name TEXT NOT NULL,
    arguments JSON,
    result TEXT,
    is_error BOOLEAN DEFAULT FALSE,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_tool_executions_conversation ON tool_executions(conversation_id);
```

---

## 6. API Design

### REST Endpoints

**Conversations**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |

**Messages**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations/:id/messages` | Send message |
| GET | `/api/conversations/:id/messages` | Get messages |

**Streaming**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/conversations/:id/stream` | Stream response (SSE) |

### Request/Response Examples

**Send Message**
```json
// POST /api/conversations/:id/messages
// Request
{
  "content": "Search for the latest news about AI agents and summarize the top 3 results"
}

// Response (non-streaming)
{
  "id": "msg_123",
  "role": "assistant",
  "content": "I'll search for the latest AI agent news...\n\n**Top 3 AI Agent News:**\n1. ...",
  "tool_calls": [
    {
      "id": "call_abc",
      "name": "web_search",
      "arguments": {"query": "latest AI agents news 2024"}
    }
  ],
  "iterations": 2,
  "tokens_used": 1523
}
```

**Stream Response (SSE)**
```
// POST /api/conversations/:id/stream
// Response (Server-Sent Events)

event: thinking
data: {"content": "I need to search for AI agent news..."}

event: tool_call
data: {"name": "web_search", "arguments": {"query": "AI agents news"}}

event: tool_result
data: {"tool_call_id": "call_abc", "content": "1. OpenAI releases..."}

event: content
data: {"content": "Based on my search, here are the top 3:"}

event: content
data: {"content": "\n\n1. **OpenAI Agents**..."}

event: done
data: {"iterations": 2, "tokens_used": 1523}
```

---

## 7. Core Implementation

### Tool Definition

```python
# tools/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Any

class Tool(ABC):
    """Base class for all tools."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique tool name."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Tool description for the LLM."""
        pass

    @property
    @abstractmethod
    def parameters(self) -> dict[str, Any]:
        """JSON Schema for tool parameters."""
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """Execute the tool and return result."""
        pass

    def to_definition(self) -> dict:
        """Convert to API tool definition format."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters
        }
```

### Web Search Tool

```python
# tools/web_search.py
from tools.base import Tool
from duckduckgo_search import DDGS

class WebSearchTool(Tool):
    name = "web_search"
    description = """Search the web for current information. Use this when you need
    up-to-date information that might not be in your training data. Returns a list
    of search results with titles, URLs, and snippets."""

    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query"
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results (default: 5)",
                "default": 5
            }
        },
        "required": ["query"]
    }

    async def execute(self, query: str, max_results: int = 5) -> str:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))

            if not results:
                return "No results found for the query."

            formatted = []
            for i, r in enumerate(results, 1):
                formatted.append(
                    f"{i}. **{r['title']}**\n"
                    f"   URL: {r['href']}\n"
                    f"   {r['body']}"
                )

            return "\n\n".join(formatted)
        except Exception as e:
            return f"Search error: {str(e)}"
```

### Code Execution Tool

```python
# tools/code_exec.py
import asyncio
import docker
from tools.base import Tool

class CodeExecutionTool(Tool):
    name = "execute_code"
    description = """Execute Python code in a sandboxed environment. Use this to run
    calculations, data processing, or test code snippets. Returns stdout, stderr,
    and exit code."""

    parameters = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "Python code to execute"
            },
            "timeout": {
                "type": "integer",
                "description": "Execution timeout in seconds (default: 30)",
                "default": 30
            }
        },
        "required": ["code"]
    }

    def __init__(self):
        self.client = docker.from_env()

    async def execute(self, code: str, timeout: int = 30) -> str:
        try:
            # Run in Docker container for isolation
            container = self.client.containers.run(
                "python:3.11-slim",
                command=["python", "-c", code],
                detach=True,
                mem_limit="256m",
                cpu_period=100000,
                cpu_quota=50000,  # 50% CPU
                network_disabled=True,
            )

            # Wait with timeout
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: container.wait(timeout=timeout)
            )

            logs = container.logs().decode("utf-8")
            exit_code = result["StatusCode"]

            container.remove()

            if exit_code == 0:
                return f"Output:\n{logs}" if logs else "Code executed successfully (no output)"
            else:
                return f"Error (exit code {exit_code}):\n{logs}"

        except docker.errors.ContainerError as e:
            return f"Execution error: {e.stderr.decode('utf-8')}"
        except Exception as e:
            return f"Error: {str(e)}"
```

### File Operations Tool

```python
# tools/file_ops.py
import aiofiles
import os
from pathlib import Path
from tools.base import Tool

class FileReadTool(Tool):
    name = "read_file"
    description = """Read the contents of a file. Use this to examine existing files
    in the workspace."""

    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file to read"
            }
        },
        "required": ["path"]
    }

    def __init__(self, workspace_dir: str = "./workspace"):
        self.workspace = Path(workspace_dir).resolve()

    async def execute(self, path: str) -> str:
        try:
            file_path = (self.workspace / path).resolve()

            # Security: ensure path is within workspace
            if not str(file_path).startswith(str(self.workspace)):
                return "Error: Access denied - path outside workspace"

            if not file_path.exists():
                return f"Error: File not found: {path}"

            async with aiofiles.open(file_path, "r") as f:
                content = await f.read()

            # Truncate very large files
            if len(content) > 50000:
                return f"{content[:50000]}\n\n... [truncated, file too large]"

            return content
        except Exception as e:
            return f"Error reading file: {str(e)}"


class FileWriteTool(Tool):
    name = "write_file"
    description = """Write content to a file. Creates the file if it doesn't exist,
    or overwrites if it does. Creates parent directories as needed."""

    parameters = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file to write"
            },
            "content": {
                "type": "string",
                "description": "Content to write to the file"
            }
        },
        "required": ["path", "content"]
    }

    def __init__(self, workspace_dir: str = "./workspace"):
        self.workspace = Path(workspace_dir).resolve()

    async def execute(self, path: str, content: str) -> str:
        try:
            file_path = (self.workspace / path).resolve()

            # Security: ensure path is within workspace
            if not str(file_path).startswith(str(self.workspace)):
                return "Error: Access denied - path outside workspace"

            # Create parent directories
            file_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(file_path, "w") as f:
                await f.write(content)

            return f"Successfully wrote {len(content)} bytes to {path}"
        except Exception as e:
            return f"Error writing file: {str(e)}"
```

### Tool Registry

```python
# tools/registry.py
from typing import Type
from tools.base import Tool
from tools.web_search import WebSearchTool
from tools.code_exec import CodeExecutionTool
from tools.file_ops import FileReadTool, FileWriteTool

class ToolRegistry:
    """Registry for managing available tools."""

    _tools: dict[str, Tool] = {}

    @classmethod
    def register(cls, tool: Tool) -> None:
        cls._tools[tool.name] = tool

    @classmethod
    def get(cls, name: str) -> Tool | None:
        return cls._tools.get(name)

    @classmethod
    def get_all(cls) -> list[Tool]:
        return list(cls._tools.values())

    @classmethod
    def get_definitions(cls, tool_names: list[str] | None = None) -> list[dict]:
        """Get tool definitions for API call."""
        tools = cls._tools.values()
        if tool_names:
            tools = [t for t in tools if t.name in tool_names]
        return [t.to_definition() for t in tools]

    @classmethod
    def setup_default_tools(cls, workspace_dir: str = "./workspace") -> None:
        """Register default tools."""
        cls.register(WebSearchTool())
        cls.register(CodeExecutionTool())
        cls.register(FileReadTool(workspace_dir))
        cls.register(FileWriteTool(workspace_dir))

# Initialize on import
ToolRegistry.setup_default_tools()
```

### LLM Client

```python
# llm/client.py
from abc import ABC, abstractmethod
from typing import AsyncIterator
import anthropic
import openai
from models.core import Message, ToolCall, AgentConfig

class LLMClient(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        tools: list[dict],
        config: AgentConfig
    ) -> tuple[str, list[ToolCall]]:
        """Get completion from LLM."""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        tools: list[dict],
        config: AgentConfig
    ) -> AsyncIterator[dict]:
        """Stream completion from LLM."""
        pass


class AnthropicClient(LLMClient):
    def __init__(self, api_key: str):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def complete(
        self,
        messages: list[Message],
        tools: list[dict],
        config: AgentConfig
    ) -> tuple[str, list[ToolCall]]:
        # Convert messages to Anthropic format
        system_prompt = None
        api_messages = []

        for msg in messages:
            if msg.role == "system":
                system_prompt = msg.content
            else:
                api_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

        response = await self.client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=api_messages,
            tools=tools if tools else None
        )

        content = ""
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input
                ))

        return content, tool_calls

    async def stream(
        self,
        messages: list[Message],
        tools: list[dict],
        config: AgentConfig
    ) -> AsyncIterator[dict]:
        # Similar to complete but with streaming
        system_prompt = None
        api_messages = []

        for msg in messages:
            if msg.role == "system":
                system_prompt = msg.content
            else:
                api_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

        async with self.client.messages.stream(
            model=config.model,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=api_messages,
            tools=tools if tools else None
        ) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        yield {"type": "content", "content": event.delta.text}
                elif event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        yield {
                            "type": "tool_call_start",
                            "id": event.content_block.id,
                            "name": event.content_block.name
                        }
```

### Agent Executor

```python
# agent/executor.py
import uuid
from typing import AsyncIterator
from models.core import Message, Role, ToolCall, ToolResult, AgentConfig, AgentState
from llm.client import LLMClient, AnthropicClient
from tools.registry import ToolRegistry

DEFAULT_SYSTEM_PROMPT = """You are a helpful AI assistant with access to tools.

When you need to use a tool, explain your reasoning first, then use the tool.
After receiving tool results, analyze them and continue working toward the user's goal.

Always be concise but thorough. If you're unsure about something, say so.
If a tool fails, try an alternative approach or explain what went wrong."""

class AgentExecutor:
    def __init__(
        self,
        config: AgentConfig,
        llm_client: LLMClient | None = None
    ):
        self.config = config
        self.llm = llm_client or AnthropicClient(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.state = AgentState()

        # Set system prompt
        system_prompt = config.system_prompt or DEFAULT_SYSTEM_PROMPT
        self.state.messages.append(Message(role=Role.SYSTEM, content=system_prompt))

    async def run(self, user_message: str) -> str:
        """Run agent with user message, return final response."""
        self.state.messages.append(Message(role=Role.USER, content=user_message))
        self.state.status = "running"

        while self.state.iteration < self.config.max_iterations:
            self.state.iteration += 1

            # Get LLM response
            tools = ToolRegistry.get_definitions(self.config.tools or None)
            content, tool_calls = await self.llm.complete(
                self.state.messages,
                tools,
                self.config
            )

            # Add assistant message
            self.state.messages.append(Message(
                role=Role.ASSISTANT,
                content=content,
                tool_calls=tool_calls
            ))

            # No tool calls = we're done
            if not tool_calls:
                self.state.status = "completed"
                return content

            # Execute tools
            for tool_call in tool_calls:
                result = await self._execute_tool(tool_call)
                self.state.messages.append(Message(
                    role=Role.TOOL,
                    content=result.content,
                    tool_call_id=result.tool_call_id
                ))

        self.state.status = "max_iterations"
        return f"Reached maximum iterations ({self.config.max_iterations}). Last response:\n{content}"

    async def stream(self, user_message: str) -> AsyncIterator[dict]:
        """Stream agent execution."""
        self.state.messages.append(Message(role=Role.USER, content=user_message))
        self.state.status = "running"

        while self.state.iteration < self.config.max_iterations:
            self.state.iteration += 1

            tools = ToolRegistry.get_definitions(self.config.tools or None)
            content = ""
            tool_calls = []
            current_tool = None

            async for event in self.llm.stream(self.state.messages, tools, self.config):
                if event["type"] == "content":
                    content += event["content"]
                    yield event
                elif event["type"] == "tool_call_start":
                    current_tool = ToolCall(
                        id=event["id"],
                        name=event["name"],
                        arguments={}
                    )
                    yield {"type": "tool_call", "name": event["name"]}

            if current_tool:
                tool_calls.append(current_tool)

            # Add assistant message
            self.state.messages.append(Message(
                role=Role.ASSISTANT,
                content=content,
                tool_calls=tool_calls if tool_calls else None
            ))

            if not tool_calls:
                self.state.status = "completed"
                yield {"type": "done", "iterations": self.state.iteration}
                return

            # Execute tools
            for tool_call in tool_calls:
                result = await self._execute_tool(tool_call)
                yield {
                    "type": "tool_result",
                    "tool_call_id": result.tool_call_id,
                    "content": result.content[:500]  # Preview
                }
                self.state.messages.append(Message(
                    role=Role.TOOL,
                    content=result.content,
                    tool_call_id=result.tool_call_id
                ))

        self.state.status = "max_iterations"
        yield {"type": "error", "message": "Max iterations reached"}

    async def _execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """Execute a tool call and return result."""
        tool = ToolRegistry.get(tool_call.name)

        if not tool:
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Error: Unknown tool '{tool_call.name}'",
                is_error=True
            )

        try:
            result = await tool.execute(**tool_call.arguments)
            return ToolResult(
                tool_call_id=tool_call.id,
                content=result,
                is_error=False
            )
        except Exception as e:
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Tool execution error: {str(e)}",
                is_error=True
            )
```

### CLI Interface

```python
# cli/main.py
import asyncio
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Prompt
from rich.panel import Panel
from agent.executor import AgentExecutor
from models.core import AgentConfig

console = Console()

async def main():
    console.print(Panel.fit(
        "[bold blue]Agent Framework[/bold blue]\n"
        "An AI assistant with tools. Type 'exit' to quit.",
        title="Welcome"
    ))

    config = AgentConfig(
        model="your-provider-model-id",
        max_iterations=10,
        tools=["web_search", "execute_code", "read_file", "write_file"]
    )
    agent = AgentExecutor(config)

    while True:
        try:
            user_input = Prompt.ask("\n[bold green]You[/bold green]")

            if user_input.lower() in ["exit", "quit"]:
                console.print("[yellow]Goodbye![/yellow]")
                break

            console.print("\n[bold blue]Agent[/bold blue]", end="")

            # Stream response
            async for event in agent.stream(user_input):
                if event["type"] == "content":
                    console.print(event["content"], end="")
                elif event["type"] == "tool_call":
                    console.print(f"\n[dim]Using tool: {event['name']}[/dim]")
                elif event["type"] == "tool_result":
                    console.print(f"[dim]Got result ({len(event['content'])} chars)[/dim]")
                elif event["type"] == "done":
                    console.print(f"\n[dim]({event['iterations']} iterations)[/dim]")

            console.print()

        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted[/yellow]")
            break

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 8. Implementation Phases

### Phase 1: Core Foundation
1. Set up Python project with Poetry/uv
2. Create data models (Pydantic)
3. Implement base Tool class
4. Create tool registry
5. Implement Anthropic LLM client
6. Build basic agent loop (non-streaming)

### Phase 2: Built-in Tools
1. Implement web search tool
2. Implement code execution tool (subprocess first)
3. Implement file read/write tools
4. Add Docker sandboxing for code execution
5. Write unit tests for all tools

### Phase 3: Streaming & CLI
1. Implement streaming LLM responses
2. Build Rich CLI interface
3. Add streaming tool results
4. Implement conversation history display
5. Add configuration via CLI flags

### Phase 4: REST API
1. Set up FastAPI server
2. Implement conversation endpoints
3. Add SSE streaming endpoint
4. Implement conversation storage (SQLite)
5. Add basic authentication

### Phase 5: Advanced Features
1. Add OpenAI client support
2. Implement retry logic with backoff
3. Add rate limiting
4. Implement parallel tool execution
5. Add tool result caching

### Phase 6: Polish
1. Comprehensive error handling
2. Logging and observability
3. Documentation
4. Example prompts and use cases
5. Performance optimization

---

## 9. AI/ML Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Prompt Engineering | System prompts, ReAct formatting |
| 2 | Tool/Function Calling | JSON schema definitions, execution |
| 3 | Chain of Thought | Explicit reasoning in prompts |
| 4 | Structured Outputs | Parsing tool calls from responses |
| 5 | Token Management | Context window optimization |
| 6 | Streaming | Real-time response delivery |
| 7 | Error Recovery | Retry strategies, fallbacks |
| 8 | Agent Loops | Iterative reasoning and acting |
| 9 | Memory | Conversation history management |
| 10 | Sandboxing | Secure code execution |

---

## 10. Folder Structure

```
agent-framework/
├── src/
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── executor.py          # Main agent loop
│   │   └── planner.py           # Planning module (v2)
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── client.py            # LLM client interface
│   │   ├── anthropic.py         # Anthropic implementation
│   │   └── openai.py            # OpenAI implementation
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── base.py              # Base tool class
│   │   ├── registry.py          # Tool registry
│   │   ├── web_search.py        # Web search tool
│   │   ├── code_exec.py         # Code execution tool
│   │   └── file_ops.py          # File operations
│   ├── models/
│   │   ├── __init__.py
│   │   └── core.py              # Pydantic models
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── routes/
│   │   │   ├── conversations.py
│   │   │   └── messages.py
│   │   └── deps.py              # Dependencies
│   ├── cli/
│   │   ├── __init__.py
│   │   └── main.py              # CLI interface
│   ├── storage/
│   │   ├── __init__.py
│   │   └── sqlite.py            # SQLite storage
│   └── config.py                # Configuration
├── tests/
│   ├── test_tools/
│   ├── test_agent/
│   └── test_api/
├── workspace/                    # Agent workspace directory
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 11. Development Commands

```bash
# Create project
mkdir agent-framework && cd agent-framework
uv init

# Install dependencies
uv add anthropic openai pydantic httpx aiofiles rich
uv add duckduckgo-search docker beautifulsoup4
uv add fastapi uvicorn python-dotenv
uv add --dev pytest pytest-asyncio ruff

# Set up environment
cp .env.example .env
# Add: ANTHROPIC_API_KEY=your-key

# Run CLI
uv run python -m src.cli.main

# Run API server
uv run uvicorn src.api.main:app --reload

# Run tests
uv run pytest

# Type check
uv run pyright

# Format code
uv run ruff format .
```

---

## 12. Example Usage

### CLI Session
```
$ uv run python -m src.cli.main

╭─ Welcome ──────────────────────────────────────╮
│ Agent Framework                                 │
│ An AI assistant with tools. Type 'exit' to quit│
╰─────────────────────────────────────────────────╯

You: What's the current weather in San Francisco? Then write a haiku about it.

Agent: I'll search for the current weather in San Francisco.

Using tool: web_search
Got result (1523 chars)

Based on my search, San Francisco currently has partly cloudy skies
with a temperature of 62°F (17°C) and light winds.

Here's a haiku about it:

Fog rolls through the bay
Golden Gate peeks through gray mist
Cool breeze, warm hearts beat

(2 iterations)

You: exit
Goodbye!
```

---

## Summary

The Agent Framework project teaches you how modern AI agents work at a fundamental level. You'll implement the ReAct pattern from scratch, build a tool registry system, and create a production-ready agent that can search the web, execute code, and manage files. This is foundational knowledge for building any AI-powered application.

**Estimated Complexity**: Intermediate-Advanced
**Core Skills**: Python, Async Programming, Prompt Engineering, API Design
**Key Challenge**: Robust error handling and token management
