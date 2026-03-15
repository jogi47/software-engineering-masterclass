# Domain-Driven Design Patterns Summary

Based on Eric Evans' "Domain-Driven Design: Tackling Complexity in the Heart of Software"

## Overview

Domain-Driven Design (DDD) is an approach to software development that centers the development on the core domain and domain logic. It provides patterns for both tactical (implementation) and strategic (architecture) design.

---

## Building Blocks (Tactical Design)

Core patterns for implementing the domain model.

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| **Entity** | Object with unique identity that persists over time | Objects that need tracking, can change but must remain identifiable |
| **Value Object** | Immutable object defined by its attributes | Descriptive elements without identity (Money, Address, Email) |
| **Aggregate** | Cluster of objects treated as a single unit | Enforcing consistency boundaries, transactional consistency |
| **Domain Event** | Record of something that happened in the domain | Decoupling, eventual consistency, event sourcing |
| **Domain Service** | Stateless operation that doesn't belong to an entity | Operations spanning multiple aggregates |
| **Repository** | Collection-like interface for aggregate access | Persistence abstraction, querying aggregates |
| **Factory** | Encapsulates complex object creation | Complex aggregate creation, reconstitution |
| **Module** | Grouping related domain concepts | Organizing large models, reducing coupling |

### Key Concepts

**Entity vs Value Object:**
- Entity: "Which one?" - Has identity, mutable, tracked over time
- Value Object: "What is it?" - No identity, immutable, replaceable

**Aggregate Rules:**
1. One aggregate root per aggregate
2. External references only to root
3. One transaction per aggregate
4. Eventually consistent between aggregates

---

## Supple Design

Patterns that make the model easier to change and understand.

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| **Intention-Revealing Interface** | Names describe what, not how | Always - fundamental design principle |
| **Side-Effect-Free Functions** | Operations that only compute, don't modify | Calculations, validations, queries |
| **Assertions** | State invariants and conditions | Protecting domain rules, validation |
| **Standalone Classes** | Self-contained, minimal dependencies | Reducing coupling, improving reusability |
| **Specification** | Business rules as first-class objects | Complex selection/validation criteria |

### Design Principles

- **Command-Query Separation**: Commands change state (return void), Queries return data (no side effects)
- **Closure of Operations**: Operations return same type as operands
- **Conceptual Contours**: Align design with domain concepts

---

## Strategic Design

Patterns for dealing with large systems and multiple bounded contexts.

| Pattern | Description | When to Use |
|---------|-------------|-------------|
| **Bounded Context** | Explicit boundary with unified model | Defining model scope, team boundaries |
| **Context Map** | Visualization of context relationships | Documenting integrations, planning |
| **Shared Kernel** | Shared subset of domain model | Closely collaborating teams, core concepts |
| **Customer/Supplier** | Upstream/downstream relationship | One team depends on another |
| **Conformist** | Using upstream model directly | Upstream is well-designed, speed priority |
| **Anti-Corruption Layer** | Translation layer between contexts | Protecting from legacy/external systems |
| **Open Host Service** | Well-defined API for external access | Multiple consumers, controlled access |
| **Published Language** | Shared vocabulary for integration | Cross-context communication, events |

### Context Integration Patterns

```
┌─────────────────────────────────────────────────────────┐
│                  INTEGRATION PATTERNS                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Shared Kernel ←──→ Partnership                         │
│       │                   │                             │
│       ▼                   ▼                             │
│  Customer/Supplier   Conformist                         │
│       │                   │                             │
│       ▼                   ▼                             │
│  Anti-Corruption Layer   Open Host Service              │
│       │                   │                             │
│       └────────┬──────────┘                             │
│                ▼                                        │
│        Published Language                               │
│                                                         │
│  Separate Ways (no integration)                         │
└─────────────────────────────────────────────────────────┘
```

---

## Pattern Relationships

### Building Blocks Relationships

```
Repository ──────► Aggregate Root ──────► Entity
     │                   │                   │
     │                   ▼                   ▼
     │              Value Object        Domain Event
     │                   │
     ▼                   ▼
Factory ◄────── Domain Service
```

### Strategic Patterns Flow

1. **Identify Bounded Contexts** - Define boundaries
2. **Create Context Map** - Document relationships
3. **Choose Integration Pattern** - Based on team dynamics and coupling needs
4. **Define Published Language** - Shared contracts
5. **Implement Translation Layers** - ACL, Facades, Adapters

---

## When to Use Each Pattern

### Start Simple, Add Complexity as Needed

1. **Single Context**: Use Building Blocks patterns
2. **Growing Complexity**: Add Supple Design patterns
3. **Multiple Teams/Contexts**: Add Strategic Design patterns

### Pattern Selection by Problem

| Problem | Pattern |
|---------|---------|
| Need to track objects over time | Entity |
| Descriptive, immutable concepts | Value Object |
| Enforce consistency rules | Aggregate |
| Decouple modules | Domain Event |
| Operation spans entities | Domain Service |
| Abstract persistence | Repository |
| Complex object creation | Factory |
| Protect from external systems | Anti-Corruption Layer |
| Share core concepts | Shared Kernel |
| Reusable business rules | Specification |

---

## Implementation Tips

### Value Objects
```typescript
// Prefer factory methods over constructors
const money = Money.of(100, "USD");

// Operations return new instances
const total = price.add(tax);  // price is unchanged
```

### Aggregates
```typescript
// Reference other aggregates by ID, not direct reference
class Order {
  constructor(
    readonly orderId: string,
    readonly customerId: string  // Not Customer object
  ) {}
}
```

### Repositories
```typescript
// One repository per aggregate root
interface OrderRepository {
  findById(id: OrderId): Order | null;
  save(order: Order): void;
}
```

### Domain Events
```typescript
// Name in past tense
interface OrderPlacedEvent {
  readonly orderId: string;
  readonly occurredAt: Date;
}
```

---

## References

- Evans, Eric. "Domain-Driven Design: Tackling Complexity in the Heart of Software" (2003)
- Vernon, Vaughn. "Implementing Domain-Driven Design" (2013)
- Evans, Eric. "Domain-Driven Design Reference" (2015) - Free PDF
