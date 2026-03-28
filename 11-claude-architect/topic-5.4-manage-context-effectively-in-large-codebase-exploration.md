# Topic 5.4: Manage Context Effectively in Large Codebase Exploration

This note explains how to keep long-running codebase investigations accurate when Claude is reading many files, generating verbose search output, delegating to subagents, and resuming work across interruptions. For the exam, Topic 5.4 is not mainly about "use a larger context window" or "spawn more agents." It is about preserving repo-specific understanding while keeping the active context small enough to stay grounded in the actual codebase.

Topic 5.1 focused on preserving critical facts across long interactions in general. Topic 5.4 narrows that same discipline to technical exploration: directory maps, symbol traces, grep results, test coverage gaps, architecture notes, and resume state for unfinished investigations. In practice, this is where coding agents often fail by drifting from "what this repository actually does" into "what a repository like this probably does."

## Why This Topic Matters

Large codebase exploration fails in predictable ways:

- early findings get buried under later search output
- the agent starts generalizing from familiar framework patterns instead of the repository in front of it
- subagents duplicate the same exploration because nobody preserved the current map
- resumed sessions continue from stale assumptions after files or branches changed
- compaction saves tokens but drops the exact file paths, symbols, or open questions needed for the next step

This matters directly in the exam's developer-productivity and multi-agent-research scenarios.

In Scenario 4, a developer productivity agent may need to trace a legacy flow such as:

- where a request enters the system
- which service actually enforces policy
- where side effects are written
- whether tests cover the critical path

If the agent loses that map midway through the investigation, later answers become confident but generic.

In Scenario 3, the same failure shows up one layer higher. A coordinator that does not preserve structured exploration state cannot tell which subagent already checked authentication, which one traced database writes, and which questions are still unresolved.

As of March 26, 2026, Anthropic's current docs and engineering posts describe this more broadly as `context engineering`: context is a finite working resource that must be curated, not just expanded. Claude Code's current docs reinforce the operational side of that idea:

- each session starts with a fresh context window
- subagents run in separate context windows
- `/compact` is a first-class way to reduce context pressure
- hooks can load context on resume and react to compaction events

Topic 5.4 is the exam version of that production reality.

## What the Exam Is Testing

For Topic 5.4, the exam is usually testing whether you understand these ideas:

- Long technical investigations degrade if important findings live only inside the running transcript.
- Scratchpad files or external notes are useful because they preserve durable findings across context boundaries.
- Subagent delegation is strongest when it isolates noisy, self-contained exploration work from the coordinator's high-level reasoning.
- Each exploration phase should end with a concise summary before the next phase begins.
- Crash recovery should restore structured state, not just reopen a transcript and hope the model reconstructs the plan.
- `/compact` is useful when exploration output becomes too verbose, but only after important evidence has been preserved elsewhere.
- Large context helps, but more tokens do not remove context-rot and attention-dilution risk.
- A good exploration workflow separates durable findings, raw artifacts, current goals, and open questions.

The durable exam skill is:

```text
keep the coordinator's active context small and high-signal,
push noisy exploration into isolated workers,
and externalize the codebase map so the investigation survives compaction, resume, and failure
```

## Current Anthropic Terminology vs Exam Wording

### Topic 5.4 maps to current `context engineering`

As of March 26, 2026, Anthropic increasingly uses `context engineering` as the broader term. That is more precise than older phrasing like "manage context" because the real task is not only preserving chat history. It is deciding what evidence, notes, instructions, tool output, and external state should be present for the next inference.

For Topic 5.4, that broader framing matters. Codebase exploration is not just a conversation problem. It is a context-assembly problem involving:

- repository instructions
- search and read results
- intermediate summaries
- scratchpad files
- subagent outputs
- resume state

### `Scratchpad files` are a pattern, not one universal built-in primitive

The exam wording uses `scratchpad files`. Current Anthropic docs do not present one single built-in feature with exactly that name across every interface.

Instead, current Claude surfaces split the idea across several mechanisms:

- `CLAUDE.md` files for persistent project or user instructions
- Claude Code auto memory, which stores a `MEMORY.md` index plus topic files
- optional subagent memory
- ordinary markdown, JSON, or YAML files that you write explicitly during a workflow

For Topic 5.4, the safe interpretation is:

```text
a scratchpad file is any durable external artifact that preserves investigation findings or control state outside the live transcript
```

