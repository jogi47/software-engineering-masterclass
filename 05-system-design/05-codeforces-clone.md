# Codeforces Clone - Competitive Programming Platform Plan

## 1. Project Overview

A full-featured competitive programming platform similar to Codeforces. Users can solve algorithmic problems, participate in contests, and compete on leaderboards. This is the most technically challenging project, involving secure code execution, real-time contest updates, and complex rating systems.

### Core Value Proposition
- Practice algorithmic problems across difficulty levels
- Participate in timed coding contests
- Track progress with ratings and achievements
- Learn through editorials and community discussions

### Key Learning Outcomes
- Secure code execution (sandboxing, Docker)
- Message queues for job processing
- Real-time updates (WebSockets)
- Complex database relationships
- Rating/ELO algorithms
- Scalable architecture

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] User registration and authentication
- [ ] Problem listing with difficulty tags
- [ ] Problem detail view with statement
- [ ] Code editor with multiple language support
- [ ] Code submission and execution
- [ ] Verdict system (AC, WA, TLE, RE, CE)
- [ ] User profile with submission history
- [ ] Basic leaderboard

### V2 Features (Nice-to-Have)
- [ ] Timed contests with registration
- [ ] Real-time contest standings
- [ ] Rating system (Elo-based)
- [ ] Problem tags and categories
- [ ] Editorial/solutions
- [ ] Comments and discussions
- [ ] Virtual contests
- [ ] Custom test case running
- [ ] Plagiarism detection
- [ ] Problem difficulty voting
- [ ] User badges and achievements

### User Stories
1. As a user, I want to browse problems by difficulty
2. As a user, I want to read a problem statement and see examples
3. As a user, I want to submit code and receive a verdict
4. As a user, I want to see my submission history
5. As a user, I want to participate in a live contest
6. As a user, I want to view the leaderboard
7. As a user, I want to see my rating and statistics
8. As an admin, I want to add new problems with test cases

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Monaco Editor | Code editor |
| TanStack Query | Data fetching |
| Zustand | State management |
| Socket.io Client | Real-time updates |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Primary API |
| OR Express.js | Separate API server |
| Prisma | ORM |
| PostgreSQL | Primary database |
| Redis | Caching, pub/sub, queues |
| BullMQ | Job queue for code execution |
| Socket.io | Real-time communication |

### Code Execution
| Technology | Purpose |
|------------|---------|
| Docker | Container isolation |
| Judge0 | Self-hosted code execution API |
| OR Piston | Alternative execution engine |
| OR Custom sandbox | Using Docker + resource limits |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker Compose | Local development |
| Vercel / Railway | Deployment |
| AWS S3 / R2 | Test case file storage |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Next.js Frontend                              │  │
│  │                                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │ Problem  │ │  Code    │ │ Contest  │ │ Leader-  │ │  User    │   │  │
│  │  │  List    │ │  Editor  │ │   Page   │ │  board   │ │ Profile  │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │                      │                         ▲                      │  │
│  │                      │ Submit                  │ Real-time            │  │
│  └──────────────────────│─────────────────────────│──────────────────────┘  │
└─────────────────────────│─────────────────────────│──────────────────────────┘
                          │                         │
                          ▼                         │ WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API SERVER                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Next.js API / Express                             │  │
│  │                                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Problems   │  │  Submissions │  │   Contests   │                │  │
│  │  │     API      │  │     API      │  │     API      │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  │         │                 │                  │                        │  │
│  └─────────│─────────────────│──────────────────│────────────────────────┘  │
│            │                 │                  │                            │
│            ▼                 ▼                  ▼                            │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                      PostgreSQL                              │            │
│  │  Users | Problems | TestCases | Submissions | Contests       │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              │                                               │
│  ┌──────────────┐           │           ┌──────────────────────┐            │
│  │    Redis     │◀──────────┴──────────▶│    Socket.io         │            │
│  │  (Queue/     │                       │    (Real-time)       │            │
│  │   Cache)     │                       └──────────────────────┘            │
│  └──────────────┘                                                           │
│         │                                                                    │
│         │ BullMQ Jobs                                                        │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    JUDGE WORKER                              │            │
│  │  ┌──────────────────────────────────────────────────────┐   │            │
│  │  │                   Docker Container                    │   │            │
│  │  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │            │
│  │  │   │  Compile    │─▶│   Execute   │─▶│   Compare   │ │   │            │
│  │  │   │   Code      │  │  with Input │  │   Output    │ │   │            │
│  │  │   └─────────────┘  └─────────────┘  └─────────────┘ │   │            │
│  │  └──────────────────────────────────────────────────────┘   │            │
│  └─────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Submission Flow

