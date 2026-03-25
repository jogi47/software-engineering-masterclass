# Topic 1.3: Configure Subagent Invocation, Context Passing, and Spawning

This note explains the mechanics behind invoking subagents, defining them correctly, deciding what context they receive, and spawning them in ways that improve quality instead of creating confusion.

Topic 1.2 explained the architecture of a coordinator-subagent system. Topic 1.3 goes one level deeper into implementation: how subagents are actually configured and called.

## Why This Topic Matters

A multi-agent design only works if the coordinator can:

- invoke the right subagent at the right time
- pass the right context into that subagent
- restrict the subagent to the right tools and role
- collect results in a form that can be used later

Many weak multi-agent systems fail not because the architecture is wrong, but because the coordinator assumes too much:

- that subagents automatically know everything the parent knows
- that subagents can infer missing scope
- that results can be passed back as loose prose without losing attribution
- that parallel spawning works automatically without careful prompt design

Topic 1.3 is about getting those details right.

## What the Exam Is Testing

Important terminology note:

- the exam guide uses the older `Task` tool name
- current Anthropic docs use `Agent`
- in current tooling, `Task` is legacy wording and may still appear as an alias in some places

For this topic, the exam is usually looking for these concepts:

- subagents are invoked through the subagent tool
- for exam prep, know that the exam guide calls it `Task` while current docs call it `Agent`
- the coordinator must be allowed to use that subagent tool
- subagents do not automatically inherit full parent context
- context must be passed explicitly in the prompt or input
- agent definitions need clear descriptions, prompts, and tool restrictions
- parallel spawning is useful when subtasks are independent
- structured context handoff is better than dumping unstructured prose
- coordinator prompts should define goals and quality criteria, not micromanage every step

## The Core Mental Model

The simplest correct mental model is:

```text
coordinator decides delegation is useful
    ->
coordinator invokes a subagent through the subagent tool
    ->
subagent receives explicit prompt + scoped tools + isolated context
    ->
subagent works independently
    ->
subagent returns results
    ->
coordinator decides what to do next
```

The important part is "explicit prompt + scoped tools + isolated context." That is what the coordinator is configuring.

## How Subagent Invocation Works

In Anthropic's tooling, subagents are separate agent instances that the main agent can spawn for focused subtasks.

In the Agent SDK:

- subagents are defined through the `agents` parameter
- the main agent invokes them through the `Agent` tool
- older exam materials may still refer to this as `Task`
- `Agent` must be present in the main agent's `allowedTools`

In Claude Code:

- subagents can be defined as files in `.claude/agents/` or `~/.claude/agents/`
- Claude can choose them automatically when appropriate
- you can also explicitly request a specific subagent

The underlying idea is the same in both cases: a parent agent delegates focused work to a separate worker with its own role and context window.

## The `Task` / `Agent` Tool Is the Invocation Mechanism

This is one of the most testable details in the exam because the terminology has shifted over time.

If a coordinator needs to spawn subagents, it must be able to use the subagent tool.

That means:

- in current docs, the main agent must have `Agent` in its allowed tools
- in the older exam-guide wording, this appears as `Task`
- if that tool is missing, the coordinator cannot delegate to subagents

This matters because the failure mode is easy to miss in design discussions. The architecture may assume subagents exist, but the actual runtime permissions may silently prevent delegation.

## Main Agent vs Subagent Tool Permissions

The parent agent and subagents should not automatically have the same tool access.

The usual pattern is:

- the main agent gets orchestration-relevant tools, including `Agent`
- each subagent gets only the tools needed for its role

Important nuance from the SDK docs:

- subagents should not themselves get `Agent`
- the SDK docs explicitly say subagents cannot spawn their own subagents and advise not to include `Agent` in a subagent's tools array

That matches good architecture:

- the coordinator coordinates
- subagents work

If subagents can all spawn more subagents without discipline, the system quickly becomes harder to reason about.

## What Subagents Actually Inherit

This is the single biggest conceptual trap in Topic 1.3:

Subagents do not automatically share the parent's full context and memory in the way many people assume.

You should assume:

- the subagent does not know the full conversation unless you pass the relevant part
- the subagent does not know prior findings unless you include them
- sibling subagents do not automatically know each other's results

This is why explicit context passing is mandatory, not optional.

## Why Explicit Context Passing Matters

A subagent can only do high-quality work if it receives:

- the exact task it owns
- the constraints it should follow
- the evidence it should rely on
- the output format it should return

If you pass too little context:

- the subagent makes shallow decisions
- it misses constraints
- it duplicates already completed work
- it cannot attribute findings properly

If you pass too much irrelevant context:

- the subagent's context window gets polluted
- the benefit of isolation is weakened
- reasoning quality can drop

So the goal is not "pass everything." The goal is "pass exactly what this subagent needs."

## What Good Context Passing Looks Like

Good context passing usually includes:

- the subtask goal
- relevant prior findings
- constraints and success criteria
- any required output shape
- source metadata that must be preserved

Example:

