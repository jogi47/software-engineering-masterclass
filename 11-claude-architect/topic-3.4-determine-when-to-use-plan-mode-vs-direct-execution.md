# Topic 3.4: Determine When to Use Plan Mode vs Direct Execution

This note explains how to choose the right Claude Code working posture before implementation begins. For the exam, Topic 3.4 is not mainly about memorizing one keyboard shortcut or one CLI flag. It is about judging complexity, ambiguity, blast radius, and rework risk so Claude starts in the right mode for the task in front of it.

Topic 3.4 is also another place where the exam wording and the current docs are close but not perfectly aligned. The exam says "plan mode vs direct execution." Current Anthropic docs are more specific: plan mode is a permission mode, while "direct execution" is a practical category that usually means working immediately in an execution-oriented mode such as `default`, `acceptEdits`, or `auto` instead of staying in planning first.

## Why This Topic Matters

Most Claude Code failures in real projects are not caused by Claude being unable to type code. They happen earlier, when the team starts in the wrong operating mode.

Common failure patterns:

- Claude starts editing immediately on a task that actually needed codebase discovery, so the first implementation is built on incomplete understanding.
- A migration or refactor begins before the trade-offs are surfaced, so the team pays rework cost after several files are already changed.
- A trivial bug fix gets pushed through a heavy planning cycle, wasting time and context on a task that was already clear.
- Discovery output floods the main conversation, making later implementation weaker because the context window is carrying too much exploration detail.
- Teams confuse "direct execution" with "maximum autonomy," when the real question is whether Claude should implement now or investigate first.

In the exam's Claude Code scenarios, Topic 3.4 often appears inside questions like:

- "Should you ask Claude to plan first or just implement?"
- "Why did the refactor go off course?"
- "What should you do before changing a large unfamiliar subsystem?"
- "How do you keep discovery from polluting the implementation context?"

## What the Exam Is Testing

For Topic 3.4, the exam is usually testing whether you understand these ideas:

- Plan mode is the safer default when the task is large, ambiguous, architectural, or likely to touch many files.
- Direct execution is the right choice when the scope is clear, the change is well understood, and the blast radius is small.
- Plan mode reduces rework by separating discovery and design from implementation.
- Verbose discovery can be isolated in a separate agent or subagent context so the main thread stays focused.
- The strongest workflow is often mixed: investigate in plan mode, then implement in an execution-oriented mode.
- Current Anthropic docs treat plan mode as one permission mode among several, not as a separate product.
- Current docs are more precise than some shorthand explanations: plan mode still allows read-focused investigation and approved exploratory actions, but it does not modify source files.

The durable exam skill is not "always use plan mode for serious work." It is matching the mode to the task.

## The Core Mental Model

The simplest correct mental model is:

```text
low ambiguity + local change + obvious fix
    ->
direct execution

high ambiguity + multiple valid approaches + wide blast radius
    ->
plan mode first

verbose discovery that would flood the main thread
    ->
use a separate investigation agent or subagent, then return a summary

large task that is now understood
    ->
switch from planning to execution
```

Another useful way to think about Topic 3.4 is to score five questions before you start:

1. Is the desired diff easy to describe in one sentence?
2. Is there one clearly preferred implementation approach?
3. Is the change local, reversible, and low-risk?
4. Do you already understand the code path well enough to implement confidently?
5. Would early wrong edits be cheap to undo?

If the answers are mostly yes, direct execution is usually fine. If several answers are no, plan mode is usually the better first move.

Anthropic's current best-practices docs phrase the same idea even more bluntly: if you could describe the diff in one sentence, planning is often unnecessary overhead. That is a strong exam heuristic.

## Current Anthropic Terminology vs Exam Wording

### Plan mode is a real current feature

Current Anthropic docs still describe plan mode directly. You can:

- switch the whole session to `plan`
- prefix a request with `/plan`
- start with `claude --permission-mode plan`

In current docs, plan mode is part of the permission-mode system, not a separate agent product.

### "Direct execution" is a workflow category more than a UI label

The exam uses "direct execution" as the opposite of planning first. Current docs usually describe this through execution-oriented permission modes rather than a single setting named `direct execution`.

In practice, "direct execution" usually means:

- stay in `default` and approve actions as needed
- use `acceptEdits` when you want Claude to edit files without asking for each edit
- use `auto` when you want lower interruption on longer tasks and the environment supports it

