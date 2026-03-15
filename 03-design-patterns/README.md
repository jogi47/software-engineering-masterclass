# Design Patterns

This folder contains self-contained TypeScript examples for classic design patterns, enterprise application patterns, domain-driven design patterns, and refactoring techniques.

## What Is Here

| Section | Count | Purpose |
| --- | --- | --- |
| `core/` | 10 | Gang of Four patterns |
| `poeaa/` | 20 | Fowler enterprise patterns |
| `ddd/` | 21 | DDD building blocks, strategic patterns, and supple design |
| `refactoring/` | 61 | Fowler refactoring catalog examples |

## How To Use This Folder

- Start with `core/` if you want a compact introduction to mainstream object-oriented patterns.
- Move to `poeaa/` and `ddd/` if you want patterns that show up in real application architecture.
- Use `refactoring/` when you want concrete code transformations rather than architecture concepts.
- Each file is designed to be runnable and self-contained.

## Run Files

```bash
npx ts-node 03-design-patterns/core/01-factory-method.ts
npx ts-node 03-design-patterns/poeaa/domain-logic/04-service-layer.ts
npx ts-node 03-design-patterns/ddd/strategic/06-anticorruption-layer.ts
npx ts-node 03-design-patterns/refactoring/basic/01-extract-function.ts
```

## Index

### Core Patterns

| Pattern | File |
| --- | --- |
| Factory Method | [01-factory-method.ts](core/01-factory-method.ts) |
| Singleton | [02-singleton.ts](core/02-singleton.ts) |
| Builder | [03-builder.ts](core/03-builder.ts) |
| Prototype | [04-prototype.ts](core/04-prototype.ts) |
| Adapter | [05-adapter.ts](core/05-adapter.ts) |
| Decorator | [06-decorator.ts](core/06-decorator.ts) |
| Facade | [07-facade.ts](core/07-facade.ts) |
| Strategy | [08-strategy.ts](core/08-strategy.ts) |
| Observer | [09-observer.ts](core/09-observer.ts) |
| State | [10-state.ts](core/10-state.ts) |

### PoEAA

| Subsection | Count | What It Covers | Directory |
| --- | --- | --- | --- |
| Base | 3 | Infrastructure-level helper abstractions | [poeaa/base/](poeaa/base/) |
| Domain Logic | 4 | Transaction script, service layer, domain model styles | [poeaa/domain-logic/](poeaa/domain-logic/) |
| Data Source | 4 | Table/row gateways, active record, data mapper | [poeaa/data-source/](poeaa/data-source/) |
| Object-Relational | 4 | Identity map, lazy load, unit of work, repository | [poeaa/object-relational/](poeaa/object-relational/) |
| Web Presentation | 3 | Page controller, front controller, MVC | [poeaa/web-presentation/](poeaa/web-presentation/) |
| Distribution | 2 | DTO and remote facade | [poeaa/distribution/](poeaa/distribution/) |

Representative files:

- [01-gateway.ts](poeaa/base/01-gateway.ts)
- [04-service-layer.ts](poeaa/domain-logic/04-service-layer.ts)
- [04-data-mapper.ts](poeaa/data-source/04-data-mapper.ts)
- [03-unit-of-work.ts](poeaa/object-relational/03-unit-of-work.ts)
- [03-mvc.ts](poeaa/web-presentation/03-mvc.ts)
- [02-remote-facade.ts](poeaa/distribution/02-remote-facade.ts)

### DDD

| Subsection | Count | What It Covers | Directory |
| --- | --- | --- | --- |
| Building Blocks | 8 | Entity, value object, aggregate, repository, factory | [ddd/building-blocks/](ddd/building-blocks/) |
| Strategic | 8 | Bounded context, context map, ACL, shared kernel, open host service | [ddd/strategic/](ddd/strategic/) |
| Supple Design | 5 | Intention-revealing interfaces, assertions, specifications | [ddd/supple-design/](ddd/supple-design/) |

Representative files:

- [03-aggregate.ts](ddd/building-blocks/03-aggregate.ts)
- [06-anticorruption-layer.ts](ddd/strategic/06-anticorruption-layer.ts)
- [05-specification.ts](ddd/supple-design/05-specification.ts)

### Refactoring

| Subsection | Count | What It Covers | Directory |
| --- | --- | --- | --- |
| Basic | 11 | Core function and variable refactorings | [refactoring/basic/](refactoring/basic/) |
| Encapsulation | 9 | Encapsulating records, collections, and behavior | [refactoring/encapsulation/](refactoring/encapsulation/) |
| Moving Features | 9 | Repositioning methods, fields, and statements | [refactoring/moving-features/](refactoring/moving-features/) |
| Organizing Data | 5 | Variable/reference reshaping | [refactoring/organizing-data/](refactoring/organizing-data/) |
| Simplifying Conditional | 6 | Guard clauses, polymorphism, special cases | [refactoring/simplifying-conditional/](refactoring/simplifying-conditional/) |
| Refactoring APIs | 10 | Changing call shapes and function responsibilities | [refactoring/refactoring-apis/](refactoring/refactoring-apis/) |
| Inheritance | 11 | Reshaping class hierarchies | [refactoring/inheritance/](refactoring/inheritance/) |

Representative files:

- [01-extract-function.ts](refactoring/basic/01-extract-function.ts)
- [02-encapsulate-collection.ts](refactoring/encapsulation/02-encapsulate-collection.ts)
- [01-move-function.ts](refactoring/moving-features/01-move-function.ts)
- [01-decompose-conditional.ts](refactoring/simplifying-conditional/01-decompose-conditional.ts)
- [08-replace-constructor-with-factory-function.ts](refactoring/refactoring-apis/08-replace-constructor-with-factory-function.ts)
- [09-collapse-hierarchy.ts](refactoring/inheritance/09-collapse-hierarchy.ts)
