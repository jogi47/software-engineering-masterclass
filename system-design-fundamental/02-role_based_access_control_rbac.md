# Role-Based Access Control (RBAC)

[← Back to Index](README.md)

Imagine you are building an application with thousands of users. You have regular users, managers, support staff, and administrators. Each group needs different levels of access to different parts of the system.

Without a proper system in place, you end up with a tangled mess of conditional logic scattered throughout your codebase:

```javascript
if (user.id === 42 || user.id === 103 || user.email === 'alice@company.com') {
  // Allow access to admin panel
}
```

Every time someone joins, leaves, or changes teams, you have to hunt through the code and update access rules manually. This approach does not scale and is a security nightmare waiting to happen.

This is where **Role-Based Access Control (RBAC)** comes in.

The core idea is simple but powerful: instead of assigning permissions directly to individual users, you create roles that represent job functions, assign permissions to those roles, and then assign roles to users.

**Example:**
A "Support Agent" role might include permissions to view orders and process refunds. When someone joins the support team, you assign them that role, and they instantly get exactly the permissions they need. When they leave, you remove the role, and all access is revoked in one operation.

In this chapter, you will learn:
  * [Why direct permission assignment fails at scale](#1-why-do-we-need-rbac)
  * [The core components of RBAC and how they relate](#2-core-components-of-rbac)
  * [How permission checks work step by step](#3-how-rbac-works)
  * [Different RBAC models (flat, hierarchical, constrained)](#4-rbac-models)
  * [How RBAC compares to other access control methods](#5-rbac-vs-other-access-control-models)
  * [Database schema design for RBAC](#6-database-schema-for-rbac)
  * [Implementation best practices](#7-implementation-best-practices)
  * [Common pitfalls and how to avoid them](#9-common-pitfalls-to-avoid)


# 1. Why Do We Need RBAC?

Before diving into RBAC, let us understand what happens without it.

### The Problem with Direct Permission Assignment

When you assign permissions directly to users, you create what is called a **permission explosion**:

```
User → Permission mapping (direct assignment)

Alice → can_view_orders
Alice → can_edit_orders
Alice → can_delete_orders
Alice → can_view_customers
Alice → can_edit_customers
Bob   → can_view_orders
Bob   → can_edit_orders
Carol → can_view_orders
Carol → can_view_customers
...
```

With 1,000 users and 50 permissions, you could have up to 50,000 user-permission mappings to manage.

**Problems this creates:**

**1. Administrative Overhead**
Every new employee requires manual assignment of 10-20 permissions. Every role change means manually adding and removing dozens of permissions.

**2. Inconsistency**
Two people with the same job title end up with different permissions because someone forgot to add one. "Why can Sarah view reports but I cannot?"

**3. Audit Difficulty**
When asked "who has access to customer data?", you must scan through thousands of individual permission assignments.

**4. Security Risks**
When someone leaves, you must remember to revoke all 20 of their permissions. Miss one, and you have a security hole.

### The Solution: Indirection Through Roles

RBAC introduces a layer of indirection:

```
Without RBAC:
User ────────────────────────────────> Permission
     (thousands of direct mappings)

With RBAC:
User ───> Role ───> Permission
     (few)    (few)

Example:
Alice ───> Support Agent ───> can_view_orders
Bob   ───> Support Agent ───> can_process_refunds
Carol ───> Support Agent ───> can_view_customers
```

Now instead of managing 50,000 mappings, you manage:
- A few hundred user-role assignments
- A few hundred role-permission assignments

When someone joins the support team, one action (assigning the "Support Agent" role) gives them all the permissions they need.


# 2. Core Components of RBAC

RBAC consists of five core components that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                         RBAC Model                               │
│                                                                  │
│  ┌──────────┐      ┌──────────┐      ┌─────────────┐            │
│  │   User   │─────▶│   Role   │─────▶│ Permission  │            │
│  │ (Subject)│ has  │(Function)│ has  │  (Action)   │            │
│  └──────────┘      └──────────┘      └──────────────┘           │
│       │                                     │                    │
│       │            ┌──────────┐            │                    │
│       └───────────▶│ Session  │◀───────────┘                    │
│          activates │ (Active) │  governs                        │
│                    └──────────┘                                  │
│                          │                                       │
│                          ▼                                       │
│                    ┌──────────┐                                  │
│                    │ Resource │                                  │
│                    │ (Object) │                                  │
│                    └──────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Users (Subjects)

A user is any entity that needs to access the system. This could be:
- Human users (employees, customers)
- Service accounts (background jobs, microservices)
- External systems (third-party integrations)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  // No permissions stored here!
}
```

### Roles (Job Functions)

A role represents a job function or responsibility within the organization. Roles should be named after what the user *does*, not who they *are*.

```
Good role names:
├── OrderManager
├── SupportAgent
├── ReportViewer
└── SystemAdministrator

Bad role names:
├── Alice
├── SeniorEmployee
├── ImportantPerson
└── Level3User
```

```typescript
interface Role {
  id: string;
  name: string;
  description: string;
}
```

### Permissions (Actions)

A permission defines what action can be performed on what resource. A good permission format is `resource:action`:

```
permissions:
├── orders:read
├── orders:create
├── orders:update
├── orders:delete
├── customers:read
├── customers:update
├── reports:generate
└── system:configure
```

```typescript
interface Permission {
  id: string;
  resource: string;  // e.g., "orders"
  action: string;    // e.g., "read"
}
```

### Resources (Objects)

Resources are what you are protecting: data, features, or operations.

```
resources:
├── Orders
│   ├── Individual order records
│   └── Order management features
├── Customers
│   ├── Customer profiles
│   └── Customer communication tools
├── Reports
│   └── Analytics dashboards
└── System
    └── Configuration settings
```

### Sessions (Active Role Assignments)

A session represents the roles that are currently active for a user. This allows users with multiple roles to activate only the ones they need.

```
User: Alice
Available Roles: [Admin, Developer, Auditor]
Current Session: [Developer]  ← Only developer permissions active
```

This supports the principle of least privilege: users should operate with the minimum permissions needed for their current task.


# 3. How RBAC Works

When a user attempts an action, the system must determine whether to allow or deny it. Here is the step-by-step flow:

### Permission Check Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Check Flow                         │
│                                                                  │
│  1. User Request                                                 │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ "Alice wants to DELETE order #12345"                 │        │
│  └─────────────────────────────────────────────────────┘        │
│     │                                                            │
│     ▼                                                            │
│  2. Get User's Active Roles                                      │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Alice's roles: [SupportAgent, TeamLead]              │        │
│  └─────────────────────────────────────────────────────┘        │
│     │                                                            │
│     ▼                                                            │
│  3. Get Permissions for Each Role                                │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ SupportAgent: [orders:read, orders:update]           │        │
│  │ TeamLead: [orders:read, orders:update, team:manage]  │        │
│  └─────────────────────────────────────────────────────┘        │
│     │                                                            │
│     ▼                                                            │
│  4. Check if Required Permission Exists                          │
│     │                                                            │
│     ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Required: orders:delete                              │        │
│  │ Available: [orders:read, orders:update, team:manage] │        │
│  │ Match: NO                                            │        │
│  └─────────────────────────────────────────────────────┘        │
│     │                                                            │
│     ▼                                                            │
│  5. Decision: DENY                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Example

```typescript
class RBACService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // 1. Get user's roles
    const roles = await this.getUserRoles(userId);

    if (roles.length === 0) {
      return false;  // No roles = no permissions
    }

    // 2. Get all permissions for these roles
    const permissions = await this.getRolePermissions(roles);

    // 3. Check if the required permission exists
    const requiredPermission = `${resource}:${action}`;
    return permissions.includes(requiredPermission);
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    // Query: SELECT role_id FROM user_roles WHERE user_id = ?
    return ['support_agent', 'team_lead'];
  }

  private async getRolePermissions(roles: string[]): Promise<string[]> {
    // Query: SELECT permission FROM role_permissions WHERE role_id IN (?)
    return ['orders:read', 'orders:update', 'team:manage'];
  }
}

// Usage
const rbac = new RBACService();
const canDelete = await rbac.checkPermission('alice', 'orders', 'delete');
// Returns: false
```

### The Permission Matrix

You can visualize RBAC as a matrix:

```
                    Permissions
              ┌─────────────────────────────────────────────┐
              │ orders: │ orders: │ orders: │ reports: │ sys: │
              │  read   │ update  │ delete  │  view    │admin │
┌─────────────┼─────────┼─────────┼─────────┼──────────┼──────┤
│ Viewer      │    ✓    │         │         │    ✓     │      │
├─────────────┼─────────┼─────────┼─────────┼──────────┼──────┤
│ Support     │    ✓    │    ✓    │         │    ✓     │      │
├─────────────┼─────────┼─────────┼─────────┼──────────┼──────┤
│ Manager     │    ✓    │    ✓    │    ✓    │    ✓     │      │
├─────────────┼─────────┼─────────┼─────────┼──────────┼──────┤
│ Admin       │    ✓    │    ✓    │    ✓    │    ✓     │  ✓   │
└─────────────┴─────────┴─────────┴─────────┴──────────┴──────┘
   Roles
```


# 4. RBAC Models

The NIST (National Institute of Standards and Technology) defines four RBAC models with increasing complexity:

### RBAC0: Flat/Basic RBAC

The simplest model with users, roles, and permissions. No hierarchy, no constraints.

```
┌──────────────────────────────────────────┐
│               RBAC0 (Flat)                │
│                                          │
│  Users ────▶ Roles ────▶ Permissions     │
│                                          │
│  No hierarchy                            │
│  No constraints                          │
└──────────────────────────────────────────┘

Example:
├── Alice ──▶ Developer ──▶ code:read, code:write
├── Bob ──▶ Tester ──▶ bugs:read, bugs:write
└── Carol ──▶ Manager ──▶ reports:read
```

**When to use:** Simple applications with few roles and no overlapping permissions.

### RBAC1: Hierarchical RBAC

Adds role hierarchies where senior roles inherit permissions from junior roles.

```
┌──────────────────────────────────────────┐
│           RBAC1 (Hierarchical)            │
│                                          │
│        ┌─────────────┐                   │
│        │    Admin    │                   │
│        └──────┬──────┘                   │
│               │ inherits                 │
│        ┌──────▼──────┐                   │
│        │   Manager   │                   │
│        └──────┬──────┘                   │
│               │ inherits                 │
│        ┌──────▼──────┐                   │
│        │   Employee  │                   │
│        └─────────────┘                   │
└──────────────────────────────────────────┘

Permissions:
├── Employee: [profile:read, profile:update]
├── Manager: inherits Employee + [team:manage, reports:view]
└── Admin: inherits Manager + [system:configure, users:manage]

Result:
Admin has: profile:read, profile:update, team:manage,
           reports:view, system:configure, users:manage
```

**When to use:** Organizations with clear hierarchies where senior roles need all junior role permissions.

### RBAC2: Constrained RBAC

Adds constraints to prevent conflicts:

```
┌──────────────────────────────────────────────────────────────┐
│                  RBAC2 (Constrained)                          │
│                                                              │
│  Constraint Types:                                           │
│                                                              │
│  1. Separation of Duties (SoD)                               │
│     ├── Static SoD: User cannot have both roles              │
│     │   └── "No user can be both Requestor and Approver"     │
│     │                                                        │
│     └── Dynamic SoD: User cannot activate both in session    │
│         └── "Cannot approve your own requests"               │
│                                                              │
│  2. Cardinality Constraints                                  │
│     ├── Max users per role: "Only 2 Super Admins"            │
│     └── Max roles per user: "Max 3 roles per employee"       │
│                                                              │
│  3. Prerequisite Constraints                                 │
│     └── "Must have Employee role before Manager role"        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Separation of Duties Example:**

```typescript
// Static SoD: Prevent assignment at role assignment time
const conflictingRoles = new Map([
  ['purchaser', ['approver']],
  ['developer', ['code_reviewer']],  // For their own code
  ['accountant', ['auditor']],
]);

function canAssignRole(user: User, newRole: string): boolean {
  const conflicts = conflictingRoles.get(newRole) || [];
  const userRoles = user.roles;

  for (const conflict of conflicts) {
    if (userRoles.includes(conflict)) {
      return false;  // User already has conflicting role
    }
  }
  return true;
}
```

**When to use:** Regulated industries (finance, healthcare) requiring compliance controls.

### RBAC3: Unified RBAC

Combines RBAC1 (hierarchy) and RBAC2 (constraints):

```
┌──────────────────────────────────────────┐
│          RBAC3 (Unified)                  │
│                                          │
│  RBAC1 (Hierarchy)                       │
│       +                                  │
│  RBAC2 (Constraints)                     │
│       =                                  │
│  Full RBAC with all features             │
│                                          │
└──────────────────────────────────────────┘
```

**When to use:** Large enterprises with complex organizational structures and compliance requirements.


# 5. RBAC vs Other Access Control Models

RBAC is not the only access control model. Here is how it compares:

### Comparison Table

```
┌────────────┬─────────────────────────────────────────────────────────────┐
│   Model    │                       Description                           │
├────────────┼─────────────────────────────────────────────────────────────┤
│    DAC     │ Resource owner decides who has access                       │
│            │ Example: Unix file permissions (chmod)                      │
├────────────┼─────────────────────────────────────────────────────────────┤
│    MAC     │ Central authority labels resources and users                │
│            │ Example: Military classifications (Top Secret, Secret)      │
├────────────┼─────────────────────────────────────────────────────────────┤
│   RBAC     │ Access based on assigned roles                              │
│            │ Example: Support agents can view orders                     │
├────────────┼─────────────────────────────────────────────────────────────┤
│   ABAC     │ Access based on attributes of user, resource, environment   │
│            │ Example: US employees can access during business hours      │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### DAC (Discretionary Access Control)

The resource owner controls access:

```
┌─────────────────────────────────────────────┐
│                    DAC                       │
│                                             │
│  Owner creates resource                     │
│       │                                     │
│       ▼                                     │
│  Owner grants access to others              │
│       │                                     │
│       ▼                                     │
│  Recipients can re-share (discretionary)    │
└─────────────────────────────────────────────┘

Example: Google Docs sharing
- Alice creates a document
- Alice shares with Bob (edit access)
- Bob can share with Carol (if allowed)
```

**Pros:** Flexible, user-controlled
**Cons:** Hard to enforce policies, access can spread uncontrollably
**Use when:** Collaborative environments, file sharing systems

### MAC (Mandatory Access Control)

Central authority assigns security labels:

```
┌─────────────────────────────────────────────┐
│                    MAC                       │
│                                             │
│  Security Levels:                           │
│  ┌───────────────┐                          │
│  │ TOP SECRET    │ ← Only cleared users     │
│  ├───────────────┤                          │
│  │ SECRET        │                          │
│  ├───────────────┤                          │
│  │ CONFIDENTIAL  │                          │
│  ├───────────────┤                          │
│  │ UNCLASSIFIED  │ ← All users              │
│  └───────────────┘                          │
│                                             │
│  Rule: User can only access their level     │
│        and below (no read up, no write down)│
└─────────────────────────────────────────────┘
```

**Pros:** Very secure, prevents information leakage
**Cons:** Rigid, complex to administer
**Use when:** Military, government, high-security environments

### ABAC (Attribute-Based Access Control)

Access decisions based on attributes and policies:

```
┌─────────────────────────────────────────────┐
│                    ABAC                      │
│                                             │
│  Policy: Allow IF                           │
│    user.department == "Engineering" AND     │
│    user.location == "US" AND                │
│    resource.classification != "restricted"  │
│    AND time.current BETWEEN 9AM and 6PM     │
│                                             │
│  Attributes:                                │
│  ├── User: department, location, clearance  │
│  ├── Resource: type, classification, owner  │
│  └── Environment: time, IP address, device  │
└─────────────────────────────────────────────┘
```

**Pros:** Very flexible, fine-grained control
**Cons:** Complex policies, harder to audit
**Use when:** Complex access rules based on multiple factors

### When to Use Each

```
┌────────────┬──────────────────────────────────────────────────────┐
│   Model    │                    Best For                          │
├────────────┼──────────────────────────────────────────────────────┤
│    DAC     │ File sharing, collaborative tools, user-owned data   │
├────────────┼──────────────────────────────────────────────────────┤
│    MAC     │ Military, classified data, strict hierarchies        │
├────────────┼──────────────────────────────────────────────────────┤
│   RBAC     │ Most enterprise applications, clear job functions    │
├────────────┼──────────────────────────────────────────────────────┤
│   ABAC     │ Complex rules, multi-tenant SaaS, healthcare         │
├────────────┼──────────────────────────────────────────────────────┤
│ RBAC+ABAC  │ Start with RBAC for structure, add ABAC for context  │
└────────────┴──────────────────────────────────────────────────────┘
```

**Practical advice:** Start with RBAC when permissions map cleanly to job functions. Add ABAC-style rules when RBAC alone is insufficient (for example, "users can only access records in their region").


# 6. Database Schema for RBAC

Here is one practical relational schema for implementing RBAC:

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(resource, action)
);

-- User-Role assignments (many-to-many)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Role-Permission assignments (many-to-many)
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### Schema Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│    users    │       │    roles    │       │   permissions   │
├─────────────┤       ├─────────────┤       ├─────────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)         │
│ email       │       │ name        │       │ resource        │
│ name        │       │ description │       │ action          │
│ created_at  │       │ created_at  │       │ description     │
└──────┬──────┘       └──────┬──────┘       └────────┬────────┘
       │                     │                       │
       │    ┌────────────────┴────────┐              │
       │    │                         │              │
       ▼    ▼                         ▼              ▼
┌──────────────────┐         ┌───────────────────────────┐
│   user_roles     │         │     role_permissions      │
├──────────────────┤         ├───────────────────────────┤
│ user_id (FK)     │         │ role_id (FK)              │
│ role_id (FK)     │         │ permission_id (FK)        │
│ assigned_at      │         └───────────────────────────┘
│ assigned_by (FK) │
└──────────────────┘
```

### Adding Role Hierarchy (RBAC1)

```sql
-- Add parent role reference for hierarchy
ALTER TABLE roles ADD COLUMN parent_role_id UUID REFERENCES roles(id);

-- Example hierarchy
INSERT INTO roles (id, name, parent_role_id) VALUES
  ('emp-uuid', 'Employee', NULL),
  ('mgr-uuid', 'Manager', 'emp-uuid'),      -- inherits from Employee
  ('adm-uuid', 'Admin', 'mgr-uuid');        -- inherits from Manager
```

### Common Queries

**Check if user has permission:**

```sql
-- Direct role permissions only (RBAC0)
SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1           -- user_id
      AND p.resource = $2           -- 'orders'
      AND p.action = $3             -- 'delete'
) AS has_permission;
```

**Get all permissions for a user:**

```sql
SELECT DISTINCT p.resource, p.action
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = $1;
```

**Get all users with a specific permission:**

```sql
SELECT DISTINCT u.id, u.email, u.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.resource = $1 AND p.action = $2;
```

**Hierarchical permissions query (RBAC1):**

```sql
-- Get all permissions including inherited ones
WITH RECURSIVE role_hierarchy AS (
    -- Base: roles directly assigned to user
    SELECT r.id, r.parent_role_id
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1

    UNION

    -- Recursive: parent roles in hierarchy
    SELECT r.id, r.parent_role_id
    FROM roles r
    JOIN role_hierarchy rh ON r.id = rh.parent_role_id
)
SELECT DISTINCT p.resource, p.action
FROM role_hierarchy rh
JOIN role_permissions rp ON rh.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;
```

### Indexes for Performance

```sql
-- Essential indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
```


# 7. Implementation Best Practices

### 1. Principle of Least Privilege

Users should have only the permissions they need, nothing more.

```
Bad:
├── All engineers get Admin role "just in case"
└── Temporary elevated access becomes permanent

Good:
├── Engineers get Developer role by default
├── Specific engineers get DeploymentManager when needed
└── Elevated access has expiration dates
```

```typescript
interface RoleAssignment {
  userId: string;
  roleId: string;
  expiresAt?: Date;  // Optional expiration
  reason: string;    // Why was this assigned?
}
```

### 2. Role Naming Conventions

Name roles after job functions, not people or departments:

```
Bad:                          Good:
├── JohnSmithRole             ├── OrderProcessor
├── EngineeringTeam           ├── CodeReviewer
├── Level2Access              ├── BillingManager
└── PowerUser                 └── ReadOnlyAuditor
```

### 3. Permission Granularity

Find the right balance. Too coarse loses control. Too fine becomes unmanageable.

```
Too coarse:
└── admin:all              ← What does this even mean?

Too fine:
├── order:12345:read       ← Permission per record?
├── order:12346:read
└── order:12347:read

Just right:
├── orders:read
├── orders:create
├── orders:update
└── orders:delete
```

**Use resource-level permissions, not record-level.** For record-level access control, combine RBAC with ownership checks:

```typescript
async function canAccessOrder(user: User, orderId: string): Promise<boolean> {
  // RBAC check: can user access orders at all?
  const hasPermission = await rbac.checkPermission(user.id, 'orders', 'read');
  if (!hasPermission) return false;

  // Ownership check: is this their order or their team's order?
  const order = await orderRepo.findById(orderId);
  return order.userId === user.id || order.teamId === user.teamId;
}
```

### 4. Caching Strategies

Permission checks happen frequently. Cache aggressively.

```typescript
class CachedRBACService {
  private cache: Map<string, { permissions: string[], expiresAt: number }>;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  async getUserPermissions(userId: string): Promise<string[]> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const permissions = await this.loadPermissionsFromDB(userId);
    this.cache.set(userId, {
      permissions,
      expiresAt: Date.now() + this.cacheTTL
    });
    return permissions;
  }

  invalidateUser(userId: string): void {
    this.cache.delete(userId);
  }

  invalidateRole(roleId: string): void {
    // When role changes, invalidate all users with that role
    // This requires tracking role→user mappings or clearing entire cache
    this.cache.clear();
  }
}
```

**Cache invalidation triggers:**
- User role assignment/removal
- Role permission changes
- User logout/session end

### 5. Audit Logging

Log all permission-related events:

```typescript
interface AuditLog {
  timestamp: Date;
  actorId: string;         // Who performed the action
  action: string;          // What they did
  targetType: string;      // user, role, permission
  targetId: string;        // ID of target
  details: object;         // Additional context
  ipAddress: string;
  userAgent: string;
}

// Log examples:
// { action: 'ROLE_ASSIGNED', targetType: 'user', details: { roleId: 'admin' } }
// { action: 'PERMISSION_CHECK_DENIED', targetType: 'resource', details: { resource: 'orders', action: 'delete' } }
// { action: 'ROLE_PERMISSION_ADDED', targetType: 'role', details: { permissionId: 'reports:export' } }
```

### 6. Permission Check Placement

Check permissions at the right layer:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layers                          │
│                                                                  │
│  ┌─────────────────┐                                            │
│  │   API Gateway   │  ← Coarse checks (is user authenticated?)  │
│  └────────┬────────┘                                            │
│           │                                                      │
│  ┌────────▼────────┐                                            │
│  │   Controllers   │  ← Route-level checks (can access orders?) │
│  └────────┬────────┘                                            │
│           │                                                      │
│  ┌────────▼────────┐                                            │
│  │    Services     │  ← Fine-grained checks (can delete THIS?)  │
│  └────────┬────────┘                                            │
│           │                                                      │
│  ┌────────▼────────┐                                            │
│  │   Repository    │  ← Never trust, always filtered            │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// Controller: Route-level check
@Get('/orders')
@RequirePermission('orders:read')  // Decorator checks permission
async getOrders(@User() user: User) {
  return this.orderService.getOrdersForUser(user);
}

// Service: Business logic check
async deleteOrder(user: User, orderId: string): Promise<void> {
  const order = await this.orderRepo.findById(orderId);

  // Can only delete own orders OR must have orders:delete permission
  if (order.userId !== user.id) {
    const canDelete = await this.rbac.check(user.id, 'orders', 'delete');
    if (!canDelete) {
      throw new ForbiddenException('Cannot delete orders you do not own');
    }
  }

  await this.orderRepo.delete(orderId);
}
```


# 8. Real-World RBAC Examples

### AWS IAM

AWS Identity and Access Management is broader than textbook RBAC. It includes role-based concepts, but in practice it is a policy-based IAM system that can also support attribute-based controls:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

```
AWS IAM Structure:
├── Users/Groups ← IAM users and groups
├── Roles ← IAM roles (for services, cross-account)
├── Policies ← Permission definitions (JSON documents)
└── Resources ← S3 buckets, EC2 instances, etc.

Roles can be assumed by:
├── IAM users (for elevated access)
├── AWS services (EC2, Lambda)
└── External users (federated access)
```

### Kubernetes RBAC

Kubernetes uses RBAC to control access to cluster resources:

```yaml
# Role: defines what permissions exist
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]

---
# RoleBinding: assigns role to users/groups
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```
Kubernetes RBAC concepts:
├── Role/ClusterRole ← Permission definitions
├── RoleBinding/ClusterRoleBinding ← Assigns roles to subjects
├── Subjects ← Users, Groups, ServiceAccounts
└── Resources ← Pods, Services, Deployments, etc.
```

### PostgreSQL Roles

PostgreSQL has built-in role-based access:

```sql
-- Create roles
CREATE ROLE readonly;
CREATE ROLE readwrite;
CREATE ROLE admin;

-- Grant permissions to roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;

-- Create users with roles
CREATE USER alice WITH PASSWORD 'secret';
CREATE USER bob WITH PASSWORD 'secret';

-- Assign roles to users
GRANT readonly TO alice;
GRANT readwrite TO bob;
GRANT admin TO bob;  -- Bob has both roles
```

```
PostgreSQL role hierarchy:
├── Superuser (postgres) ← Full access
├── admin ← All privileges on tables
├── readwrite ← CRUD operations
└── readonly ← SELECT only
```


# 9. Common Pitfalls to Avoid

### 1. Role Explosion

Creating too many roles defeats the purpose of RBAC.

```
Bad: One role per person
├── AliceRole (1 user)
├── BobRole (1 user)
├── CarolRole (1 user)
└── ... 500 more roles

You have recreated direct permission assignment with extra steps.

Good: Roles based on job functions
├── SupportAgent (50 users)
├── SupportLead (5 users)
├── Developer (30 users)
└── Admin (3 users)
```

**Prevention:**
- Roles should have multiple users
- If a role has only one user, question whether it should exist
- Review role count vs user count regularly

### 2. Over-Permissive Roles

Giving roles more permissions than needed "for convenience":

```
Bad:
└── Developer role has production database write access
    "Just in case they need to fix something"

Good:
├── Developer role has dev/staging access
└── DatabaseAdmin role (separate) has production access
    Requires explicit assignment and approval
```

**Prevention:**
- Start with minimal permissions, add as needed
- Require justification for each permission
- Regular access reviews

### 3. Hardcoded Role Checks

Checking role names directly in code instead of permissions:

```typescript
// Bad: Tightly coupled to role names
if (user.roles.includes('Admin') || user.roles.includes('SuperUser')) {
  allowDelete();
}
// What if you rename a role? What if a new role needs this?

// Good: Check the permission, not the role
if (await rbac.checkPermission(user.id, 'orders', 'delete')) {
  allowDelete();
}
// Roles can change without code changes
```

**Why this matters:**
- Role names might change
- New roles might need the same permission
- Permission-based checks are more maintainable

### 4. Missing Audit Trails

Not logging who did what and when:

```
Questions you cannot answer without audit logs:
├── "Who gave Bob admin access?"
├── "When did this permission change?"
├── "What access did Alice have last month?"
└── "Who accessed customer data yesterday?"
```

**Prevention:**
- Log all role assignments and removals
- Log all permission checks (especially denials)
- Include who, what, when, and why
- Retain logs for compliance period

### 5. No Access Reviews

Set it and forget it leads to permission creep:

```
Day 1: Alice joins as intern, gets InternRole
Day 90: Alice becomes full-time, gets DeveloperRole (InternRole not removed)
Day 365: Alice moves to security team, gets SecurityRole (previous roles not removed)
Day 730: Alice leaves the company with 5 roles active
```

**Prevention:**
- Quarterly access reviews
- Automatic expiration for temporary roles
- Manager approval for role assignments
- Offboarding checklist includes role removal


# 10. Summary

**RBAC simplifies access control through indirection:**
- Users are assigned roles (job functions)
- Roles are assigned permissions (actions on resources)
- Permission checks aggregate permissions from all user roles

**Key concepts:**
- **RBAC0:** Basic flat model (users → roles → permissions)
- **RBAC1:** Adds role hierarchy (senior roles inherit from junior)
- **RBAC2:** Adds constraints (separation of duties, cardinality)
- **RBAC3:** Combines hierarchy and constraints

**When to use RBAC:**
- Most enterprise applications with clear job functions
- When you need to manage access for many users
- When audit and compliance are important
- Start with RBAC, add ABAC only when context-based rules are needed

**Implementation checklist:**

```
Design:
  □ Define roles based on job functions, not people
  □ Use resource:action format for permissions
  □ Keep permission granularity at resource level
  □ Plan for role hierarchy if organization has one

Database:
  □ Users, roles, permissions tables
  □ Many-to-many junction tables (user_roles, role_permissions)
  □ Add indexes on foreign keys
  □ Consider role hierarchy support

Implementation:
  □ Check permissions, not role names
  □ Cache permission lookups with proper invalidation
  □ Check at appropriate layer (controller, service)
  □ Combine RBAC with ownership for record-level access

Operations:
  □ Log all permission changes and checks
  □ Implement regular access reviews
  □ Set up alerting for suspicious patterns
  □ Document role purposes and permissions

Avoid:
  □ Role explosion (too many roles)
  □ Over-permissive roles
  □ Hardcoded role name checks
  □ Missing audit trails
  □ Stale permissions from role creep
```
