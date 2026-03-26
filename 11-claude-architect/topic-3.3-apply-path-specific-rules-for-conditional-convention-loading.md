# Topic 3.3: Apply Path-Specific Rules for Conditional Convention Loading

This note explains how Claude Code can load conventions only when they are relevant to the files Claude is working with. For the exam, Topic 3.3 is not mainly about memorizing one YAML field. It is about choosing the right conditional loading mechanism so Claude sees the right conventions at the right time without carrying irrelevant rules through every session.

Topic 3.1 established the broader memory hierarchy with `CLAUDE.md` and `.claude/rules/`. Topic 3.3 narrows that down to one specific design problem: once you already use rules, when should a rule load for the whole project, when should it live in a subtree, and when should it activate only for matching file patterns across the repository?

## Why This Topic Matters

Mixed codebases rarely organize conventions in one neat folder.

Common examples:

- test files live next to production code instead of under one `tests/` directory
- Markdown files appear in `docs/`, package roots, and onboarding folders
- React components, stories, migrations, or API handlers are spread across packages in a monorepo
- one team wants strong conventions for `*.sql` or `*.tf` files without forcing those instructions into every unrelated task

If all of those conventions live in a root `CLAUDE.md`, Claude gets extra context on every task whether it needs it or not. That creates the exact failure pattern the exam wants you to recognize:

- irrelevant rules consume context
- overlapping instructions become harder to follow consistently
- users start adding more files and more prose instead of improving scope

Path-specific rules are the precision tool for this problem. They let you keep conventions modular and load them only when Claude is actually working with matching files.

## What the Exam Is Testing

For Topic 3.3, the exam is usually testing whether you understand these ideas:

- `.claude/rules/` files can use YAML frontmatter with a `paths` field for conditional loading.
- Rules without a `paths` field are unconditional and load at session start.
- Glob patterns let conventions follow file types or file shapes across the repository instead of depending only on directory boundaries.
- Path-specific rules are usually better than nested `CLAUDE.md` files when the same convention applies to files scattered across many directories.
- Path-specific rules reduce irrelevant context, but they are still guidance loaded into context rather than enforced policy.
- Current Anthropic docs are slightly more precise than some exam phrasing: path-scoped rules trigger when Claude reads matching files, not on every tool use.

The local exam guide phrases this topic as "conditional convention loading." Current Anthropic docs still support that idea, but the practical implementation is specifically rule files in `.claude/rules/` with `paths` globs.

## The Core Mental Model

The simplest correct mental model is:

```text
always relevant to the whole project
    ->
project CLAUDE.md or an unscoped rule

relevant to one subtree with its own workflow
    ->
nested CLAUDE.md

relevant to scattered files that share a pattern
    ->
path-specific rule with paths globs

relevant only for an occasional reusable task
    ->
skill, not always-loaded memory
```

Another useful way to think about Topic 3.3 is:

1. What causes this convention to matter: the repo, a folder, or a file pattern?
2. Should Claude see it on every session, or only when matching files are involved?
3. Is the convention really about file shape and location, or is it actually a task playbook?

If the trigger is "these kinds of files anywhere in the repo," path-specific rules are usually the right answer.

## Current Anthropic Terminology vs Exam Wording

### Path-specific rules are part of the Claude Code memory system

Current Anthropic docs place path-specific rules under Claude Code's memory and instruction system, alongside `CLAUDE.md`, imports, and auto memory.

That matters because the exam phrase "conditional convention loading" can sound more magical than it really is. In current docs, the mechanism is concrete:

- put markdown rule files in `.claude/rules/`
- add YAML frontmatter
- use `paths` globs to scope the rule

This is conditional context loading, not a separate policy engine.

### Current docs are more precise than "when editing matching files"

The local exam guide says path-scoped rules load only when editing matching files. That is close, but current Anthropic docs are more specific:

- path-scoped rules trigger when Claude reads files matching the pattern
- they do not trigger on every tool use

That is an important practical nuance.

If Claude has not actually opened or read a matching file yet, you should not assume the rule is already active just because the conversation mentions that area of the codebase.

### Rules without `paths` are still rules, but they are not conditional

Another easy exam trap is to assume that everything inside `.claude/rules/` is lazy-loaded.

Current Anthropic docs say:

- rules without `paths` frontmatter load at launch
- they load with the same priority as `.claude/CLAUDE.md`

So Topic 3.3 is not "how rules work in general." It is specifically about when you add `paths` to make a rule conditional.

### Path-specific rules are guidance, not enforcement

This distinction remains critical across the Claude Code topics.

Path-specific rules help Claude see the right conventions at the right time, but they do not:

- block tool use
- enforce permissions
- guarantee compliance

If a rule must be technically guaranteed, the answer is usually settings, permission controls, hooks, or some other deterministic control, not just a path-scoped markdown file.

## How Path-Specific Rules Actually Load

Current Anthropic docs describe `.claude/rules/` as a modular instruction directory:

- all markdown rule files are discovered recursively
- unscoped rules load at session start
- path-scoped rules load when Claude works with matching files by reading them
- `/memory` shows which instruction files are currently loaded

