# Topic 4.1: Design Prompts with Explicit Criteria to Improve Precision and Reduce False Positives

This note explains how to write prompts that produce higher-trust review output by making reporting boundaries explicit instead of vague. For the exam, Topic 4.1 is not mainly about adding stronger warning language like "be careful" or "only report high-confidence issues." It is about defining exactly what counts as a reportable issue, what should be ignored, how severity should be classified, and how prompt design affects developer trust in automated review systems.

This topic sits directly in Scenario 5 from the exam guide: Claude Code in CI/CD doing code review and pull-request feedback. In practice, the same idea applies more broadly to agent prompts, extraction prompts, and escalation prompts, but code review is the clearest exam frame.

## Why This Topic Matters

Many review systems fail not because Claude cannot reason about code, but because the prompt asks for too many fuzzy things at once:

- "review for bugs, style, maintainability, comments, and security"
- "be conservative"
- "only report issues if you are confident"
- "avoid false positives"

Those instructions sound careful, but they leave the real decision boundary undefined.

That creates predictable failure modes:

- valid issues are mixed with speculative nitpicks
- severity labels drift between runs
- local codebase patterns get misread as bugs
- developers stop trusting the review channel because the noisy categories drown out the real ones

For the exam, the important idea is that trust is system-wide. If a review bot repeatedly produces weak findings in one category, engineers often start discounting the entire output, including accurate security or correctness findings.

## What the Exam Is Testing

For Topic 4.1, the exam is usually testing whether you understand these ideas:

- Explicit criteria improve precision more reliably than general cautionary wording.
- Prompts should define reportable categories and non-reportable categories directly.
- False positives are not just an annoyance. They reduce trust in the whole review system.
- If one category is producing too much noise, it is often better to disable that category temporarily than to keep shipping low-trust output.
- Severity labels need concrete criteria and examples, not just loose words like high, medium, and low.
- Confidence-based filtering is weaker than category-based and evidence-based filtering.

The durable exam skill is:

```text
Design the prompt like a policy with reporting boundaries, evidence thresholds, and severity rules.
```

## The Core Mental Model

The simplest correct mental model is:

```text
review prompt
    ->
define what to report
    + define what to skip
    + define what evidence is required
    + define how severity is assigned
    + define what output should look like
    ->
higher precision and more stable trust
```

Another useful way to think about Topic 4.1 is:

```text
vague caution
    ->
Claude still has to guess the boundary

explicit criteria
    ->
Claude has a narrower decision surface
```

This is why prompts like "be conservative" usually underperform. They ask for a mood, not a rule.

## Current Anthropic Terminology vs Exam Wording

### "Explicit criteria" is a prompt-design discipline, not one product feature

The exam wording treats this as a prompt-engineering topic. Current Anthropic docs distribute the same idea across several places:

- prompt-engineering guidance such as being clear, direct, and detailed
- Claude Code best practices around giving precise instructions and verification targets
- evaluation guidance around defining success criteria before scaling an automation workflow
- review-oriented surfaces such as GitHub Actions prompts, `CLAUDE.md`, and in some current workflows `REVIEW.md`

So if an exam question asks how to reduce false positives, do not look for a hidden "precision mode." The answer is usually better prompt criteria, often paired with structured outputs and evaluation.

### Current review instructions can live in more than one place

Older or simplified exam wording may speak as if "the prompt" is one system prompt. Current Anthropic workflows can spread review instructions across:

- the direct request passed to Claude Code or the API
- shared repo guidance in `CLAUDE.md`
- review-only guidance in `REVIEW.md` for managed code-review workflows
- JSON schemas or structured-output contracts that constrain the final shape

For exam prep, the durable concept is the same:

- the model needs explicit reporting criteria somewhere in its effective instruction context

If a question is specifically about shared CI guidance, `CLAUDE.md` is still a safe exam-oriented answer because the local exam guide emphasizes it. In current production practice, review-only criteria may also live in `REVIEW.md` depending on the surface you are using.

### Topic 4.1 is about criteria, not few-shot examples yet

This boundary matters because Topic 4.2 is separate.