```
1. User submits code
         │
         ▼
2. API validates submission
         │
         ▼
3. Create submission record (status: PENDING)
         │
         ▼
4. Add job to Redis queue (BullMQ)
         │
         ▼
5. Judge worker picks up job
         │
         ▼
6. For each test case:
   ┌──────────────────────────┐
   │ a. Create Docker container│
   │ b. Copy code + input     │
   │ c. Compile (if needed)   │
   │ d. Execute with limits   │
   │ e. Compare output        │
   │ f. Record result         │
   └──────────────────────────┘
         │
         ▼
7. Update submission status in DB
         │
         ▼
8. Emit WebSocket event to user
         │
         ▼
9. User sees verdict in real-time
```

---

## 5. Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      User        │       │     Problem      │       │    TestCase      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │       │ id          PK   │───┐   │ id          PK   │
│ email            │       │ title            │   │   │ problemId   FK   │
│ username         │       │ slug             │   └──▶│ input            │
│ password         │       │ statement        │       │ expectedOutput   │
│ rating           │       │ difficulty       │       │ isExample        │
│ maxRating        │       │ timeLimit        │       │ order            │
│ rank             │       │ memoryLimit      │       └──────────────────┘
│ solvedCount      │       │ inputFormat      │
│ createdAt        │       │ outputFormat     │
└──────────────────┘       │ constraints      │
        │                  │ tags[]           │
        │                  │ createdAt        │
        │                  └──────────────────┘
        │                           │
        │                           │
        ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Submission     │       │     Contest      │       │ContestProblem    │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id          PK   │       │ id          PK   │───┐   │ contestId   FK   │
