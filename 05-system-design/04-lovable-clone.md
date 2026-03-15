# Lovable Clone - AI App Builder Project Plan

## 1. Project Overview

An AI-powered application builder similar to Lovable.dev. Users describe what they want to build in natural language, and the AI generates functional web applications with real-time preview. This is a complex project that will push your full-stack skills and introduce AI/LLM integration.

### Core Value Proposition
- Generate React/Next.js apps from natural language descriptions
- Real-time code preview in sandboxed environment
- Iterate on designs through conversation
- Export generated projects

### Key Learning Outcomes
- LLM/AI API integration (OpenAI, Anthropic)
- Code generation and parsing
- Sandboxed code execution (iframes, WebContainers)
- Real-time collaboration patterns
- Complex state management
- WebSocket for live updates

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] User authentication
- [ ] Chat interface for describing apps
- [ ] AI-powered code generation (using LLM API)
- [ ] Live preview of generated code
- [ ] Project management (create, save, list projects)
- [ ] Code editor to view/edit generated code
- [ ] Export project as ZIP

### V2 Features (Nice-to-Have)
- [ ] Multiple file support (components, pages)
- [ ] Version history / undo
- [ ] Template library
- [ ] Custom styling options
- [ ] Deploy directly to Vercel
- [ ] Collaboration (share projects)
- [ ] Component library integration
- [ ] Image generation for assets
- [ ] Database schema generation

### User Stories
1. As a user, I want to describe an app idea and see it generated
2. As a user, I want to see a live preview of my generated app
3. As a user, I want to refine my app through follow-up messages
4. As a user, I want to edit the generated code manually
5. As a user, I want to save my projects and return later
6. As a user, I want to export my project to work on locally

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Monaco Editor | Code editing |
| Sandpack/WebContainers | Code preview sandbox |
| Zustand | State management |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Backend API |
| Prisma | ORM |
| PostgreSQL | Database |
| Auth.js (NextAuth) | Authentication |
| OpenAI API / Anthropic API | Code generation |
| Redis | Rate limiting, caching |

### AI/LLM
| Technology | Purpose |
|------------|---------|
| OpenAI / Anthropic code generation model | Code generation |
| LangChain (optional) | LLM orchestration |
| Streaming responses | Real-time output |

### Preview/Sandbox
| Technology | Purpose |
|------------|---------|
| Sandpack | CodeSandbox's in-browser bundler |
| OR WebContainers | Stackblitz's Node.js in browser |
| OR iframe sandbox | Simple isolated preview |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       Next.js App                                │    │
│  │                                                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │  │    Chat      │  │    Code      │  │   Preview    │          │    │
│  │  │  Interface   │  │   Editor     │  │   Sandbox    │          │    │
│  │  │              │  │   (Monaco)   │  │  (Sandpack)  │          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  │         │                 │                  ▲                   │    │
│  │         │                 │                  │                   │    │
│  │         ▼                 ▼                  │                   │    │
│  │  ┌─────────────────────────────────────────────┐                │    │
│  │  │            State Management (Zustand)        │                │    │
│  │  │  - messages[] - files{} - activeFile        │                │    │
│  │  └─────────────────────────────────────────────┘                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP / SSE (streaming)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              SERVER                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Next.js API Routes                            │    │
│  │                                                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │  │  /api/chat   │  │/api/projects │  │  /api/auth   │          │    │
│  │  │  (streaming) │  │    (CRUD)    │  │              │          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  │         │                 │                                      │    │
│  │         ▼                 ▼                                      │    │
│  │  ┌─────────────┐  ┌─────────────────┐                           │    │
│  │  │   LLM API   │  │     Prisma      │                           │    │
│  │  │  (OpenAI/   │  │                 │                           │    │
│  │  │  Anthropic) │  └────────┬────────┘                           │    │
│  │  └─────────────┘           │                                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        PostgreSQL                                │    │
│  │   Users | Projects | Messages | GeneratedFiles                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User types app description in chat
2. Message sent to `/api/chat` endpoint
3. Server constructs prompt with context (previous messages, current files)
4. LLM API called with streaming enabled
5. Generated code streamed back to client
6. Client parses code blocks and updates file state
7. Sandpack/preview reloads with new code
8. User sees live preview

---

## 5. Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      User        │       │     Project      │       │   GeneratedFile  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │───┐   │ id          PK   │───┐   │ id          PK   │
│ email            │   │   │ name             │   │   │ filename         │
│ password         │   └──▶│ userId      FK   │   └──▶│ content          │
│ name             │       │ description      │       │ projectId   FK   │
│ credits          │       │ status           │       │ language         │
│ createdAt        │       │ createdAt        │       │ createdAt        │
└──────────────────┘       │ updatedAt        │       │ updatedAt        │
                           └──────────────────┘       └──────────────────┘
                                    │
                                    │
                                    ▼
                           ┌──────────────────┐
                           │     Message      │
                           ├──────────────────┤
                           │ id          PK   │
                           │ role (user/ai)   │
                           │ content          │
                           │ projectId   FK   │
                           │ createdAt        │
                           └──────────────────┘