That gives you a practical loading model:

```text
session starts
    ->
project CLAUDE.md + unscoped rules load
    ->
Claude reads a file that matches a path rule
    ->
that rule is injected into context
```

This is why Topic 3.3 helps both adherence and context efficiency:

- rules stay modular
- only the relevant subset joins the active context
- scattered conventions do not have to live in one giant root file

## When Path-Specific Rules Are the Right Tool

The exam is often testing your ability to choose the right scoping mechanism, not just your ability to write YAML.

| Situation | Best tool | Why |
| --- | --- | --- |
| Repo-wide coding or workflow baseline | Project `CLAUDE.md` or unscoped rule | Claude should see it on most sessions |
| One package or subtree has its own commands or architecture | Nested `CLAUDE.md` | The whole directory behaves differently |
| The same convention applies to matching files across many directories | Path-specific rule | The trigger is a file pattern, not one folder |
| The instruction is a reusable task or playbook | Skill | It should load on demand, not because of file reads |

### Better than a nested `CLAUDE.md` for dispersed file types

Suppose test files live next to source files throughout a monorepo:

```text
packages/
  billing/src/service.test.ts
  checkout/src/hooks/useCart.test.tsx
  search/src/query.spec.ts
```

A nested `CLAUDE.md` under one test folder cannot cover that cleanly because the convention is not attached to one subtree. The real trigger is:

- "when working on test files anywhere"

That is exactly what `paths` globs are for.

### Worse than a nested `CLAUDE.md` when an entire area really differs

If one package has different build commands, deployment workflow, architectural boundaries, and review expectations, that is usually not a file-pattern problem.

That is a subtree problem, so a nested `CLAUDE.md` is usually the cleaner answer.

Do not force everything into path rules just because Topic 3.3 exists.

### Worse than a skill for occasional task playbooks

If the instruction is:

- "run the release checklist"
- "review this PR for regressions"
- "generate migration notes"

that is task-triggered, not file-triggered. A skill is usually a better fit because it loads on demand rather than as always-available memory.

## Designing Good `paths` Patterns

The technical mechanism for Topic 3.3 is simple, but weak patterns create weak outcomes.

Current docs show a few important facts:

- `paths` uses glob patterns
- multiple patterns are allowed
- brace expansion is supported
- patterns can target extensions, directories, or combinations of both

### Example: API-only conventions

```md
---
paths:
  - "src/api/**/*.ts"
---

# API Development Rules

- Validate all external inputs.
- Use the standard error response contract.
- Keep OpenAPI comments in sync with handler behavior.
```

This is a good path rule because:

- it is focused on one concern
- the trigger is concrete
- the rule does not pollute unrelated frontend or database work

### Example: test conventions across the whole repo

```md
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
---

# Test File Conventions

- Prefer behavior-focused test names.
- Use shared test helpers before creating ad hoc setup.
- Avoid real network calls in unit tests unless the test is explicitly integration-scoped.
- When fixing a regression, add or update the failing test first.
```

This is the kind of pattern Topic 3.3 is really about:

- the files are dispersed
- the convention is about file type, not folder ownership
- loading the rule only when Claude reads tests reduces noise

### Example: multiple extensions with brace expansion

Current Anthropic docs explicitly show brace expansion such as:

```md
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
---
```

This is useful when one convention applies to a family of file extensions and you want fewer duplicated patterns.

## Implementation or Workflow Guidance

Topic 3.3 is practical. The easiest way to study it is to use a repeatable workflow for deciding whether a convention belongs in a path-scoped rule.

### Workflow 1: Identify the real trigger for the convention

Before writing a rule, ask:

1. Does this convention apply to the whole repo?
2. Does it apply to one subtree?
3. Does it apply to files matching a pattern across many places?
4. Is it really a task, not a file convention?

The answers usually map cleanly:

- whole repo -> project `CLAUDE.md` or unscoped rule
- one subtree -> nested `CLAUDE.md`
- scattered matching files -> path-specific rule
- on-demand task -> skill

This step matters because many bad Topic 3.3 implementations are really scope mistakes.

### Workflow 2: Keep one rule focused on one concern

A path rule works best when it covers one coherent convention area.

Good rule topics:

- test-writing conventions
- API handler expectations
- migration file rules
- storybook or component documentation conventions
- infrastructure file guardrails

Weak rule topics:

- "all engineering standards"
- a mixed list of testing, security, naming, deployment, and product policy

Focused rule files are easier to maintain, easier to debug, and less likely to conflict with root guidance.

### Workflow 3: Write patterns that match the real file layout

The right pattern is not the cleverest pattern. It is the pattern that matches the repository as it actually exists.

Good habits:

- inspect where the target files really live
- prefer simple patterns you can reason about quickly
- use multiple explicit patterns if that is clearer than one dense pattern
- avoid over-broad globs that sweep in unrelated files

For example:

