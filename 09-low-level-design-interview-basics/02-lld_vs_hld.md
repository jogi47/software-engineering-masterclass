# LLD vs HLD

This topic matters in interviews because many weak candidates mix high-level architecture decisions with low-level class design and end up answering the wrong question.

## 1. Introduction

High-Level Design (HLD) and Low-Level Design (LLD) solve different layers of the same problem.

HLD answers questions like:

```text
What major parts should the system have, and how should they interact?
```

LLD answers questions like:

```text
How should one part be modeled internally so engineers can implement it cleanly?
```

A simple way to think about it:
- HLD decides the system shape
- LLD decides the code shape inside one part of that system

Both matter in software development, but interviews use them to evaluate different skills.

## 2. Why It Matters in Interviews

Interviewers care about this distinction because it shows whether you can stay at the right abstraction level.

If the interview is HLD, they want signals like:
- requirement scoping
- component breakdown
- API and data flow thinking
- scale, reliability, and storage trade-offs

If the interview is LLD, they want signals like:
- class responsibilities
- interface design
- object relationships
- use of OOP and design principles
- code-level extensibility

Weak candidates often fail by doing one of these:
- answering an LLD question with load balancers, queues, and databases
- answering an HLD question with deep class hierarchies too early
- switching between levels randomly

Strong candidates identify the level early and keep the conversation there unless the interviewer asks to zoom in or out.

## 3. Core Breakdown

### 3.1 What HLD Focuses On

HLD is about architecture and system boundaries.

Typical HLD concerns:
- services or components
- request and data flow
- storage choices
- caching
- messaging
- scaling and reliability
- external integrations

Example HLD questions:
- Design Instagram
- Design a URL shortener
- Design a notification system at scale

Typical HLD deliverables:
- architecture diagram
- APIs
- database choice
- scaling strategy
- bottlenecks and trade-offs

### 3.2 What LLD Focuses On

LLD is about implementation structure inside a module or subsystem.

Typical LLD concerns:
- classes and interfaces
- method signatures
- inheritance vs composition
- validation boundaries
- state transitions
- pattern selection
- testability and maintainability

Example LLD questions:
- Design a parking lot
- Design a chess game
- Design a splitwise-like expense module
- Design a notification dispatcher class structure

Typical LLD deliverables:
- class diagram
- interfaces and enums
- method signatures
- object relationships
- runnable or near-runnable code

### 3.3 HLD vs LLD Side by Side

| Aspect | HLD | LLD |
| --- | --- | --- |
| Main question | what major parts exist? | how should one part be implemented? |
| Focus level | system or service level | module or class level |
| Main concerns | scale, traffic, storage, reliability | modeling, responsibilities, extensibility |
| Common artifacts | architecture diagrams, APIs, data flow | class diagrams, interfaces, method definitions |
| Typical audience | architects, senior engineers, stakeholders | engineers implementing the module |
| Interview signal | broad system reasoning | code design quality |

### 3.4 Example Using the Same Product

Take a ride-hailing app.

HLD discussion:
- passenger service
- driver service
- matching service
- billing service
- WebSockets for real-time updates
- databases for user, trip, and location data

LLD discussion for the billing module:
- `Ride`
- `Invoice`
- `PaymentMethod`
- `PaymentProcessor`
- `CreditCardProcessor`
- `WalletProcessor`
- fee calculation and payment status transitions

Same product, different zoom level.

### 3.5 How They Connect

HLD and LLD are not competing ideas.

They usually flow like this:

1. Requirements define the problem.
2. HLD breaks the system into major components.
3. LLD designs the internals of one component.
4. Code implements the LLD.

In real engineering work, teams move between these levels constantly.

## 4. Practical Interview Framing

A useful question to ask yourself in the first minute is:

```text
Is this interview asking me to design the system architecture, or the internal code structure of one module?
```

If it is HLD, start with:
- requirements
- scale
- major components
- core data flow

If it is LLD, start with:
- scope of the module
- core entities
- responsibilities
- interfaces and relationships

Good candidate framing for an LLD round:

```text
I’ll stay focused on the internal design of this module, identify the main objects first, then define relationships and method boundaries.
```

Good candidate framing for an HLD round:

```text
I’ll begin by clarifying scope and scale, then outline the major components and the data flow between them.
```

If the interviewer changes level, adapt explicitly:

```text
At the architecture level I would use a queue here, but inside this service I would model the dispatch behavior behind an interface.
```

That is a strong signal because it shows you understand both levels and can switch deliberately.

## 5. Examples or Scenarios

### Example 1: Wrong Level Answer

Prompt:

```text
Design the low-level design of a parking lot.
```

Weak answer:

```text
I will use microservices, Redis, Kafka, and PostgreSQL.
```

Why it is weak:
- it ignores the class design problem
- it jumps to infrastructure before modeling the domain

Stronger answer:

```text
I’ll start by identifying the main entities such as ParkingLot, ParkingFloor, ParkingSpot, Vehicle, and Ticket, then decide how spot allocation and pricing should be encapsulated.
```

### Example 2: Same Prompt, Different Levels

| Prompt | HLD answer focus | LLD answer focus |
| --- | --- | --- |
| Design a notification system | delivery pipeline, retries, queues, provider failover | sender interfaces, template models, channel strategies |
| Design a food delivery system | services, order flow, databases, location updates | order state model, assignment rules, pricing components |

### Example 3: Useful Mental Shortcut

If you are talking about:
- services, data stores, load balancers, or event streams, you are probably in HLD
- classes, interfaces, composition, and method signatures, you are probably in LLD

This is not a perfect rule, but it works well in interviews.

## 6. Common Mistakes

- Treating every design round like a system design round.
- Treating every design round like a machine coding round.
- Using infrastructure buzzwords in an LLD discussion.
- Overbuilding class hierarchies in an HLD discussion.
- Failing to state the abstraction level before diving in.
- Confusing module-level extensibility with system-level scalability.
- Not noticing when the interviewer wants you to zoom in or zoom out.

## 7. Summary Checklist

- I can explain HLD as architecture-level design and LLD as code-structure design.
- I know the typical artifacts and concerns of each level.
- I can tell whether a prompt is asking for system architecture or object modeling.
- I can use the same product example to explain both levels clearly.
- I know how to stay at the correct abstraction level during an interview.

## 8. Quiz

### 1. Which is more aligned with HLD: class responsibilities or service boundaries?

Answer:
Service boundaries.

### 2. Which is more aligned with LLD: queue topology or interface design?

Answer:
Interface design.

### 3. Why do candidates lose points when they mix HLD and LLD?

Answer:
Because it shows weak control over abstraction level and often means they are solving a different problem than the one asked.

### 4. If an interviewer asks you to design a billing module, what is the better first move?

Answer:
Identify the main entities, responsibilities, and relationships inside the module.

### 5. How do HLD and LLD usually relate in real work?

Answer:
HLD defines the major system structure, and LLD defines how one part of that structure is implemented internally.
