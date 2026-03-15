# Todo App - Full Stack Project Plan

## 1. Project Overview

A full-featured todo application that goes beyond basic CRUD operations. This project will teach you fundamental full-stack concepts including authentication, database design, RESTful APIs, and modern React patterns.

### Core Value Proposition
- Manage tasks with categories, priorities, and due dates
- User authentication and personal todo lists
- Real-time sync across devices

### Key Learning Outcomes
- Full-stack application architecture
- User authentication flows
- CRUD operations with a database
- React state management
- TypeScript in a real project
- Responsive design with Tailwind CSS

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] User registration and login (email/password)
- [ ] Create, read, update, delete todos
- [ ] Mark todos as complete/incomplete
- [ ] Filter todos (all, active, completed)
- [ ] Persist data in database
- [ ] Responsive design

### V2 Features (Nice-to-Have)
- [ ] Categories/tags for todos
- [ ] Priority levels (low, medium, high)
- [ ] Due dates with reminders
- [ ] Search functionality
- [ ] Drag-and-drop reordering
- [ ] Dark mode
- [ ] Share lists with other users
- [ ] Recurring todos

### User Stories
1. As a user, I want to sign up so I can save my todos
2. As a user, I want to create a todo with a title and optional description
3. As a user, I want to mark a todo as complete
4. As a user, I want to filter my todos to see only active items
5. As a user, I want to edit a todo after creating it
6. As a user, I want to delete a todo I no longer need
7. As a user, I want my todos to persist when I close the browser

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| React Hook Form | Form handling |
| Zod | Validation |
| Zustand or Context | State management |

### Backend
| Technology | Purpose |
|------------|---------|
| Next.js API Routes | Backend API |
| Prisma | ORM |
| PostgreSQL | Database |
| Auth.js (NextAuth) | Authentication |
| bcrypt | Password hashing |

### DevOps
| Technology | Purpose |
|------------|---------|
| Vercel | Deployment |
| Neon/Supabase | Hosted PostgreSQL |
| GitHub Actions | CI/CD (optional) |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Next.js App                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │  Auth   │  │  Todo   │  │ Filter  │             │    │
│  │  │  Pages  │  │  List   │  │  Bar    │             │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         SERVER                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js API Routes                      │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │  Auth   │  │  Todos  │  │  Users  │             │    │
│  │  │   API   │  │   API   │  │   API   │             │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              │ Prisma ORM                    │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │  Users  │  │  Todos  │  │Sessions │             │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown
- **Auth Pages**: Login, Register, Forgot Password
- **Todo List**: Main component displaying all todos
- **Todo Item**: Individual todo with actions
- **Filter Bar**: Filter by status (all/active/completed)
- **Add Todo Form**: Create new todos

---

## 5. Database Design

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      User        │       │       Todo       │
├──────────────────┤       ├──────────────────┤
│ id          PK   │───┐   │ id          PK   │
│ email            │   │   │ title            │
│ password         │   │   │ description      │
│ name             │   └──▶│ userId      FK   │
│ createdAt        │       │ completed        │
│ updatedAt        │       │ priority         │
└──────────────────┘       │ dueDate          │
                           │ createdAt        │
                           │ updatedAt        │
                           └──────────────────┘
```

### Prisma Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  todos     Todo[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Todo {
  id          String    @id @default(cuid())
  title       String
  description String?
  completed   Boolean   @default(false)
  priority    Priority  @default(MEDIUM)
  dueDate     DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

---

## 6. API Design

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Todo Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | Get all todos for user |
| POST | `/api/todos` | Create new todo |
| GET | `/api/todos/:id` | Get single todo |
| PATCH | `/api/todos/:id` | Update todo |
| DELETE | `/api/todos/:id` | Delete todo |
| PATCH | `/api/todos/:id/toggle` | Toggle completion |

### Request/Response Examples

**Create Todo**
```json
// POST /api/todos
// Request
{
  "title": "Learn TypeScript",
  "description": "Complete TypeScript course",
  "priority": "HIGH",
  "dueDate": "2024-12-31"
}