│ userId      FK   │       │ name             │   │   │ problemId   FK   │
│ problemId   FK   │       │ startTime        │   └──▶│ points           │
│ contestId   FK   │       │ endTime          │       │ order            │
│ language         │       │ description      │       └──────────────────┘
│ code             │       │ isRated          │
│ status           │       │ createdAt        │       ┌──────────────────┐
│ verdict          │       └──────────────────┘       │  Registration    │
│ runtime          │               │                  ├──────────────────┤
│ memory           │               │                  │ userId      FK   │
│ testsPassed      │               │                  │ contestId   FK   │
│ totalTests       │               └─────────────────▶│ registeredAt     │
│ createdAt        │                                  └──────────────────┘
└──────────────────┘
```

### Prisma Schema

```prisma
model User {
  id          String        @id @default(cuid())
  email       String        @unique
  username    String        @unique
  password    String
  rating      Int           @default(1500)
  maxRating   Int           @default(1500)
  rank        Rank          @default(NEWBIE)
  solvedCount Int           @default(0)
  submissions Submission[]
  registrations Registration[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Problem {
  id           String       @id @default(cuid())
  title        String
  slug         String       @unique
  statement    String       @db.Text
  difficulty   Difficulty
  timeLimit    Int          @default(1000)  // milliseconds
  memoryLimit  Int          @default(256)   // MB
  inputFormat  String       @db.Text
  outputFormat String       @db.Text
  constraints  String       @db.Text
  tags         String[]
  testCases    TestCase[]
  submissions  Submission[]
  contests     ContestProblem[]
  solvedBy     Int          @default(0)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model TestCase {
  id             String   @id @default(cuid())
  problem        Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)
  problemId      String
  input          String   @db.Text
  expectedOutput String   @db.Text
  isExample      Boolean  @default(false)
  order          Int
}

model Submission {
  id          String     @id @default(cuid())
  user        User       @relation(fields: [userId], references: [id])
  userId      String
  problem     Problem    @relation(fields: [problemId], references: [id])
  problemId   String
  contest     Contest?   @relation(fields: [contestId], references: [id])
  contestId   String?
  language    Language
  code        String     @db.Text
  status      Status     @default(PENDING)
  verdict     Verdict?
  runtime     Int?       // milliseconds
  memory      Int?       // KB
  testsPassed Int        @default(0)
  totalTests  Int        @default(0)
  createdAt   DateTime   @default(now())
}

model Contest {
  id           String          @id @default(cuid())
  name         String
  slug         String          @unique
  description  String?         @db.Text
  startTime    DateTime
  endTime      DateTime
  isRated      Boolean         @default(true)
  problems     ContestProblem[]
  registrations Registration[]
  submissions  Submission[]
  createdAt    DateTime        @default(now())
}

model ContestProblem {
  contest    Contest  @relation(fields: [contestId], references: [id])
  contestId  String
  problem    Problem  @relation(fields: [problemId], references: [id])
  problemId  String
  points     Int      @default(100)
  order      Int      // A, B, C, D...

  @@id([contestId, problemId])
}

model Registration {
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  contest     Contest  @relation(fields: [contestId], references: [id])
  contestId   String
  registeredAt DateTime @default(now())

  @@id([userId, contestId])
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
  EXPERT
}

enum Language {
  CPP
  C
  PYTHON
  JAVA
  JAVASCRIPT
  RUST
  GO
}

enum Status {
  PENDING
  JUDGING
  COMPLETED
}

enum Verdict {
  ACCEPTED
  WRONG_ANSWER
  TIME_LIMIT_EXCEEDED
  MEMORY_LIMIT_EXCEEDED
  RUNTIME_ERROR
  COMPILATION_ERROR
}

enum Rank {
  NEWBIE
  PUPIL
  SPECIALIST
  EXPERT
  CANDIDATE_MASTER
  MASTER
  GRANDMASTER
}
```

---

## 6. API Design

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Problems

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/problems` | List problems (paginated, filterable) |
| GET | `/api/problems/:slug` | Get problem detail |
| POST | `/api/problems` | Create problem (admin) |
| PATCH | `/api/problems/:id` | Update problem (admin) |
| DELETE | `/api/problems/:id` | Delete problem (admin) |

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Submit code |
| GET | `/api/submissions/:id` | Get submission detail |
| GET | `/api/submissions` | List submissions (filter by user/problem) |
| GET | `/api/problems/:id/submissions` | Problem submissions |

### Contests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contests` | List contests |
| GET | `/api/contests/:slug` | Contest detail |
| POST | `/api/contests/:id/register` | Register for contest |
| GET | `/api/contests/:id/standings` | Contest leaderboard |
| GET | `/api/contests/:id/problems` | Contest problems |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:username` | User profile |
| GET | `/api/users/:username/submissions` | User submissions |
| GET | `/api/leaderboard` | Global leaderboard |

### WebSocket Events

```typescript
// Client → Server
socket.emit('join:problem', problemId);
socket.emit('join:contest', contestId);

// Server → Client
socket.on('submission:update', { submissionId, status, verdict });
socket.on('contest:standings', updatedStandings);
```

---

## 7. Code Execution System

### Using Judge0 (Recommended for MVP)

Judge0 is an open-source code execution system. You can self-host it.

```yaml
# docker-compose.yml for Judge0
version: '3'
services:
  judge0:
    image: judge0/judge0:latest
    ports:
      - "2358:2358"
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=postgres
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:alpine

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_PASSWORD=yourpassword
```

### Custom Judge (Advanced)

```typescript
// judge-worker.ts
import { Worker } from 'bullmq';
import Docker from 'dockerode';

const docker = new Docker();

async function judgeSubmission(job: Job) {
  const { submissionId, code, language, testCases, timeLimit, memoryLimit } = job.data;

  // Update status to JUDGING
  await updateSubmissionStatus(submissionId, 'JUDGING');

  const results = [];

  for (const testCase of testCases) {
    const result = await runInDocker({
      code,
      language,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      timeLimit,
      memoryLimit
    });

    results.push(result);

    if (result.verdict !== 'ACCEPTED') {
      break; // Stop on first failure
    }
  }

  // Calculate final verdict
  const verdict = calculateVerdict(results);

  // Update submission
  await updateSubmission(submissionId, {
    status: 'COMPLETED',
    verdict,
    testsPassed: results.filter(r => r.verdict === 'ACCEPTED').length,
    totalTests: testCases.length,
    runtime: Math.max(...results.map(r => r.runtime)),
    memory: Math.max(...results.map(r => r.memory))
  });

  // Emit WebSocket update
  io.to(`submission:${submissionId}`).emit('submission:update', { verdict });
}

async function runInDocker({ code, language, input, expectedOutput, timeLimit, memoryLimit }) {
  const container = await docker.createContainer({
    Image: getImageForLanguage(language),
    Cmd: getRunCommand(language),
    HostConfig: {
      Memory: memoryLimit * 1024 * 1024,
      CpuPeriod: 100000,
      CpuQuota: 50000,
      NetworkMode: 'none', // No network access
      AutoRemove: true
    }
  });

  // Copy code and input
  // Execute and capture output
  // Compare with expected output
  // Return result
}
```

### Language Support Configuration

```typescript
const LANGUAGE_CONFIG = {
  CPP: {
    image: 'gcc:latest',
    compile: 'g++ -O2 -std=c++17 solution.cpp -o solution',
    run: './solution',
    extension: '.cpp'
  },
  PYTHON: {
    image: 'python:3.11-slim',
    compile: null,
    run: 'python3 solution.py',
    extension: '.py'
  },
  JAVA: {
    image: 'openjdk:17-slim',
    compile: 'javac Solution.java',
    run: 'java Solution',
    extension: '.java'
  },
  JAVASCRIPT: {
    image: 'node:18-alpine',
    compile: null,
    run: 'node solution.js',
    extension: '.js'
  }
};
```

---

## 8. Frontend Structure

### Page Routes

```
/                           → Landing page
/login                      → Login
/register                   → Register
/problems                   → Problem list
/problem/:slug              → Problem detail + editor
/submissions                → My submissions
/submission/:id             → Submission detail
/contests                   → Contest list
/contest/:slug              → Contest page
/contest/:slug/problem/:id  → Contest problem
/contest/:slug/standings    → Contest standings
/user/:username             → User profile
/leaderboard                → Global leaderboard
/admin/problems             → Problem management (admin)
```

### Component Hierarchy

```
app/
├── layout.tsx
├── page.tsx                    # Landing
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (main)/
│   ├── problems/
│   │   ├── page.tsx            # Problem list
│   │   └── [slug]/page.tsx     # Problem + editor
│   ├── submissions/
│   │   ├── page.tsx            # My submissions
│   │   └── [id]/page.tsx       # Submission detail
│   ├── contests/
│   │   ├── page.tsx            # Contest list
│   │   └── [slug]/
│   │       ├── page.tsx        # Contest overview
│   │       ├── standings/page.tsx
│   │       └── problem/[id]/page.tsx
│   ├── user/[username]/page.tsx
│   └── leaderboard/page.tsx
└── api/

components/
├── problems/
│   ├── ProblemList.tsx
│   ├── ProblemCard.tsx
│   ├── ProblemStatement.tsx
│   ├── DifficultyBadge.tsx
│   └── TagsList.tsx
├── editor/
│   ├── CodeEditor.tsx          # Monaco wrapper
│   ├── LanguageSelector.tsx
│   ├── SubmitButton.tsx
│   └── TestCaseRunner.tsx
├── submissions/
│   ├── SubmissionList.tsx
│   ├── SubmissionRow.tsx
│   ├── VerdictBadge.tsx
│   └── SubmissionDetail.tsx
├── contests/
│   ├── ContestList.tsx
│   ├── ContestCard.tsx
│   ├── ContestTimer.tsx
│   └── Standings.tsx
├── users/
│   ├── UserProfile.tsx
│   ├── RatingGraph.tsx
│   ├── SolvedProblems.tsx
│   └── RankBadge.tsx
└── ui/
```

### Problem Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Problem Title (Difficulty) | Time: 1s | Memory: 256MB  │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│     Problem Statement          │       Code Editor              │
│                                │       (Monaco)                 │
│  Description...                │  ┌─────────────────────────┐  │
│                                │  │ #include <bits/stdc++.h>│  │
│  Input Format...               │  │                         │  │
│                                │  │ int main() {            │  │
│  Output Format...              │  │   // your code here     │  │
│                                │  │ }                       │  │
│  Constraints...                │  └─────────────────────────┘  │
│                                │                                │
│  Examples:                     │  [Language: C++  ▼] [Submit]  │
│  Input: 5 3                    │                                │
│  Output: 8                     │  ─────────────────────────────│
│                                │  Submission Status:            │
│  Tags: [math] [dp]             │  ● Judging... Test 3/10       │
│                                │                                │
└────────────────────────────────┴────────────────────────────────┘
```

---

## 9. Implementation Phases

### Phase 1: Core Setup
1. Initialize Next.js project
2. Set up Prisma with PostgreSQL
3. Create database schema
4. Set up authentication
5. Create basic UI components
6. Set up project structure

### Phase 2: Problems System
1. Create Problem model and API
2. Build problem list page with filters
3. Build problem detail page
4. Integrate Monaco Editor
5. Add language selection
6. Create test case viewer

### Phase 3: Submission & Judging
1. Set up Redis and BullMQ
2. Create submission API endpoint
3. Build Docker-based judge worker
4. OR integrate Judge0 API
5. Implement verdict system
6. Add real-time updates via WebSocket
7. Build submission history page

### Phase 4: User Features
1. Build user profile page
2. Add submission history
3. Create solved problems list
4. Implement rating calculation
5. Add rank badges
6. Build global leaderboard

### Phase 5: Contests
1. Create Contest model
2. Build contest list/detail pages
3. Implement contest registration
4. Add contest-specific submission
5. Build real-time standings
6. Implement contest timer

### Phase 6: Admin & Polish
1. Create admin panel for problems
2. Add test case management
3. Implement problem editing
4. Add search and filters
5. Performance optimization
6. Error handling
7. Mobile responsiveness

### Phase 7: Deployment
1. Set up Docker Compose for judge
2. Deploy main app to Vercel/Railway
3. Configure judge workers
4. Set up monitoring
5. Load testing

---

## 10. Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | HTML/CSS | Semantic structure, layouts |
| 2 | JS Basics | Problem logic, validation |
| 3 | JS Architecture | Complex state, worker patterns |
| 4 | Async JS | Queue processing, real-time |
| 5 | Node vs Browser | Judge runs server-side only |
| 6 | HTTP and Express | REST APIs |
| 7 | Databases and Mongo | - |
| 8 | Postgres + Prisma | All data storage |
| 9 | TypeScript | Full type safety |
| 10 | Turborepo | Monorepo for judge + web (optional) |
| 11 | BunJS | Fast runtime for judge (optional) |
| 12 | React | UI components |
| 13 | Tailwind | Styling |
| 14 | NextJS | Full-stack framework |
| 15 | Websockets | Real-time verdicts, standings |
| 16 | Queues/Pubsubs | BullMQ for judge jobs, Redis pub/sub |

---

## 11. Folder Structure

```
codeforces-clone/
├── apps/
│   ├── web/                     # Next.js frontend + API
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── hooks/
│   │   └── package.json
│   └── judge/                   # Judge worker service
│       ├── src/
│       │   ├── worker.ts
│       │   ├── docker.ts
│       │   └── languages/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── database/                # Shared Prisma schema
│   │   ├── prisma/
│   │   └── package.json
│   └── shared/                  # Shared types
│       └── package.json
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## 12. Development Commands

```bash
# Create monorepo (optional, can be single app)
npx create-turbo@latest

# Install dependencies
npm install prisma @prisma/client bullmq ioredis socket.io
npm install @monaco-editor/react
npm install -D @types/node

# For judge worker
npm install dockerode
npm install -D @types/dockerode

# Run local development
docker-compose up -d  # Redis, Postgres, Judge0
npm run dev

# Run judge worker
npm run judge:dev
```

---

## 13. Security Considerations

### Code Execution Security
1. **Network isolation**: Docker containers have no network access
2. **Resource limits**: CPU, memory, time limits enforced
3. **File system isolation**: Read-only except for designated folders
4. **Process limits**: Limit forking, threads
5. **No root access**: Run as unprivileged user

### Application Security
1. **Rate limiting**: Limit submissions per user
2. **Input validation**: Sanitize all inputs
3. **SQL injection**: Use Prisma parameterized queries
4. **XSS prevention**: Escape user content
5. **Authentication**: Secure session handling

---

## Summary

The Codeforces Clone is the most technically challenging project. Start with a simple setup (single problem, one language) and iterate. Consider using Judge0 for MVP to avoid building the execution engine from scratch. Focus on getting core flows working before adding contests and ratings.

**Estimated Complexity**: Expert
**Core Skills**: Docker, Message Queues, WebSockets, Complex DB Relations
**Unique Challenge**: Secure code execution at scale
