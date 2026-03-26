# Topic 3.5: Apply Iterative Refinement Techniques for Progressive Improvement

This note explains how to improve Claude's output over multiple rounds without turning the workflow into vague retry spam. For the exam, Topic 3.5 is not mainly about telling Claude to "try again." It is about making each iteration materially better by giving stronger examples, sharper verification, better clarification, and the right batching strategy for the problems you are trying to solve.

Topic 3.4 focused on choosing the right starting mode. Topic 3.5 focuses on what happens after work begins: how to tighten the loop so Claude improves progressively instead of repeating the same class of mistake.

## Why This Topic Matters

A lot of real Claude failures are not first-attempt failures. They are refinement failures.

Common patterns look like this:

- the initial request is ambiguous, so Claude makes a reasonable but wrong interpretation
- the user replies with "that's not what I meant," but still does not provide examples
- the code almost works, but there are no tests or expected outputs to check against
- the design space is unfamiliar, yet the team starts implementation before surfacing constraints
- five unrelated corrections are bundled into one noisy message, so the next turn fixes two and regresses one
- three tightly coupled issues are split into separate prompts, so Claude keeps solving each in isolation and missing the interaction

Iterative refinement is the discipline that fixes those patterns.

In Claude Code and in production Claude workflows more broadly, the first answer is often just the first hypothesis. The systems that improve reliably are the ones that turn each next round into a better-specified problem, not just a louder restatement of dissatisfaction.

## What the Exam Is Testing

For Topic 3.5, the exam is usually testing whether you understand these ideas:

- Concrete input/output examples are often the fastest way to remove ambiguity from transformation tasks.
- Executable feedback such as tests, screenshots, linters, or expected outputs is stronger than subjective comments like "still wrong."
- Claude can help surface hidden constraints before implementation by asking questions in an interview-style workflow.
- Some issues should be fixed together because they interact; other issues should be separated so the feedback loop stays clean.
- Better iteration comes from improving the feedback artifact, not from repeating the same prompt with stronger wording.
- Current Anthropic docs distribute this topic across prompting best practices, evaluation guidance, and Claude Code workflow guidance rather than naming one standalone "iterative refinement" feature.

The exam is not looking for blind persistence. It is looking for judgment about what kind of feedback to introduce next.

## The Core Mental Model

The simplest correct mental model is:

```text
first attempt
    ->
observe the specific mismatch
    ->
improve the artifact Claude is using to reason
    ->
rerun with clearer evidence
    ->
repeat until the gap closes
```

The phrase "improve the artifact" is the key.

In Topic 3.5, you usually refine one of four things:

1. The specification artifact.
   Replace vague prose with concrete examples, explicit constraints, or a clearer transformation target.
2. The evaluation artifact.
   Replace opinion-based review with tests, screenshot comparison, exact expected output, or a grading rubric.
3. The discovery artifact.
   Replace hidden assumptions with an interview or clarification phase that surfaces constraints before coding.
4. The batching artifact.
   Decide whether the next correction should combine multiple related issues or isolate one independent issue at a time.

If you do not strengthen one of those artifacts, the next iteration often has the same weakness as the first.

Another useful way to think about Topic 3.5 is:

```text
ambiguous task
    ->
add examples

uncertain correctness
    ->
add verification

uncertain requirements
    ->
ask better questions first

multiple failures
    ->
decide whether they interact or not
```

That is the durable exam skill.

## Current Anthropic Terminology vs Exam Wording

### "Progressive improvement" is a workflow pattern, not one product toggle

The local course outline and exam guide describe "iterative refinement techniques for progressive improvement." Current Anthropic docs do not present that as one named Claude feature. Instead, the current guidance is spread across:

- Claude Code best practices such as giving Claude a way to verify its work, letting Claude interview you, and course-correcting early
- prompt-engineering guidance on using examples effectively
- test-and-evaluate guidance on defining success criteria and building evaluations

So if an exam question uses the phrase "progressive improvement," read it as a workflow discipline, not a hidden UI mode.

