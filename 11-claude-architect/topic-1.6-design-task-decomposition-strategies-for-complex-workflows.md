# Topic 1.6: Design Task Decomposition Strategies for Complex Workflows

This note explains how to choose the right decomposition pattern for a complex task: when to use a fixed sequential pipeline, when to branch work in parallel, when to let the decomposition adapt based on new findings, and how to prevent broad tasks from collapsing into shallow or chaotic execution.

Topic 1.4 focused on enforced workflows. Topic 1.5 focused on hook-based interception and normalization. Topic 1.6 focuses on the shape of the work itself: how you break a complex problem into steps or subtasks that Claude can actually execute well.

## Why This Topic Matters

A lot of agent failures are really decomposition failures.

Examples:

- a review prompt asks for too many dimensions at once, so the output becomes shallow
- an open-ended engineering task is treated as a fixed checklist even though the right next step depends on what gets discovered
- a broad code review is run as one giant pass, so cross-file issues are missed and attention gets diluted
- a task that could be parallelized is serialized for no good reason

Good decomposition improves:

- coverage
- focus
- latency
- reliability
- recoverability

## What the Exam Is Testing

For this topic, the exam is usually looking for these ideas:

- fixed sequential pipelines are good when the task shape is predictable
- dynamic decomposition is better when the next steps depend on intermediate findings
- prompt chaining is useful for structured reviews and predictable multi-step work
- large reviews often benefit from local passes plus a separate integration pass
- open-ended tasks should begin with structure mapping and prioritization rather than immediate execution
- the best decomposition pattern depends on the workflow, not on one universal rule

## The Core Mental Model

The simplest correct mental model is:

```text
understand task shape
    ->
choose decomposition strategy
    ->
run focused steps or subtasks
    ->
evaluate what was learned
    ->
either continue the planned flow or adapt the plan
```

Topic 1.6 is really about deciding how much of the work can be planned up front versus how much should emerge from the evidence you collect.

## Anthropic's High-Level Framing

Anthropic's workflow guidance draws a useful distinction:

- workflows are predefined code paths
- agents dynamically direct their own process

That distinction maps directly to Topic 1.6.

If the task is stable and easy to decompose ahead of time:

- prefer a workflow-like decomposition

If the task is open-ended and depends on discoveries along the way:

- prefer an adaptive agentic decomposition

The exam is not asking you to memorize jargon. It is asking whether you can match the decomposition pattern to the real task shape.

## The Three Main Decomposition Patterns

For Topic 1.6, the most useful mental split is:

1. fixed sequential decomposition
2. parallel decomposition
3. dynamic adaptive decomposition

## 1. Fixed Sequential Decomposition

Fixed sequential decomposition means the task is broken into ordered steps that are known in advance.

This usually looks like:

```text
step 1 -> step 2 -> step 3
```

Use it when:

- the task has a predictable structure
- each step depends on the previous one
- the output of one step becomes the input to the next
- you want consistent repeatable behavior

Examples:

- classify a request, then choose a response template, then validate output
- review each file, then do a cross-file integration pass
- generate an outline, validate it, then write the full content

Anthropic's "prompt chaining" pattern is the clearest example of this.

## Prompt Chaining

Prompt chaining decomposes work into sequential LLM calls where each step processes the prior step's output.

Anthropic explicitly notes that you can add programmatic checks or gates on intermediate steps to keep the chain on track.

This is a strong fit when:

- the task can be cleanly broken into fixed subtasks
- each subtask is easier than the whole problem
- intermediate validation improves quality

For exam prep, prompt chaining is the default answer for:

- predictable multi-aspect review work
- fixed review pipelines
- tasks where step order is clearly known in advance

## 2. Parallel Decomposition

Parallel decomposition means independent parts of the problem are worked on simultaneously and later aggregated.

This usually looks like:

```text
shared context
    ->
subtask A
subtask B
subtask C
    ->
aggregate results
```

Use it when:

- the subtasks are genuinely independent
- speed matters
- each branch needs focused attention
- the results can be recombined cleanly

Examples:

- separate billing, shipping, and account-access investigations
- review security, style, and test coverage in parallel
- research multiple independent topic areas at once