```

### Prisma Schema

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String?
  credits   Int       @default(100)  // API usage credits
  projects  Project[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id          String          @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus   @default(DRAFT)
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  messages    Message[]
  files       GeneratedFile[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model Message {
  id        String   @id @default(cuid())
  role      Role
  content   String   @db.Text
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId String
  createdAt DateTime @default(now())
}

model GeneratedFile {
  id        String   @id @default(cuid())
  filename  String
  content   String   @db.Text
  language  String   @default("tsx")
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, filename])
}

enum Role {
  USER
  ASSISTANT
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  EXPORTED
  ARCHIVED
}
```

---

## 6. API Design

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project with files |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/export` | Export as ZIP |

### Chat/Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get AI response (streaming) |
| GET | `/api/projects/:id/messages` | Get conversation history |

### File Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/files` | Get all files for project |
| PATCH | `/api/projects/:id/files/:fileId` | Update file content |

### Streaming Response Example

```typescript
// POST /api/chat
// Request
{
  "projectId": "clx123...",
  "message": "Create a landing page with a hero section and pricing table"
}

// Response (Server-Sent Events)
data: {"type": "thinking", "content": "I'll create a landing page..."}

data: {"type": "code", "filename": "page.tsx", "content": "export default function..."}

data: {"type": "code", "filename": "components/Hero.tsx", "content": "..."}

data: {"type": "done"}
```

---

## 7. Frontend Structure

### Page Routes

```
/                        → Landing page
/login                   → Login
/register                → Register
/dashboard               → Project list (protected)
/project/new             → Create new project
/project/[id]            → Project workspace (main builder)
/project/[id]/settings   → Project settings
```

### Component Hierarchy

```
app/
├── layout.tsx
├── page.tsx                    # Landing
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (protected)/
│   ├── dashboard/page.tsx      # Project list
│   └── project/
│       ├── new/page.tsx
│       └── [id]/
│           └── page.tsx        # Main workspace
└── api/
    ├── auth/
    ├── projects/
    └── chat/

components/
├── workspace/
│   ├── Workspace.tsx           # Main 3-panel layout
│   ├── ChatPanel.tsx           # Left: chat interface
│   ├── CodePanel.tsx           # Middle: Monaco editor
│   ├── PreviewPanel.tsx        # Right: Sandpack preview
│   ├── FileTree.tsx            # File navigation
│   └── MessageBubble.tsx
├── dashboard/
│   ├── ProjectCard.tsx
│   └── ProjectList.tsx
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Tabs.tsx
└── layout/
    ├── Header.tsx
    └── Sidebar.tsx
```

### Workspace Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Project Name | Save | Export | Settings                   │
├──────────────┬─────────────────────────┬───────────────────────────┤
│              │                         │                           │
│    Chat      │      Code Editor        │      Live Preview         │
│   Panel      │       (Monaco)          │       (Sandpack)          │
│              │                         │                           │
│  [Message]   │  ┌─ FileTree ─────────┐ │  ┌───────────────────┐   │
│  [Message]   │  │ App.tsx            │ │  │                   │   │
│  [Message]   │  │ components/        │ │  │   Your App        │   │
│              │  │   Hero.tsx         │ │  │   Preview         │   │
│  ┌────────┐  │  │   Pricing.tsx      │ │  │   Here            │   │
│  │ Input  │  │  └───────────────────┘ │  │                   │   │
│  └────────┘  │                         │  └───────────────────┘   │
└──────────────┴─────────────────────────┴───────────────────────────┘
```

### State Management (Zustand)

```typescript
interface WorkspaceStore {
  // Project
  project: Project | null;
  isLoading: boolean;

  // Chat
  messages: Message[];
  isGenerating: boolean;

  // Files
  files: Record<string, FileContent>;
  activeFile: string | null;