### "Concrete examples" maps cleanly to current prompt-engineering guidance

Older Anthropic docs often used labels such as few-shot or multishot prompting more prominently. Current prompt docs consolidate that guidance under "Use examples effectively" inside the broader prompting best-practices page.

The underlying concept did not change:

- examples reduce misinterpretation
- diverse examples cover edge cases
- structured examples improve consistency

One useful nuance for exam prep:

- the exam wording often says "provide 2-3 examples"
- current Anthropic prompt docs say 3-5 examples generally work best

That is not a contradiction. The durable point is that examples are better than prose alone when the transformation shape matters. In a fast Claude Code workflow, 2-3 examples may be enough to disambiguate the task. In a reusable prompt template, Anthropic's current docs recommend a somewhat larger few-shot set when needed.

### "Test-driven iteration" maps to verification and evaluation loops

The exam wording emphasizes writing tests first and then iterating on failures. Current Claude Code docs phrase the same idea more broadly: give Claude a way to verify its work.

In practice, that verification might be:

- unit or integration tests
- type checking or linting
- exact CLI output
- screenshots or visual diffs
- structured evaluation rubrics

So Topic 3.5 is not only about formal TDD in the narrow software-engineering sense. It is about replacing subjective review with executable or at least structured feedback.

### "Interview pattern" maps to current Claude Code guidance around `AskUserQuestion`

The exam guide calls this the interview pattern. Current Claude Code docs describe it more concretely: for larger features, have Claude interview you first using the `AskUserQuestion` tool, then produce a spec and execute from a fresh session.

That detail matters because the modern product framing is slightly more explicit than the exam shorthand:

- exam wording focuses on the pattern
- current docs name the tool and recommend a spec-oriented workflow

The `AskUserQuestion` name is Claude Code-specific. In API-based systems, the same pattern is usually implemented through ordinary message turns or your own application UI rather than a built-in tool with that exact name.

If a question asks when Claude should interview the developer first, the right concept is clarification before implementation when the hard part is unknown constraints, not syntax generation.

### "Fix together or separately" is a reasoning choice, not a special Claude feature

Current Anthropic docs do not expose a button labeled "batch interacting issues." This is an operator judgment call.

The durable principle is:

- combine issues when they share constraints, root causes, or acceptance criteria
- separate issues when they are operationally independent and combined feedback would add noise

This is why Topic 3.5 is a workflow judgment topic more than an interface-memorization topic.

## Why Concrete Examples Beat Prose for Ambiguous Transformations

When a task is fundamentally about transforming one representation into another, prose descriptions often under-specify the exact rule.

Typical examples:

- converting freeform timestamps into one canonical format
- cleaning customer names during a migration
- rewriting documentation into a house style
- generating code that must follow a local pattern already used in the repo
- extracting structured records from messy text

A prose-only request like "normalize the dates" leaves too many questions open:

- Which format is canonical?
- Should missing timezone information be preserved, inferred, or rejected?
- Should invalid values be dropped, flagged, or passed through unchanged?
- How should nulls or partial values behave?

Concrete examples answer those questions faster than extra adjectives.

### Weak refinement

```text
The output format is still off. Please make it more consistent.
```

### Stronger refinement

```text
Normalize these date strings to ISO 8601 UTC.

Input: "2026-03-01 4:30 PM PST"
Output: "2026-03-02T00:30:00Z"

Input: "2026/03/01"
Output: "2026-03-01T00:00:00Z"

Input: null
Output: null

If the value cannot be parsed confidently, return the original value and add an error entry.
```

The second version improves three things at once:

- it defines the target representation
- it shows edge-case handling
- it gives Claude something concrete to generalize from

### Current-doc nuance: examples should be relevant and diverse

Anthropic's current prompt-engineering docs emphasize that examples should:

- mirror the real task
- cover edge cases
- be varied enough that Claude does not learn the wrong superficial pattern

That means bad examples can make refinement worse.

Common bad-example patterns:

- every example is the happy path
- every example has the same length and shape
- examples contradict the prose instructions
- examples show formatting but not business-rule edge cases

For exam purposes, remember the priority order:

1. make the examples representative
2. make them diverse enough to expose boundaries
3. make them concrete enough that the expected transformation is obvious

## Test-Driven Iteration as Executable Feedback

If examples clarify what the output should look like, tests clarify whether the implementation actually satisfies that requirement.

This is why Topic 3.5 pairs examples with test-driven iteration.

### Why tests are such strong refinement artifacts

Tests do three jobs at once:

- they specify expected behavior
- they reveal edge cases explicitly
- they give Claude a concrete failure signal to respond to

That is much stronger than feedback like:

- "the edge cases are broken"
- "performance is not good enough"
- "it still does not handle nulls correctly"

A failing test tells Claude exactly which assumption broke.

### The practical loop

In Claude Code, a strong refinement loop often looks like this:

1. Define what success means.
2. Write or provide tests that capture normal behavior and important edges.
3. Ask Claude to implement or revise the code.
4. Run the tests.
5. Feed the failures back into the next iteration.
6. Repeat until the verification artifact is green.

Current Anthropic docs generalize this beyond tests and call it verification. That is the right modern framing. For exam questions, though, "write tests first, then iterate on failures" is usually the stronger answer than "just explain the bug again."

### A stronger prompt pattern

```text
Update the migration script to handle nullable last names.

Requirements:
- `null` should remain `null`
- empty string should become `null`
- non-empty names should be trimmed but preserved

Before changing the implementation:
- add tests for these cases
- include one case with surrounding whitespace
- include one case where another field in the record is missing

Then run the tests, fix the implementation, and rerun them.
Do not weaken the tests to make them pass.
```

That prompt gives Claude:

- explicit behavioral requirements
- a verification sequence
- a guard against fake-success behavior

### Tests are not limited to pure correctness

The exam guide also mentions performance requirements. That matters because Topic 3.5 is about success criteria broadly, not just happy-path logic.

Good refinement tests may cover:

- boundary conditions
- malformed input
- null handling
- performance-sensitive paths
- regression cases from prior bugs
- behavior under partial failure

Anthropic's current evaluation docs make the same durable point in broader terms: define measurable success criteria and build task-specific evaluations that reflect real-world edge cases.

### When formal tests are not available

Not every task has a clean unit test harness. In those cases, still give Claude a verification artifact:

- an expected JSON output
- a screenshot to match
- a shell command whose output should change in a defined way
- a rubric for PR review findings
- a schema or contract the output must satisfy

The exam-safe principle is:

- no verification artifact means weak refinement
- stronger verification artifact means stronger refinement

## The Interview Pattern Before Implementation

Some tasks fail not because Claude wrote bad code, but because the team started coding before the real constraints were on the table.

That is where the interview pattern matters.

### When the interview pattern is useful

Use it when:

- the feature is large enough that hidden constraints matter
- the domain is unfamiliar
- there are multiple plausible approaches
- edge cases are more important than the happy path
- the user has a goal, but not yet a complete spec

Typical examples:

- cache invalidation behavior for a new data flow
- retry and fallback rules for flaky integrations
- rollout strategy for a risky migration
- UI behavior for draft, error, and partial-save states
- authorization or audit expectations for a new admin feature

In these cases, implementation too early is usually worse than asking sharper questions first.

### When the interview pattern is overkill

Do not force an interview workflow onto:

- one-line bug fixes with a clear stack trace
- obvious local refactors
- typo fixes
- changes where the acceptance criteria are already explicit and testable

This follows the same efficiency principle from Topic 3.4: use the heavier workflow only when it materially reduces risk.

### Current Anthropic workflow framing

Current Claude Code best practices describe a concrete pattern:

1. Start with a short feature description.
2. Ask Claude to interview you in detail using `AskUserQuestion`.
3. Have Claude surface technical concerns, UX edge cases, tradeoffs, and constraints you may not have considered.
4. Turn that into a written spec.
5. Start a fresh session to execute the spec with cleaner implementation context.

