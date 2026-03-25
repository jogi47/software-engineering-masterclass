# Topic 1.2: Orchestrate Multi-Agent Systems with Coordinator-Subagent Patterns

This note explains how multi-agent Claude systems are structured, why a coordinator-subagent pattern works, when it is worth the extra complexity, and what design mistakes the exam is likely to test.

Topic 1.1 was about the loop inside one agent. Topic 1.2 is about what happens when one agent is not enough and you need a lead agent to coordinate several specialized agents.

## Why This Topic Matters

A single agent is often enough for simple tasks. Multi-agent systems become useful when the work naturally breaks into distinct parallel or specialized subtasks, such as:

- researching multiple independent areas at once
- exploring different parts of a codebase in parallel
- separating search, analysis, and synthesis roles
- isolating verbose work into smaller focused contexts

The exam is testing whether you know how to use that extra complexity deliberately rather than creating a messy swarm of agents.

## What the Exam Is Testing

For Topic 1.2, the exam is usually looking for these ideas:

- the coordinator is the control plane
- subagents are focused workers, not independent peers making system-level decisions
- context does not magically flow between agents
- decomposition quality determines coverage quality
- the coordinator must evaluate gaps, re-delegate, and synthesize
- communication should usually stay routed through the coordinator for observability and control

## The Core Pattern

The standard pattern is often called:

- coordinator-subagent
- orchestrator-worker
- hub-and-spoke

The shape is simple:

```text
user request
    ->
coordinator agent
    ->
spawn specialized subagents
    ->
subagents return findings to coordinator
    ->
coordinator aggregates, checks coverage, and answers
```

This is not usually a peer-to-peer network. In the default exam-oriented pattern, the coordinator is the hub and the subagents are spokes.

## What the Coordinator Does

The coordinator is responsible for system-level thinking.

Its job includes:

- understanding the user's request
- deciding whether the task should stay single-agent or become multi-agent
- decomposing the task into useful subproblems
- choosing which subagents to invoke
- deciding what context each subagent gets
- collecting outputs from subagents
- identifying missing coverage or contradictions
- deciding whether more investigation is needed
- synthesizing or routing the final answer

If the coordinator is weak, the whole system becomes weak, even if each subagent works correctly.

## What Subagents Do

Subagents are specialized workers with narrower responsibilities.

Their job is usually to do one well-bounded piece of work, such as:

- search the web
- analyze a document set
- inspect a code area
- verify a fact
- summarize findings into a structured format

Subagents should usually not, in the default coordinator-subagent pattern:

- redefine the whole system plan
- talk directly to other subagents as peers
- make final synthesis decisions for the whole system unless explicitly assigned
- accumulate the full coordinator context unnecessarily

## Why the Hub-and-Spoke Pattern Works

Anthropic's documentation and engineering guidance point to a consistent reason: context control.

The hub-and-spoke pattern helps because:

- each subagent can work in an isolated context window
- the coordinator stays focused on high-level progress
- the system has one clear place for routing, logging, recovery, and synthesis
- failures are easier to reason about when one agent owns orchestration

In other words, the pattern is not just about parallelism. It is about control.

## Context Isolation Is a Feature, Not a Bug

One of the most important ideas in this topic is that subagents operate in separate contexts.

That means:

- they do not automatically inherit everything the coordinator knows
- they do not share memory with each other by default
- they must be given the right context deliberately

This is useful because it:

- keeps the main thread from being polluted by verbose exploration
- keeps subagents focused on their specific assignment
- reduces irrelevant context that hurts reasoning quality

It becomes a problem only when the coordinator fails to pass the right inputs.

## When to Use Multi-Agent Systems

You should not reach for multi-agent orchestration automatically.

Multi-agent designs make sense when:

- the task has multiple independent branches
- specialized prompts or tools produce better results by role
- context would become too large for one agent to manage well
- you want to search or analyze in parallel
- the output benefits from separation of search, analysis, and synthesis

A single agent is usually better when:

- the task is short and linear
- the context is still manageable
- the overhead of coordination is greater than the benefit of decomposition
- the subtasks are tightly coupled and cannot progress independently

This is a recurring Anthropic theme: keep the system as simple as the task allows.