So the durable concept is:

- plan mode = investigate first, no source edits yet
- direct execution = let Claude start implementing now

### Plan mode is read-first, not "no actions of any kind"

This is one of the most important current-doc nuances.

Some shorthand descriptions make plan mode sound like "Claude only reads files." Current Anthropic permission-mode docs are more precise: in plan mode, Claude can investigate, ask clarifying questions, and use approved exploratory actions such as shell commands, but it does not edit your source code.

For exam study, the safest interpretation is:

- plan mode is implementation-blocking, not necessarily exploration-blocking
- do not confuse "no source edits" with "no tools at all"

### Current docs expose plan mode through tools as well

The tools reference currently includes:

- `EnterPlanMode`
- `ExitPlanMode`
- `AskUserQuestion`

That reinforces the current product model: plan mode is integrated into Claude Code's tool and permission flow, not just a prompt-writing convention.

### "Explore subagent" is older exam shorthand for a current subagent pattern

The local exam guide mentions an Explore subagent. Current Anthropic docs talk more generally about subagents with separate context windows. The underlying idea is stable:

- push verbose discovery into a separate context
- return a concise summary to the main thread
- keep implementation context clean

If a question says "Explore subagent," read that as an investigation-focused subagent or agent role, not as the only valid current product term.

### `opusplan` is related, but it is not the same decision

Current model configuration docs include an `opusplan` alias that uses Opus in plan mode and Sonnet for execution. That is useful, but it does not replace Topic 3.4's core judgment call.

The mode decision is still:

- should Claude plan first or implement now?

Model selection is a second decision layered on top.

## Mapping the Exam Wording to Current Claude Code

| Exam wording | Current-doc mapping | What it really means |
| --- | --- | --- |
| Plan mode | `plan` permission mode, `/plan`, `--permission-mode plan` | Investigate and propose before editing |
| Direct execution | Usually `default`, `acceptEdits`, or `auto` | Let Claude implement now instead of planning first |
| Explore subagent | Investigation-focused subagent with separate context | Keep noisy discovery out of the main thread |
| Normal mode | Informal tutorial wording | Execution-oriented work after planning |
| `opusplan` | Model alias | Better reasoning during planning, then a cheaper execution model |

This mapping matters because exam distractors often mix product labels with workflow concepts.

## What Plan Mode Actually Buys You

Plan mode is valuable because it forces a sequence that is usually healthier for high-uncertainty work:

1. Explore the relevant code and constraints.
2. Surface competing approaches and trade-offs.
3. Identify affected files, risks, and verification steps.
4. Align with the user before edits begin.
5. Execute only after the direction is clear.

That creates three practical benefits.

### It lowers rework risk

When multiple implementation paths are plausible, the first code change is often the wrong place to discover the real architecture problem. Planning first moves uncertainty earlier, when it is cheaper.

### It improves user alignment

Plan mode gives the user a chance to correct assumptions before Claude edits twenty files based on the wrong interpretation.

### It gives you a cleaner handoff into implementation

Current docs note that once a plan is ready, you can approve it and proceed into an execution mode. Current interfaces also allow clearing planning context before execution. That is useful when the discovery transcript is long and you want implementation to start from the distilled plan rather than the full exploration history.

## When Plan Mode Is Usually the Right Choice

Plan mode is usually the right answer when one or more of these signals are present:

| Signal | Why it pushes toward planning | Typical examples |
| --- | --- | --- |
| Many files or subsystems are affected | Early mistakes multiply quickly | Framework migration, auth rewrite, build-system change |
| More than one valid approach exists | The real problem is choosing among options | OAuth flow design, queueing strategy, caching approach |
| Architectural boundaries may move | The change is not just local implementation | Splitting a service, introducing a new shared abstraction |
| You do not yet understand the code path | Exploration is needed before coding | Legacy subsystem, unfamiliar monorepo area |
| Rework would be expensive | Wrong first edits create cleanup cost | Schema changes, API contract changes, shared component refactors |
| Verification needs coordination | Testing or rollout has multiple moving parts | Library upgrade with test, config, and docs changes |

Strong plan-mode examples:

- "Migrate from library A to library B across the frontend and test suite."
- "Refactor our authentication system to support OAuth2 and preserve current sessions."
- "Split this monolith module into three services without breaking existing flows."
- "We have two plausible integration strategies. Compare them and recommend one."
- "Understand how this payment flow works, identify affected files, and create an implementation plan."