That could be:

- a markdown investigation note
- a YAML manifest of completed phases and pending questions
- a structured JSON export from an agent
- an auto-memory topic file

### Current docs emphasize `subagents`; older materials may use `Task` or `Agent`

Current Claude Code docs center the idea of `subagents`, each with its own context window, tool access, and permissions. In the Agent SDK or older exam phrasing, you may still see `Agent` or `Task` language.

For Topic 5.4, the exact noun is less important than the architecture:

- the worker explores in isolated context
- the coordinator keeps the high-level map
- results are returned as a summary, not as an uncontrolled transcript dump

### `/compact` is now an explicit context-management tool

Current Claude Code docs explicitly recommend `/compact` to reduce context size during large-codebase work, and hook docs expose `PreCompact`, `PostCompact`, and `SessionStart` events around compaction and resume.

That matters because the exam is not asking whether compaction exists. It is asking whether you know how to use it correctly:

- preserve durable findings first
- compact once the current phase has been summarized
- restore the next-turn working set from structured notes rather than hoping the compacted transcript preserves every critical detail

## The Core Mental Model

The simplest correct mental model is:

```text
transcript = temporary working memory
scratchpad = durable investigation memory
manifest = resumable control state
subagent = isolated worker for verbose local exploration
```

Another useful way to think about Topic 5.4 is:

```text
codebase exploration is map-building
```

The agent is building a map of:

- important entry points
- relevant symbols and files
- dependency paths
- current evidence
- unanswered questions
- what has already been ruled out

If that map exists only as scattered assistant prose inside a long transcript, the system becomes fragile. If the map is externalized into durable notes, the investigation can survive:

- long sessions
- compaction
- handoff between phases
- subagent parallelism
- crashes and resumes

### A practical four-layer model

| Layer | What belongs there | Why |
| --- | --- | --- |
| Active context | current objective, current phase, top findings, open questions, next step | this should shape the very next inference |
| Scratchpad | durable findings with file paths, symbols, commands, confidence, and references | this preserves the codebase map across turns |
| Manifest | workflow state such as completed phases, pending tasks, artifact paths, resume inputs | this enables reliable recovery and orchestration |
| Raw artifacts | full grep output, long logs, transcript files, exhaustive tool output | these are useful for audit and deep inspection, but usually too noisy for every turn |

The exam-safe principle is:

```text
promote what changes the next decision,
archive what only proves it later
```

## Topic 5.4 vs Related Topics

These topics overlap, but they are not identical.

### Topic 5.4 vs Topic 5.1

Topic 5.1 is about preserving critical facts across long interactions broadly.

Topic 5.4 is more specific:

- the facts are codebase facts
- the evidence is file- and symbol-level
- the risk comes from verbose technical exploration output
- the workflow often uses subagents, scratchpads, and resumable manifests

### Topic 5.4 vs Topic 1.3

Topic 1.3 is about how to invoke subagents and pass context to them.

Topic 5.4 is about what context should be preserved across a long investigation so those subagents do not operate blindly or redundantly.

### Topic 5.4 vs Topic 1.7

Topic 1.7 is about whether to resume, continue, fork, or restart a session.

Topic 5.4 is about what structured state should exist so a resumed exploration can actually pick up intelligently rather than re-reading half the repository.

## Implementation and Workflow Guidance

### 1. Start with an explicit exploration contract

Do not begin a large investigation with a vague prompt like:

```text
understand the payment system
```

That creates two context problems immediately:

- the scope is too broad, so the search surface explodes
- the agent has no stable shape for what to preserve

A stronger exploration contract defines:

- the exact question
- the scope boundary
- the expected deliverable
- the current repo state if relevant
- what counts as evidence

For example:

```yaml
investigation:
  objective: Trace the refund flow from HTTP entrypoint to database write
  scope:
    include:
      - src/refunds/**
      - src/orders/**
      - tests/**/refund*
    exclude:
      - generated/**
      - vendor/**
  deliverable:
    - entrypoint file and symbol
    - main service path
    - policy-check location
    - side effects
    - test coverage gaps
  evidence_format:
    - file path
    - symbol or function name
    - one-line explanation
  repo_state:
    branch: feature/refund-audit
```

This matters because once the session gets long, Claude can re-anchor itself against this contract instead of improvising a new problem statement from partial memory.

### 2. Keep a durable scratchpad of findings with evidence