Topic 4.1 is mostly about:

- defining the reporting policy explicitly
- clarifying what to include and exclude
- defining severity and evidence standards

Topic 4.2 is mostly about:

- showing targeted examples of ambiguous cases
- improving consistency when criteria alone are not enough

A good exam shortcut is:

- Topic 4.1 = write the rules
- Topic 4.2 = show examples of how to apply the rules

## Why General Cautionary Wording Usually Fails

Prompts such as these are common but weak:

- "Be conservative."
- "Only report issues when you are very confident."
- "Avoid false positives."
- "Focus on important issues."

They fail because they do not answer the questions Claude still has to resolve:

- Which issue types are in scope?
- Which issue types are out of scope?
- What evidence is enough to report something?
- How should uncertainty be handled?
- What separates high severity from medium severity?

Without those boundaries, the model is still doing policy interpretation on its own.

That is why the exam outline prefers explicit statements like:

- report comment issues only when the comment's claimed behavior contradicts the actual code behavior
- skip stylistic phrasing suggestions
- report security findings only when the code path and impact are explainable from the diff or nearby context

Those criteria narrow the reporting surface much more effectively than generic cautionary language.

## Why False Positives Damage the Whole System

This is one of the most important operational ideas in Topic 4.1.

A noisy review category does not stay isolated. If a bot repeatedly posts weak findings about style, comments, or speculative maintainability concerns, developers often stop reading carefully enough to catch the accurate bug or security finding later in the output.

In other words:

```text
false positives in one category
    ->
trust drops in the whole channel
    ->
accurate findings lose impact too
```

That is why "maximum coverage" is not always the right goal for review automation. In many production teams, a smaller set of high-trust categories is better than a larger set of mixed-quality categories.

For exam questions, remember this pattern:

- if a category is producing high noise, temporarily disable or narrow it first
- restore it only after the criteria or examples are improved

That is usually a better answer than "keep everything enabled and tell the model to be more careful."

## What Explicit Criteria Should Actually Contain

A strong review prompt usually defines five things clearly.

### 1. Reportable issue categories

Say exactly what Claude should report.

Examples:

- correctness defects that can cause wrong behavior
- security issues with a plausible exploit or data exposure path
- data-loss risks
- broken API contract changes
- missing validation that can cause runtime failure

Weak version:

- "Review the code for issues."

Strong version:

- "Report only correctness and security issues introduced by this diff."

### 2. Non-reportable categories

Say exactly what Claude should skip.

Examples:

- naming preferences
- style formatting
- minor refactor suggestions
- subjective maintainability opinions
- comments unless they state behavior that the code contradicts
- local patterns that are unusual but internally consistent

This matters because many false positives come from categories that were never meant to be in scope.

### 3. Evidence threshold

State what kind of support is required before reporting a finding.

Examples:

- cite the file and line or changed region
- explain the concrete failure path
- connect the claim to the actual code behavior
- do not report speculative issues without a causal chain
- if the code depends on unseen application context, note uncertainty and skip unless the defect is directly supported by the diff

This is often the real precision control.

### 4. Severity criteria

Do not assume the words high, medium, and low mean the same thing to every reviewer or every run.

Define them.

Example rubric:

- `high`: likely security exposure, data loss, privilege bypass, or production-breaking correctness issue with direct evidence
- `medium`: real correctness risk or broken edge case with meaningful user impact, but narrower blast radius
- `low`: useful issue worth fixing, but limited impact and not purely stylistic

If a team does not want low-severity review noise, the better prompt is often:

- report only `high` and `medium`

rather than:

- you may report low issues, but only if you are really confident

### 5. Output contract

State how findings should be returned.

Examples:

- path and line
- short title
- severity
- explanation of the defect
- suggested fix only when it is clear
- no output when there are no qualifying findings

A clean output contract does not by itself reduce false positives, but it makes the criteria easier to apply consistently and easier to evaluate later.

## Weak Prompt vs Strong Prompt

### Weak review prompt