- `**/*.test.ts` is usually clearer than a very compressed expression if only one file type matters
- `src/**/*` is reasonable when the entire `src/` tree shares the same convention
- `*.md` is only for Markdown files at the project root, not every Markdown file everywhere

### Workflow 4: Keep project baseline rules separate from conditional ones

A strong setup usually looks like this:

- project `CLAUDE.md` or an unscoped rule for baseline standards
- path-specific rules only for conventions that should load conditionally

This separation prevents two common failures:

- putting every specialized convention into the root file
- duplicating the same instruction in global and conditional places

A clean mental split is:

- broad defaults live broadly
- file-pattern specifics live conditionally

### Workflow 5: Verify loading instead of guessing

When a path-specific rule seems ignored, the best debugging sequence is:

1. run `/memory`
2. verify whether the rule file is currently loaded
3. confirm Claude has actually read a file that should match the pattern
4. inspect the rule for conflicting or vague instructions
5. if needed, use the `InstructionsLoaded` hook to log when rules load and why

This is a much stronger answer than saying "make the prompt clearer."

## A Good Repo Layout for Topic 3.3

```text
repo/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── testing.md
│       ├── frontend/
│       │   └── stories.md
│       └── backend/
│           └── api.md
├── packages/
│   ├── billing/src/service.test.ts
│   ├── checkout/src/hooks/useCart.test.tsx
│   └── search/src/query.spec.ts
└── docs/
    └── onboarding.md
```

A sensible arrangement here would be:

- `.claude/CLAUDE.md` for repo-wide defaults
- `.claude/rules/testing.md` with `paths` for test files anywhere
- `.claude/rules/backend/api.md` with `paths` for API handlers
- no attempt to fake dispersed file-type rules using one deep nested `CLAUDE.md`

## What Good Path-Scoped Rule Design Looks Like

A strong Topic 3.3 implementation usually has these properties:

- the rule exists because the convention follows a file pattern, not just because rules feel modern
- the glob patterns mirror the real repository layout
- the rule covers one topic cleanly instead of becoming a mini root manual
- project-wide baseline guidance stays outside the path rule
- the same convention is not duplicated across root files, nested files, and multiple overlapping rules
- the team can verify rule loading quickly with `/memory`
- nobody confuses conditional loading with technical enforcement

In practice, good path-scoped rule design improves three things at once:

- relevance, because Claude sees the convention only when it matters
- context quality, because unrelated tasks do not drag in file-specific instructions
- maintainability, because teams can evolve conventions by topic instead of overgrowing one file

## Common Mistakes

- Using a subdirectory `CLAUDE.md` for a convention that actually applies to scattered files across many directories.
- Assuming every rule file in `.claude/rules/` is conditional, when unscoped rules actually load at session start.
- Believing a path rule activates on every tool use instead of when Claude reads matching files.
- Writing globs that are too broad and pulling unrelated files into the same convention bucket.
- Writing globs that are too narrow and then concluding Claude "ignored" the rule when the file never matched.
- Duplicating the same instruction in root `CLAUDE.md`, an unscoped rule, and a path rule, creating conflicts.
- Treating path-specific rules as hard enforcement instead of behavioral guidance.
- Using path rules for occasional task workflows that should be skills.
- Forcing file-pattern logic where a whole subtree really needs its own nested `CLAUDE.md`.
- Failing to check `/memory` before debugging rule behavior.

## Exam Takeaways

If you remember only a few things for Topic 3.3, remember these:

1. Path-specific rules live in `.claude/rules/` and use YAML frontmatter with a `paths` field.
2. Rules without `paths` are unconditional and load at launch with the same priority as `.claude/CLAUDE.md`.
3. Path-scoped rules are the right tool when conventions follow file patterns across the repo rather than one directory boundary.
4. Current Anthropic docs say path-scoped rules trigger when Claude reads matching files, not on every tool use.
5. Glob patterns let the same convention apply by extension, folder, or mixed patterns without forcing everything into one root file.
6. Use path rules instead of nested `CLAUDE.md` when the convention is dispersed across the codebase.
7. Use nested `CLAUDE.md` instead when an entire subtree has its own workflow or architecture.
8. Use skills instead of path rules when the instruction is task-triggered rather than file-triggered.
9. Path-specific rules reduce irrelevant context, but they do not enforce permissions or policy.
10. `/memory` is the first debugging tool for checking whether a conditional rule actually loaded.

## Quick Self-Check

You understand Topic 3.3 if you can answer yes to these questions:

- Can I explain why a `**/*.test.tsx` rule is usually better than one nested `CLAUDE.md` when tests are spread across packages?
- Can I explain the difference between an unscoped rule in `.claude/rules/` and a path-scoped rule with `paths` frontmatter?
- Can I describe the current-doc nuance that rules trigger when Claude reads matching files, not on every tool use?
- Can I explain when a nested `CLAUDE.md` is cleaner than a path rule?
- Can I explain why path-specific rules improve context relevance but do not technically enforce behavior?
- Can I debug a "Claude ignored the rule" complaint by checking `/memory` and the actual matched file path first?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "How Claude remembers your project": https://code.claude.com/docs/en/memory
