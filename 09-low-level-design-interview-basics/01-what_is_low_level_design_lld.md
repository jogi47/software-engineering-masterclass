# What Is Low-Level Design (LLD)?

Low-level design matters in interviews because it shows whether you can turn a vague requirement into clean classes, interfaces, and code boundaries.

---

## On this page

- [1. Introduction](#1-introduction)
- [2. Why It Matters in Interviews](#2-why-it-matters-in-interviews)
- [3. Core Breakdown](#3-core-breakdown)
  - [3.1 What LLD Actually Covers](#31-what-lld-actually-covers)
  - [3.2 Core Building Blocks](#32-core-building-blocks)
  - [3.3 Classes and Responsibilities](#33-classes-and-responsibilities)
  - [3.4 Interfaces and Abstractions](#34-interfaces-and-abstractions)
  - [3.5 Relationships Between Objects](#35-relationships-between-objects)
  - [3.6 Method Design](#36-method-design)
  - [3.7 Patterns in LLD](#37-patterns-in-lld)
- [4. Practical Interview Framing](#4-practical-interview-framing)
- [5. Examples or Scenarios](#5-examples-or-scenarios)
- [6. Common Mistakes](#6-common-mistakes)
- [7. Summary Checklist](#7-summary-checklist)
- [8. Quiz](#8-quiz)
- [9. Quick Interview Checklist](#9-quick-interview-checklist)

---

## 1. Introduction

Low-Level Design (LLD) is the step between a broad system idea and concrete code structure.

If High-Level Design answers:

```text
What major components do we need?
```

LLD answers:

```text
How should those components be modeled and implemented?
```

In an LLD discussion, you are expected to think about:
- classes and objects
- interfaces and abstractions
- responsibilities and boundaries
- relationships between components
- extensibility and maintainability

This is why LLD interviews are less about infrastructure and more about code design quality.

## 2. Why It Matters in Interviews

Interviewers use LLD rounds to check whether you can design code that other engineers can actually work with.

They are usually looking for signals like:
- can you break a vague problem into coherent objects?
- can you assign responsibilities cleanly?
- can you avoid giant classes and tangled dependencies?
- can you explain why you used an interface, enum, or pattern?
- can you keep the design simple without making it rigid?

Weak understanding usually looks like this:
- jumping straight into code without identifying entities
- forcing design patterns by name
- mixing unrelated responsibilities into one class
- confusing HLD concerns like sharding or CDNs with local object modeling

Strong understanding usually looks like this:
- starting from requirements and behaviors
- identifying the right abstractions
- using composition and interfaces where they help
- naming trade-offs clearly
- keeping the design easy to extend

## 3. Core Breakdown

### 3.1 What LLD Actually Covers

LLD focuses on the internal structure of a module or subsystem.

Typical concerns include:
- class design
- method signatures
- interfaces
- enums and value objects
- object relationships
- error handling boundaries
- basic design pattern use

It is not mainly about:
- global system topology
- cross-region replication
- CDN placement
- database sharding

Those belong more naturally to HLD or system design.

### 3.2 Core Building Blocks

| Building block | What it does | Interview expectation |
| --- | --- | --- |
| Classes | Hold state and behavior | Responsibilities should be focused |
| Interfaces | Define contracts | Should reduce coupling where variation exists |
| Relationships | Connect objects | You should know composition, aggregation, association, inheritance |
| Methods | Express behavior | Names and parameters should be clear and intentional |
| Patterns | Solve recurring design problems | Use only when the problem justifies them |

### 3.3 Classes and Responsibilities

The first LLD skill is identifying the right objects.

Example:
- In a parking lot system, `Vehicle`, `ParkingSpot`, `Ticket`, and `ParkingLot` are meaningful entities.
- In a notification system, `Notification`, `NotificationSender`, and `NotificationManager` are more useful than one giant `NotificationService` class that does everything.

A good class usually has:
- one clear reason to change
- a small public surface area
- behavior close to the data it owns

### 3.4 Interfaces and Abstractions

Interfaces are useful when behavior can vary.

For example:

```ts
interface PaymentProcessor {
  process(amount: number): void;
}
```

Concrete implementations might include:
- `StripePaymentProcessor`
- `PayPalPaymentProcessor`
- `MockPaymentProcessor`

This matters in interviews because it shows you understand loose coupling and testability, not just syntax.

### 3.5 Relationships Between Objects

You should be comfortable with the common relationships:

| Relationship | Meaning | Example |
| --- | --- | --- |
| Association | one object uses another | `Doctor` uses `Stethoscope` |
| Aggregation | weak ownership | `Department` has `Professor`s |
| Composition | strong ownership | `House` has `Room`s |
| Inheritance | one type extends another | `Car` is a `Vehicle` |

In interviews, composition is often safer than inheritance unless the `is-a` relationship is very clear.

### 3.6 Method Design

Good method signatures communicate intent.

Weak:

```ts
sendMsg(str: string): void
```

Better:

```ts
sendNotification(message: Message): void
```

Interviewers notice whether your APIs feel easy to use, easy to test, and hard to misuse.

### 3.7 Patterns in LLD

Patterns are tools, not goals.

Common patterns in LLD interviews:
- `Strategy` for interchangeable behavior
- `Factory` for controlled object creation
- `Observer` for event-driven updates
- `State` for lifecycle-driven behavior
- `Singleton` only when true single ownership is justified

Saying "I will use Strategy here" is weak by itself.

A stronger answer is:

```text
Pricing rules can change independently from ticket creation, so I would hide fee calculation behind a PricingStrategy interface.
```

That shows problem-driven design rather than memorization.

## 4. Practical Interview Framing

A good LLD answer usually sounds like this:

1. Clarify the problem and scope.
2. Identify the core entities.
3. Assign responsibilities.
4. Define interfaces only where variation exists.
5. Describe relationships.
6. Mention one or two fitting patterns if they solve a real problem.
7. Discuss how the design could evolve.

What to say early in an interview:

```text
Let me first identify the main objects and the behaviors they own before I jump into class definitions.
```

What to avoid:
- listing patterns before the problem is clear
- designing for every future possibility
- over-abstracting simple flows
- treating inheritance as the default reuse mechanism

A strong candidate usually starts simple and adds abstraction only where the problem demands it.

## 5. Examples or Scenarios

### Example 1: Weak vs Strong Framing

Weak:

```text
I will create a BaseManager, AbstractManager, ManagerFactory, ManagerService, and StrategyManager.
```

Strong:

```text
The system has three main concerns: storing the order, calculating price, and changing order status. I will model those separately so pricing logic does not leak into order lifecycle code.
```

### Example 2: HLD Thinking vs LLD Thinking

| Prompt | HLD-style response | LLD-style response |
| --- | --- | --- |
| Design a notification system | talk about queues, retries, and scale | design senders, message models, templates, and dispatch flow |
| Design a parking lot | talk about traffic and sensors | design spot allocation, ticketing, pricing, and object relationships |

### Example 3: Small LLD Skeleton

```ts
interface NotificationSender {
  send(notification: Notification): void;
}

class EmailSender implements NotificationSender {
  send(notification: Notification): void {
    // send email
  }
}

class NotificationManager {
  constructor(private readonly sender: NotificationSender) {}

  dispatch(notification: Notification): void {
    this.sender.send(notification);
  }
}
```

This is not a full system, but it shows a typical LLD move:
- depend on an abstraction
- keep orchestration separate from implementation detail

## 6. Common Mistakes

- Jumping into code before identifying responsibilities.
- Creating god classes that own validation, storage, business rules, and formatting.
- Using inheritance where composition would be simpler.
- Adding interfaces for every class even when there is no variation.
- Naming design patterns without explaining the problem they solve.
- Mixing HLD concerns like caching and load balancing into a class design discussion.
- Designing for imaginary future requirements until the solution becomes hard to explain.

## 7. Summary Checklist

- I can explain LLD as the bridge between architecture and code structure.
- I can identify classes, interfaces, relationships, and method boundaries from requirements.
- I know the difference between object modeling and high-level system design.
- I know when an interface or pattern adds value and when it is unnecessary.
- I can discuss responsibilities, extensibility, and trade-offs in plain language.

## 8. Quiz

### 1. What does LLD primarily focus on?

Answer:
Classes, interfaces, behaviors, relationships, and code-level structure.

### 2. In an interview, when should you introduce a design pattern?

Answer:
When a concrete design problem justifies it, not just because you recognize the pattern name.

### 3. Which is more aligned with LLD: "use a CDN" or "split notification sending behind an interface"?

Answer:
"split notification sending behind an interface" because it is a code-structure decision.

### 4. Why is composition often preferred over inheritance in interviews?

Answer:
Because it usually gives better flexibility and lower coupling unless the inheritance relationship is genuinely natural.

### 5. What is one strong signal of good LLD thinking?

Answer:
Clear responsibility boundaries with simple, explainable abstractions.

## 9. Quick Interview Checklist

```text
Modeling:
  [ ] I identify core entities before writing classes
  [ ] I keep each class focused on one main responsibility

Abstractions:
  [ ] I add interfaces only where variation or substitution is real
  [ ] I justify patterns in terms of the problem they solve

Boundaries:
  [ ] I keep HLD concerns out of an LLD discussion unless asked
  [ ] I prefer simple, explainable relationships over clever hierarchies

Communication:
  [ ] I can explain the design in plain language
  [ ] I can defend trade-offs around extensibility vs simplicity
```
