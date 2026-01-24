# DSA Playground

> A comprehensive TypeScript knowledge base for Data Structures, Algorithms, Design Patterns, System Design, and Database Internals.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![Patterns](https://img.shields.io/badge/Patterns-112-purple?style=flat-square)
![Problems](https://img.shields.io/badge/Problems-88-orange?style=flat-square)
![System Design](https://img.shields.io/badge/System%20Design-21-blue?style=flat-square)
![LLD Interview](https://img.shields.io/badge/LLD%20Interview-3-green?style=flat-square)

---

## Overview

| Category | Count | Description |
|----------|-------|-------------|
| **Design Patterns** | 112 | Core GoF + PoEAA + DDD + Refactoring patterns |
| **DSA Problems** | 88 | Data structures, algorithms, and LeetCode-style problems |
| **System Design** | 16 | Real-world system architecture documents |
| **System Design Interview** | 2 | Interview-focused system design problems |
| **LLD Interview** | 3 | Low-level design interview problems |
| **System Design Fundamentals** | 2 | Core concepts (SSL/TLS, RBAC) |
| **DDIA Notes** | 12 | Designing Data-Intensive Applications book notes |
| **TypeScript** | Strict | Full type safety with comprehensive documentation |

---

## Table of Contents

- [Directory Structure](#directory-structure)
- [Design Patterns](#design-patterns)
  - [Core Patterns (GoF)](#core-patterns-gof)
  - [PoEAA Patterns](#poeaa-patterns)
  - [DDD Patterns](#ddd-patterns)
  - [Refactoring Patterns](#refactoring-patterns)
- [DSA Problems](#dsa-problems)
  - [Core Data Structures & Algorithms](#core-data-structures--algorithms)
  - [Easy Problems](#easy-problems)
  - [Medium Problems](#medium-problems)
  - [Hard Problems](#hard-problems)
- [System Design](#system-design)
- [System Design Interview](#system-design-interview)
- [Low-Level Design Interview](#low-level-design-interview)
- [System Design Fundamentals](#system-design-fundamentals)
- [Database & Distributed Systems](#database--distributed-systems)
  - [DDIA - Designing Data-Intensive Applications](#ddia---designing-data-intensive-applications)
- [Getting Started](#getting-started)

---

## Directory Structure

```
dsa-playground/
├── patterns/
│   ├── core/                    # 10 fundamental GoF patterns
│   ├── poeaa/                   # 20 enterprise architecture patterns
│   │   ├── base/
│   │   ├── data-source/
│   │   ├── distribution/
│   │   ├── domain-logic/
│   │   ├── object-relational/
│   │   └── web-presentation/
│   ├── ddd/                     # 21 domain-driven design patterns
│   │   ├── building-blocks/
│   │   ├── strategic/
│   │   └── supple-design/
│   └── refactoring/             # 61 refactoring patterns
│       ├── basic/
│       ├── encapsulation/
│       ├── moving-features/
│       ├── organizing-data/
│       ├── simplifying-conditional/
│       ├── refactoring-apis/
│       └── inheritance/
├── problems/
│   ├── core/                    # 12 data structures & sorting algorithms
│   ├── easy/                    # 18 easy difficulty problems
│   ├── medium/                  # 47 medium difficulty problems
│   └── hard/                    # 11 hard difficulty problems
├── system-design/               # 16 system design documents
├── system-design-interview/     # 2 system design interview problems
├── low-level-design-interview/  # 3 LLD interview problems
├── system-design-fundamental/   # 2 system design concepts
├── database/
│   └── ddia/                    # 12 chapters of DDIA notes
│       ├── foundations/
│       ├── distributed-data/
│       └── derived-data/
└── language-runtime/
    └── python/                  # Python language notes
```

---

## Design Patterns

### Core Patterns (GoF)

10 fundamental design patterns from the Gang of Four book.

| # | Pattern | Category | File | Description |
|---|---------|----------|------|-------------|
| 01 | **Factory Method** | Creational | [01-factory-method.ts](patterns/core/01-factory-method.ts) | Object creation without specifying exact class |
| 02 | **Singleton** | Creational | [02-singleton.ts](patterns/core/02-singleton.ts) | Single instance with global access point |
| 03 | **Builder** | Creational | [03-builder.ts](patterns/core/03-builder.ts) | Step-by-step complex object construction |
| 04 | **Prototype** | Creational | [04-prototype.ts](patterns/core/04-prototype.ts) | Clone existing objects without coupling |
| 05 | **Adapter** | Structural | [05-adapter.ts](patterns/core/05-adapter.ts) | Bridge incompatible interfaces |
| 06 | **Decorator** | Structural | [06-decorator.ts](patterns/core/06-decorator.ts) | Add behavior dynamically to objects |
| 07 | **Facade** | Structural | [07-facade.ts](patterns/core/07-facade.ts) | Simplified interface to complex subsystem |
| 08 | **Strategy** | Behavioral | [08-strategy.ts](patterns/core/08-strategy.ts) | Interchangeable algorithm families |
| 09 | **Observer** | Behavioral | [09-observer.ts](patterns/core/09-observer.ts) | Subscription-based event notification |
| 10 | **State** | Behavioral | [10-state.ts](patterns/core/10-state.ts) | Behavior changes based on internal state |

---

### PoEAA Patterns

20 patterns from Martin Fowler's "Patterns of Enterprise Application Architecture".

#### Domain Logic Patterns (4)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Transaction Script** | [01-transaction-script.ts](patterns/poeaa/domain-logic/01-transaction-script.ts) | Organizes business logic by procedures |
| 02 | **Table Module** | [02-table-module.ts](patterns/poeaa/domain-logic/02-table-module.ts) | Single instance handling logic for a table |
| 03 | **Domain Model** | [03-domain-model.ts](patterns/poeaa/domain-logic/03-domain-model.ts) | Object model incorporating behavior and data |
| 04 | **Service Layer** | [04-service-layer.ts](patterns/poeaa/domain-logic/04-service-layer.ts) | Defines application boundary with operations |

#### Data Source Patterns (4)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Table Data Gateway** | [01-table-data-gateway.ts](patterns/poeaa/data-source/01-table-data-gateway.ts) | Gateway to a database table |
| 02 | **Row Data Gateway** | [02-row-data-gateway.ts](patterns/poeaa/data-source/02-row-data-gateway.ts) | Gateway to a single record |
| 03 | **Active Record** | [03-active-record.ts](patterns/poeaa/data-source/03-active-record.ts) | Object wrapping a row with database access |
| 04 | **Data Mapper** | [04-data-mapper.ts](patterns/poeaa/data-source/04-data-mapper.ts) | Layer separating domain objects from database |

#### Object-Relational Patterns (4)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Identity Map** | [01-identity-map.ts](patterns/poeaa/object-relational/01-identity-map.ts) | Ensures each object loaded only once |
| 02 | **Lazy Load** | [02-lazy-load.ts](patterns/poeaa/object-relational/02-lazy-load.ts) | Defers loading of object data until needed |
| 03 | **Unit of Work** | [03-unit-of-work.ts](patterns/poeaa/object-relational/03-unit-of-work.ts) | Maintains list of objects affected by transaction |
| 04 | **Repository** | [04-repository.ts](patterns/poeaa/object-relational/04-repository.ts) | Collection-like interface for domain objects |

#### Web Presentation Patterns (3)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Page Controller** | [01-page-controller.ts](patterns/poeaa/web-presentation/01-page-controller.ts) | Controller for each page/action |
| 02 | **Front Controller** | [02-front-controller.ts](patterns/poeaa/web-presentation/02-front-controller.ts) | Single handler for all requests |
| 03 | **MVC** | [03-mvc.ts](patterns/poeaa/web-presentation/03-mvc.ts) | Model-View-Controller separation |

#### Distribution Patterns (2)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **DTO** | [01-dto.ts](patterns/poeaa/distribution/01-dto.ts) | Data transfer between processes |
| 02 | **Remote Facade** | [02-remote-facade.ts](patterns/poeaa/distribution/02-remote-facade.ts) | Coarse-grained facade for remote access |

#### Base Patterns (3)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Gateway** | [01-gateway.ts](patterns/poeaa/base/01-gateway.ts) | Encapsulates access to external system |
| 02 | **Registry** | [02-registry.ts](patterns/poeaa/base/02-registry.ts) | Well-known object for finding services |
| 03 | **Value Object** | [03-value-object.ts](patterns/poeaa/base/03-value-object.ts) | Immutable object defined by its attributes |

---

### DDD Patterns

21 patterns from Eric Evans' "Domain-Driven Design" book.

#### Building Blocks (8)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Entity** | [01-entity.ts](patterns/ddd/building-blocks/01-entity.ts) | Object defined by identity, not attributes |
| 02 | **Value Object** | [02-value-object.ts](patterns/ddd/building-blocks/02-value-object.ts) | Immutable object defined by attributes |
| 03 | **Aggregate** | [03-aggregate.ts](patterns/ddd/building-blocks/03-aggregate.ts) | Cluster of objects with consistency boundary |
| 04 | **Domain Event** | [04-domain-event.ts](patterns/ddd/building-blocks/04-domain-event.ts) | Record of something that happened |
| 05 | **Domain Service** | [05-domain-service.ts](patterns/ddd/building-blocks/05-domain-service.ts) | Stateless operations on domain concepts |
| 06 | **Repository** | [06-repository.ts](patterns/ddd/building-blocks/06-repository.ts) | Collection-like interface for aggregates |
| 07 | **Factory** | [07-factory.ts](patterns/ddd/building-blocks/07-factory.ts) | Encapsulates complex object creation |
| 08 | **Module** | [08-module.ts](patterns/ddd/building-blocks/08-module.ts) | Grouping related domain concepts |

#### Strategic Design (8)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Bounded Context** | [01-bounded-context.ts](patterns/ddd/strategic/01-bounded-context.ts) | Explicit boundary with unified model |
| 02 | **Context Map** | [02-context-map.ts](patterns/ddd/strategic/02-context-map.ts) | Visualization of context relationships |
| 03 | **Shared Kernel** | [03-shared-kernel.ts](patterns/ddd/strategic/03-shared-kernel.ts) | Shared subset between contexts |
| 04 | **Customer/Supplier** | [04-customer-supplier.ts](patterns/ddd/strategic/04-customer-supplier.ts) | Upstream/downstream relationship |
| 05 | **Conformist** | [05-conformist.ts](patterns/ddd/strategic/05-conformist.ts) | Following upstream model as-is |
| 06 | **Anti-Corruption Layer** | [06-anticorruption-layer.ts](patterns/ddd/strategic/06-anticorruption-layer.ts) | Translation between contexts |
| 07 | **Open Host Service** | [07-open-host-service.ts](patterns/ddd/strategic/07-open-host-service.ts) | Protocol/API for external access |
| 08 | **Published Language** | [08-published-language.ts](patterns/ddd/strategic/08-published-language.ts) | Well-documented shared language |

#### Supple Design (5)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Intention-Revealing Interface** | [01-intention-revealing-interface.ts](patterns/ddd/supple-design/01-intention-revealing-interface.ts) | Names that express intent |
| 02 | **Side-Effect-Free Functions** | [02-side-effect-free-functions.ts](patterns/ddd/supple-design/02-side-effect-free-functions.ts) | Pure functions in domain |
| 03 | **Assertions** | [03-assertions.ts](patterns/ddd/supple-design/03-assertions.ts) | Post-conditions and invariants |
| 04 | **Standalone Classes** | [04-standalone-classes.ts](patterns/ddd/supple-design/04-standalone-classes.ts) | Self-contained, low dependency |
| 05 | **Specification** | [05-specification.ts](patterns/ddd/supple-design/05-specification.ts) | Business rules as objects |

---

### Refactoring Patterns

61 patterns from Martin Fowler's "Refactoring: Improving the Design of Existing Code" (2nd Edition).

#### Basic Refactorings (11)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Extract Function** | [01-extract-function.ts](patterns/refactoring/basic/01-extract-function.ts) | Create a new function from code fragment |
| 02 | **Inline Function** | [02-inline-function.ts](patterns/refactoring/basic/02-inline-function.ts) | Replace function call with function body |
| 03 | **Extract Variable** | [03-extract-variable.ts](patterns/refactoring/basic/03-extract-variable.ts) | Replace expression with named variable |
| 04 | **Inline Variable** | [04-inline-variable.ts](patterns/refactoring/basic/04-inline-variable.ts) | Replace variable with its value |
| 05 | **Change Function Declaration** | [05-change-function-declaration.ts](patterns/refactoring/basic/05-change-function-declaration.ts) | Rename function or change parameters |
| 06 | **Encapsulate Variable** | [06-encapsulate-variable.ts](patterns/refactoring/basic/06-encapsulate-variable.ts) | Wrap variable access in functions |
| 07 | **Rename Variable** | [07-rename-variable.ts](patterns/refactoring/basic/07-rename-variable.ts) | Give variable a clearer name |
| 08 | **Introduce Parameter Object** | [08-introduce-parameter-object.ts](patterns/refactoring/basic/08-introduce-parameter-object.ts) | Replace related parameters with object |
| 09 | **Combine Functions into Class** | [09-combine-functions-into-class.ts](patterns/refactoring/basic/09-combine-functions-into-class.ts) | Group functions operating on same data |
| 10 | **Combine Functions into Transform** | [10-combine-functions-into-transform.ts](patterns/refactoring/basic/10-combine-functions-into-transform.ts) | Create transformation function for data |
| 11 | **Split Phase** | [11-split-phase.ts](patterns/refactoring/basic/11-split-phase.ts) | Separate code into distinct phases |

#### Encapsulation (9)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Encapsulate Record** | [01-encapsulate-record.ts](patterns/refactoring/encapsulation/01-encapsulate-record.ts) | Replace record with class |
| 02 | **Encapsulate Collection** | [02-encapsulate-collection.ts](patterns/refactoring/encapsulation/02-encapsulate-collection.ts) | Return copy, not reference |
| 03 | **Replace Primitive with Object** | [03-replace-primitive-with-object.ts](patterns/refactoring/encapsulation/03-replace-primitive-with-object.ts) | Wrap primitive in meaningful class |
| 04 | **Replace Temp with Query** | [04-replace-temp-with-query.ts](patterns/refactoring/encapsulation/04-replace-temp-with-query.ts) | Extract temp calculation to method |
| 05 | **Extract Class** | [05-extract-class.ts](patterns/refactoring/encapsulation/05-extract-class.ts) | Split class with multiple responsibilities |
| 06 | **Inline Class** | [06-inline-class.ts](patterns/refactoring/encapsulation/06-inline-class.ts) | Merge class with insufficient behavior |
| 07 | **Hide Delegate** | [07-hide-delegate.ts](patterns/refactoring/encapsulation/07-hide-delegate.ts) | Remove dependency on delegate's interface |
| 08 | **Remove Middle Man** | [08-remove-middle-man.ts](patterns/refactoring/encapsulation/08-remove-middle-man.ts) | Let clients call delegate directly |
| 09 | **Substitute Algorithm** | [09-substitute-algorithm.ts](patterns/refactoring/encapsulation/09-substitute-algorithm.ts) | Replace algorithm with clearer one |

#### Moving Features (9)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Move Function** | [01-move-function.ts](patterns/refactoring/moving-features/01-move-function.ts) | Move function to better context |
| 02 | **Move Field** | [02-move-field.ts](patterns/refactoring/moving-features/02-move-field.ts) | Move field to class that uses it more |
| 03 | **Move Statements into Function** | [03-move-statements-into-function.ts](patterns/refactoring/moving-features/03-move-statements-into-function.ts) | Move statements into called function |
| 04 | **Move Statements to Callers** | [04-move-statements-to-callers.ts](patterns/refactoring/moving-features/04-move-statements-to-callers.ts) | Move statements out to callers |
| 05 | **Replace Inline Code with Function Call** | [05-replace-inline-code-with-function-call.ts](patterns/refactoring/moving-features/05-replace-inline-code-with-function-call.ts) | Replace code with existing function |
| 06 | **Slide Statements** | [06-slide-statements.ts](patterns/refactoring/moving-features/06-slide-statements.ts) | Move related code together |
| 07 | **Split Loop** | [07-split-loop.ts](patterns/refactoring/moving-features/07-split-loop.ts) | Separate loops that do multiple things |
| 08 | **Replace Loop with Pipeline** | [08-replace-loop-with-pipeline.ts](patterns/refactoring/moving-features/08-replace-loop-with-pipeline.ts) | Use collection pipeline operations |
| 09 | **Remove Dead Code** | [09-remove-dead-code.ts](patterns/refactoring/moving-features/09-remove-dead-code.ts) | Delete unreachable or unused code |

#### Organizing Data (5)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Split Variable** | [01-split-variable.ts](patterns/refactoring/organizing-data/01-split-variable.ts) | Create separate variable for each purpose |
| 02 | **Rename Field** | [02-rename-field.ts](patterns/refactoring/organizing-data/02-rename-field.ts) | Give field a clearer name |
| 03 | **Replace Derived Variable with Query** | [03-replace-derived-variable-with-query.ts](patterns/refactoring/organizing-data/03-replace-derived-variable-with-query.ts) | Replace stored calculation with method |
| 04 | **Change Reference to Value** | [04-change-reference-to-value.ts](patterns/refactoring/organizing-data/04-change-reference-to-value.ts) | Make object immutable value object |
| 05 | **Change Value to Reference** | [05-change-value-to-reference.ts](patterns/refactoring/organizing-data/05-change-value-to-reference.ts) | Share single instance across system |

#### Simplifying Conditional Logic (6)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Decompose Conditional** | [01-decompose-conditional.ts](patterns/refactoring/simplifying-conditional/01-decompose-conditional.ts) | Extract condition and branches to functions |
| 02 | **Consolidate Conditional Expression** | [02-consolidate-conditional-expression.ts](patterns/refactoring/simplifying-conditional/02-consolidate-conditional-expression.ts) | Combine related conditions |
| 03 | **Replace Nested Conditional with Guard Clauses** | [03-replace-nested-conditional-with-guard-clauses.ts](patterns/refactoring/simplifying-conditional/03-replace-nested-conditional-with-guard-clauses.ts) | Use guard clauses for special cases |
| 04 | **Replace Conditional with Polymorphism** | [04-replace-conditional-with-polymorphism.ts](patterns/refactoring/simplifying-conditional/04-replace-conditional-with-polymorphism.ts) | Use polymorphism instead of conditionals |
| 05 | **Introduce Special Case** | [05-introduce-special-case.ts](patterns/refactoring/simplifying-conditional/05-introduce-special-case.ts) | Handle special case with dedicated class |
| 06 | **Introduce Assertion** | [06-introduce-assertion.ts](patterns/refactoring/simplifying-conditional/06-introduce-assertion.ts) | Make assumptions explicit with assertions |

#### Refactoring APIs (10)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Separate Query from Modifier** | [01-separate-query-from-modifier.ts](patterns/refactoring/refactoring-apis/01-separate-query-from-modifier.ts) | Split function that queries and modifies |
| 02 | **Parameterize Function** | [02-parameterize-function.ts](patterns/refactoring/refactoring-apis/02-parameterize-function.ts) | Add parameter to generalize function |
| 03 | **Remove Flag Argument** | [03-remove-flag-argument.ts](patterns/refactoring/refactoring-apis/03-remove-flag-argument.ts) | Replace flag with separate functions |
| 04 | **Preserve Whole Object** | [04-preserve-whole-object.ts](patterns/refactoring/refactoring-apis/04-preserve-whole-object.ts) | Pass whole object instead of fields |
| 05 | **Replace Parameter with Query** | [05-replace-parameter-with-query.ts](patterns/refactoring/refactoring-apis/05-replace-parameter-with-query.ts) | Remove parameter obtainable from other data |
| 06 | **Replace Query with Parameter** | [06-replace-query-with-parameter.ts](patterns/refactoring/refactoring-apis/06-replace-query-with-parameter.ts) | Pass value instead of querying global state |
| 07 | **Remove Setting Method** | [07-remove-setting-method.ts](patterns/refactoring/refactoring-apis/07-remove-setting-method.ts) | Make field immutable after construction |
| 08 | **Replace Constructor with Factory Function** | [08-replace-constructor-with-factory-function.ts](patterns/refactoring/refactoring-apis/08-replace-constructor-with-factory-function.ts) | Use factory for flexible creation |
| 09 | **Replace Function with Command** | [09-replace-function-with-command.ts](patterns/refactoring/refactoring-apis/09-replace-function-with-command.ts) | Wrap function in command object |
| 10 | **Replace Command with Function** | [10-replace-command-with-function.ts](patterns/refactoring/refactoring-apis/10-replace-command-with-function.ts) | Simplify command back to function |

#### Dealing with Inheritance (11)

| # | Pattern | File | Description |
|---|---------|------|-------------|
| 01 | **Pull Up Method** | [01-pull-up-method.ts](patterns/refactoring/inheritance/01-pull-up-method.ts) | Move method from subclasses to superclass |
| 02 | **Pull Up Field** | [02-pull-up-field.ts](patterns/refactoring/inheritance/02-pull-up-field.ts) | Move field from subclasses to superclass |
| 03 | **Pull Up Constructor Body** | [03-pull-up-constructor-body.ts](patterns/refactoring/inheritance/03-pull-up-constructor-body.ts) | Move common constructor code to super |
| 04 | **Push Down Method** | [04-push-down-method.ts](patterns/refactoring/inheritance/04-push-down-method.ts) | Move method from superclass to subclasses |
| 05 | **Push Down Field** | [05-push-down-field.ts](patterns/refactoring/inheritance/05-push-down-field.ts) | Move field from superclass to subclasses |
| 06 | **Replace Type Code with Subclasses** | [06-replace-type-code-with-subclasses.ts](patterns/refactoring/inheritance/06-replace-type-code-with-subclasses.ts) | Use subclasses instead of type field |
| 07 | **Remove Subclass** | [07-remove-subclass.ts](patterns/refactoring/inheritance/07-remove-subclass.ts) | Replace subclass with field in superclass |
| 08 | **Extract Superclass** | [08-extract-superclass.ts](patterns/refactoring/inheritance/08-extract-superclass.ts) | Create superclass from common features |
| 09 | **Collapse Hierarchy** | [09-collapse-hierarchy.ts](patterns/refactoring/inheritance/09-collapse-hierarchy.ts) | Merge superclass and subclass |
| 10 | **Replace Subclass with Delegate** | [10-replace-subclass-with-delegate.ts](patterns/refactoring/inheritance/10-replace-subclass-with-delegate.ts) | Use composition instead of inheritance |
| 11 | **Replace Superclass with Delegate** | [11-replace-superclass-with-delegate.ts](patterns/refactoring/inheritance/11-replace-superclass-with-delegate.ts) | Delegate instead of inheriting |

---

## DSA Problems

### Core Data Structures & Algorithms

12 fundamental data structure and sorting algorithm implementations.

#### Data Structures (9)

| # | Data Structure | File | Description |
|---|----------------|------|-------------|
| 001 | **Dynamic Array** | [001-dynamic-array.ts](problems/core/001-dynamic-array.ts) | Resizable array with amortized O(1) append |
| 002 | **Singly Linked List** | [002-singly-linked-list.ts](problems/core/002-singly-linked-list.ts) | Linear collection with O(1) head operations |
| 003 | **Double-Ended Queue** | [003-double-ended-queue.ts](problems/core/003-double-ended-queue.ts) | Deque with O(1) operations at both ends |
| 004 | **Binary Search Tree** | [004-binary-search-tree.ts](problems/core/004-binary-search-tree.ts) | Ordered tree with O(log n) operations |
| 005 | **Hash Table** | [005-hash-table.ts](problems/core/005-hash-table.ts) | Key-value store with O(1) average operations |
| 006 | **Heap** | [006-heap.ts](problems/core/006-heap.ts) | Priority queue with O(log n) insert/extract |
| 007 | **Graph** | [007-graph.ts](problems/core/007-graph.ts) | Adjacency list representation with traversals |
| 008 | **Disjoint Set** | [008-disjoint-set.ts](problems/core/008-disjoint-set.ts) | Union-Find with path compression |
| 009 | **Segment Tree** | [009-segment-tree.ts](problems/core/009-segment-tree.ts) | Range queries and updates in O(log n) |

#### Sorting Algorithms (3)

| # | Algorithm | File | Time Complexity | Space |
|---|-----------|------|-----------------|-------|
| 010 | **Insertion Sort** | [010-insertion-sort.ts](problems/core/010-insertion-sort.ts) | O(n^2) | O(1) |
| 011 | **Merge Sort** | [011-merge-sort.ts](problems/core/011-merge-sort.ts) | O(n log n) | O(n) |
| 012 | **Quick Sort** | [012-quick-sort.ts](problems/core/012-quick-sort.ts) | O(n log n) avg | O(log n) |

---

### Easy Problems

18 problems covering fundamental techniques.

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 001 | **Two Sum** | [001-two-sum.ts](problems/easy/001-two-sum.ts) | Hash Map |
| 002 | **Contains Duplicate** | [002-contains-duplicate.ts](problems/easy/002-contains-duplicate.ts) | Set |
| 003 | **Valid Anagram** | [003-valid-anagram.ts](problems/easy/003-valid-anagram.ts) | Character Count |
| 004 | **Valid Palindrome** | [004-valid-palindrome.ts](problems/easy/004-valid-palindrome.ts) | Two Pointers |
| 005 | **Best Time to Buy and Sell Stock** | [005-best-time-to-buy-and-sell-stock.ts](problems/easy/005-best-time-to-buy-and-sell-stock.ts) | Greedy |
| 006 | **Valid Parentheses** | [006-valid-parentheses.ts](problems/easy/006-valid-parentheses.ts) | Stack |
| 007 | **Binary Search** | [007-binary-search.ts](problems/easy/007-binary-search.ts) | Binary Search |
| 008 | **Reverse Linked List** | [008-reverse-linked-list.ts](problems/easy/008-reverse-linked-list.ts) | Iterative/Recursive |
| 009 | **Merge Two Sorted Lists** | [009-merge-two-sorted-lists.ts](problems/easy/009-merge-two-sorted-lists.ts) | Two Pointers |
| 010 | **Linked List Cycle** | [010-linked-list-cycle.ts](problems/easy/010-linked-list-cycle.ts) | Floyd's Cycle Detection |
| 011 | **Invert Binary Tree** | [011-invert-binary-tree.ts](problems/easy/011-invert-binary-tree.ts) | DFS/BFS |
| 012 | **Maximum Depth of Binary Tree** | [012-maximum-depth-of-binary-tree.ts](problems/easy/012-maximum-depth-of-binary-tree.ts) | DFS |
| 013 | **Diameter of Binary Tree** | [013-diameter-of-binary-tree.ts](problems/easy/013-diameter-of-binary-tree.ts) | DFS |
| 014 | **Balanced Binary Tree** | [014-balanced-binary-tree.ts](problems/easy/014-balanced-binary-tree.ts) | DFS |
| 015 | **Same Tree** | [015-same-tree.ts](problems/easy/015-same-tree.ts) | DFS |
| 016 | **Subtree of Another Tree** | [016-subtree-of-another-tree.ts](problems/easy/016-subtree-of-another-tree.ts) | DFS |
| 017 | **Kth Largest Element in Stream** | [017-kth-largest-element-in-stream.ts](problems/easy/017-kth-largest-element-in-stream.ts) | Min Heap |
| 018 | **Last Stone Weight** | [018-last-stone-weight.ts](problems/easy/018-last-stone-weight.ts) | Max Heap |

---

### Medium Problems

47 problems covering intermediate techniques.

#### Arrays & Hashing (6)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 001 | **Group Anagrams** | [001-group-anagrams.ts](problems/medium/001-group-anagrams.ts) | Hash Map |
| 002 | **Top K Frequent Elements** | [002-top-k-frequent-elements.ts](problems/medium/002-top-k-frequent-elements.ts) | Heap / Bucket Sort |
| 003 | **Encode and Decode Strings** | [003-encode-and-decode-strings.ts](problems/medium/003-encode-and-decode-strings.ts) | String Manipulation |
| 004 | **Product of Array Except Self** | [004-product-of-array-except-self.ts](problems/medium/004-product-of-array-except-self.ts) | Prefix/Suffix |
| 005 | **Valid Sudoku** | [005-valid-sudoku.ts](problems/medium/005-valid-sudoku.ts) | Hash Set |
| 006 | **Longest Consecutive Sequence** | [006-longest-consecutive-sequence.ts](problems/medium/006-longest-consecutive-sequence.ts) | Set |

#### Two Pointers (3)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 007 | **Two Sum II** | [007-two-sum-ii-input-array-is-sorted.ts](problems/medium/007-two-sum-ii-input-array-is-sorted.ts) | Two Pointers |
| 008 | **Three Sum** | [008-three-sum.ts](problems/medium/008-three-sum.ts) | Two Pointers |
| 009 | **Container with Most Water** | [009-container-with-most-water.ts](problems/medium/009-container-with-most-water.ts) | Two Pointers |

#### Sliding Window (3)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 010 | **Longest Substring Without Repeating Characters** | [010-longest-substring-without-repeating-characters.ts](problems/medium/010-longest-substring-without-repeating-characters.ts) | Sliding Window |
| 011 | **Longest Repeating Character Replacement** | [011-longest-repeating-character-replacement.ts](problems/medium/011-longest-repeating-character-replacement.ts) | Sliding Window |
| 012 | **Permutation in String** | [012-permutation-in-string.ts](problems/medium/012-permutation-in-string.ts) | Sliding Window |

#### Stack (4)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 013 | **Min Stack** | [013-min-stack.ts](problems/medium/013-min-stack.ts) | Two-Stack Approach |
| 014 | **Evaluate Reverse Polish Notation** | [014-evaluate-reverse-polish-notation.ts](problems/medium/014-evaluate-reverse-polish-notation.ts) | Stack |
| 015 | **Daily Temperatures** | [015-daily-temperatures.ts](problems/medium/015-daily-temperatures.ts) | Monotonic Stack |
| 016 | **Car Fleet** | [016-car-fleet.ts](problems/medium/016-car-fleet.ts) | Sorting + Stack |

#### Binary Search (5)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 017 | **Search a 2D Matrix** | [017-search-a-2d-matrix.ts](problems/medium/017-search-a-2d-matrix.ts) | Binary Search |
| 018 | **Koko Eating Bananas** | [018-koko-eating-bananas.ts](problems/medium/018-koko-eating-bananas.ts) | Binary Search on Answer |
| 019 | **Find Minimum in Rotated Sorted Array** | [019-find-minimum-in-rotated-sorted-array.ts](problems/medium/019-find-minimum-in-rotated-sorted-array.ts) | Binary Search |
| 020 | **Search in Rotated Sorted Array** | [020-search-in-rotated-sorted-array.ts](problems/medium/020-search-in-rotated-sorted-array.ts) | Binary Search |
| 021 | **Time-Based Key-Value Store** | [021-time-based-key-value-store.ts](problems/medium/021-time-based-key-value-store.ts) | HashMap + Binary Search |

#### Linked List (6)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 022 | **Reorder List** | [022-reorder-list.ts](problems/medium/022-reorder-list.ts) | Fast/Slow Pointers |
| 023 | **Remove Nth Node from End** | [023-remove-nth-node-from-end.ts](problems/medium/023-remove-nth-node-from-end.ts) | Two Pointers |
| 024 | **Copy List with Random Pointer** | [024-copy-list-with-random-pointer.ts](problems/medium/024-copy-list-with-random-pointer.ts) | Hash Map |
| 025 | **Add Two Numbers** | [025-add-two-numbers.ts](problems/medium/025-add-two-numbers.ts) | Math |
| 026 | **Find the Duplicate Number** | [026-find-the-duplicate-number.ts](problems/medium/026-find-the-duplicate-number.ts) | Floyd's Cycle Detection |
| 027 | **LRU Cache** | [027-lru-cache.ts](problems/medium/027-lru-cache.ts) | HashMap + Doubly Linked List |

#### Binary Tree (7)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 028 | **Lowest Common Ancestor of BST** | [028-lowest-common-ancestor-of-bst.ts](problems/medium/028-lowest-common-ancestor-of-bst.ts) | BST Properties |
| 029 | **Binary Tree Level Order Traversal** | [029-binary-tree-level-order-traversal.ts](problems/medium/029-binary-tree-level-order-traversal.ts) | BFS |
| 030 | **Binary Tree Right Side View** | [030-binary-tree-right-side-view.ts](problems/medium/030-binary-tree-right-side-view.ts) | BFS/DFS |
| 031 | **Count Good Nodes in Binary Tree** | [031-count-good-nodes-in-binary-tree.ts](problems/medium/031-count-good-nodes-in-binary-tree.ts) | DFS |
| 032 | **Validate Binary Search Tree** | [032-validate-binary-search-tree.ts](problems/medium/032-validate-binary-search-tree.ts) | DFS with Bounds |
| 033 | **Kth Smallest Element in BST** | [033-kth-smallest-element-in-bst.ts](problems/medium/033-kth-smallest-element-in-bst.ts) | Inorder Traversal |
| 034 | **Construct Binary Tree from Preorder and Inorder** | [034-construct-binary-tree-from-preorder-inorder.ts](problems/medium/034-construct-binary-tree-from-preorder-inorder.ts) | Divide and Conquer |

#### Heap / Priority Queue (4)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 035 | **K Closest Points to Origin** | [035-k-closest-points-to-origin.ts](problems/medium/035-k-closest-points-to-origin.ts) | Max Heap |
| 036 | **Kth Largest Element in Array** | [036-kth-largest-element-in-array.ts](problems/medium/036-kth-largest-element-in-array.ts) | Quick Select / Heap |
| 037 | **Task Scheduler** | [037-task-scheduler.ts](problems/medium/037-task-scheduler.ts) | Greedy + Heap |
| 038 | **Design Twitter** | [038-design-twitter.ts](problems/medium/038-design-twitter.ts) | Heap + Design |

#### Backtracking (9)

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 039 | **Subsets** | [039-subsets.ts](problems/medium/039-subsets.ts) | Pick/Skip Pattern |
| 040 | **Combination Sum** | [040-combination-sum.ts](problems/medium/040-combination-sum.ts) | Pick/Skip with Reuse |
| 041 | **Combination Sum II** | [041-combination-sum-ii.ts](problems/medium/041-combination-sum-ii.ts) | Pick/Skip + Dedup |
| 042 | **Permutations** | [042-permutations.ts](problems/medium/042-permutations.ts) | Backtracking |
| 043 | **Subsets II** | [043-subsets-ii.ts](problems/medium/043-subsets-ii.ts) | Pick/Skip + Dedup |
| 044 | **Generate Parentheses** | [044-generate-parentheses.ts](problems/medium/044-generate-parentheses.ts) | Backtracking |
| 045 | **Word Search** | [045-word-search.ts](problems/medium/045-word-search.ts) | DFS Backtracking |
| 046 | **Palindrome Partitioning** | [046-palindrome-partitioning.ts](problems/medium/046-palindrome-partitioning.ts) | Backtracking |
| 047 | **Letter Combinations of Phone Number** | [047-letter-combinations-of-phone-number.ts](problems/medium/047-letter-combinations-of-phone-number.ts) | Backtracking |

---

### Hard Problems

11 problems covering advanced techniques.

| # | Problem | File | Technique |
|---|---------|------|-----------|
| 001 | **Trapping Rain Water** | [001-trapping-rain-water.ts](problems/hard/001-trapping-rain-water.ts) | Two Pointers / Stack |
| 002 | **Minimum Window Substring** | [002-minimum-window-substring.ts](problems/hard/002-minimum-window-substring.ts) | Sliding Window |
| 003 | **Sliding Window Maximum** | [003-sliding-window-maximum.ts](problems/hard/003-sliding-window-maximum.ts) | Monotonic Deque |
| 004 | **Largest Rectangle in Histogram** | [004-largest-rectangle-in-histogram.ts](problems/hard/004-largest-rectangle-in-histogram.ts) | Monotonic Stack |
| 005 | **Median of Two Sorted Arrays** | [005-median-of-two-sorted-arrays.ts](problems/hard/005-median-of-two-sorted-arrays.ts) | Binary Search |
| 006 | **Merge K Sorted Lists** | [006-merge-k-sorted-lists.ts](problems/hard/006-merge-k-sorted-lists.ts) | Min Heap / Divide & Conquer |
| 007 | **Reverse Nodes in K-Group** | [007-reverse-nodes-in-k-group.ts](problems/hard/007-reverse-nodes-in-k-group.ts) | Linked List Manipulation |
| 008 | **Binary Tree Maximum Path Sum** | [008-binary-tree-maximum-path-sum.ts](problems/hard/008-binary-tree-maximum-path-sum.ts) | DFS |
| 009 | **Serialize and Deserialize Binary Tree** | [009-serialize-deserialize-binary-tree.ts](problems/hard/009-serialize-deserialize-binary-tree.ts) | BFS/DFS |
| 010 | **Find Median from Data Stream** | [010-find-median-from-data-stream.ts](problems/hard/010-find-median-from-data-stream.ts) | Two Heaps |
| 011 | **N-Queens** | [011-n-queens.ts](problems/hard/011-n-queens.ts) | Backtracking |

---

## System Design

16 comprehensive system design documents for real-world applications.

| # | System | File | Category |
|---|--------|------|----------|
| 01 | **Todo App** | [01-todo-app.md](system-design/01-todo-app.md) | Full-Stack Application |
| 02 | **Trading App** | [02-trading-app.md](system-design/02-trading-app.md) | Financial Systems |
| 03 | **E2B Sandbox** | [03-e2b-sandbox.md](system-design/03-e2b-sandbox.md) | Code Execution |
| 04 | **Lovable Clone** | [04-lovable-clone.md](system-design/04-lovable-clone.md) | AI App Builder |
| 05 | **Codeforces Clone** | [05-codeforces-clone.md](system-design/05-codeforces-clone.md) | Competitive Programming |
| 06 | **Replit Clone** | [06-replit-clone.md](system-design/06-replit-clone.md) | Online IDE |
| 07 | **Cloudflare Workers Runtime** | [07-cloudflare-workers-runtime.md](system-design/07-cloudflare-workers-runtime.md) | Edge Computing |
| 08 | **Agent Framework** | [08-agent-framework.md](system-design/08-agent-framework.md) | AI Infrastructure |
| 09 | **RL Finetuning** | [09-rl-finetuning.md](system-design/09-rl-finetuning.md) | Machine Learning |
| 10 | **Devin** | [10-devin.md](system-design/10-devin.md) | AI Software Engineer |
| 11 | **Memory Framework** | [11-memory-framework.md](system-design/11-memory-framework.md) | AI Memory Systems |
| 12 | **DEX AMM** | [12-dex-amm.md](system-design/12-dex-amm.md) | Web3 / DeFi |
| 13 | **CEX** | [13-cex.md](system-design/13-cex.md) | Web3 / Exchange |
| 14 | **Wallet** | [14-wallet.md](system-design/14-wallet.md) | Web3 / Crypto |
| 15 | **Prediction Market** | [15-prediction-market.md](system-design/15-prediction-market.md) | Web3 / DeFi |
| 16 | **Staking Escrow Frontend** | [16-staking-escrow-frontend.md](system-design/16-staking-escrow-frontend.md) | Web3 / Frontend |

---

## System Design Interview

2 interview-focused system design problems with detailed solutions.

| # | Problem | File | Focus Areas |
|---|---------|------|-------------|
| 01 | **Design Calendar System** | [01-design-calendar-system.md](system-design-interview/01-design-calendar-system.md) | Event scheduling, recurring events, timezone handling |
| 02 | **Design Google Docs** | [02-design-google-docs.md](system-design-interview/02-design-google-docs.md) | Real-time collaboration, OT/CRDT, conflict resolution |

---

## Low-Level Design Interview

3 low-level design interview problems with OOP implementations.

| # | Problem | File | Key Concepts |
|---|---------|------|--------------|
| 01 | **Design Parking Lot** | [01-design-parking-lot.md](low-level-design-interview/01-design-parking-lot.md) | OOP, Strategy pattern, State management |
| 02 | **Design Notification System** | [02-design-notification-system.md](low-level-design-interview/02-design-notification-system.md) | Observer pattern, Template method, Priority queues |
| 03 | **Design Search Autocomplete** | [03-design-search-autocomplete.md](low-level-design-interview/03-design-search-autocomplete.md) | Trie, Caching, Ranking algorithms |

---

## System Design Fundamentals

2 core system design concepts with detailed explanations.

| # | Topic | File | Description |
|---|-------|------|-------------|
| 01 | **SSL/TLS Explained** | [01-ssltls_explained.md](system-design-fundamental/01-ssltls_explained.md) | TLS handshake, certificates, encryption |
| 02 | **Role-Based Access Control (RBAC)** | [02-role_based_access_control_rbac.md](system-design-fundamental/02-role_based_access_control_rbac.md) | Roles, permissions, access control models |

---

## Database & Distributed Systems

### DDIA - Designing Data-Intensive Applications

Comprehensive notes from Martin Kleppmann's book covering database internals and distributed systems.

#### Part I: Foundations of Data Systems (4 chapters)

| # | Chapter | File | Topics |
|---|---------|------|--------|
| 01 | **Reliable, Scalable, and Maintainable Applications** | [01-reliable-scalable-maintainable.md](database/ddia/foundations/01-reliable-scalable-maintainable.md) | Reliability, Scalability, Maintainability |
| 02 | **Data Models and Query Languages** | [02-data-models-query-languages.md](database/ddia/foundations/02-data-models-query-languages.md) | Relational, Document, Graph models |
| 03 | **Storage and Retrieval** | [03-storage-and-retrieval.md](database/ddia/foundations/03-storage-and-retrieval.md) | LSM-Trees, B-Trees, Column stores |
| 04 | **Encoding and Evolution** | [04-encoding-and-evolution.md](database/ddia/foundations/04-encoding-and-evolution.md) | JSON, Protobuf, Avro, Schema evolution |

#### Part II: Distributed Data (5 chapters)

| # | Chapter | File | Topics |
|---|---------|------|--------|
| 05 | **Replication** | [05-replication.md](database/ddia/distributed-data/05-replication.md) | Leader-follower, Multi-leader, Leaderless |
| 06 | **Partitioning** | [06-partitioning.md](database/ddia/distributed-data/06-partitioning.md) | Key range, Hash, Secondary indexes |
| 07 | **Transactions** | [07-transactions.md](database/ddia/distributed-data/07-transactions.md) | ACID, Isolation levels, Serializability |
| 08 | **The Trouble with Distributed Systems** | [08-trouble-with-distributed-systems.md](database/ddia/distributed-data/08-trouble-with-distributed-systems.md) | Failures, Clocks, Byzantine faults |
| 09 | **Consistency and Consensus** | [09-consistency-and-consensus.md](database/ddia/distributed-data/09-consistency-and-consensus.md) | Linearizability, Raft, Zab, 2PC |

#### Part III: Derived Data (3 chapters)

| # | Chapter | File | Topics |
|---|---------|------|--------|
| 10 | **Batch Processing** | [10-batch-processing.md](database/ddia/derived-data/10-batch-processing.md) | MapReduce, Spark, Dataflow |
| 11 | **Stream Processing** | [11-stream-processing.md](database/ddia/derived-data/11-stream-processing.md) | Kafka, Event sourcing, Stream joins |
| 12 | **The Future of Data Systems** | [12-future-of-data-systems.md](database/ddia/derived-data/12-future-of-data-systems.md) | Data integration, Unbundling |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dsa-playground.git
cd dsa-playground

# Install dependencies
npm install
```

### Running Examples

```bash
# Run any TypeScript file directly
npx ts-node <path-to-file>

# Examples:
npx ts-node patterns/core/01-factory-method.ts
npx ts-node problems/medium/001-group-anagrams.ts
npx ts-node problems/core/006-heap.ts

# Type check
npx tsc --noEmit
```

---

## Quick Reference

### Problem Categories by Technique

| Technique | Problems |
|-----------|----------|
| **Hash Map** | Two Sum, Group Anagrams, LRU Cache |
| **Two Pointers** | Valid Palindrome, Three Sum, Container with Most Water |
| **Sliding Window** | Longest Substring Without Repeating, Minimum Window Substring |
| **Binary Search** | Search in Rotated Array, Koko Eating Bananas, Median of Two Arrays |
| **Stack** | Valid Parentheses, Daily Temperatures, Largest Rectangle |
| **Monotonic Stack/Deque** | Daily Temperatures, Sliding Window Maximum |
| **Heap** | Top K Frequent, Find Median, Merge K Sorted Lists |
| **Backtracking** | Subsets, Permutations, N-Queens, Word Search |
| **DFS/BFS** | Binary Tree problems, Graph traversal |
| **Floyd's Cycle Detection** | Linked List Cycle, Find Duplicate Number |

### Pattern Categories

| Category | Count | Source |
|----------|-------|--------|
| GoF Patterns | 10 | Design Patterns (Gang of Four) |
| PoEAA Patterns | 20 | Patterns of Enterprise Application Architecture |
| DDD Patterns | 21 | Domain-Driven Design (Eric Evans) |
| Refactoring Patterns | 61 | Refactoring (Martin Fowler, 2nd Ed) |

### Interview Preparation

| Category | Count | Description |
|----------|-------|-------------|
| System Design Interview | 2 | Large-scale system design problems |
| LLD Interview | 3 | Object-oriented design problems |
| System Design Fundamentals | 2 | Core concepts (security, access control) |

---

## License

MIT

---

<p align="center">
  <sub>Built for learning and reference</sub>
</p>