// Response
{
  "id": "clx123...",
  "title": "Learn TypeScript",
  "description": "Complete TypeScript course",
  "completed": false,
  "priority": "HIGH",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 7. Frontend Structure

### Page Routes

```
/                    → Redirect to /todos or /login
/login              → Login page
/register           → Registration page
/todos              → Main todo list (protected)
/todos/[id]         → Todo detail/edit (optional)
```

### Component Hierarchy

```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Landing/redirect
├── (auth)/
│   ├── login/page.tsx      # Login form
│   └── register/page.tsx   # Register form
├── (protected)/
│   └── todos/
│       └── page.tsx        # Main todo page
└── api/
    ├── auth/[...nextauth]/route.ts
    └── todos/
        ├── route.ts        # GET all, POST new
        └── [id]/route.ts   # GET, PATCH, DELETE single

components/
├── auth/
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
├── todos/
│   ├── TodoList.tsx
│   ├── TodoItem.tsx
│   ├── TodoForm.tsx
│   └── FilterBar.tsx
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
└── layout/
    ├── Header.tsx
    └── Footer.tsx
```

### State Management

Using Zustand for client-side state:

```typescript
interface TodoStore {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  isLoading: boolean;

  // Actions
  fetchTodos: () => Promise<void>;
  addTodo: (todo: CreateTodoInput) => Promise<void>;
  updateTodo: (id: string, data: UpdateTodoInput) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  setFilter: (filter: FilterType) => void;
}
```

---

## 8. Implementation Phases

### Phase 1: Project Setup (Foundation)
1. Initialize Next.js project with TypeScript
2. Set up Tailwind CSS
3. Configure Prisma with PostgreSQL
4. Create database schema
5. Set up project structure (folders, components)
6. Create basic UI components (Button, Input, Card)

### Phase 2: Authentication
1. Install and configure Auth.js (NextAuth)
2. Create User model in Prisma
3. Build registration page and API
4. Build login page and API
5. Implement session handling
6. Add protected route middleware
7. Create auth context/hooks

### Phase 3: Core Todo Features
1. Create Todo model in Prisma
2. Build API routes for CRUD operations
3. Create TodoList component
4. Create TodoItem component
5. Create AddTodo form
6. Implement create, read operations
7. Implement update, delete operations
8. Add toggle completion functionality

### Phase 4: Enhanced Features & Polish
1. Add filter bar (all/active/completed)
2. Add priority levels
3. Add due dates
4. Implement search (optional)
5. Add loading states and error handling
6. Add empty states
7. Responsive design fixes
8. Add optimistic updates

### Phase 5: Deployment
1. Set up Vercel project
2. Configure production database (Neon/Supabase)
3. Set up environment variables
4. Deploy and test
5. Set up custom domain (optional)

---

## 9. Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | HTML/CSS | Structure and basic styling |
| 2 | JS Basics | Logic, DOM manipulation |
| 3 | JS Architecture | Component organization, state management |
| 4 | Async JS | API calls, data fetching |
| 5 | Node vs Browser JS | Understanding server vs client code |
| 6 | HTTP and Express | REST API design (via Next.js routes) |
| 7 | Databases and Mongo | - (using Postgres instead) |
| 8 | Postgres + Prisma | Primary database with ORM |
| 9 | TypeScript | Full type safety throughout |
| 12 | React | Component-based UI |
| 13 | Tailwind | Styling |
| 14 | NextJS | Full-stack framework |

---

## 10. Folder Structure

```
todo-app/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (protected)/
│   │   │   └── todos/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── todos/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── auth.ts
│   ├── hooks/
│   ├── stores/
│   └── types/
├── public/
├── .env
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 11. Development Commands

```bash
# Create project
npx create-next-app@latest todo-app --typescript --tailwind --eslint --app

# Install dependencies
npm install prisma @prisma/client next-auth bcrypt zod react-hook-form @hookform/resolvers zustand
npm install -D @types/bcrypt

# Initialize Prisma
npx prisma init

# After schema changes
npx prisma db push
npx prisma generate

# Run development server
npm run dev

# Build for production
npm run build
```

---

## 12. Key Files to Create First

1. `prisma/schema.prisma` - Database schema
2. `src/lib/prisma.ts` - Prisma client singleton
3. `src/lib/auth.ts` - NextAuth configuration
4. `src/app/api/auth/[...nextauth]/route.ts` - Auth API
5. `src/components/ui/Button.tsx` - Base UI component
6. `src/app/(auth)/login/page.tsx` - Login page
7. `src/app/(protected)/todos/page.tsx` - Main todos page

---

## Summary

This todo app project is an excellent starting point for full-stack development. It covers essential concepts like authentication, database operations, API design, and React patterns while remaining manageable in scope. Focus on getting the MVP working first, then iterate with additional features.

**Estimated Complexity**: Beginner-Intermediate
**Core Skills**: React, Next.js, TypeScript, Prisma, Authentication