Parallelization is good for breadth, but it is not automatically good for everything. Tasks with strong dependencies often do better in sequence.

## 3. Dynamic Adaptive Decomposition

Dynamic adaptive decomposition means the system does not decide every subtask up front.

Instead, it:

- maps the problem
- gathers early findings
- creates follow-up subtasks based on what it discovers
- revises the plan as dependencies and risks become clearer

This is the right pattern when:

- the task is open-ended
- you cannot reliably predict the needed subtasks ahead of time
- later work depends on what earlier investigation reveals

Examples:

- "Add comprehensive tests to a legacy codebase"
- "Investigate why production latency increased after the last release"
- "Review this unfamiliar monorepo and identify the highest-risk architectural issues"

In Anthropic's workflow language, this is closest to orchestrator-workers or broader agentic decomposition, where the orchestrator decides the subtasks dynamically from the specific input.

## Fixed vs Adaptive: The Key Question

A useful question is:

- Can I know the right steps before I start?

If yes:

- fixed sequential decomposition is often better

If no:

- use adaptive decomposition

This is the heart of Topic 1.6.

Many mistakes come from forcing an adaptive problem into a rigid pipeline, or forcing a predictable problem into a needlessly open-ended agent loop.

## Pattern Selection Guide

Here is the practical decision rule:

### Use prompt chaining when:

- the workflow is predictable
- the steps are known ahead of time
- you want consistent ordered execution
- each step produces a clear artifact for the next one

### Use parallel decomposition when:

- branches are independent
- they can run without waiting on one another
- you want faster coverage or focused analysis

### Use dynamic adaptive decomposition when:

- the task is exploratory
- the next subtask depends on new evidence
- you need to map structure before deciding what matters

## Code Review as the Canonical 1.6 Example

The exam guide explicitly points to a strong code review decomposition:

- analyze each file individually
- then run a separate cross-file integration pass

This matters because broad reviews fail when everything is mixed together in one pass.

Why the two-stage pattern works:

- the local pass gives focused attention to file-specific issues
- the integration pass catches cross-file risks, interface mismatches, and system-level problems
- the model does not have to hold every review dimension across every file at once

This reduces attention dilution.

## Example: Large Code Review Decomposition

Weak decomposition:

- "Review this whole codebase for correctness, maintainability, architecture, tests, and security."

Why it is weak:

- too many dimensions at once
- poor locality
- easy to miss file-specific details
- easy to miss integration issues too

Stronger decomposition:

```text
1. review each changed file locally
2. record file-specific findings
3. run a separate cross-file integration pass
4. merge results into one prioritized review
```

This is the kind of decomposition the exam wants you to recognize.

## Example: Open-Ended Testing Task

User asks:

> "Add comprehensive tests to this legacy codebase."

This is not a fixed pipeline problem.

You do not yet know:

- which modules matter most
- where the fragile logic lives
- what test harnesses already exist
- which dependencies will block safe changes

So the right decomposition usually starts with discovery:

```text
1. map codebase structure
2. identify high-impact or high-risk areas
3. inspect existing test coverage and tooling
4. choose an initial priority slice
5. implement tests for that slice
6. re-evaluate what should come next
```

This is adaptive decomposition, not static checklist execution.

## Why "Map First, Then Prioritize" Matters

Anthropic's later engineering guidance on long-running coding agents reinforces this pattern.

For open-ended work, asking the model to do one focused increment at a time often works much better than asking it to solve everything at once.

The important idea is:

- first build a map of the problem
- then choose a priority slice
- then make incremental progress
- then reassess

That is much safer than:

- "Just add comprehensive tests everywhere"

## Incremental Progress Is a Decomposition Strategy

Anthropic's long-running agent work found that asking the coding agent to work on only one feature at a time was critical for reducing the tendency to do too much at once.

That insight applies directly to Topic 1.6.

A good decomposition often creates:

- smaller scopes
- clearer completion criteria
- cleaner checkpoints
- better recovery when a step fails

This is especially important in coding and CI tasks.

## Breadth vs Depth

Anthropic's multi-agent research system highlights another useful decomposition idea:

- some questions need breadth first
- some questions need depth first

Breadth-first decomposition is useful when:

- the task has multiple independent directions
- you need landscape coverage before deciding where to focus

Depth-first decomposition is useful when:

- one branch is already clearly high-value
- later work depends on understanding one area deeply first

Good decomposition often means choosing the right balance:

- explore enough breadth to avoid blind spots
- then go deep where the evidence says it matters

## Orchestrator-Workers as Adaptive Decomposition

Anthropic's orchestrator-workers pattern is a strong fit for dynamic decomposition.

The central idea is:

- a lead process breaks down the work dynamically
- workers handle focused subtasks
- the lead process synthesizes and decides what to do next

Use it when:

- you cannot predict all needed subtasks in advance
- the number and shape of subtasks depends on the input

This is often a better answer than fixed parallelization for complex coding or investigative tasks.

## When Not to Over-Decompose

Decomposition can also go wrong by becoming too fragmented.

Bad signs:

- too many tiny subtasks with high coordination overhead
- duplicated investigation across branches
- local passes with no integration pass
- rigid step sequences for tasks that should adapt
- dynamic branching on tasks that were simple enough for one clean workflow

A decomposition is only good if it makes execution easier, clearer, or more reliable.

## Common Failure Modes

### 1. Using one giant pass for a multi-aspect review

Problem:

- the model tries to inspect everything everywhere all at once

Effect:

- shallow findings and missed issues

### 2. Forcing a rigid checklist onto an exploratory task

Problem:

- the system commits to fixed steps before it understands the problem structure

Effect:

- wasted effort and missed high-impact areas

### 3. Treating dependent tasks as if they were parallel

Problem:

- later branches actually need outputs from earlier ones

Effect:

- rework, contradictions, or empty branches

### 4. Skipping the integration pass

Problem:

- local subtasks finish, but no one checks system-level consistency

Effect:

- cross-file or cross-step issues remain hidden

### 5. Starting implementation before mapping the terrain

Problem:

- the agent begins changing code before understanding structure, risk, or tooling

Effect:

- poor prioritization and unstable progress

### 6. Breaking work into too many tiny pieces

Problem:

- the coordination cost becomes larger than the benefit of decomposition

Effect:

- slower execution and noisier synthesis

## Topic 1.6 vs Topic 1.2

These topics overlap, but they are not the same.

Topic 1.2 is mostly about:

- coordinator-subagent architecture
- orchestration roles
- context isolation

Topic 1.6 is mostly about:

- choosing the decomposition pattern itself
- deciding between sequence, parallelism, and adaptive branching
- structuring review and investigation workflows

A good way to remember it:

- Topic 1.2 = "How do multiple agents cooperate?"
- Topic 1.6 = "How should the work be broken down in the first place?"

## Design Principles to Remember

Strong decomposition is usually:

- matched to the true task shape
- focused enough to reduce attention dilution
- explicit about dependencies
- willing to adapt when new evidence appears
- disciplined about integration after local analysis

The main design question is:

- What is the simplest decomposition that gives enough structure without destroying the flexibility the task actually needs?

That is the heart of Topic 1.6.

## Exam Takeaways

If you remember only a few things for Topic 1.6, remember these:

1. Use prompt chaining when the steps are predictable and ordered.
2. Use dynamic decomposition when the right subtasks depend on what you discover.
3. Use parallel decomposition only when the branches are truly independent.
4. Large reviews often need per-file local analysis plus a separate cross-file integration pass.
5. Open-ended engineering tasks should begin with mapping and prioritization, not immediate broad execution.
6. Incremental progress is often better than trying to solve everything in one pass.
7. Good decomposition reduces attention dilution and improves coverage.

## Quick Self-Check

You understand Topic 1.6 if you can answer yes to these questions:

- Can I explain when prompt chaining is better than adaptive decomposition?
- Can I explain when parallel branches are appropriate and when they are not?
- Can I design a code review flow with local passes plus a separate integration pass?
- Can I explain why open-ended tasks should often begin with structure mapping?
- Can I describe how an evolving plan differs from a static checklist?
- Can I explain why over-decomposition can hurt rather than help?

## References

- Anthropic, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, "How we built our multi-agent research system": https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic, "Effective harnesses for long-running agents": https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