The common thread is not just size. It is uncertainty plus consequence.

## When Direct Execution Is Usually the Right Choice

Direct execution is usually the right answer when the task is small, clear, and local enough that planning overhead adds little value.

Typical direct-execution signals:

- the bug has a clear stack trace or obvious failing test
- the requested behavior change is narrow and concrete
- the likely edit surface is one file or a small bounded set of files
- there is not a serious architectural decision to make
- rollback is cheap if the first attempt is slightly wrong

Strong direct-execution examples:

- "Add a date validation guard in this function."
- "Fix this typo in the API error message."
- "Rename this variable for clarity."
- "Update this single failing test to match the new enum value."
- "Patch the null check causing the crash in this one handler."

Direct execution does not mean blind execution. Claude can still read code, inspect nearby context, and verify the result. The distinction is that Claude does not need a separate planning phase before implementation begins.

## Direct Execution Is Not the Same as Maximum Autonomy

This distinction matters because exam questions may try to blur it.

You can choose direct execution while still varying oversight:

| Current mode | What it means in practice | Good fit |
| --- | --- | --- |
| `default` | Claude implements, but asks before actions that require permission | Sensitive or unfamiliar edits where you still want close review |
| `acceptEdits` | Claude can edit files without asking each time | Regular implementation when the task is clear |
| `auto` | Claude implements with classifier-based approval flow | Longer tasks where reducing prompt fatigue matters |
| `bypassPermissions` | Claude can act without checks | Isolated environments only, not a normal answer to Topic 3.4 |

So if the exam asks "plan mode or direct execution," the right answer is not automatically "use the least restrictive permission mode." The real question is whether Claude should start changing code now.

## A Practical Decision Framework

If you need a compact exam-safe framework, use this:

### Start in plan mode when

- the task changes architecture, boundaries, or multiple subsystems
- several implementation options are plausible
- you need discovery before you can even describe the intended diff clearly
- the repo area is unfamiliar
- the cost of wrong first edits is high

### Start in direct execution when

- the task is already well understood
- the edit surface is small and local
- the expected change is concrete
- there is a clear verification path
- the first implementation attempt is cheap to correct

### Use the mixed pattern when

- the change is large but the implementation can be made routine once the plan is settled
- discovery and alignment are the hard part, not the coding itself

That mixed pattern is often the best answer in real projects and on the exam.

## The Best Workflow Is Often Plan First, Then Execute

The local exam guide explicitly tests this combined pattern, and current Anthropic docs support it.

A strong workflow looks like this:

1. Enter plan mode.
2. Explore the relevant code, dependencies, and constraints.
3. Ask Claude for a concrete plan:
   - affected files
   - recommended approach
   - alternatives rejected and why
   - test or verification plan
   - rollout or migration concerns if relevant
4. Refine the plan with follow-up questions.
5. If discovery was noisy, compress or clear planning context.
6. Switch to an execution-oriented mode.
7. Ask Claude to implement the approved plan and verify the result.

This pattern is especially strong for:

- migrations
- multi-file refactors
- new features with architectural consequences
- changes in unfamiliar parts of the codebase

It is weaker for tiny bug fixes where the plan would just restate the obvious.

## How Investigation Subagents Fit Into Topic 3.4

The exam guide mentions an Explore subagent because discovery can become context-heavy. Current Anthropic docs describe subagents as separate contexts with specialized prompts and tool access. The practical lesson is:

- use the main thread for decisions and synthesis
- use subagents for bounded discovery passes that would otherwise flood the main thread

Good uses of an investigation subagent:

- inventory every usage of a library before a migration
- analyze one subsystem while the main thread handles another
- gather file-level summaries before creating a cross-file plan
- inspect logs, tests, or configs in parallel and return concise findings

Weak uses:

- a one-file typo fix
- a trivial, already-understood change
- discovery that is so small it would take longer to delegate than to inspect directly

The main value is context preservation. Discovery is often verbose. Plans and implementation prompts work better when that verbosity is summarized rather than carried forward raw.

## What Good Planning Output Looks Like

A useful plan for Topic 3.4 is not vague advice like "update the code carefully." It should reduce uncertainty enough that execution becomes mostly mechanical.

Good plan characteristics:

- names the files or modules likely to change
- explains the intended approach and why it was chosen
- identifies risks, unknowns, and dependencies
- includes verification steps
- notes open questions that must be resolved before coding

Weak plan characteristics:

- generic restatements of the prompt
- no trade-off analysis when multiple approaches exist
- no verification guidance
- no affected-file inventory for a multi-file task
- no distinction between must-change areas and optional cleanup

If the plan does not make implementation safer or clearer, it is not doing Topic 3.4's job.

## Implementation or Workflow Guidance

Use this workflow when deciding between planning and execution in Claude Code:

1. Assess the task before choosing a mode.
   Ask how many files may change, whether architecture is involved, whether you already understand the area, and how costly rework would be.
2. If uncertainty is high, start in plan mode explicitly.
   Use `/plan` or `--permission-mode plan` instead of hoping Claude will naturally avoid premature edits.
3. Make the planning request concrete.
   Ask for affected files, recommended approach, alternatives, risks, and tests instead of a generic "make a plan."
4. Use an investigation subagent when discovery is large or parallelizable.
   Have it return a compact summary to the main thread.
5. Exit planning once uncertainty is materially reduced.
   Do not stay in plan mode forever if the real work is now straightforward implementation.
6. Choose the execution mode based on oversight needs, not on Topic 3.4 alone.
   `default`, `acceptEdits`, and `auto` are all execution-oriented choices with different approval behavior.
7. Verify after implementation.
   Topic 3.4 is about choosing the right start, not about skipping tests or validation.

## Common Mistakes

- Using plan mode for tiny changes where the plan only restates an obvious one-line diff.
- Starting direct execution on a migration or refactor before Claude has mapped the affected surface area.
- Confusing "direct execution" with "unsafe autonomy" instead of recognizing that oversight still varies by permission mode.
- Confusing `opusplan` with plan mode itself.
- Assuming plan mode means Claude cannot run any exploratory commands, when current docs are more nuanced.
- Letting discovery happen in the main thread when a separate subagent context would keep implementation cleaner.
- Treating plan mode as a guarantee that the eventual implementation is correct.
- Failing to ask for specific planning outputs such as files, risks, and tests.
- Staying in plan mode after the task has become clear, adding overhead with no real benefit.
- Switching into execution without resolving the most important open questions from the plan.

## Exam Takeaways

If you remember only a few things for Topic 3.4, remember these:

1. Use plan mode when complexity, ambiguity, blast radius, or rework risk is high.
2. Use direct execution when the change is clear, local, and well understood.
3. The best current-doc heuristic is simple: if you can describe the intended diff in one sentence, planning is often unnecessary.
4. Plan mode is a current Claude Code permission mode, not just an informal prompting style.
5. "Direct execution" is mostly exam wording; in current docs it usually maps to working immediately in `default`, `acceptEdits`, or `auto`.
6. Plan mode blocks source edits, but current docs still allow read-focused investigation and approved exploratory actions.
7. A mixed workflow is often strongest: plan first, then execute once the direction is clear.
8. Investigation subagents help preserve context by isolating verbose discovery work.
9. The point of planning is not ceremony. It is reducing expensive wrong turns before implementation starts.
10. Do not confuse mode selection with model selection. `opusplan` can support planning, but it does not answer whether planning is needed.

## Quick Self-Check

You understand Topic 3.4 if you can answer yes to these questions:

- Can I explain why a 40-file migration usually belongs in plan mode before implementation starts?
- Can I explain why a one-function validation fix usually does not need a separate planning phase?
- Can I describe the current-doc nuance that plan mode blocks source edits but may still use approved exploratory actions?
- Can I explain why "direct execution" is a workflow choice rather than one exact modern settings label?
- Can I identify when an investigation subagent would preserve context better than doing all discovery in the main thread?
- Can I explain why the best answer is sometimes "plan first, then execute" rather than choosing one mode for the whole task?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Choose a permission mode": https://code.claude.com/docs/en/permission-modes
- Anthropic, "Best Practices for Claude Code": https://code.claude.com/docs/en/best-practices
- Anthropic, "Common workflows": https://code.claude.com/docs/en/tutorials
- Anthropic, "Tools reference": https://code.claude.com/docs/en/tools-reference
- Anthropic, "Model configuration": https://code.claude.com/docs/en/model-config
- Anthropic, "Subagents": https://docs.anthropic.com/en/docs/claude-code/sub-agents