  // Actions
  loadProject: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  updateFile: (filename: string, content: string) => void;
  setActiveFile: (filename: string) => void;
  saveProject: () => Promise<void>;
  exportProject: () => Promise<Blob>;
}
```

---

## 8. AI Prompt Engineering

### System Prompt Structure

```typescript
const systemPrompt = `You are an expert React/Next.js developer.
Generate clean, modern code based on user descriptions.

RULES:
1. Use TypeScript with proper types
2. Use Tailwind CSS for styling
3. Create functional components with hooks
4. Include proper imports
5. Make components responsive
6. Use semantic HTML

OUTPUT FORMAT:
Return code blocks with filename annotations:
\`\`\`tsx filename="components/Hero.tsx"
// component code here
\`\`\`

Current project files:
${JSON.stringify(currentFiles)}

Previous conversation:
${conversationHistory}`;
```

### Parsing Generated Code

```typescript
function parseGeneratedCode(response: string): FileUpdate[] {
  const codeBlockRegex = /```(\w+)\s+filename="([^"]+)"\n([\s\S]*?)```/g;
  const files: FileUpdate[] = [];

  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    files.push({
      language: match[1],
      filename: match[2],
      content: match[3].trim()
    });
  }

  return files;
}
```

---

## 9. Implementation Phases

### Phase 1: Project Setup & Core UI
1. Initialize Next.js with TypeScript and Tailwind
2. Set up Prisma with PostgreSQL
3. Create database schema
4. Set up authentication with Auth.js (NextAuth)
5. Build landing page
6. Build dashboard with project list
7. Create basic 3-panel workspace layout

### Phase 2: Code Editor & Preview
1. Integrate Monaco Editor
2. Set up file state management
3. Create file tree component
4. Integrate Sandpack for live preview
5. Connect editor changes to preview
6. Add syntax highlighting
7. Test with hardcoded React code

### Phase 3: AI Integration
1. Set up OpenAI/Anthropic API integration
2. Create chat API endpoint with streaming
3. Build chat interface component
4. Implement prompt engineering
5. Parse code blocks from AI response
6. Update files from AI response
7. Add loading states during generation

### Phase 4: Project Management
1. Implement project CRUD operations
2. Save conversation history
3. Save generated files to database
4. Implement project loading
5. Add project settings page
6. Build export functionality (ZIP download)

### Phase 5: Polish & Advanced Features
1. Add error handling and validation
2. Implement rate limiting
3. Add usage credits system
4. Improve UI/UX with animations
5. Add keyboard shortcuts
6. Optimize for performance
7. Add templates/starters

### Phase 6: Deployment
1. Set up Vercel deployment
2. Configure production database
3. Set up API keys securely
4. Add monitoring/logging
5. Test in production

---

## 10. Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | HTML/CSS | Semantic markup, layouts |
| 2 | JS Basics | Core logic, event handling |
| 3 | JS Architecture | Complex state management, component patterns |
| 4 | Async JS | API calls, streaming responses |
| 5 | Node vs Browser | Server-side AI calls vs client preview |
| 6 | HTTP and Express | REST APIs with streaming |
| 7 | Databases and Mongo | - |
| 8 | Postgres + Prisma | Project and file storage |
| 9 | TypeScript | Full type safety |
| 10 | Turborepo | - (optional for monorepo) |
| 11 | BunJS | - (optional runtime) |
| 12 | React | Component architecture |
| 13 | Tailwind | Styling |
| 14 | NextJS | Full-stack framework |
| 15 | Websockets + WebRTC | SSE for streaming (WebSocket optional) |
| 16 | Queues/Pubsubs | Rate limiting, job queues for heavy generation |

---

## 11. Folder Structure

```
lovable-clone/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (protected)/
│   │   │   ├── dashboard/
│   │   │   └── project/[id]/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   └── chat/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── workspace/
│   │   ├── dashboard/
│   │   ├── chat/
│   │   └── ui/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── openai.ts
│   │   ├── code-parser.ts
│   │   └── prompts.ts
│   ├── stores/
│   │   └── workspace.ts
│   ├── hooks/
│   │   ├── useChat.ts
│   │   └── useProject.ts
│   └── types/
├── public/
├── .env
└── package.json
```

---

## 12. Development Commands

```bash
# Create project
npx create-next-app@latest lovable-clone --typescript --tailwind --eslint --app

# Install dependencies
npm install prisma @prisma/client next-auth openai zustand
npm install @monaco-editor/react @codesandbox/sandpack-react
npm install archiver  # for ZIP export
npm install -D @types/archiver

# Initialize Prisma
npx prisma init

# Run development
npm run dev
```

---

## 13. Key Challenges & Solutions

### Challenge 1: Streaming AI Responses
**Solution**: Use Server-Sent Events (SSE) or the AI SDK by Vercel

```typescript
// Using AI SDK by Vercel
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('your-codegen-model'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Challenge 2: Live Preview Security
**Solution**: Use Sandpack which runs in an iframe sandbox

```tsx
import { Sandpack } from '@codesandbox/sandpack-react';

<Sandpack
  files={generatedFiles}
  template="react-ts"
  theme="dark"
  options={{
    showNavigator: true,
    showTabs: true,
  }}
/>
```

### Challenge 3: Parsing AI Output
**Solution**: Structured prompts + regex parsing + validation

---

## Summary

The Lovable Clone is an ambitious project that combines modern web development with AI integration. Start with a basic chat-to-preview flow, then incrementally add features. Focus on getting the AI generation working reliably before adding polish.

**Estimated Complexity**: Advanced
**Core Skills**: React, Next.js, AI/LLM APIs, Code Parsing, Sandboxing
**Unique Challenge**: Reliable code generation and live preview