## Coordinator Design Principles

A strong coordinator should:

- analyze the query before delegating
- create a decomposition that matches the real shape of the problem
- choose subagents only when they add value
- pass explicit goals, scope, and output expectations
- collect results in structured form
- check for gaps and contradictions before final synthesis

A weak coordinator often:

- always invokes every subagent whether needed or not
- breaks a broad topic into overly narrow or repetitive subtasks
- delegates vague prompts like "research this"
- accepts the first set of outputs without checking coverage

## Good Task Decomposition

The hardest part of multi-agent orchestration is usually not spawning agents. It is decomposition.

Good decomposition:

- covers the full problem space
- gives each subagent distinct scope
- avoids duplicated work
- produces outputs that are easy to combine

Common decomposition strategies:

- by subtopic
- by data source type
- by workflow phase
- by code area
- by verification function

### Example: good decomposition

User asks:

> "Research the impact of AI on creative industries."

Good decomposition might be:

- AI and music
- AI and film production
- AI and writing/publishing
- AI and visual arts

Bad decomposition might be:

- AI in digital art
- AI in graphic design
- AI in photography

The bad version is too narrow. It misses large parts of the actual topic. The subagents may perform perfectly and still produce an incomplete result.

## The Coordinator Loop

A strong multi-agent system still has a loop. The difference is that the coordinator's loop is about orchestration, not only tool use.

The coordinator loop often looks like this:

```text
1. analyze request
2. decide if multi-agent is needed
3. define subtasks
4. dispatch subagents
5. collect outputs
6. evaluate coverage and quality
7. if gaps exist, re-delegate
8. synthesize final answer
```

That "evaluate and re-delegate" step is what turns a coordinator from a dispatcher into an orchestrator.

## Pseudocode for the Coordinator Pattern

```python
def handle_request(user_query):
    plan = coordinator.analyze(user_query)

    subtasks = coordinator.decompose(plan)
    results = run_subagents_in_parallel(subtasks)

    assessment = coordinator.evaluate(results)

    while assessment.has_gaps:
        follow_up_subtasks = coordinator.create_follow_up_tasks(assessment)
        follow_up_results = run_subagents_in_parallel(follow_up_subtasks)
        results.extend(follow_up_results)
        assessment = coordinator.evaluate(results)

    return coordinator.synthesize(results)
```

This is the essence of Topic 1.2:

- decompose
- delegate
- evaluate
- refine
- synthesize

## Why Subagents Should Usually Report Back to the Coordinator

The exam guide explicitly favors routing communication through the coordinator.

That is the right default because it improves:

- observability
- traceability
- consistent error handling
- controlled information flow
- synthesis quality

If subagents talk freely to each other without a clear control model, you can lose:

- a clean audit trail
- consistent shared assumptions
- clear ownership of conflict resolution

In practice, direct agent-to-agent communication often creates hidden state and harder debugging.

## Structured Outputs Make Aggregation Easier

The coordinator works best when subagents return structured outputs instead of loose prose.

Useful structured fields include:

- claim or finding
- evidence
- source URL or document name
- publication date
- confidence or uncertainty note
- relevance or priority

Structured outputs help the coordinator:

- merge results cleanly
- detect duplicate findings
- trace claims back to sources
- identify missing areas
- synthesize without losing provenance

## Parallelism: Why It Helps and What It Costs

Parallel subagents are one of the main benefits of multi-agent systems.

Parallelism helps when:

- subtasks are independent
- latency matters
- breadth of search matters
- the coordinator needs diverse findings quickly

But parallelism also introduces costs:

- more coordination complexity
- more result-merging work
- more chances for duplicated effort
- harder state management
- more complex error propagation

So the question is not "can these run in parallel?" It is "does parallelism improve the outcome enough to justify the coordination overhead?"

## Iterative Refinement Is Part of the Pattern

A common mistake is to treat the first round of subagent outputs as final.

A strong coordinator should ask:

- Did the subagents cover the whole problem?
- Are there contradictions?
- Are any high-value areas still missing?
- Did one subagent find something that should change the overall plan?

If the answer is yes, the coordinator should:

- create follow-up subtasks
- target specific missing areas
- re-run only the needed agents
- then synthesize again