That last step matters. Topic 3.5 is not only about better questions. It is also about preventing the noisy clarification transcript from polluting later implementation.

### A strong interview-style prompt

```text
I want to add offline draft saving to the editor.
Interview me in detail before proposing implementation.
Ask about sync behavior, storage limits, failure recovery, conflict handling, privacy concerns, and UX edge cases.
Once we have enough detail, summarize the final spec and open questions.
```

That prompt is strong because it does not just say "ask questions." It tells Claude what kinds of hidden constraints to hunt for.

## Fix Interacting Problems Together, but Split Independent Problems Apart

This is one of the most practical judgment calls in Topic 3.5.

If you batch the wrong issues together, Claude gets noisy feedback. If you split the wrong issues apart, Claude keeps solving one part while breaking another.

### Interacting problems should usually be refined together

Combine issues into one correction when:

- they share a root cause
- one fix changes the constraints for the others
- they depend on the same data model or API contract
- the acceptance criteria are interdependent
- solving one without the others would create a false pass

Example:

- a backend response shape changed
- frontend rendering broke
- tests now assert the wrong contract

That is one interacting problem cluster. Splitting it into three unrelated prompts often creates churn because the real issue is the shared contract.

### Independent problems should usually be refined separately

Split issues into separate iterations when:

- they affect unrelated modules
- they have different success criteria
- one issue can be fully evaluated without touching the others
- combining them would obscure which feedback mattered
- they are small enough that sequential resolution is cheaper than one large synthesis step

Example:

- one prompt asks Claude to fix a flaky billing test
- another asks it to update onboarding documentation wording

Those do not belong in one refinement message just because both are open.

### A simple decision table

| Situation | Better refinement strategy | Why |
| --- | --- | --- |
| One bug changes API shape, UI rendering, and test expectations together | Single combined correction | The problems share one contract and should be solved coherently |
| Two unrelated failures live in different subsystems with different owners and tests | Separate iterations | Combined feedback adds noise and weakens attribution |
| One feature has logic, UX copy, and analytics rules that must stay aligned | Combined refinement | Acceptance criteria interact |
| One typo, one performance warning, and one flaky unrelated test | Separate refinement | No useful shared reasoning path |

The exam is usually testing whether you can see the dependency structure, not whether you always prefer batching or always prefer isolation.

## Choosing the Next Feedback Artifact

When Claude misses the mark, the best next step is usually not "explain harder." It is choosing the right kind of corrective artifact.

| What went wrong | Highest-leverage next artifact | Why |
| --- | --- | --- |
| Claude interpreted the transformation incorrectly | Concrete input/output examples | Examples define the shape of the mapping better than prose |
| Claude wrote plausible code that may still be wrong | Tests, screenshots, or exact expected output | Verification turns taste-based review into objective feedback |
| The feature has too many hidden assumptions | Interview-style questioning | Clarification reduces expensive wrong turns before coding |
| Several failures come from one shared contract or root cause | One combined correction | Separate prompts would keep solving symptoms in isolation |
| The session is full of failed attempts on the same issue | Fresh session with a better prompt | Long correction history can become context pollution instead of useful evidence |

Current Claude Code docs are especially explicit about the last two points:

- course-correct early instead of letting mistakes accumulate
- if you have corrected Claude more than twice on the same issue, clear the session and restart with a sharper prompt

That is an important Topic 3.5 lesson. More iteration is not automatically better. Better iteration is better.

## What Good Iteration Looks Like

A strong refinement loop usually gets more concrete over time, not more emotional.

### Weak sequence

```text
Try again.

Still not right.

Please be more careful.
```

This sequence adds almost no new information.

### Stronger sequence

