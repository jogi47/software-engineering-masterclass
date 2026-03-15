# Types of System Design Questions

This topic matters because system design interviews do not all test the same skill, and candidates often underperform by answering the wrong kind of question at the wrong level.

---

## On this page

- [1. Introduction](#1-introduction)
- [2. Why It Matters in Interviews](#2-why-it-matters-in-interviews)
- [3. Core Breakdown](#3-core-breakdown)
  - [3.1 The Main Categories You Will See](#31-the-main-categories-you-will-see)
  - [3.2 Product-Facing System Design Questions](#32-product-facing-system-design-questions)
  - [3.3 Infrastructure and Platform Questions](#33-infrastructure-and-platform-questions)
  - [3.4 Data and Analytics Questions](#34-data-and-analytics-questions)
  - [3.5 Real-Time and Collaboration Questions](#35-real-time-and-collaboration-questions)
  - [3.6 Internal Platform and Workflow Questions](#36-internal-platform-and-workflow-questions)
  - [3.7 Open-Ended Versus Constraint-Driven Questions](#37-open-ended-versus-constraint-driven-questions)
  - [3.8 How to Identify the Question Type Quickly](#38-how-to-identify-the-question-type-quickly)
- [4. Practical Interview Framing](#4-practical-interview-framing)
- [5. Examples or Scenarios](#5-examples-or-scenarios)
- [6. Common Mistakes](#6-common-mistakes)
- [7. Summary Checklist](#7-summary-checklist)
- [8. Quiz](#8-quiz)
- [9. Quick Interview Checklist](#9-quick-interview-checklist)

---

## 1. Introduction

System design interview prompts may sound similar on the surface, but they often test different instincts.

For example:
- "design instagram" tests product-facing read and write flows, fan-out, storage, and feeds
- "design a rate limiter" tests infrastructure policy, correctness, and performance boundaries
- "design a data warehouse ingestion pipeline" tests batch, stream, storage, and analytical workloads
- "design google docs" tests real-time collaboration, conflict resolution, and session coordination

If you treat all of these as the same category, your answer usually drifts:
- too product-heavy for an infrastructure problem
- too infrastructure-heavy for a product problem
- too generic for a real-time problem

That is why one of the most important early interview skills is classifying the prompt correctly.

You do not need a perfect taxonomy. You do need enough pattern recognition to choose the right first questions, the right architecture depth, and the right trade-offs.

## 2. Why It Matters in Interviews

Interviewers care about question type because it changes what "good judgment" looks like.

A strong answer to a consumer-product question usually emphasizes:
- user actions
- latency expectations
- traffic shape
- data access patterns
- scaling bottlenecks around reads and writes

A strong answer to an infrastructure or platform question usually emphasizes:
- correctness guarantees
- performance limits
- failure handling
- configuration and policy
- operational simplicity

Weak candidates often fail because they recognize the words in the prompt but not the category behind it.

Common weak patterns:
- answering a platform question with a social-app template
- answering a collaboration problem without discussing coordination or consistency
- answering a data-system prompt like it is just an API service
- giving the same microservices-plus-cache answer no matter what is asked

Strong candidates do something different:
- they identify the workload shape early
- they know which constraints matter most for this category
- they pick an answer structure that fits the prompt
- they spend their deep-dive time on the genuinely hard part of that type

In practice, question classification is not academic. It is a way to avoid solving the wrong problem.

## 3. Core Breakdown

### 3.1 The Main Categories You Will See

There is no single universal taxonomy, but these categories cover most interview prompts well:

| Category | Typical examples | What it usually tests |
| --- | --- | --- |
| Product-facing systems | Instagram, Uber, URL shortener, notification system | user flows, storage, APIs, scale, reliability |
| Infrastructure and platform | rate limiter, API gateway, distributed cache, job scheduler | correctness, throughput, policy, failure behavior |
| Data and analytics | event pipeline, metrics platform, warehouse ingestion, recommendation data flow | batch vs stream trade-offs, data modeling, storage layers |
| Real-time and collaboration | chat, collaborative editor, presence, multiplayer systems | low latency, ordering, fan-out, session coordination, consistency |
| Internal platform and workflow | CI system, deployment platform, feature flag service, workflow engine | developer-facing abstractions, orchestration, operability |

This is not the only valid grouping, but it is practical for interviews because each category has a different center of gravity.

### 3.2 Product-Facing System Design Questions

These are the most common interview prompts.

Examples:
- design instagram
- design youtube
- design a food delivery app
- design a URL shortener
- design a notification service for end users

These questions usually start from user behavior:
- what are the core user actions?
- what is the read/write ratio?
- what is the latency expectation?
- what data entities dominate the system?

Typical architecture concerns:
- API surface
- request flow
- storage model
- caching
- search or feed retrieval
- background processing
- notifications

These questions often reward a strong baseline first:
- identify the core workflow
- model the main entities
- estimate traffic
- add scale mechanisms only where they are justified

### 3.3 Infrastructure and Platform Questions

These questions focus less on end-user features and more on internal system behavior.

Examples:
- design a rate limiter
- design a distributed lock service
- design a service registry
- design a task queue
- design a configuration service

What these usually test:
- correctness under load
- consistency of policy
- bounded latency
- fault handling
- operational simplicity

A common mistake is answering these like product systems with too much user-story framing.

A better approach is to ask:
- what guarantee matters most?
- is this latency-sensitive, throughput-sensitive, or correctness-sensitive?
- what are the failure modes?
- what must happen if a dependency is unavailable?

For these questions, trade-offs often matter more than feature breadth.

### 3.4 Data and Analytics Questions

These prompts revolve around data movement, processing, storage, or analytical access.

Examples:
- design an event ingestion pipeline
- design a metrics platform
- design a clickstream analytics system
- design a warehouse loading pipeline
- design a recommendation feature data flow

These questions usually test whether you understand:
- batch vs stream trade-offs
- event volume and retention
- storage layout
- aggregation strategy
- freshness requirements
- backfill and replay concerns

The wrong answer is often to treat the system like a standard CRUD app.

The better answer usually starts by clarifying:
- what is the input data shape?
- what freshness is required?
- what queries matter most?
- are we serving operational data or analytical data?

These prompts often reward clear separation between ingestion, storage, processing, and serving layers.

### 3.5 Real-Time and Collaboration Questions

These prompts are easy to underestimate because the UI experience feels simple while the coordination problems are hard.

Examples:
- design whatsapp
- design google docs
- design a live chat system
- design a presence service
- design a multiplayer collaboration platform

These usually test:
- low-latency message or operation delivery
- ordering
- session coordination
- fan-out
- offline/reconnect behavior
- consistency under concurrent activity

A candidate who gives a static CRUD architecture here usually misses the heart of the problem.

The real focus tends to be:
- how state changes propagate
- how ordering is maintained or relaxed
- how concurrent operations are reconciled
- how hot sessions are handled

### 3.6 Internal Platform and Workflow Questions

These prompts look like infrastructure, but they often center more on workflow and system orchestration.

Examples:
- design a CI pipeline system
- design a deployment orchestrator
- design a feature flag platform
- design a workflow engine
- design a sandbox execution platform

What they often test:
- multi-step execution flow
- retries and recovery
- job state transitions
- tenant isolation
- auditability
- control plane versus data plane thinking

These questions benefit from identifying:
- who the primary user is
- what abstraction they depend on
- what lifecycle the system manages

For example, in a deployment system the hard part is often not storing deployment rows. It is handling state transitions, retries, ordering, rollback, safety, and observability.

### 3.7 Open-Ended Versus Constraint-Driven Questions

Another useful way to classify prompts is by how constrained they are.

| Type | Description | Candidate challenge |
| --- | --- | --- |
| Open-ended | broad prompt with many valid interpretations | scoping well without drifting |
| Constraint-driven | prompt centers on one dominant requirement | focusing deeply on the core bottleneck |

Examples:
- "design instagram" is usually open-ended
- "design a rate limiter for 10 million requests per second" is more constraint-driven
- "design a collaborative editor with offline support" is heavily shaped by one hard constraint

This matters because your opening should adapt.

For open-ended prompts:
- narrow the scope
- define a baseline
- say what you will not cover

For constraint-driven prompts:
- acknowledge the main constraint early
- organize the design around it

### 3.8 How to Identify the Question Type Quickly

In the first minute, ask yourself:

1. Is this mainly a user product, an internal platform, or a system primitive?
2. What is the dominant workload: CRUD, stream, coordination, scheduling, or analytics?
3. What is the likely hard part: scale, consistency, ordering, latency, or workflow?

Useful shortcut table:

| If the prompt emphasizes... | It is probably... |
| --- | --- |
| users, features, feeds, content, uploads | product-facing system design |
| policies, limits, quotas, registration, scheduling | infrastructure/platform |
| pipelines, retention, freshness, aggregation, replay | data/analytics |
| live sessions, cursors, messages, presence, sync | real-time/collaboration |
| jobs, deployment steps, execution stages, rollback | workflow/internal platform |

This does not replace clarification, but it gives you a starting frame that is usually directionally correct.

## 4. Practical Interview Framing

Once you classify the prompt, use that classification to guide how you speak.

For product-facing prompts, a strong opening sounds like:

```text
I’ll first clarify the core user flows and expected scale, then I’ll design a simple baseline for the main path before deepening the bottlenecks.
```

For infrastructure or platform prompts:

```text
I want to clarify the main correctness and performance requirements first, because the design depends heavily on what guarantees matter most.
```

For data-system prompts:

```text
I’ll clarify the input data shape, freshness requirements, and query patterns first, because those drive ingestion, storage, and processing choices.
```

For real-time prompts:

```text
I’ll start by clarifying latency, ordering, and session assumptions, since those usually define the architecture more than the CRUD model does.
```

This is useful because it tells the interviewer:
- you recognized the question type
- you know the likely hard part
- you will structure the answer accordingly

## 5. Examples or Scenarios

### Example 1: Same Generic Answer, Wrong Fit

Prompt:

```text
Design a rate limiter.
```

Weak response:

```text
I’ll start with users, posts, comments, and notifications.
```

Why it is weak:
- it uses the shape of a consumer product answer
- it ignores policy enforcement, time windows, storage for counters, and correctness

Better response:

```text
I want to clarify whether we need per-user, per-IP, or per-token limits first, and whether strict enforcement or approximate enforcement is acceptable.
```

That response matches the category.

### Example 2: Product Versus Collaboration

| Prompt | Better first deep dive |
| --- | --- |
| Design Instagram | feed generation, media storage, read/write scaling |
| Design Google Docs | conflict resolution, operation ordering, session coordination |

Both are user-facing systems, but the hard part is very different.

### Example 3: Data Prompt Versus CRUD Prompt

Prompt:

```text
Design a metrics ingestion platform.
```

Weak response:

```text
I’ll create a user service, metrics service, and dashboard service.
```

Stronger response:

```text
I first want to understand ingestion rate, retention period, cardinality pressure, freshness expectations, and the most common query shapes.
```

That response is better because it recognizes that the problem is dominated by data volume, storage, and query patterns rather than generic service decomposition.

## 6. Common Mistakes

- Treating every prompt like a social-media architecture problem.
- Not identifying the dominant constraint early enough.
- Spending most of the interview on familiar components instead of the hard part of that category.
- Using the same cache/database/queue answer template regardless of workload shape.
- Over-scoping open-ended prompts.
- Under-scoping constraint-driven prompts by ignoring the core requirement that defines them.
- Confusing internal platform prompts with consumer-product feature design.
- Missing the difference between data-serving systems and data-processing systems.

## 7. Summary Checklist

- I can classify a prompt into a practical category before diving into architecture.
- I know that different system design categories reward different kinds of depth.
- I can adjust my first questions based on whether the prompt is product, infrastructure, data, real-time, or workflow-oriented.
- I know how open-ended prompts differ from constraint-driven prompts.
- I can focus my deep dive on the real bottleneck for the category.

## 8. Quiz

### 1. Why is it dangerous to answer every system design prompt with the same structure?

Answer:
Because different prompt types test different constraints, and a generic answer often misses the real problem being evaluated.

### 2. Which category is most likely to emphasize replay, freshness, retention, and aggregation?

Answer:
Data and analytics questions.

### 3. Which category is most likely to emphasize ordering, session state, and concurrent updates?

Answer:
Real-time and collaboration questions.

### 4. What is usually the first job of a candidate when the prompt is open-ended?

Answer:
Scope it properly so the answer has a clear baseline and does not drift.

### 5. What is a useful first move for an infrastructure or platform prompt?

Answer:
Clarify the primary correctness, latency, and failure-handling requirements before proposing components.

## 9. Quick Interview Checklist

```text
Classification:
  [ ] I can tell whether the prompt is product, platform, data, real-time, or workflow-heavy

Scoping:
  [ ] I know whether the prompt is open-ended or constraint-driven
  [ ] I choose my first questions based on the dominant workload shape

Depth:
  [ ] I focus my deep dive on the hardest part of this category
  [ ] I avoid reusing the same answer template for every prompt

Communication:
  [ ] I can explain why this question type changes the design discussion
```
