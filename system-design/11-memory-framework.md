# Memory Framework for AI Agents - Project Plan

## 1. Project Overview

A comprehensive memory system for AI agents that enables long-term retention, semantic search, and personalization. This project implements different types of memory (episodic, semantic, procedural) that allow agents to remember past conversations, learn user preferences, and recall relevant information across sessions. This is essential infrastructure for building AI assistants that improve over time.

### Core Value Proposition
- Remember conversations and context across sessions
- Learn user preferences and personalize responses
- Retrieve relevant past interactions when needed
- Build knowledge graphs from accumulated information
- Enable agents to "grow smarter" over time

### Key Learning Outcomes
- Vector databases and embedding models
- Semantic similarity search
- Memory types (episodic, semantic, procedural)
- RAG (Retrieval Augmented Generation)
- Memory consolidation and summarization
- Knowledge graph construction
- Personalization systems

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] Conversation memory (store and retrieve chat history)
- [ ] Semantic search over memories
- [ ] User preference extraction and storage
- [ ] Memory relevance scoring
- [ ] Automatic memory summarization
- [ ] Context injection into prompts
- [ ] Memory API for agents to use

### V2 Features (Nice-to-Have)
- [ ] Memory consolidation (combine related memories)
- [ ] Forgetting curves (decay old memories)
- [ ] Importance scoring
- [ ] Knowledge graph extraction
- [ ] Cross-session context
- [ ] Memory visualization dashboard
- [ ] Privacy controls (memory deletion)
- [ ] Multi-agent memory sharing
- [ ] Hierarchical memory (short/medium/long term)
- [ ] Contradiction detection and resolution

---

## 3. Tech Stack

### Vector Storage
| Technology | Purpose |
|------------|---------|
| Pinecone | Managed vector DB (production) |
| Chroma | Local vector DB (development) |
| Qdrant | Self-hosted alternative |
| pgvector | PostgreSQL extension |

### Embeddings
| Technology | Purpose |
|------------|---------|
| OpenAI embedding model | Production embeddings |
| Voyage AI | Alternative embeddings |
| sentence-transformers | Local embeddings |
| Cohere embed | Multilingual option |

### Core
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Primary language |
| FastAPI | API server |
| Pydantic | Data validation |
| Redis | Caching, recent memory |

### Storage
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Metadata, user data |
| Redis | Hot cache, session state |

### Knowledge Graph (V2)
| Technology | Purpose |
|------------|---------|
| Neo4j | Graph database |
| LlamaIndex | Knowledge extraction |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI AGENT                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Agent Runtime                                  │  │
│  │                                                                        │  │
│  │  User Message ─────────────────────────────────────────────────┐      │  │
│  │       │                                                         │      │  │
│  │       ▼                                                         ▼      │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐        │  │
│  │  │  Memory  │───▶│  Context │───▶│   LLM    │───▶│  Memory  │        │  │
│  │  │  Recall  │    │  Builder │    │   Call   │    │  Store   │        │  │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘        │  │
│  │       │                                               │               │  │
│  │       │         Retrieved Context                     │               │  │
│  │       │         ┌─────────────────┐                  │               │  │
│  │       └────────▶│ "User prefers   │                  │               │  │
│  │                 │  Python. Last   │                  │               │  │
│  │                 │  discussed auth │                  │               │  │
│  │                 │  systems..."    │                  │               │  │
│  │                 └─────────────────┘                  │               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │                   │
                              ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEMORY SERVICE                                     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Memory Manager                                 │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Episodic   │  │   Semantic   │  │  Procedural  │                │  │