The single biggest Topic 5.4 mistake is treating the transcript as the investigation notebook.

A durable scratchpad should capture what the agent learned in a form that survives:

- `/compact`
- a resumed session
- coordinator handoff
- a new subagent wave

The scratchpad should be more structured than freeform prose. A good pattern is:

```markdown
# Refund Flow Investigation

## Confirmed Findings
- `src/http/refunds/RefundController.ts` -> `createRefund()` is the POST entrypoint.
- `src/refunds/RefundService.ts` -> `createRefund()` performs eligibility checks before persistence.
- `src/refunds/RefundRepository.ts` -> `save()` writes refund records to the database.

## Evidence To Reuse
- `tests/refunds/refund-service.spec.ts` covers happy-path eligibility.
- No test found yet for duplicate refund idempotency.

## Open Questions
- Where is manual-approval escalation triggered for large refunds?
- Is idempotency enforced in service code or at the database layer?

## Ruled Out
- `src/legacy/refund_worker.ts` appears unused in the current HTTP path.
```

Good scratchpads preserve:

- exact paths
- exact symbols
- what is confirmed versus still open
- what was checked and ruled out

Weak scratchpads say things like:

```text
Refund logic mostly lives in the service layer and there are some tests.
```

That summary is too lossy to drive the next phase accurately.

### 3. Make every finding provenance-rich

A codebase exploration note becomes much more trustworthy when each finding carries lightweight provenance.

Useful provenance fields include:

- file path
- symbol name
- command or tool used
- branch or commit if the repo may change
- confidence or verification status

Example:

```yaml
- finding: refund policy is enforced in service layer
  path: src/refunds/RefundService.ts
  symbol: RefundService.createRefund
  verified_via:
    - Read
    - rg "eligible|policy|limit" src/refunds
  status: exact
  branch: feature/refund-audit
```

This matters because "I think the service handles it" is fragile, while "I verified `RefundService.createRefund` in this file on this branch" is reusable.

### 4. Delegate narrow exploration questions to subagents

Current Claude Code docs make the context-management reason for subagents explicit: they keep verbose exploration out of the main conversation. That is exactly the Topic 5.4 use case.

Strong subagent questions are:

- narrow
- self-contained
- evidence-oriented
- easy to summarize back

Examples:

- "Find all test files that exercise refund creation. Return paths, target behavior, and obvious missing cases."
- "Trace which modules call `RefundService.createRefund`. Return only call sites and why they matter."
- "Inspect config and feature flags related to refunds. Report the actual config keys and the files that read them."

Weak subagent prompts are:

- "Understand the refund system end to end."
- "Explore the whole repo and tell me everything relevant."

Those weak prompts produce two problems:

- too much output returns to the coordinator
- the worker is likely to mix important evidence with irrelevant narrative

Current Claude Code docs also matter here operationally:

- subagents run in separate context windows
- subagents are strongest for verbose, self-contained work
- subagents start fresh, so they need clear task framing
- subagents cannot spawn further subagents, so the main coordinator should manage chaining and parallel waves

The exam-safe pattern is:

```text
coordinator owns the map
subagents answer bounded questions
```

### 5. Separate exploration into phases and summarize each phase before the next

Large codebase work becomes much more reliable when you divide it into phases with explicit phase summaries.

A common sequence is:

1. map the relevant area of the repository
2. trace the main execution path
3. inspect side effects and integrations
4. validate tests, configs, and edge cases
5. synthesize the answer

At the end of each phase, update:

- the scratchpad
- the manifest
- the coordinator's short working summary

This prevents a common failure mode where a later phase restarts from raw search results instead of the refined understanding already earned.

Example phase summary:

```yaml
phase_summary:
  phase: trace-main-execution
  confirmed:
    - POST /refunds enters via RefundController.createRefund
    - RefundService.createRefund enforces eligibility and amount limits
    - RefundRepository.save persists the new refund record
  unresolved:
    - where duplicate-refund protection is enforced
  next_phase:
    - inspect tests and database constraints for idempotency
```

This summary is small enough for active context, while the full scratchpad retains the detailed evidence.

### 6. Keep raw discovery output out of the active prompt unless it changes the next decision

This is the codebase equivalent of Topic 5.1's warning about raw tool outputs.

Weak pattern:

- run a large `rg`
- paste 150 lines of matches into the active conversation
- ask Claude to remember the important parts later

Stronger pattern:

- store the raw result externally if it may matter
- promote only the meaningful subset into the scratchpad
- keep the active context focused on what the next step needs

For example, a raw grep result might produce:

- 42 references to `refund`
- 5 files that actually implement the current flow
- 2 historical modules that are likely dead code

The active context usually needs only:

- the 5 current files
- the 2 dead-code candidates if they affect uncertainty
- the open question created by that discovery

Everything else is audit material, not next-turn reasoning material.

### 7. Use manifests for crash recovery and resume flows

The outline and exam guide are explicit about structured state persistence for crash recovery. This is a major Topic 5.4 differentiator.

Do not rely on reopening a transcript and expecting the model to infer:

- what phase was complete
- which subagents already ran
- which artifacts are trustworthy
- what still needs investigation

A manifest gives the coordinator an explicit state export to reload.

Example:

```yaml
investigation_manifest:
  objective: Trace refund flow from entrypoint to persistence
  repo_state:
    branch: feature/refund-audit
    commit: 8a1e0d2
  artifacts:
    scratchpad: notes/refund-flow.md
    raw_search_log: artifacts/refund-rg.txt
  completed_phases:
    - map-repo-area
    - trace-main-execution
  pending_phases:
    - inspect-idempotency
    - review-tests
  subagent_runs:
    - question: find refund tests
      status: complete
      summary_ref: notes/refund-flow.md#tests
    - question: inspect database constraints
      status: pending
  open_questions:
    - where duplicate-refund protection is enforced
  known_risks:
    - repository may have changed since last phase
```

A strong resume flow does three things:

1. loads the manifest
2. loads the scratchpad
3. tells Claude exactly which phase should continue next

Current Claude Code hook docs reinforce this pattern. `SessionStart` hooks can add context when a session starts or resumes, and compaction-related hooks exist before and after compact events. That means resume and compaction can be tied into external state instead of being treated as opaque UI events.

### 8. Use `/compact` intentionally, not reactively

Current Claude Code docs explicitly recommend using `/compact` when large-codebase work becomes resource-heavy. Topic 5.4 cares about the judgment around that command.

The best time to compact is usually after:

- the current exploration phase is complete
- the scratchpad has been updated
- the manifest reflects current state
- the next phase is clearly stated

The worst time to compact is when:

- the only copy of the important findings is still in the transcript
- the current understanding is half-formed
- exact file paths or symbols have not yet been promoted into durable notes

The safe operational pattern is:

```text
discover -> distill -> externalize -> compact -> continue
```

In current docs, compaction can be manual or automatic. Hook events also show that compaction is part of the session lifecycle, not an edge case. That makes it reasonable to design workflows where:

- compaction triggers a scratchpad save
- the resume path reloads the latest manifest
- the compacted summary is treated as a helper, not the sole source of truth

### 9. Know when to resume a subagent and when to start a fresh one

Current Claude Code docs say each subagent starts with fresh context unless it is explicitly resumed. Resumed subagents retain their prior tool history and reasoning.

That is powerful, but it creates a judgment call.

Resume the same subagent when:

- the branch of investigation is still valid
- the repository has not changed materially for that question
- the worker already built expensive local context worth preserving

Start a fresh subagent with a summary when:

- files changed significantly
- the earlier branch was exploratory and noisy
- you want a cleaner, narrower follow-up question
- the previous worker's context is now more baggage than advantage

This is a classic exam trade-off:

- blind resumption can preserve stale assumptions
- blind restarting can waste exploration effort

The strongest answer usually prefers:

```text
resume when local context is still valid,
restart with injected summary when validity is uncertain
```

### 10. Treat codebase facts as time-bound, not eternal

This is easy to miss in developer workflows.

A codebase map is only trustworthy relative to a repo state. If the branch, commit, or generated artifacts change, some earlier findings may now be stale.

That means a strong scratchpad or manifest should record at least one of:

- branch
- commit
- last verified timestamp

And a strong resumed session should explicitly say what changed, for example:

```text
Resume the refund investigation. The previous map was built on commit 8a1e0d2.
Since then, `RefundService.ts` and `refund-service.spec.ts` changed. Re-verify idempotency handling before using prior conclusions.
```

This prevents a common failure mode where the agent sounds consistent because it remembers its earlier story, not because it revalidated the code.

## A Strong End-to-End Workflow Pattern

Here is a practical Topic 5.4 workflow for a large codebase question.