This is why the coordinator must do more than just fan out work.

## Practical Example

Imagine a research request:

> "Compare open-source agent frameworks for enterprise use."

A strong coordinator might do this:

1. Decide the task needs multiple agents because the topic is broad.
2. Decompose by evaluation dimensions:
   - framework architecture
   - deployment and ops
   - security and governance
   - ecosystem maturity
3. Spawn one subagent for each dimension.
4. Ask each subagent to return structured findings and sources.
5. Check whether any framework lacks enough evidence in one dimension.
6. Re-delegate targeted follow-up research for the missing areas.
7. Synthesize a final comparison matrix.

That is good orchestration.

A weak coordinator might:

- ask three subagents to "research agent frameworks"
- receive overlapping summaries
- miss security entirely
- produce a shallow final answer

## Common Failure Modes

### 1. Overly narrow decomposition

Problem:

- the coordinator slices the task so narrowly that it misses major areas

Effect:

- the final answer looks coherent but is incomplete

### 2. Duplicate work across subagents

Problem:

- multiple subagents search or analyze the same area

Effect:

- wasted latency and token budget
- less overall coverage

### 3. Vague subagent instructions

Problem:

- subagents get prompts that are too generic

Effect:

- they drift, duplicate work, or interpret the task differently

### 4. No coordinator evaluation step

Problem:

- the coordinator aggregates immediately without checking for gaps

Effect:

- missing evidence goes unnoticed

### 5. Direct peer communication without a clear control model

Problem:

- subagents become a loose network instead of coordinated workers

Effect:

- hard-to-debug state and inconsistent outputs

### 6. Giving every task to every subagent

Problem:

- the coordinator always runs the full pipeline

Effect:

- unnecessary cost and slower responses

## How This Topic Shows Up in Claude Tooling

In Claude Code and the Claude Agent SDK, subagents are supported directly, but the architecture still matters.

You still need to decide:

- which agents exist
- what each one is for
- when the coordinator should invoke them
- what context and tools each one gets
- how results come back

The SDK gives you mechanics. Topic 1.2 is about using those mechanics well.

## Topic 1.2 vs Topic 1.3

These two topics are close, but they are not the same.

Topic 1.2 focuses on:

- architecture
- orchestration
- decomposition
- aggregation
- coordinator behavior

Topic 1.3 focuses more on:

- invocation mechanics
- context passing details
- spawning behavior
- configuration of subagent definitions

If Topic 1.1 is "how one agent loops," Topic 1.2 is "how many agents cooperate under one lead."

## Design Principles to Remember

Anthropic's guidance across docs and engineering posts is consistent:

- prefer simple systems first
- add subagents only when specialization or parallelism clearly helps
- keep one clear orchestration layer
- make decomposition explicit
- keep outputs structured
- preserve context boundaries intentionally

Good multi-agent systems are usually:

- modular
- observable
- easy to debug
- explicit about roles
- deliberate about context

## Exam Takeaways

If you remember only a few things for Topic 1.2, remember these:

1. The coordinator owns planning, delegation, aggregation, and synthesis.
2. Subagents are specialized workers with isolated context.
3. Decomposition quality determines coverage quality.
4. Broad tasks should be partitioned so subagents do not duplicate work.
5. Communication should usually route through the coordinator in the default hub-and-spoke pattern.
6. The coordinator should evaluate gaps and re-delegate when necessary.
7. Multi-agent systems are helpful only when the complexity is justified.

## Quick Self-Check

You understand Topic 1.2 if you can answer yes to these questions:

- Can I explain the hub-and-spoke coordinator pattern clearly?
- Can I explain why context isolation is useful?
- Can I design a broad task decomposition that avoids gaps and overlap?
- Can I explain the coordinator's responsibilities beyond simple dispatch?
- Can I explain why subagents should usually report back to the coordinator?
- Can I describe when a single-agent design is better than a multi-agent design?

## References

- Anthropic, "Subagents": https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Anthropic, "Subagents in the SDK": https://platform.claude.com/docs/en/agent-sdk/subagents
- Anthropic, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, "How we built our multi-agent research system": https://www.anthropic.com/engineering/built-multi-agent-research-system
