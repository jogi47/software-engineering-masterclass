# Topic 3.6: Integrate Claude Code into CI/CD Pipelines

This note explains how to run Claude Code as a reliable automation component instead of as an interactive coding partner. For the exam, Topic 3.6 is not mainly about memorizing one GitHub Action or one CLI flag. It is about designing CI/CD workflows that do not hang, produce machine-consumable outputs, use shared project standards, and keep review quality high by separating implementation context from review context.

This topic sits at the boundary between Claude Code workflow design and prompt/output discipline. In practice, good CI automation depends on both.

## Why This Topic Matters

Interactive Claude Code sessions assume a human can clarify intent, approve risky actions, and interpret free-form output. CI jobs cannot do that.

If you integrate Claude Code into pipelines carelessly, common failure modes appear quickly:

- the job hangs because Claude is waiting for interactive input
- the output is useful to a human but impossible for the pipeline to parse safely
- reruns keep posting duplicate PR comments
- test generation ignores the existing suite and produces low-value duplicates
- review runs become biased because the same session that wrote the code is now "reviewing" it
- the repository has standards, but the CI-invoked Claude run does not see them consistently

Scenario 5 in the exam guide is built around these problems. The exam wants you to recognize the operational shape of a strong Claude-in-CI workflow, not just the existence of automation features.

## What the Exam Is Testing

For Topic 3.6, the exam is usually testing whether you understand these ideas:

- Use `-p` or `--print` for non-interactive Claude Code execution in automation.
- Prefer machine-readable outputs for CI integrations instead of trying to parse prose with regexes.
- `--output-format json` and `--json-schema` solve related but not identical automation problems.
- `CLAUDE.md` is the shared project context layer that helps CI-invoked Claude follow team standards.
- Fresh review runs are better than self-review inside the same implementation session.
- Re-review workflows should suppress already-reported or already-fixed issues.
- Test-generation workflows improve when Claude sees the existing tests, fixtures, and testing standards.

The durable exam skill is this:

```text
Treat Claude Code in CI as a stateless automation worker with shared repo context and explicit output contracts.
```

## The Core Mental Model

The simplest correct mental model is:

```text
repo event
    ->
fresh headless Claude run
    ->
structured result artifact
    ->
pipeline logic posts comments, gates status, or stores outputs
    ->
human reviewers still make merge decisions
```

Another useful way to think about Topic 3.6 is:

```text
interactive coding session
    ->
good for exploration and implementation

fresh CI invocation
    ->
good for repeatable review, summarization, classification, and test suggestion
```

The CI runner is the orchestrator. Claude Code is one worker inside that orchestration. The runner decides when to invoke Claude, what context to provide, how to store the result, and what to do next. Claude should not be the only enforcement layer.

That last point matters. If a pipeline must avoid duplicate PR comments, enforce severity thresholds, or gate merges, the workflow should combine:

- Claude's reasoning
- structured outputs
- deterministic pipeline logic

## Current Anthropic Terminology vs Exam Wording

### "Claude Code in CI/CD" now spans several current docs and products

The exam guide speaks broadly about integrating Claude Code into CI/CD pipelines. Current Anthropic documentation splits that idea across several surfaces:

- `Claude Code GitHub Actions` for GitHub-hosted automation
- `Claude Code GitLab CI/CD` for GitLab pipelines
- `Code Review` for Anthropic-managed automated PR review
- the Claude Code CLI and Agent SDK for custom headless automation

So if an exam question says "integrate Claude Code into CI/CD," do not assume it means only one product. The broader workflow skill is the real target.

### GitHub Actions currently uses `anthropics/claude-code-action@v1`

Current GitHub docs use the product name `Claude Code GitHub Actions`. The current action version is `@v1`, and the docs describe a GA configuration model based on:

- `prompt`
- `claude_args`
- automatic mode detection

That matters because older examples may still show beta-era inputs such as:

- `mode`
- `direct_prompt`
- `custom_instructions`

For exam prep, the stable concept is more important than the exact migration details:

- current GitHub Actions integrations pass instructions through `prompt`
- CLI flags are passed through `claude_args`

### GitLab CI/CD is current too, but the docs call it beta

Current Claude Code docs also include `Claude Code GitLab CI/CD`. The page explicitly says the integration is in beta and maintained by GitLab.

That is worth knowing because the exam may ask about CI/CD as a general pattern, while the current product surface varies slightly by platform and maturity.

### Headless automation still means `-p` or `--print`

Current Claude Code CLI docs still define `-p` / `--print` as the non-interactive mode for scripted use. This is the direct mapping to the exam outline's "run Claude Code headlessly in CI."

This part of the exam wording aligns cleanly with the current docs.

### Structured output now has two distinct layers

Current Claude Code CLI docs expose both:

- `--output-format`, with `text`, `json`, and `stream-json`
- `--json-schema`, which requests validated JSON matching a schema after the agent finishes its workflow

These are related, but they are not the same thing.

In practice:

- use `--output-format json` when you want machine-readable run output and metadata
- use `--output-format stream-json` when you need real-time events
- use `--json-schema` when you need a strict final object that downstream automation can trust structurally

The exam guide groups `--output-format json` and `--json-schema` together under structured CI automation, which is directionally right. The more precise current-doc view is that one controls transport format and the other controls the final result schema.

One caution is important here: the docs clearly describe both flags, but they do not emphasize every possible combination pattern. If your team standardizes on a combined usage pattern, verify the exact output shape against your installed CLI version before hardcoding a parser.

### `CLAUDE.md` remains the shared repo instruction layer

Current GitHub Actions, GitLab CI/CD, and general Claude Code docs still describe `CLAUDE.md` as the shared way to encode project guidance.

That aligns with the exam guide. A CI-invoked Claude run should not rely only on the per-job prompt if the standards are durable and repo-wide.

### Current managed Code Review also introduces `REVIEW.md`

This is a useful modern nuance.

Anthropic's current `Code Review` docs say that managed reviews can use:

- `CLAUDE.md` for shared Claude Code instructions
- `REVIEW.md` for review-only rules

The exam guide for Topic 3.6 emphasizes `CLAUDE.md`, not `REVIEW.md`, so `CLAUDE.md` is still the safer exam answer when the question asks about shared CI context. But for current production practice, `REVIEW.md` is worth knowing because it lets you keep review-only criteria out of the general coding memory.

### "Independent review instance" maps cleanly to a fresh invocation

The exam says the same Claude session that generated code is less effective at reviewing its own changes than an independent review instance.

Current Anthropic docs do not frame this as one dedicated "review isolation" toggle, but the session model supports the same idea:

- fresh `claude -p` invocations start separate runs
- Agent SDK `query()` creates a new session for each call
- `ClaudeSDKClient` is the continuous-session option when you do want shared context

So the exam-safe interpretation is:

- implementation and review should usually be separate runs
- do not default to resuming the editing session for code review

That is partly an inference from the current session model and partly explicit exam guidance. It is a strong inference, and it matches real operational practice.

## Why Headless Execution Is Mandatory in CI

CI jobs are autonomous. They cannot answer follow-up questions or click approval prompts in a terminal UI.

Anthropic's current workflow docs make the same practical point for scheduled automation: autonomous runs need explicit success criteria because they cannot negotiate requirements mid-run.

That is why `claude -p` matters so much:

- it runs without the interactive REPL
- it prints a result and exits
- it fits shell pipelines, CI runners, scheduled jobs, and wrappers such as GitHub Actions

A minimal pattern looks like this:

```bash
claude -p "Review the current diff for correctness and security issues"
```

But in real CI, the stronger pattern is to add explicit output and execution controls:

```bash
claude -p "Review the current diff for correctness issues. Return only actionable findings." \
  --max-turns 5 \
  --output-format json
```

In review-oriented CI jobs, keep the tool surface narrow and the behavior predictable. If the job is review-only, do not grant unnecessary edit capability. The goal is repeatable analysis, not open-ended autonomous coding.

## Choosing the Right Output Contract for Automation

This is one of the highest-value distinctions in Topic 3.6.

### Use `--output-format json` when the pipeline needs run metadata

Current Claude Code docs say `--output-format json` returns machine-readable output rather than plain text. The common workflows page specifically describes it as a JSON array of messages with metadata such as cost and duration.

That is useful when your pipeline wants to:

- archive the full run output
- inspect the final result plus metadata
- debug what Claude did during the run
- feed the run artifact into another internal tool

### Use `--json-schema` when the pipeline needs a strict final object

The current CLI surface exposes `--json-schema` for structured output validation after the agent completes its workflow.

That is usually the stronger fit when your pipeline wants to do things like:

- post inline PR comments from a `findings[]` array
- create a machine-readable review summary
- decide pass or fail based on a small set of structured fields
- hand Claude's result to another automation step without brittle parsing

### A strong review schema