### Step 1: Define the investigation

Create:

- objective
- scope
- deliverable
- evidence format

### Step 2: Launch targeted exploration

Use the main conversation or a coordinator to:

- ask one subagent to map entry points
- ask another to inspect tests
- ask another to find configuration or dependency edges

Each worker returns:

- concise summary
- evidence list
- unresolved questions

### Step 3: Update the scratchpad

Promote durable findings into a shared note with:

- exact paths
- exact symbols
- what was confirmed
- what is still unknown

### Step 4: Update the manifest

Record:

- completed phases
- pending phases
- artifact locations
- whether any branch should be resumed

### Step 5: Compact if needed

Once the important state is externalized:

- run `/compact` if the active conversation is getting noisy
- continue from the phase summary and open questions

### Step 6: Resume or restart intelligently

If interrupted:

- reload the manifest
- reload the scratchpad
- re-check whether repo changes invalidate any earlier findings
- resume only the branches whose local context still matters

This workflow is stronger than either extreme:

- "just keep chatting until the answer appears"
- "restart from scratch every time"

## Common Mistakes

- Treating the live transcript as the only investigation record.
- Asking one agent to "understand the whole system" instead of decomposing the exploration into bounded questions.
- Letting subagents return long prose summaries without exact file paths, symbols, or open questions.
- Keeping huge grep outputs, test logs, or directory listings in the active prompt when only a few lines matter.
- Compacting before durable findings have been written into a scratchpad or manifest.
- Resuming an old exploration branch without checking whether the code changed.
- Failing to record what has already been ruled out, which leads to repeated exploration of the same dead ends.
- Assuming a large context window eliminates the need for phase summaries and external notes.
- Putting task-specific investigation state into `CLAUDE.md` instead of a workflow-specific scratchpad or manifest.
- Forgetting that subagents start fresh unless resumed explicitly.
- Sending dependent work to parallel subagents without giving the coordinator a clear merge point.
- Confusing raw artifacts with usable context. Full logs are useful, but they are not automatically the best next-turn input.

## Exam Takeaways

If you remember only a few things for Topic 5.4, remember these:

1. Topic 5.4 is about preserving an accurate codebase map, not just keeping a long transcript alive.
2. The main conversation should keep the investigation objective, top findings, and open questions, not every raw search result.
3. Scratchpad files are durable external memory for repo-specific findings and workflow state.
4. Subagents are strongest when they isolate verbose, self-contained exploration and return concise evidence-rich summaries.
5. Summarize each exploration phase before launching the next one.
6. Preserve file paths, symbols, commands, and repo state so findings stay reusable after compaction or resume.
7. Use manifests for crash recovery and resumable investigations instead of relying on transcript reconstruction.
8. `/compact` is useful after you have externalized the important state, not before.
9. Resume a prior subagent only when its local context is still valid; otherwise restart with a structured summary.
10. Current Anthropic terminology frames this as `context engineering`, even if the exam wording still says "manage context" or "scratchpad files."

## Quick Self-Check

You understand Topic 5.4 if you can answer yes to these questions:

- Can I explain why a long codebase transcript is not the same as a reliable investigation record?
- Can I describe what should go into active context versus a scratchpad versus a manifest?
- Can I explain why subagents help with context management during verbose exploration?
- Can I design a subagent question that is narrow enough to summarize cleanly?
- Can I show how to preserve file-level evidence and open questions between exploration phases?
- Can I explain when `/compact` helps and what must be saved before using it?
- Can I design a resume flow that restores structured state after an interruption?
- Can I distinguish when to resume an old branch of exploration versus starting a fresh one with an injected summary?
- Can I explain why branch or commit awareness matters when reusing earlier codebase findings?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "How Claude remembers your project": https://code.claude.com/docs/en/memory
- Anthropic, "Create custom subagents": https://code.claude.com/docs/en/sub-agents
- Anthropic, "Troubleshooting": https://code.claude.com/docs/en/troubleshooting
- Anthropic, "Hooks reference": https://code.claude.com/docs/en/hooks
- Anthropic, "Context windows": https://platform.claude.com/docs/en/build-with-claude/context-windows
- Anthropic Engineering, "Effective context engineering for AI agents" (September 29, 2025): https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic Engineering, "How we built our multi-agent research system" (June 13, 2025): https://www.anthropic.com/engineering/multi-agent-research-system
