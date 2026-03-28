# Topic 4.6: Design Multi-Instance and Multi-Pass Review Architectures

This note explains how to make Claude-based review systems more reliable by separating implementation from review, splitting review into focused passes, and verifying candidate findings before routing them to developers. For the exam, Topic 4.6 is not mainly about one special "review mode." It is about designing a review architecture that gives the reviewer fresh perspective, reduces attention dilution on large changes, and keeps false positives low enough that engineers still trust the output.

Topic 4.1 defined review criteria. Topic 4.6 is about building a review workflow that applies those criteria consistently on real pull requests, especially in Scenario 5 from the exam guide.

## Why This Topic Matters

Automated review gets weaker in three predictable ways:

- the same Claude session that wrote the code is asked to review it and stays anchored to its own earlier assumptions
- one giant review pass over a large multi-file PR spreads attention unevenly
- candidate findings are posted directly to developers without a verification step

Those failure modes produce the exact outcomes teams dislike:

- obvious local bugs get missed
- cross-file regressions are overlooked
- findings contradict each other across files
- low-quality comments reduce trust in the whole review channel

Current Anthropic product behavior reinforces why this topic matters. As of March 26, 2026, Anthropic's managed Code Review docs describe a system where multiple agents analyze code changes in parallel and a verification step checks candidates against actual code behavior before posting findings. That is a concrete modern example of the architectural idea behind Topic 4.6.

## What the Exam Is Testing

For Topic 4.6, the exam is usually testing whether you understand these ideas:

- Self-review in the same session is structurally weaker than an independent review run.
- A fresh reviewer is valuable because it does not inherit the generator's reasoning path.
- Large multi-file reviews often work better when split into per-file local passes plus a separate cross-file integration pass.
- Verification passes are useful because they filter speculative findings before those findings reach developers.
- Confidence output can help route follow-up review, but confidence alone is not enough without evidence.
- Larger context windows do not remove the need to separate local analysis from integration analysis.

The durable exam skill is:

```text
separate generation from review, separate local review from integration review, and verify before you escalate or auto-comment
```

## The Core Mental Model

The simplest correct mental model is:

```text
code change or PR
    ->
fresh review instance or instances
    ->
local per-file analysis passes
    ->
cross-file integration pass
    ->
verification pass on candidate findings
    ->
dedupe, rank, and route findings
```

Another useful way to think about Topic 4.6 is:

```text
independence improves skepticism
pass separation improves attention
verification improves trust
```

That is the core architecture.

You are not trying to create the most complicated review graph possible. You are trying to make each review step easier and more reliable than one overloaded all-in-one pass.

## Current Anthropic Terminology vs Exam Wording

### "Multi-instance review architecture" is an architectural pattern, not one named Anthropic feature

The exam wording describes the pattern directly: use multiple Claude instances or passes to improve review quality.

Current Anthropic materials usually describe the same idea through adjacent terms:

- `prompt chaining` for fixed sequential passes
- `parallelization` for independent local analyses
- `evaluator-optimizer` for critique and correction loops
- `Code Review` for Anthropic's managed review product, which uses multiple agents plus verification

So if an exam question asks about "multi-instance and multi-pass review architectures," the stable answer is architectural, not feature-hunting.

### "Independent instance" today usually means a fresh run or separate session

As of March 26, 2026, current Anthropic docs and engineering guidance do not present one universal "independent reviewer" toggle across every surface. In practice, the pattern usually means one of these:

- a second Claude Code session in another terminal or window
- a fresh headless Claude Code invocation in CI
- a separate API or Agent SDK call used only for review
- Anthropic's managed Code Review service running its own review agents

The important part is the independence of context, not the exact UI.

### Current guidance explicitly recommends multi-Claude review workflows

Anthropic's current "Claude Code Best Practices" engineering post recommends a simple multi-Claude workflow:

- have one Claude write code
- use another Claude to review or test it
- then use another fresh Claude or cleared context to apply the feedback

That maps directly to the exam guide's warning that self-review is weaker when the model keeps its generation context.

### Managed Code Review is a current concrete example of this topic

Current Code Review docs say that multiple agents analyze the diff and surrounding code in parallel, and then a verification step checks candidates against actual code behavior to filter out false positives.

That means Topic 4.6 is not just an exam abstraction. Anthropic's current review surface implements the same broad design principles:

- parallel specialized analysis
- verification before posting
- deduplication and severity ranking after analysis

### Confidence is useful as routing metadata, not as proof