```text
Review this PR carefully. Be conservative and only report high-confidence issues. Check for bugs, security problems, comments, maintainability issues, and anything else that looks wrong.
```

Problems:

- no reporting boundary
- no skip boundary
- no severity definition
- no evidence threshold
- "anything else that looks wrong" reopens the scope completely

### Stronger review prompt

```text
Review this diff for actionable correctness and security issues only.

Report a finding only when:
- the changed code introduces a concrete bug, security weakness, or broken contract
- you can point to the relevant file and line or changed block
- you can explain the failure mode or impact from the code shown

Do not report:
- style, formatting, naming, or refactor suggestions
- subjective maintainability concerns
- comment wording unless the comment contradicts actual code behavior
- speculative issues that depend on unseen code or assumptions you cannot support from the diff

Severity:
- high: likely security exposure, privilege bypass, data loss, or production-breaking defect
- medium: real correctness risk with meaningful impact but narrower scope
- low: minor but valid issue; skip low-severity findings entirely for this review

Return findings as:
- path
- line
- severity
- title
- explanation
If there are no qualifying findings, return an empty findings list.
```

The stronger prompt is not better because it uses more words. It is better because it closes ambiguity.

## Severity Criteria Need Concrete Examples

The exam guide explicitly calls out severity criteria with examples. That matters because severity drift is a common source of noisy reviews.

A useful review rubric might look like this:

### `high`

Report as `high` when the issue has direct evidence of severe impact.

Examples:

- a missing authorization check on a privileged mutation endpoint
- string-built SQL in a request path that accepts user input
- deleting or overwriting production data under a likely runtime path
- returning secrets or tokens in an API response

### `medium`

Report as `medium` when the defect is real and user-impacting, but not catastrophic.

Examples:

- a null or undefined path introduced in the diff that can trigger a runtime failure
- validation removed from a write path, causing corrupted but recoverable data
- incorrect branching that skips a required business rule in one case
- using stale state in a way that breaks behavior only for a subset of requests

### `low`

Use `low` only if the review process actually wants low-severity findings.

Examples:

- an inaccurate comment that does not change runtime behavior but can mislead later maintenance
- error handling that is weaker than the surrounding code standard but not clearly broken
- a minor logging or observability gap that complicates debugging without causing incorrect behavior

In many CI review workflows, the better choice is to exclude `low` entirely until the higher-severity categories are trusted.

## Report/Skip Matrices Usually Work Better Than Confidence Language

A practical way to write explicit criteria is to create a report/skip matrix.

Example:

### Report

- auth and permission bypasses
- input validation regressions
- incorrect state transitions
- broken error handling that changes behavior materially
- data integrity and persistence issues
- comment-to-code contradictions that can mislead future changes

### Skip

- naming and formatting preferences
- alternative refactor ideas
- local framework patterns that differ from generic best practices
- comments that are merely incomplete or wordy
- test suggestions unless the missing test reveals a concrete correctness gap
- speculative performance concerns without evidence from the diff

This is often easier for teams to maintain than one long prose paragraph.

## Temporarily Disabling Noisy Categories Is Often the Right Move

This point is directly in the course outline and exam guide.

If one category creates too many false positives, the right short-term response is often:

1. disable or narrow that category
2. preserve trust in the remaining categories
3. gather examples of the noisy cases
4. improve the criteria or add few-shot examples later
5. re-enable only after the quality improves

Common high-noise categories include:

- style and formatting
- broad maintainability critiques
- speculative performance advice
- comment quality without a contradiction rule
- generic testing advice that is not tied to a concrete defect

The exam-safe principle is:

- precision and trust usually matter more than maximal recall in an automated review channel

## A Strong CI Review Prompt Pattern

Scenario 5 is the clearest place to apply Topic 4.1. A strong CI review prompt usually combines:

- explicit issue categories
- exclusions
- severity rules
- output structure
- the instruction to stay grounded in the diff

Example:

```text
Review the current diff.

Goal:
Find only actionable correctness and security issues introduced by this change.

Report only when:
- the problem is directly supported by the changed code or immediately related context
- the issue would cause wrong behavior, security exposure, broken validation, broken state handling, or contract mismatch
- you can explain why the behavior fails

Skip:
- style, formatting, naming, and refactor suggestions
- minor documentation issues
- hypothetical improvements not required for correctness or security
- findings that depend on code not shown unless the defect is still directly inferable

Severity:
- high: exploitable security issue, privilege bypass, data loss, or production-breaking defect
- medium: real correctness issue with meaningful impact
- do not report low-severity findings

For each finding return:
- path
- line
- severity
- title
- explanation
- suggested_fix only if obvious

If there are no qualifying findings, return no findings.
```

That prompt will not make the system perfect, but it gives Claude a much narrower and more useful review policy than "review everything important."

## Implementation or Workflow Guidance

Use this workflow when designing explicit-criteria prompts for review automation:

1. Pick the highest-trust scope first.
   Start with correctness and security rather than every possible review category.
2. Define reportable categories in plain language.
   Say exactly which issue classes count.
3. Define non-reportable categories just as explicitly.
   Precision often improves more from exclusion rules than from extra cautionary wording.
4. Add an evidence standard.
   Require a concrete code path, contradiction, or impact explanation before reporting.
5. Define severity with examples.
   Do not rely on shared intuition about what `high` or `medium` means.
6. Remove low-value categories if they create noise.
   Trust is easier to rebuild when the system reports less but better.
7. Evaluate on a sample set of diffs.
   Look at both false positives and missed true positives before scaling the prompt.
8. Add few-shot examples only after the rule boundary is clear.
   Examples help apply a policy, but they should not be a substitute for having a policy.
9. Keep deterministic workflow concerns outside the prompt when needed.
   Dedupe, merge gates, and policy enforcement often still belong in pipeline code.
10. Revisit categories periodically.
    Once a disabled category has sharper criteria and test cases, you can consider re-enabling it.

## Common Mistakes

- Asking for bugs, security, style, maintainability, comments, and performance in one undifferentiated review pass.
- Using phrases like "be conservative" or "only report high-confidence issues" as the main precision strategy.
- Forgetting to specify what Claude should skip.
- Treating self-reported confidence as a substitute for explicit evidence rules.
- Leaving severity undefined and then expecting stable `high` versus `medium` labeling.
- Keeping noisy categories enabled even after they have already damaged developer trust.
- Reporting low-severity issues in a channel that is supposed to stay high signal.
- Asking for speculative findings that depend on large amounts of unseen context.
- Confusing Topic 4.1 with Topic 4.2 and trying to solve every boundary problem with examples alone.
- Expecting prompt wording alone to handle deterministic pipeline duties such as dedupe or merge gating.

## Exam Takeaways

If you remember only a few things for Topic 4.1, remember these:

1. Explicit criteria beat vague cautionary wording for precision.
2. The prompt should define both what to report and what to skip.
3. False positives reduce trust in the entire review system, not just the noisy category.
4. Disabling a high-noise category is often better than keeping it enabled with weak criteria.
5. Severity labels need concrete definitions and examples.
6. Evidence-based filtering is stronger than asking the model to be "high confidence."
7. Topic 4.1 is about writing the reporting policy clearly; Topic 4.2 is about using examples to help Claude apply it consistently.

## Quick Self-Check

You understand Topic 4.1 if you can answer yes to these questions:

- Can I explain why "be conservative" is weaker than defining exact report and skip categories?
- Can I design a review prompt that reports correctness and security issues while ignoring style and speculative maintainability concerns?
- Can I explain why false positives in one category damage trust in accurate findings elsewhere?
- Can I describe when a noisy category should be disabled temporarily instead of kept alive with vague cautionary wording?
- Can I write a severity rubric that distinguishes `high` from `medium` with concrete examples?
- Can I explain the difference between Topic 4.1 criteria design and Topic 4.2 few-shot prompting?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Be clear, direct, and detailed": https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct
- Anthropic, "Prompting best practices": https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic, "Best Practices for Claude Code": https://code.claude.com/docs/en/best-practices
- Anthropic, "Define success criteria and build evaluations": https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