│  │  │   Memory     │  │   Memory     │  │   Memory     │                │  │
│  │  │              │  │              │  │              │                │  │
│  │  │  - Convos    │  │  - Facts     │  │  - Prefs     │                │  │
│  │  │  - Events    │  │  - Knowledge │  │  - Patterns  │                │  │
│  │  │  - Context   │  │  - Entities  │  │  - Skills    │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         │                 │                 │                         │  │
│  │         └─────────────────┴─────────────────┘                         │  │
│  │                           │                                            │  │
│  │                           ▼                                            │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │                    Retrieval Pipeline                          │   │  │
│  │  │                                                                │   │  │
│  │  │  Query ──▶ Embed ──▶ Search ──▶ Rerank ──▶ Format ──▶ Return  │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Background Processes                              │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │ Consolidator │  │  Summarizer  │  │   Extractor  │                │  │
│  │  │              │  │              │  │              │                │  │
│  │  │  Merge       │  │  Compress    │  │  Extract     │                │  │
│  │  │  similar     │  │  old convos  │  │  entities,   │                │  │
│  │  │  memories    │  │  into facts  │  │  preferences │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Vector DB  │  │  PostgreSQL  │  │    Redis     │  │   Neo4j      │    │
│  │   (Chroma)   │  │              │  │              │  │   (V2)       │    │
│  │              │  │              │  │              │  │              │    │
│  │  - Embeddings│  │  - Users     │  │  - Cache     │  │  - Knowledge │    │
│  │  - Semantic  │  │  - Metadata  │  │  - Sessions  │  │    Graph     │    │
│  │    search    │  │  - Raw text  │  │  - Hot data  │  │  - Entities  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Memory Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MEMORY TYPES                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      EPISODIC MEMORY                                    │ │
│  │  "What happened" - Specific events and conversations                   │ │
│  │                                                                         │ │
│  │  Examples:                                                              │ │
│  │  - "On Dec 15, user asked about implementing auth in Flask"           │ │
│  │  - "User mentioned they're building a startup called Acme"            │ │
│  │  - "We debugged a React rendering issue together"                     │ │
│  │                                                                         │ │
│  │  Schema: {timestamp, user_id, session_id, content, embedding}         │ │
│  │                                                                         │ │
│  │  Use: Context for current conversation                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      SEMANTIC MEMORY                                    │ │
│  │  "What I know" - Facts and knowledge extracted from episodes           │ │
│  │                                                                         │ │
│  │  Examples:                                                              │ │
│  │  - "Flask-Login is used for user session management"                  │ │
│  │  - "User's company Acme is in the fintech space"                      │ │
│  │  - "React useEffect runs after render"                                │ │
│  │                                                                         │ │
│  │  Schema: {fact, source_episode_ids, confidence, embedding}            │ │
│  │                                                                         │ │
│  │  Use: Background knowledge injection                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      PROCEDURAL MEMORY                                  │ │
│  │  "How to do things" - Learned preferences and patterns                 │ │
│  │                                                                         │ │
│  │  Examples:                                                              │ │
│  │  - "User prefers Python over JavaScript"                              │ │
│  │  - "User likes detailed explanations with code examples"              │ │
│  │  - "User works in VSCode with vim keybindings"                        │ │
│  │                                                                         │ │
│  │  Schema: {preference_type, value, evidence_count, last_updated}       │ │
│  │                                                                         │ │
│  │  Use: Personalization of responses                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Memory Write and Read Paths

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORY WRITE PATH                                   │
│                                                                              │
│  ┌──────────────┐                                                           │
│  │ Conversation │  User: "I prefer using TypeScript for React projects"    │
│  │    Turn      │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐ │
│  │   Extract    │────▶│ Entities: [TypeScript, React]                     │ │
│  │   Metadata   │     │ Preference: (language=TypeScript, context=React)  │ │
│  └──────┬───────┘     └──────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐ │
│  │    Embed     │────▶│ [0.023, -0.156, 0.089, ..., 0.034] (1536 dims)   │ │
│  └──────┬───────┘     └──────────────────────────────────────────────────┘ │
│         │                                                                    │
│         ├────────────────────┬─────────────────────┐                        │
│         ▼                    ▼                     ▼                        │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Vector DB  │     │  PostgreSQL  │     │    Redis     │                │
│  │              │     │              │     │              │                │
│  │  Store       │     │  Store raw   │     │  Update      │                │
│  │  embedding   │     │  content +   │     │  session     │                │
│  │  + metadata  │     │  metadata    │     │  cache       │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          MEMORY READ PATH                                    │
│                                                                              │
│  ┌──────────────┐                                                           │
│  │    Query     │  "How do I set up auth in my React TypeScript app?"      │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │    Embed     │  Query → embedding vector                                 │
│  │    Query     │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐ │
│  │   Vector     │────▶│ Top-k similar memories (cosine similarity)        │ │
│  │   Search     │     │ 1. "TypeScript preference" (0.89)                 │ │
│  │              │     │ 2. "React auth discussion" (0.85)                 │ │
│  └──────┬───────┘     │ 3. "Previous Flask auth" (0.72)                   │ │
│         │             └──────────────────────────────────────────────────┘ │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐ │
│  │   Rerank     │────▶│ Reordered by relevance + recency + importance     │ │
│  │   (Optional) │     │ 1. "React auth discussion" (reranked: 0.92)       │ │
│  └──────┬───────┘     │ 2. "TypeScript preference" (reranked: 0.88)       │ │
│         │             └──────────────────────────────────────────────────┘ │
│         ▼                                                                    │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐ │
│  │   Format     │────▶│ "## Relevant Context                              │ │
│  │   Context    │     │ - User prefers TypeScript for React              │ │
│  │              │     │ - Previously discussed auth patterns"            │ │
│  └──────────────┘     └──────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Memory Consolidation Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MEMORY CONSOLIDATION (Background)                       │
│                                                                              │
│  Triggered: Every N hours or when memory count exceeds threshold            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Step 1: Identify Related Memories                                      │ │
│  │                                                                         │ │
│  │  Cluster memories by semantic similarity:                              │ │
│  │  ┌───────────────────┐  ┌───────────────────┐                         │ │
│  │  │ Cluster A (Auth)  │  │ Cluster B (React) │                         │ │
│  │  │ - Flask auth      │  │ - React hooks     │                         │ │
│  │  │ - JWT tokens      │  │ - Component state │                         │ │
│  │  │ - Password hash   │  │ - useEffect       │                         │ │
│  │  └───────────────────┘  └───────────────────┘                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Step 2: Summarize Clusters (LLM)                                       │ │
│  │                                                                         │ │
│  │  Prompt: "Summarize these related memories into key facts:"            │ │
│  │                                                                         │ │
│  │  Input: [Flask auth memory, JWT memory, Password memory]               │ │
│  │  Output: "User learned about web auth: Flask-Login for sessions,       │ │
│  │           JWTs for stateless auth, bcrypt for password hashing"        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Step 3: Create Semantic Memory                                         │ │
│  │                                                                         │ │
│  │  New semantic memory:                                                  │ │
│  │  {                                                                     │ │
│  │    "type": "semantic",                                                 │ │
│  │    "fact": "User understands web auth: Flask-Login, JWT, bcrypt",     │ │
│  │    "source_ids": ["mem_001", "mem_002", "mem_003"],                   │ │
│  │    "confidence": 0.9                                                   │ │
│  │  }                                                                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Step 4: Decay Original Memories                                        │ │
│  │                                                                         │ │
│  │  - Reduce importance score of consolidated episodic memories           │ │
│  │  - Keep originals for detailed recall, but prefer consolidated        │ │
│  │  - After long time, archive/delete very old episodes                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Models

### Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE,  -- Your app's user ID
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Memory entries (all types)
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    session_id UUID,
    memory_type VARCHAR(20) NOT NULL,  -- episodic, semantic, procedural
    content TEXT NOT NULL,
    embedding_id VARCHAR(100),  -- Reference to vector DB
    metadata JSONB,  -- entities, preferences, etc.
    importance FLOAT DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP  -- For automatic cleanup
);

-- Preferences (procedural memory)
CREATE TABLE preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL,  -- language, style, format, etc.
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    evidence_count INTEGER DEFAULT 1,
    confidence FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, category, key)
);

-- Memory relationships (for consolidation tracking)
CREATE TABLE memory_relationships (
    id UUID PRIMARY KEY,
    source_memory_id UUID REFERENCES memories(id),
    target_memory_id UUID REFERENCES memories(id),
    relationship_type VARCHAR(50),  -- consolidated_from, related_to, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    summary TEXT,
    metadata JSONB
);

-- Indexes
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_importance ON memories(importance DESC);
CREATE INDEX idx_preferences_user_category ON preferences(user_id, category);
```

### Pydantic Models

```python
# models/memory.py
from pydantic import BaseModel, Field
from typing import Literal, Any
from datetime import datetime
from enum import Enum

class MemoryType(str, Enum):
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"