The exam outline mentions confidence output for follow-up review routing. A practical inference from current Anthropic guidance is that confidence works best as one routing signal among others, because the stronger trust mechanism is still evidence plus verification.

In other words:

- `high confidence` without code-backed reasoning is weak
- `medium confidence` with strong evidence may still deserve human review
- verification against actual code behavior is stronger than confidence alone

## Implementation and Workflow Guidance

### 1. Separate generation from review first

The first architectural split is the most important:

- one session or run generates the change
- a different session or run reviews the change

Why this helps:

- the reviewer is not anchored to the implementation plan it just executed
- the review prompt can be optimized for defect finding instead of code generation
- the reviewer can approach the diff with more skepticism

Weak pattern:

```text
generate code
    ->
same session says "now review your own work"
```

Stronger pattern:

```text
implementation run
    ->
fresh review run with the diff, repo context, and review criteria
```

The exam-safe principle is simple:

```text
asking the author to proofread is better than nothing
asking an independent reviewer is better than asking the author
```

### 2. Use per-file local passes before a cross-file integration pass

This is the main multi-pass idea in Topic 4.6.

When a PR touches many files, one giant pass often produces uneven depth. Some files get detailed analysis, others get a skim, and cross-file reasoning competes with local bug-finding for the same attention budget.

A stronger design splits the work:

1. Run focused local passes on each changed file or each small file cluster.
2. Summarize local findings in structured form.
3. Run a separate integration pass that looks only for cross-file issues.

This separation works because local and integration reviews are different tasks.

Local passes are good for issues such as:

- missing guards or null checks
- incorrect conditionals
- stale comments or mismatched logic, if those are in scope
- wrong variable usage or argument wiring
- file-scoped correctness bugs

Integration passes are good for issues such as:

- request and response shape mismatches across modules
- data-flow regressions between layers
- broken authorization propagation
- transaction or caching inconsistencies
- migration and persistence mismatches
- state-management bugs that only appear across file boundaries

The exam guide's sample question about a 14-file PR is testing exactly this point. The right fix is not "use a bigger model and keep one pass." The right fix is usually to separate local attention from integration attention.

### 3. Parallelize local analysis, then serialize synthesis

Topic 4.6 sits at the boundary between prompt chaining and parallelization.

A practical review pipeline often looks like this:

```text
changed files
    ->
parallel local review passes
    ->
aggregate structured findings
    ->
single integration review pass
    ->
verification
```

This pattern gives you:

- better local depth
- lower wall-clock time than a fully sequential design
- a cleaner handoff into integration review

Anthropic's "Building Effective AI Agents" guidance describes this pattern cleanly:

- use `parallelization` when independent subtasks can be reviewed separately
- use `prompt chaining` when one pass should consume the results of earlier passes

Topic 4.6 combines both.

### 4. Add a verification pass before posting findings

This is where many weak review systems fail.

A candidate finding is not yet a trustworthy developer-facing comment. It is just a hypothesis produced by an earlier pass. Before routing it outward, a stronger system verifies it.

A verification pass usually gets:

- the candidate finding
- the relevant code region
- surrounding context needed to check the claim
- the review rubric or severity rules

It then returns something like:

```json
{
  "status": "confirmed",
  "confidence": "high",
  "severity": "normal",
  "evidence": "The new controller accepts `null` from the parser and passes it into `normalizeSku`, which dereferences `value.trim()` without a guard.",
  "post_inline": true
}
```

Possible statuses are often:

- `confirmed`
- `uncertain`
- `rejected`

This is conceptually similar to the evaluator-optimizer pattern in Anthropic's workflow guidance, except the goal here is not rewriting prose. The goal is to filter review noise and keep only findings that survive a focused second look.

### 5. Use confidence to route, not to replace evidence

The exam outline explicitly mentions confidence output. That is useful, but only when interpreted correctly.

A strong routing policy might look like this:

- `confirmed` plus high evidence quality: post inline automatically
- `confirmed` but lower confidence or incomplete evidence: include in a summary or send to human review
- `uncertain`: queue for follow-up review or a second independent verifier
- `rejected`: discard

Do not treat confidence as ground truth. Models can be confidently wrong. The reliable unit is:

```text
claim + evidence + verification result
```

not just:

```text
claim + confidence score
```

### 6. Keep outputs structured between passes

Multi-pass review quality depends on good handoffs.

If local passes emit long free-form prose, the integration pass has to rediscover what matters. That wastes tokens and makes contradictions harder to detect.

Prefer structured local outputs such as:

- file path
- finding type
- severity
- affected symbols
- concise explanation
- open questions
- whether the issue is local-only or may affect cross-file behavior

That gives the integration pass a cleaner input and makes deduplication easier later.

### 7. A practical review orchestrator pattern

For CI review, a strong exam-oriented workflow often looks like this:

```python
changed_files = get_changed_files()

local_findings = parallel_map(
    lambda path: review_file(path, rubric=review_policy),
    changed_files,
)

integration_candidates = review_integration(
    changed_files=changed_files,
    local_summaries=summarize(local_findings),
    rubric=review_policy,
)

all_candidates = dedupe(local_findings + integration_candidates)

verified_findings = [
    verify_finding(candidate, rubric=review_policy)
    for candidate in all_candidates
]

route(verified_findings)
```

This captures the main Topic 4.6 ideas:

- local passes are independent and parallelizable
- integration review is separate
- verification happens before routing

### 8. Choose the architecture by PR size and risk

Not every review needs the full pattern.

A lightweight review is often enough when:

- the PR changes one or two files
- the risk is low
- the code path is local and easy to reason about

A heavier multi-pass architecture is more justified when:

- the PR touches many files
- the change crosses boundaries such as API, database, and worker layers
- subtle regressions matter more than raw latency
- false positives are expensive because the review system comments directly on PRs

The exam generally rewards adding complexity when it measurably improves review quality, not by default.

### 9. Use voting carefully

Anthropic's workflow guidance includes voting as one form of parallelization. That can help in some review settings, but it is usually not the first fix for the specific problem in Topic 4.6.

If a large PR review is weak because the task is overloaded, three full-PR review runs with majority voting often waste tokens and still blur local versus cross-file reasoning.

The better first move is usually:

- split the review by concern
- verify candidates
- then consider extra voting only for especially ambiguous or high-risk findings

That is why the exam guide's sample answer favors per-file plus integration passes over repeated full-PR voting.

## Common Mistakes

- Using the same generation session as the primary reviewer and assuming "be extra critical" removes anchoring bias.
- Running one giant review pass over a large multi-file PR and expecting consistent depth across all files.
- Treating a larger context window as if it automatically solves attention dilution.
- Mixing local bug-finding and cross-file integration analysis into one overloaded prompt.
- Posting raw candidate findings directly to developers without a verification step.
- Treating self-reported confidence as enough evidence to auto-comment on a PR.
- Passing verbose prose between passes instead of structured findings, which makes synthesis and deduplication harder.
- Forgetting to deduplicate findings from local and integration passes before routing.
- Making every PR pay for the most complex review architecture even when the change is small and low risk.
- Using repeated whole-PR voting as the default fix when the real problem is poor review decomposition.
- Ignoring current Anthropic terminology and looking for a literal product feature named "multi-instance review architecture" instead of recognizing it as a workflow pattern.

## Exam Takeaways

If you remember only a few things for Topic 4.6, remember these:

1. Independent review is stronger than same-session self-review because the reviewer does not carry the generator's reasoning path.
2. Topic 4.6 is about architecture, not one hidden Anthropic feature toggle.
3. Large multi-file reviews often improve when split into per-file local passes and a separate cross-file integration pass.
4. Local passes and integration passes solve different problems and should not be conflated.
5. Verification passes reduce false positives by checking candidate findings before they reach developers.
6. Confidence is useful for routing, but evidence and verification are stronger than confidence alone.
7. Parallel local review plus sequential integration review is often a strong balance of speed and quality.
8. Managed Anthropic Code Review is a current real-world example of multiple review agents plus a verification step.
9. Majority voting across repeated full-PR reviews is not usually the first or best fix for attention dilution.
10. Add review complexity when PR size, cross-file risk, or trust requirements justify it.

## Quick Self-Check

You understand Topic 4.6 if you can answer yes to these questions:

- Can I explain why a fresh reviewer is usually better than asking the generator session to review its own work?
- Can I explain the difference between a per-file local review pass and a cross-file integration pass?
- Can I design a review pipeline that parallelizes local analysis and then runs a separate integration pass?
- Can I explain why verification should happen before findings are posted to developers?
- Can I describe how confidence should influence routing without treating confidence as proof?
- Can I explain why a bigger context window does not automatically remove the need for multi-pass review?
- Can I identify when a simple review run is enough and when a heavier multi-pass design is worth the cost?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Code Review": https://code.claude.com/docs/en/code-review
- Anthropic Engineering, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
- Anthropic Engineering, "Claude Code Best Practices": https://www.anthropic.com/engineering/claude-code-best-practices