For CI review, a good schema usually asks for fields your automation can map directly into platform APIs:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pass", "fail"]
    },
    "summary": {
      "type": "string"
    },
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "path": { "type": "string" },
          "line": { "type": "integer", "minimum": 1 },
          "severity": {
            "type": "string",
            "enum": ["high", "medium", "low"]
          },
          "title": { "type": "string" },
          "explanation": { "type": "string" },
          "suggested_fix": { "type": "string" }
        },
        "required": ["path", "line", "severity", "title", "explanation"]
      }
    }
  },
  "required": ["status", "summary", "findings"]
}
```

This shape is better than a vague prose summary because your pipeline can:

- map `path` and `line` into inline comments
- ignore unsupported severity levels deterministically
- suppress duplicates by hashing finding fields
- compute job status from `status` or `findings.length`

### Do not confuse structured output with correct judgment

This is an important exam nuance.

A valid schema guarantees structure, not truth. Claude can still produce:

- false positives
- wrong severity
- weak explanations
- duplicate findings worded differently

So the robust pattern is:

- use schema validation for structure
- use prompt design and repo guidance for quality
- use pipeline logic for dedupe, gating, and enforcement

## Use `CLAUDE.md` to Make CI Runs Project-Aware

`CLAUDE.md` is the durable shared memory for Claude Code. In CI, that matters because the runner is ephemeral but the repository instructions persist.

For Topic 3.6, `CLAUDE.md` is where you should put things like:

- testing standards and what counts as a high-value test
- fixture locations and helper utilities
- review criteria that go beyond linters
- patterns that should be preferred or avoided
- directories that should usually be ignored during review
- migration, compatibility, or API-contract expectations

Good CI-oriented guidance is durable and reusable.

Bad CI-oriented guidance is:

- PR-specific
- too verbose
- contradictory
- full of one-off requests that do not belong in repository memory

### Example of useful CI-oriented `CLAUDE.md` guidance

```md
# Review and Testing Standards

- Prefer correctness, regression risk, and security findings over style nits.
- Do not comment on generated files under `src/gen/`.
- New API routes should include integration-test coverage.
- Prefer extending existing fixtures in `test/fixtures/` over creating near-duplicate test setup.
- When proposing tests, look for missing behavior coverage rather than rewriting tests that already exist.
```

That kind of guidance helps both:

- review jobs avoid low-value noise
- test-generation jobs avoid redundant suggestions

## Separate Generation from Review

This is one of the most important ideas in Topic 3.6.

If Claude helped write the code in one session, then "reviewing" that same code in the same session is weaker than a fresh review run. The problem is not that Claude becomes incapable of criticism. The problem is that the session already contains:

- earlier assumptions
- partial plans
- implementation rationale
- local compromises made during coding

That can bias the review.

### The stronger workflow

```text
implementation session or job
    ->
code changes exist
    ->
fresh review invocation
    ->
structured findings
    ->
human review and merge decision
```

Current Anthropic managed `Code Review` follows the same general spirit. The docs describe a dedicated review system where multiple agents analyze the diff and surrounding code, followed by a verification step and deduplication before comments are posted. That is not the same feature as a custom CLI pipeline, but it reinforces the same design lesson:

- review is stronger when it is its own run, not an afterthought inside the coding session

### What this means operationally

For custom CI:

- do not default to `--continue` or `--resume` for review
- prefer a new `claude -p` invocation for each review run
- if you need context from prior runs, inject a concise structured summary instead of sharing the whole editing transcript

That is usually a better balance of independence and continuity.

## Re-Run Reviews Without Spamming Duplicate Findings

The exam guide explicitly cares about rerunning reviews after new commits without duplicating already-reported issues.

This is not something you should leave entirely to natural-language prompting.

The strongest workflow is:

1. Store prior findings as a structured artifact.
2. On a new commit, load the previously posted findings.
3. Pass those findings back to Claude as already-known review context.
4. Instruct Claude to return only newly discovered issues or previously reported issues that are still unresolved.
5. Apply deterministic dedupe in pipeline code before posting comments.

### Why prompt-only dedupe is not enough

Claude can often suppress duplicates if prompted well, but prompt-only dedupe is still probabilistic. The pipeline should also compare:

- file path
- line number
- normalized title or category
- prior comment IDs or hashes

That way, even if Claude rephrases the same issue, your automation has a second defense against noise.

### A strong rerun prompt pattern

```text
Review the latest PR diff for correctness and regression issues.

Previously posted findings are included below. Do not repeat issues that are already fixed.
Only return:
- new findings introduced by the latest changes
- prior findings that are still present