```text
Round 1:
Transform the migration output into this shape.
Here are three representative input/output examples, including a null case.

Round 2:
The implementation now passes the happy-path cases but fails the null and whitespace tests.
Here is the failing test output.
Preserve the existing passing behavior.

Round 3:
The logic is correct, but the API contract and frontend consumer now disagree on empty-string handling.
Fix the backend normalization and the frontend rendering together so the contract is consistent.
```

That sequence improves because each round adds a better artifact:

- examples
- failing tests
- contract-level dependency clarification

## Implementation or Workflow Guidance

Use this workflow when you need Claude to improve over multiple rounds:

1. Identify the real failure mode.
   Decide whether the first output failed because the task was ambiguous, the requirements were incomplete, verification was weak, or multiple issues were mixed together badly.
2. Strengthen the prompt with the highest-leverage artifact.
   Add examples for ambiguity, tests for correctness, questions for hidden constraints, or a clearer issue grouping.
3. Keep the feedback specific and local.
   Reference the exact output mismatch, failing test, or missing consideration.
4. Preserve what is already correct.
   Tell Claude which behaviors should remain unchanged so refinement does not regress working parts.
5. Ask Claude to verify after each change.
   Do not assume success from plausible-looking output.
6. If the domain is unfamiliar, ask for questions before implementation.
   The clarification loop can be more valuable than the code loop.
7. Avoid cargo-cult TDD.
   The goal is executable feedback, not ritual. Use whatever verification artifact fits the task.
8. Restart cleanly when repeated failed attempts are cluttering context.
   A shorter, sharper second session is often the real refinement win.

## Common Mistakes

- Treating iterative refinement as repeated restatement instead of supplying stronger evidence.
- Giving only one happy-path example and assuming Claude will infer all boundary behavior.
- Providing tests that do not cover the actual failure mode.
- Asking Claude to "make the tests pass" without guarding against weakening the tests or changing the intended contract.
- Skipping clarification on a large unfamiliar feature and discovering key constraints only after implementation has started.
- Forcing an interview workflow on a tiny, already-clear task.
- Bundling unrelated issues into one correction message and making the next turn unfocused.
- Splitting a tightly coupled problem into separate iterations that fight each other.
- Letting multiple failed attempts accumulate without resetting the session once context has become noisy.
- Giving feedback like "be smarter" or "be more accurate" instead of pointing to the specific mismatch.

## Exam Takeaways

If you remember only a few things for Topic 3.5, remember these:

1. The first output is often a draft hypothesis, not the final answer.
2. The best refinement adds better artifacts, not just stronger language.
3. For ambiguous transformations, concrete input/output examples usually beat prose.
4. Current Anthropic prompt docs recommend relevant, diverse examples; the exam's "2-3 examples" phrasing is a smaller operational version of the same idea.
5. For implementation work, tests or other verification artifacts are stronger than subjective review.
6. Current Claude Code docs frame this as giving Claude a way to verify its work.
7. The interview pattern is for surfacing hidden constraints before coding when the design space is unclear.
8. Current Claude Code docs implement that pattern explicitly with `AskUserQuestion`.
9. Interacting issues should usually be refined together; independent issues should usually be split apart.
10. Tight feedback loops beat delayed correction.
11. If repeated failed attempts clutter context, restarting with a cleaner, sharper prompt is often the right refinement move.

## Quick Self-Check

You understand Topic 3.5 if you can answer yes to these questions:

- Can I explain why three concrete examples are often more valuable than another paragraph of vague requirements?
- Can I explain why a failing test is better feedback than "the edge cases still fail"?
- Can I identify when Claude should ask clarifying questions before implementation instead of guessing?
- Can I distinguish a tightly coupled issue cluster from several unrelated issues that should be fixed separately?
- Can I explain the current-doc mapping from exam phrases like "interview pattern" and "progressive improvement" to today's Claude Code and Anthropic prompt guidance?
- Can I recognize when a fresh session with a better prompt is more useful than continuing a cluttered correction loop?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Best Practices for Claude Code": https://code.claude.com/docs/en/best-practices
- Anthropic, "Prompting best practices": https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic, "Define success criteria and build evaluations": https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