```text
Task:
Analyze these three research findings and produce a synthesis of the security tradeoffs.

Prior findings:
- Finding 1 ...
- Finding 2 ...
- Finding 3 ...

Constraints:
- Preserve source attribution
- Flag contradictions explicitly
- Return output as JSON with claim, evidence, source, and uncertainty
```

That is much stronger than:

```text
Please synthesize the earlier research.
```

The second version assumes the subagent somehow knows what "earlier research" means.

## Agent Definition Configuration

In the Agent SDK, subagents are defined with `AgentDefinition`.

The key configuration fields are:

- `description`
- `prompt`
- `tools`
- optionally `model`

These fields matter for different reasons.

### `description`

This tells Claude when the agent should be used.

It should answer:

- what this subagent is good at
- when the coordinator should invoke it
- what type of task belongs to it

Weak description:

- "Research agent"

Strong description:

- "Security-focused document analysis specialist. Use when you need structured findings about risk, controls, and compliance gaps in long documents."

### `prompt`

This is the subagent's system prompt. It defines:

- role
- scope
- approach
- quality bar
- output expectations
- constraints

This is where you shape behavior, not just identity.

### `tools`

This limits what the subagent can do.

Examples:

- a synthesis agent might only need `Read`
- a web research agent might need search tools
- a test runner might need `Bash`, `Read`, and `Grep`

Restricting tools helps the subagent stay in role and reduces tool misuse.

### `model`

This can be used when one subagent needs a different tradeoff than the main agent, such as lower cost or higher capability.

For the exam, the main idea is not model tuning itself. The key point is that agent definitions can encode role-specific configuration.

## Claude Code File-Based Subagents

In Claude Code, subagents can also be defined as Markdown files with YAML frontmatter.

Typical locations:

- `.claude/agents/` for project-level subagents
- `~/.claude/agents/` for user-level subagents

Typical structure:

```md
---
name: code-reviewer
description: Expert code review specialist for maintainability and security
tools: Read, Grep, Glob
---

You are a code reviewer...
```

This is another reminder that subagents are not magical workers. They are configured entities with:

- a declared purpose
- declared permissions
- a real prompt

## Built-In and General-Purpose Subagents

Anthropic also documents a built-in general-purpose subagent.

This is useful when:

- you want delegation
- but you do not need a custom specialist with a deeply specialized prompt

Still, the same rules apply:

- the coordinator must decide when to use it
- the handoff prompt must still be clear
- the subtask must still be scoped appropriately

## Context Passing: Raw Text vs Structured Handoffs

The exam heavily favors structured handoffs.

### Unstructured handoff

Example:

```text
We looked at a bunch of pages and there were several interesting findings.
One source said X, another said Y, and we think maybe Z.
Please synthesize this.
```

Problems:

- attribution is weak
- evidence is mixed with interpretation
- contradictions are hard to track
- downstream synthesis becomes error-prone

### Structured handoff

Example:

```json
[
  {
    "claim": "Vendor A supports self-hosting",
    "evidence": "Deployment guide states on-prem is supported",
    "source_url": "https://example.com/deploy",
    "publication_date": "2026-01-10"
  },
  {
    "claim": "Vendor A does not support air-gapped deployment",
    "evidence": "FAQ states internet connectivity is required",
    "source_url": "https://example.com/faq",
    "publication_date": "2026-02-14"
  }
]
```

Benefits:

- the next agent can reason over explicit fields
- metadata remains attached to each claim
- contradictions stay visible
- synthesis can preserve provenance

This is exactly the kind of structure the exam expects you to recognize as superior.

## Content vs Metadata

This distinction is especially important in Topic 1.3.

### Content

The actual finding or meaning:

- claim
- summary
- evidence excerpt
- conclusion

### Metadata

The supporting identity and location fields:

- source URL
- document name
- page number
- publication date
- author
- confidence

If content and metadata are mixed loosely in prose, attribution gets lost easily. If they are separated in structured form, downstream agents can preserve source fidelity.

## Parallel Spawning

Parallel spawning is another key exam concept in this topic.

If subtasks are independent, the coordinator should often spawn multiple subagents at once.

Why that helps:

- lower latency
- broader coverage
- better use of context isolation

Anthropic's multi-agent guidance strongly emphasizes parallelization as one of the main reasons multi-agent systems outperform single agents on broad research tasks.

## What "Spawn in Parallel" Really Means

The exam guide frames this as:

- emit multiple subagent tool calls in a single coordinator response
- do not unnecessarily serialize independent work across separate turns

That means:

- if the coordinator already knows the subtasks are independent, it should not wait for one subagent before launching the next
- if it does serialize unnecessarily, the system becomes slower with no quality gain

### Good parallel spawning

Subtasks:

- research pricing
- research deployment model
- research compliance and security

These can start together.

### Bad unnecessary serialization

Coordinator behavior:

1. run pricing subagent
2. wait
3. run deployment subagent
4. wait
5. run compliance subagent

If the three tasks do not depend on each other, this is just slower.

## When Not to Spawn in Parallel

Parallel spawning is not always correct.

Do not parallelize blindly when:

- later tasks depend on earlier outputs
- the task has a strongly sequential workflow
- the decomposition is still uncertain
- the subtask boundaries are not yet clean

In those cases, serial or staged delegation may be the better design.

## Coordinator Prompt Design for Subagents

The exam guide makes an important distinction here.

The coordinator should generally tell subagents:

- the goal
- the scope
- the quality criteria
- the output format

It should usually avoid over-specifying every internal reasoning step.

### Good coordinator prompt style

```text
Research the pricing models of these vendors.
Return a structured table with pricing model, seat-based vs usage-based notes,
enterprise licensing notes, and source links.
Flag uncertainty explicitly.
```

Why this works:

- the goal is clear
- the output shape is clear
- the quality standard is clear
- the subagent still has room to adapt

### Weak coordinator prompt style

```text
First search pricing.
Then read one page.
Then read another page.
Then summarize in exactly three bullets.
Then check if you missed anything.
```

Problems:

- too procedural
- brittle
- reduces the subagent's ability to adapt to findings
- often under-specifies quality while over-specifying steps

The exam usually prefers the first style.

## Practical Example

Imagine this user task:

> "Compare three AI coding tools for enterprise adoption and cite all major claims."

A strong coordinator might configure three parallel subagents:

- one for pricing and packaging
- one for security/compliance
- one for developer workflow integration

Each subagent gets:

- the exact vendor list
- the dimension it owns
- the expected structured output format
- instructions to preserve sources and uncertainty

The coordinator then:

- merges the outputs
- detects missing evidence for one vendor in the compliance area
- spawns a follow-up subagent only for that gap
- synthesizes the final answer

This design uses:

- explicit invocation
- explicit context passing
- structured handoff
- parallel spawning
- targeted refinement

That is exactly the shape Topic 1.3 wants you to understand.

## Common Mistakes

### 1. Assuming subagents know the parent context

Wrong:

- "The subagent will know what we already found."

Right:

- pass the relevant prior findings directly.

### 2. Giving vague delegation prompts

Wrong:

- "Look into this and report back."

Right:

- define the goal, scope, format, and quality criteria.

### 3. Passing only prose without structure

Wrong:

- long narrative handoffs with mixed evidence and interpretation

Right:

- structured findings with source metadata

### 4. Forgetting the subagent tool in the main agent's allowed tools

Wrong:

- architecture assumes subagents exist but runtime permissions prevent invocation

Right:

- ensure the coordinator can actually call `Agent`

### 5. Giving subagents unnecessary tools

Wrong:

- every subagent inherits a broad toolset

Right:

- restrict tools based on role

### 6. Serializing obviously independent work

Wrong:

- one subagent at a time for independent branches

Right:

- parallelize when subtasks do not depend on each other

### 7. Micromanaging subagent reasoning

Wrong:

- step-by-step procedural prompts for adaptive tasks

Right:

- specify outcomes and standards, then let the subagent adapt

## Topic 1.2 vs Topic 1.3

These topics are closely related, but the exam separates them for a reason.

Topic 1.2 is mostly about:

- multi-agent architecture
- coordinator-subagent patterns
- decomposition and orchestration

Topic 1.3 is mostly about:

- invocation mechanics
- configuration of subagents
- explicit context passing
- structured handoffs
- spawning behavior

A good way to remember it:

- Topic 1.2 = "How should the system be organized?"
- Topic 1.3 = "How do I configure and invoke those subagents correctly?"

## Design Principles to Remember

Good subagent invocation design is usually:

- explicit
- role-based
- tool-scoped
- structured
- parallel where helpful
- careful about attribution

The coordinator should think:

- What should this subagent do?
- What must it know?
- What should it not need to know?
- Which tools should it have?
- What output format will make the next step easiest?

That is the mindset behind Topic 1.3.

## Exam Takeaways

If you remember only a few things for Topic 1.3, remember these:

1. The exam guide uses `Task`, but current Anthropic docs use `Agent`.
2. The coordinator must be allowed to use that subagent tool.
3. Subagents do not automatically inherit full parent context.
4. Pass prior findings explicitly when they matter.
5. Keep content and metadata structured and separate.
6. Spawn independent subtasks in parallel when possible.
7. Define goals and quality criteria, not brittle step-by-step scripts.
8. Restrict each subagent's tools to its real role.

## Quick Self-Check

You understand Topic 1.3 if you can answer yes to these questions:

- Can I explain why the coordinator needs `Agent` in its allowed tools, and why the exam guide may call it `Task`?
- Can I explain what a subagent does and does not inherit automatically?
- Can I define a subagent using description, prompt, and tools?
- Can I design a structured handoff that preserves attribution?
- Can I explain when parallel spawning is better than serialized delegation?
- Can I explain why outcome-focused prompts are usually better than procedural micromanagement?

## References

- Anthropic, "Subagents in the SDK": https://platform.claude.com/docs/en/agent-sdk/subagents
- Anthropic, "Subagents" (Claude Code): https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Anthropic, "How we built our multi-agent research system": https://www.anthropic.com/engineering/multi-agent-research-system