If a previously reported issue is now fixed, omit it.
Return only results that match the schema.
```

This is much stronger than:

```text
Review this again and avoid duplicates.
```

## Improve Test-Generation Quality by Providing Existing Tests and Standards

The exam guide also emphasizes test generation in CI. The main point is not "Claude can write tests." It is "Claude writes better tests when it understands the existing suite."

Weak test-generation workflow:

- "Write tests for this feature."

Stronger workflow:

- provide the relevant implementation diff
- provide the existing test files or test directory context
- tell Claude what fixtures and helpers already exist
- define what counts as missing high-value coverage
- tell Claude not to duplicate scenarios already covered

### Why this matters

Without that context, Claude often produces:

- duplicate happy-path tests
- tests that ignore local fixture conventions
- tests in the wrong style for the repo
- shallow coverage that misses the real regression risk

With the right context, Claude can instead focus on:

- uncovered edge cases
- regressions introduced by the diff
- missing failure-path tests
- higher-value integration coverage where appropriate

### Good repo guidance for CI test generation

For Topic 3.6, a good `CLAUDE.md` or prompt often includes things like:

- where reusable fixtures live
- when to prefer unit versus integration tests
- how to name test files
- which edge cases matter most in this codebase
- what duplicate coverage looks like

This is one of the clearest examples of why `CLAUDE.md` improves CI quality. It gives Claude reusable, team-level judgment instead of forcing every workflow file to restate it.

## Implementation or Workflow Guidance

Use this workflow when integrating Claude Code into CI/CD:

1. Choose the right integration surface.
   Use the CLI or Agent SDK for custom automation, GitHub Actions for GitHub-native workflows, GitLab CI/CD for GitLab-native jobs, and Anthropic-managed Code Review when that product fits the requirement.
2. Run headlessly.
   Use `claude -p` or a wrapper that ultimately invokes Claude Code non-interactively.
3. Make the output contract explicit.
   Use `--output-format json` for machine-readable run output and `--json-schema` when downstream logic needs a validated final object.
4. Keep repo-wide standards in `CLAUDE.md`.
   Put durable review and testing guidance there so every CI run inherits it.
5. Keep review runs separate from implementation runs.
   Use a fresh invocation for review instead of resuming the session that wrote the code.
6. Keep review jobs narrow.
   In CI review mode, prefer read-focused analysis and avoid unnecessary write capability.
7. Persist findings between runs.
   Store prior review results so reruns can focus on new or unresolved issues.
8. Add deterministic dedupe in pipeline code.
   Do not rely only on the model to avoid duplicate comments.
9. Feed existing tests into test-generation tasks.
   Show Claude what already exists so it can propose missing coverage instead of cloning current coverage.
10. Define success up front.
    CI jobs cannot negotiate requirements interactively, so prompts should say what to check, what to ignore, and what the output should look like.

## Common Mistakes

- Forgetting to use `-p` and ending up with a job that waits for interactive input.
- Asking for free-form prose output and then trying to parse it with brittle shell logic.
- Treating `--output-format json` and `--json-schema` as exact synonyms.
- Using the same Claude session that wrote the code to review the code.
- Re-running reviews without passing prior findings, which leads to duplicate comments.
- Depending only on prompt wording for dedupe instead of adding deterministic suppression in the pipeline.
- Keeping `CLAUDE.md` empty and then compensating with long one-off prompts in each workflow file.
- Putting ephemeral PR-specific instructions into `CLAUDE.md`, which pollutes later runs.
- Asking Claude to generate tests without showing the existing tests, fixtures, or standards.
- Giving CI review jobs broader permissions or tool access than they actually need.

## Exam Takeaways

If you remember only a few things for Topic 3.6, remember these:

1. CI automation should invoke Claude Code headlessly with `-p` or `--print`.
2. Machine-readable outputs are better than parsing prose in automation.
3. `--output-format json` and `--json-schema` serve different automation needs.
4. `CLAUDE.md` is the shared repo context layer that keeps CI runs aligned with team standards.
5. Fresh review runs are stronger than self-review in the same session.
6. Re-review workflows should pass prior findings and suppress duplicates.
7. Test-generation quality improves when Claude sees the existing suite, fixtures, and standards.
8. Claude's output should be part of the pipeline logic, not the only enforcement layer.

## Quick Self-Check

You understand Topic 3.6 if you can answer yes to these questions:

- Can I explain why `claude -p` is necessary in CI?
- Can I explain the difference between `--output-format json` and `--json-schema`?
- Can I explain why `CLAUDE.md` improves CI review and test-generation quality?
- Can I explain why a fresh review run is stronger than reviewing in the same implementation session?
- Can I describe a rerun workflow that avoids duplicate PR comments?
- Can I explain why existing tests and fixtures should be provided when asking Claude to generate more tests?

## References

- Anthropic, "Claude Code CLI reference": https://code.claude.com/docs/en/cli-reference
- Anthropic, "Claude Code common workflows": https://code.claude.com/docs/en/common-workflows
- Anthropic, "Claude Code GitHub Actions": https://code.claude.com/docs/en/github-actions
- Anthropic, "Claude Code GitLab CI/CD": https://code.claude.com/docs/en/gitlab-ci-cd
- Anthropic, "Code Review": https://code.claude.com/docs/en/code-review
- Anthropic, "Agent SDK reference - Python": https://platform.claude.com/docs/en/agent-sdk/python
- Anthropic, "Get structured output from agents": https://platform.claude.com/docs/en/agent-sdk/structured-outputs
- Local exam framing: [claude-certified-architect-foundations-certification-exam-guide.md](claude-certified-architect-foundations-certification-exam-guide.md)