class Memory(BaseModel):
    id: str
    user_id: str
    memory_type: MemoryType
    content: str
    embedding: list[float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    importance: float = 0.5
    created_at: datetime = Field(default_factory=datetime.now)

class Preference(BaseModel):
    category: str  # language, style, format, tools, etc.
    key: str
    value: str
    confidence: float = 0.5
    evidence_count: int = 1

class MemoryQuery(BaseModel):
    query: str
    user_id: str
    memory_types: list[MemoryType] | None = None
    limit: int = 10
    min_relevance: float = 0.5
    include_preferences: bool = True

class MemoryResult(BaseModel):
    memory: Memory
    relevance_score: float
    source: str  # "vector_search", "preference", "recent"

class ContextBlock(BaseModel):
    memories: list[MemoryResult]
    preferences: list[Preference]
    formatted_context: str
```

---

## 6. API Design

### REST Endpoints

**Memory Operations**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/memory/store` | Store a new memory |
| POST | `/api/memory/query` | Search memories |
| GET | `/api/memory/:id` | Get specific memory |
| DELETE | `/api/memory/:id` | Delete memory |
| PATCH | `/api/memory/:id` | Update memory metadata |

**Preferences**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id/preferences` | Get user preferences |
| PUT | `/api/users/:id/preferences` | Update preferences |
| DELETE | `/api/users/:id/preferences/:key` | Delete preference |

**Context Building**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/context/build` | Build context for a query |

**Admin**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/memory/consolidate` | Trigger consolidation |
| GET | `/api/memory/stats` | Get memory statistics |

### Request/Response Examples

**Store Memory**
```json
// POST /api/memory/store
// Request
{
  "user_id": "user_123",
  "session_id": "sess_456",
  "memory_type": "episodic",
  "content": "User asked about implementing authentication in Flask",
  "metadata": {
    "entities": ["Flask", "authentication"],
    "turn_index": 5
  }
}

// Response
{
  "id": "mem_789",
  "user_id": "user_123",
  "memory_type": "episodic",
  "content": "User asked about implementing authentication in Flask",
  "embedding_id": "vec_abc123",
  "importance": 0.6,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Query Memories**
```json
// POST /api/memory/query
// Request
{
  "query": "authentication patterns",
  "user_id": "user_123",
  "memory_types": ["episodic", "semantic"],
  "limit": 5,
  "min_relevance": 0.6
}

// Response
{
  "results": [
    {
      "memory": {
        "id": "mem_789",
        "content": "User asked about implementing authentication in Flask",
        "memory_type": "episodic",
        "importance": 0.6
      },
      "relevance_score": 0.89,
      "source": "vector_search"
    },
    {
      "memory": {
        "id": "mem_790",
        "content": "Flask-Login is recommended for session-based auth",
        "memory_type": "semantic",
        "importance": 0.8
      },
      "relevance_score": 0.82,
      "source": "vector_search"
    }
  ],
  "preferences": [
    {"category": "language", "key": "preferred", "value": "Python", "confidence": 0.9}
  ]
}
```

**Build Context**
```json
// POST /api/context/build
// Request
{
  "query": "How do I add auth to my Flask app?",
  "user_id": "user_123",
  "max_tokens": 2000
}

// Response
{
  "context": "## Relevant Memory\n\n### Previous Conversations\n- You previously discussed Flask authentication patterns\n- We covered Flask-Login for session management\n\n### Your Preferences\n- Preferred language: Python\n- Preferred style: Detailed explanations with code\n\n### Relevant Knowledge\n- Flask-Login handles user sessions\n- Use bcrypt for password hashing",
  "token_count": 847,
  "memories_used": 4,
  "preferences_included": 2
}
```

---

## 7. Core Implementation

### Embedding Service

```python
# services/embedding.py
import openai
from typing import Sequence
import numpy as np

class EmbeddingService:
    """Generate embeddings for text."""

    def __init__(self, model: str = "text-embedding-3-small"):
        self.model = model
        self.client = openai.AsyncOpenAI()
        self.dimension = 1536  # For text-embedding-3-small

    async def embed(self, text: str) -> list[float]:
        """Embed a single text."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=text
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed multiple texts in batch."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=list(texts)
        )
        return [item.embedding for item in response.data]

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        a_arr = np.array(a)
        b_arr = np.array(b)
        return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))
```

### Vector Store (Chroma)

```python
# services/vector_store.py
import chromadb
from chromadb.config import Settings
from typing import Any

class VectorStore:
    """Interface to Chroma vector database."""

    def __init__(self, persist_directory: str = "./chroma_data"):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="memories",
            metadata={"hnsw:space": "cosine"}
        )

    async def add(
        self,
        id: str,
        embedding: list[float],
        content: str,
        metadata: dict[str, Any]
    ):
        """Add a memory to the vector store."""
        self.collection.add(
            ids=[id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[metadata]
        )

    async def search(
        self,
        query_embedding: list[float],
        limit: int = 10,
        filter: dict[str, Any] | None = None
    ) -> list[dict]:
        """Search for similar memories."""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=filter,
            include=["documents", "metadatas", "distances"]
        )

        memories = []
        for i in range(len(results["ids"][0])):
            memories.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
                "relevance": 1 - results["distances"][0][i]  # Convert distance to similarity
            })

        return memories

    async def delete(self, id: str):
        """Delete a memory from the vector store."""
        self.collection.delete(ids=[id])

    async def update_metadata(self, id: str, metadata: dict[str, Any]):
        """Update metadata for a memory."""
        self.collection.update(
            ids=[id],
            metadatas=[metadata]
        )
```

### Memory Manager

```python
# services/memory_manager.py
from typing import Any
import uuid
from datetime import datetime
from models.memory import Memory, MemoryType, MemoryQuery, MemoryResult, Preference
from services.embedding import EmbeddingService
from services.vector_store import VectorStore
from db.repository import MemoryRepository

class MemoryManager:
    """Core memory management service."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStore,
        repository: MemoryRepository
    ):
        self.embedder = embedding_service
        self.vectors = vector_store
        self.repo = repository

    async def store(
        self,
        user_id: str,
        content: str,
        memory_type: MemoryType = MemoryType.EPISODIC,
        metadata: dict[str, Any] | None = None,
        session_id: str | None = None
    ) -> Memory:
        """Store a new memory."""

        # Generate embedding
        embedding = await self.embedder.embed(content)

        # Create memory object
        memory = Memory(
            id=str(uuid.uuid4()),
            user_id=user_id,
            memory_type=memory_type,
            content=content,
            embedding=embedding,
            metadata=metadata or {},
            importance=self._calculate_importance(content, metadata)
        )

        # Store in vector DB
        await self.vectors.add(
            id=memory.id,
            embedding=embedding,
            content=content,
            metadata={
                "user_id": user_id,
                "memory_type": memory_type.value,
                "session_id": session_id,
                **(metadata or {})
            }
        )

        # Store in SQL DB
        await self.repo.create(memory, session_id)

        # Extract and store preferences if applicable
        if memory_type == MemoryType.EPISODIC:
            await self._extract_preferences(user_id, content)

        return memory

    async def query(self, query: MemoryQuery) -> list[MemoryResult]:
        """Query memories with semantic search."""

        # Embed query
        query_embedding = await self.embedder.embed(query.query)

        # Build filter
        filter_dict = {"user_id": query.user_id}
        if query.memory_types:
            filter_dict["memory_type"] = {"$in": [t.value for t in query.memory_types]}

        # Search vector DB
        results = await self.vectors.search(
            query_embedding=query_embedding,
            limit=query.limit * 2,  # Get extra for filtering
            filter=filter_dict
        )

        # Filter by relevance threshold
        filtered = [r for r in results if r["relevance"] >= query.min_relevance]

        # Convert to MemoryResult objects
        memory_results = []
        for r in filtered[:query.limit]:
            memory = await self.repo.get(r["id"])
            if memory:
                memory_results.append(MemoryResult(
                    memory=memory,
                    relevance_score=r["relevance"],
                    source="vector_search"
                ))

        # Optionally include preferences
        if query.include_preferences:
            preferences = await self.repo.get_preferences(query.user_id)
            # Preferences are added separately in context builder

        return memory_results

    async def get_preferences(self, user_id: str) -> list[Preference]:
        """Get all preferences for a user."""
        return await self.repo.get_preferences(user_id)

    async def update_preference(
        self,
        user_id: str,
        category: str,
        key: str,
        value: str,
        confidence_delta: float = 0.1
    ):
        """Update or create a preference."""
        await self.repo.upsert_preference(
            user_id=user_id,
            category=category,
            key=key,
            value=value,
            confidence_delta=confidence_delta
        )

    def _calculate_importance(
        self,
        content: str,
        metadata: dict[str, Any] | None
    ) -> float:
        """Calculate importance score for a memory."""
        importance = 0.5  # Base

        # Longer content might be more important
        if len(content) > 200:
            importance += 0.1

        # Presence of code might be important
        if "```" in content or "def " in content or "function " in content:
            importance += 0.15

        # Explicit importance markers
        if metadata and metadata.get("is_important"):
            importance += 0.2

        return min(importance, 1.0)

    async def _extract_preferences(self, user_id: str, content: str):
        """Extract preferences from content using LLM."""
        # Simple heuristic extraction (can be enhanced with LLM)
        preference_patterns = [
            ("language", "prefer", ["Python", "JavaScript", "TypeScript", "Go", "Rust"]),
            ("style", "detailed", ["detailed", "concise", "brief"]),
            ("format", "code", ["code examples", "explanations", "diagrams"]),
        ]

        content_lower = content.lower()
        for category, key, values in preference_patterns:
            for value in values:
                if value.lower() in content_lower:
                    await self.update_preference(
                        user_id=user_id,
                        category=category,
                        key=key,
                        value=value,
                        confidence_delta=0.05
                    )
```

### Context Builder

```python
# services/context_builder.py
from typing import Any
from models.memory import MemoryQuery, MemoryType, ContextBlock

class ContextBuilder:
    """Build context from memories for LLM prompts."""

    def __init__(self, memory_manager, max_tokens: int = 4000):
        self.memory = memory_manager
        self.max_tokens = max_tokens
        self.chars_per_token = 4  # Rough estimate

    async def build(
        self,
        query: str,
        user_id: str,
        session_context: str | None = None
    ) -> ContextBlock:
        """Build context for a query."""

        # Query memories
        memory_query = MemoryQuery(
            query=query,
            user_id=user_id,
            memory_types=[MemoryType.EPISODIC, MemoryType.SEMANTIC],
            limit=10,
            min_relevance=0.5
        )
        memory_results = await self.memory.query(memory_query)

        # Get preferences
        preferences = await self.memory.get_preferences(user_id)

        # Format context
        formatted = self._format_context(
            memories=memory_results,
            preferences=preferences,
            session_context=session_context
        )

        return ContextBlock(
            memories=memory_results,
            preferences=preferences,
            formatted_context=formatted
        )

    def _format_context(
        self,
        memories: list,
        preferences: list,
        session_context: str | None
    ) -> str:
        """Format memories and preferences into context string."""
        sections = []

        # Current session context (most relevant)
        if session_context:
            sections.append(f"## Current Session\n{session_context}")

        # Preferences
        if preferences:
            pref_lines = []
            for p in sorted(preferences, key=lambda x: x.confidence, reverse=True)[:5]:
                pref_lines.append(f"- {p.category}/{p.key}: {p.value}")
            sections.append("## Your Preferences\n" + "\n".join(pref_lines))

        # Relevant memories (grouped by type)
        episodic = [m for m in memories if m.memory.memory_type == MemoryType.EPISODIC]
        semantic = [m for m in memories if m.memory.memory_type == MemoryType.SEMANTIC]

        if episodic:
            ep_lines = [f"- {m.memory.content[:200]}" for m in episodic[:3]]
            sections.append("## Previous Conversations\n" + "\n".join(ep_lines))

        if semantic:
            sem_lines = [f"- {m.memory.content[:200]}" for m in semantic[:3]]
            sections.append("## Relevant Knowledge\n" + "\n".join(sem_lines))

        context = "\n\n".join(sections)

        # Truncate if too long
        max_chars = self.max_tokens * self.chars_per_token
        if len(context) > max_chars:
            context = context[:max_chars] + "\n...[truncated]"

        return context
```

### Memory Consolidation Service

```python
# services/consolidator.py
import anthropic
from typing import Any
from models.memory import Memory, MemoryType
from services.memory_manager import MemoryManager
from services.embedding import EmbeddingService
import numpy as np
from sklearn.cluster import AgglomerativeClustering

class MemoryConsolidator:
    """Consolidate memories into semantic facts."""

    def __init__(
        self,
        memory_manager: MemoryManager,
        embedding_service: EmbeddingService,
        llm_model: str = "your-provider-model-id"
    ):
        self.memory = memory_manager
        self.embedder = embedding_service
        self.client = anthropic.AsyncAnthropic()
        self.model = llm_model

    async def consolidate(
        self,
        user_id: str,
        min_cluster_size: int = 3,
        similarity_threshold: float = 0.7
    ) -> list[Memory]:
        """Consolidate episodic memories into semantic memories."""

        # Get all episodic memories for user
        memories = await self.memory.repo.get_by_type(user_id, MemoryType.EPISODIC)

        if len(memories) < min_cluster_size:
            return []

        # Get embeddings
        embeddings = np.array([m.embedding for m in memories if m.embedding])

        # Cluster similar memories
        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1 - similarity_threshold,
            metric="cosine",
            linkage="average"
        )
        labels = clustering.fit_predict(embeddings)

        # Group memories by cluster
        clusters: dict[int, list[Memory]] = {}
        for i, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(memories[i])

        # Consolidate each cluster
        new_semantic_memories = []
        for label, cluster_memories in clusters.items():
            if len(cluster_memories) >= min_cluster_size:
                semantic_memory = await self._summarize_cluster(user_id, cluster_memories)
                if semantic_memory:
                    new_semantic_memories.append(semantic_memory)

                    # Update source memories
                    for m in cluster_memories:
                        m.importance *= 0.7  # Decay importance
                        await self.memory.repo.update(m)

        return new_semantic_memories

    async def _summarize_cluster(
        self,
        user_id: str,
        memories: list[Memory]
    ) -> Memory | None:
        """Summarize a cluster of memories into a semantic fact."""

        # Build prompt
        memory_texts = "\n".join([f"- {m.content}" for m in memories])
        prompt = f"""Analyze these related conversation memories and extract the key facts or knowledge:

Memories:
{memory_texts}

Extract 1-3 concise factual statements that capture the essential information.
Focus on:
- User preferences or patterns
- Technical knowledge discussed
- Important decisions made

Respond with just the facts, one per line."""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        facts = response.content[0].text.strip()

        if not facts:
            return None

        # Create semantic memory
        semantic_memory = await self.memory.store(
            user_id=user_id,
            content=facts,
            memory_type=MemoryType.SEMANTIC,
            metadata={
                "source_memory_ids": [m.id for m in memories],
                "consolidation_date": str(datetime.now())
            }
        )

        return semantic_memory
```

### Preference Extractor

```python
# services/preference_extractor.py
import anthropic
import json
from typing import Any

class PreferenceExtractor:
    """Extract user preferences from conversations using LLM."""

    def __init__(self, model: str = "your-extractor-model-id"):
        self.client = anthropic.AsyncAnthropic()
        self.model = model

    async def extract(self, content: str) -> list[dict[str, Any]]:
        """Extract preferences from conversation content."""

        prompt = f"""Analyze this conversation content and extract any user preferences.

Content:
{content}

Look for:
- Programming language preferences
- Code style preferences (verbose vs concise)
- Tool/framework preferences
- Communication style preferences
- Learning preferences

Return a JSON array of preferences found:
[{{"category": "...", "key": "...", "value": "...", "confidence": 0.0-1.0}}]

If no clear preferences, return empty array [].
Only include high-confidence preferences (>0.6)."""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            preferences = json.loads(response.content[0].text)
            return [p for p in preferences if p.get("confidence", 0) > 0.6]
        except json.JSONDecodeError:
            return []
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure
1. Set up project structure
2. Create data models
3. Implement embedding service
4. Set up Chroma vector store
5. Create PostgreSQL schema
6. Implement basic memory CRUD

### Phase 2: Memory Operations
1. Implement memory storage
2. Build semantic search
3. Add relevance scoring
4. Create context builder
5. Test memory retrieval accuracy

### Phase 3: Preferences
1. Implement preference storage
2. Build preference extraction
3. Add confidence scoring
4. Create preference API
5. Test personalization

### Phase 4: API & Integration
1. Build FastAPI endpoints
2. Add authentication
3. Create SDK client
4. Integration tests
5. Documentation

### Phase 5: Consolidation
1. Implement memory clustering
2. Build summarization service
3. Add decay/forgetting
4. Create consolidation scheduler
5. Test memory lifecycle

### Phase 6: Advanced (V2)
1. Knowledge graph extraction
2. Multi-user memory sharing
3. Memory visualization
4. Privacy controls
5. Performance optimization

---

## 9. AI/ML Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Embeddings | Text to vector conversion |
| 2 | Vector Similarity | Cosine similarity search |
| 3 | Semantic Search | Finding relevant memories |
| 4 | Clustering | Grouping similar memories |
| 5 | RAG | Retrieval-augmented generation |
| 6 | Information Extraction | Preference extraction |
| 7 | Memory Consolidation | Summarizing into facts |
| 8 | Forgetting Curves | Memory decay over time |
| 9 | Personalization | Adapting to user preferences |
| 10 | Knowledge Graphs | Entity-relationship modeling |

---

## 10. Folder Structure

```
memory-framework/
├── src/
│   ├── models/
│   │   ├── __init__.py
│   │   └── memory.py           # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── embedding.py        # Embedding generation
│   │   ├── vector_store.py     # Chroma interface
│   │   ├── memory_manager.py   # Core memory operations
│   │   ├── context_builder.py  # Context formatting
│   │   ├── consolidator.py     # Memory consolidation
│   │   └── preference_extractor.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py         # SQLAlchemy setup
│   │   └── repository.py       # Data access layer
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app
│   │   └── routes/
│   │       ├── memory.py
│   │       ├── preferences.py
│   │       └── context.py
│   └── config.py
├── tests/
│   ├── test_embedding.py
│   ├── test_memory.py
│   └── test_consolidation.py
├── scripts/
│   └── migrate.py
├── chroma_data/                 # Vector DB storage
├── pyproject.toml
├── docker-compose.yml
└── README.md
```

---

## 11. Development Commands

```bash
# Create project
mkdir memory-framework && cd memory-framework
uv init

# Install dependencies
uv add openai anthropic chromadb pydantic
uv add sqlalchemy asyncpg alembic
uv add fastapi uvicorn python-dotenv
uv add numpy scikit-learn
uv add --dev pytest pytest-asyncio ruff

# Set up environment
echo "OPENAI_API_KEY=your-key" > .env
echo "ANTHROPIC_API_KEY=your-key" >> .env
echo "DATABASE_URL=postgresql://localhost/memory" >> .env

# Initialize database
uv run alembic upgrade head

# Run API server
uv run uvicorn src.api.main:app --reload --port 8000

# Run tests
uv run pytest

# Run consolidation job
uv run python -m scripts.consolidate
```

---

## 12. Example Usage

```python
# Example: Using the memory framework in an agent

from memory_framework import MemoryClient

# Initialize client
memory = MemoryClient(api_url="http://localhost:8000", user_id="user_123")

# Store a conversation turn
await memory.store(
    content="User asked about implementing auth with JWT tokens",
    metadata={"entities": ["JWT", "authentication"]}
)

# Later, when user asks a related question...
context = await memory.build_context(
    query="How do I validate a JWT token?"
)

# Use context in prompt
prompt = f"""
{context.formatted_context}

User Question: How do I validate a JWT token?
"""

# Context might include:
# ## Previous Conversations
# - User asked about implementing auth with JWT tokens
#
# ## Your Preferences
# - language/preferred: Python
#
# ## Relevant Knowledge
# - JWTs consist of header, payload, and signature

# After getting response, store it too
await memory.store(
    content="Explained JWT validation: decode, verify signature, check expiry",
    metadata={"entities": ["JWT", "validation"]}
)
```

---

## Summary

The Memory Framework project teaches you how to build persistent, intelligent memory for AI agents. You'll implement vector databases for semantic search, build preference learning systems, and create memory consolidation pipelines. This is foundational infrastructure for any AI assistant that needs to remember and learn from interactions.

**Estimated Complexity**: Intermediate-Advanced
**Core Skills**: Embeddings, Vector Search, RAG, Personalization
**Key Challenge**: Balancing relevance vs recency in memory retrieval
