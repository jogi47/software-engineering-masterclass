# Topic 3.2: Create and Configure Custom Slash Commands and Skills

This note explains how Claude Code packages recurring workflows and reusable guidance into skills that can be invoked directly as slash commands or loaded automatically when relevant. For the exam, Topic 3.2 is not mainly about memorizing one folder path. It is about choosing the right abstraction, putting it at the right scope, and adding the right invocation and permission guardrails so reusable automation stays useful instead of becoming noisy or risky.

Topic 3.2 is also another place where the exam wording and the current docs are close but not identical. The outline says "custom slash commands and skills" as if they are separate features. Current Anthropic docs treat skills as the main mechanism for creating your own reusable commands in Claude Code. The durable idea is still the same: package repeatable behavior into something Claude can reuse safely and predictably.

## Why This Topic Matters

Without reusable commands and skills, teams end up repeating the same long prompts and workflow instructions over and over:

- "review this PR for regressions and missing tests"
- "deploy this service using our release checklist"
- "explain this subsystem with the architecture conventions in mind"
- "generate a migration plan and keep the output format consistent"

That repetition creates several problems:

- workflow quality depends on whether the user remembered the full prompt
- side-effectful tasks can fire at the wrong time if there is no explicit invocation boundary
- repo-specific instructions get stuffed into always-loaded memory even when they matter only occasionally
- one developer's private helper accidentally becomes team policy, or the reverse

The exam tests whether you understand reusable workflow packaging as an architecture decision, not just a convenience feature.

## What the Exam Is Testing

For Topic 3.2, the exam is usually testing whether you understand these ideas:

- A reusable workflow can live at personal scope or project scope, and putting it at the wrong scope creates predictable collaboration problems.
- In current Claude Code, skills are the primary way to define reusable custom commands.
- A skill can be used as optional knowledge, as a direct task command, or as a forked workflow that runs in an isolated agent context.
- `description`, `argument-hint`, `context: fork`, and `allowed-tools` shape when and how a skill runs.
- Manual invocation and automatic invocation are different design choices, and side-effectful workflows usually should not be auto-invoked.
- A skill is often a better fit than `CLAUDE.md` when the guidance is task-specific, verbose, or only occasionally relevant.
- Reusable instructions should stay modular, with supporting files and scripts instead of one giant prompt blob.
- Current docs add more nuance than the outline, including enterprise scope, plugin scope, nested skill discovery, and custom commands being folded into skills.

## The Core Mental Model

The simplest correct mental model is:

- `CLAUDE.md` is always-available memory and behavioral guidance
- a skill is an on-demand reusable capability
- a custom slash command is usually just the manual invocation path for a skill

Another useful way to think about Topic 3.2 is:

```text
should Claude see this guidance on most turns?
    ->
CLAUDE.md or rules

is this a reusable task, playbook, or optional body of knowledge?
    ->
skill

should only a human trigger it?
    ->
skill with disable-model-invocation: true

does it need isolated, verbose, or exploratory execution?
    ->
skill with context: fork

should the whole team get it?
    ->
project skill

is it only for one developer across projects?
    ->
personal skill
```

For exam purposes, Topic 3.2 is really about four design questions:

1. Should this live in memory or in a skill?
2. Who should receive it: just me or the whole project?
3. Should Claude invoke it automatically, or should only the user invoke it?
4. Should it run inline in the current context, or in a forked agent context?

If you answer those four questions correctly, most of the configuration details become straightforward.

## Current Anthropic Terminology vs Exam Wording

### Current docs treat skills as the main custom-command mechanism

Current Anthropic docs say skills are how you create reusable commands in Claude Code. A skill can be invoked directly with `/skill-name`, and Claude can also load it automatically when the description matches the current task.

The important current-doc nuance is:

- custom commands have been merged into skills
- legacy files in `.claude/commands/` still work
- if a skill and a legacy command share the same name, the skill takes precedence

So if an exam question says "create a custom slash command," the current practical answer is usually "create a skill."

### Built-in slash commands are a different category

Current Claude Code docs still separate:

- built-in commands like `/help`, `/compact`, and `/memory`
- bundled skills that also appear in the slash menu
- MCP prompts that surface as slash commands from connected MCP servers
- your own custom skills

This matters because not every slash command is a custom skill, even though skills are now the main way to create your own reusable slash commands.

### `context: fork` is current, but the surrounding naming may vary

The course outline's language about skills and custom commands is still useful, but current docs describe a richer execution model:

- a skill can run inline in the current session
- or it can run with `context: fork` in an isolated agent context
- the `agent` field selects the built-in or custom agent configuration used for that forked run

Some materials still say "subagent" while newer UI and docs increasingly say "agent." The durable concept is the same: `context: fork` creates an isolated execution context rather than continuing in the main conversation thread.

### Current docs include more scopes than the exam outline emphasizes

The course outline focuses on personal versus project customizations. Current docs add more deployment shapes:

- managed or enterprise skills
- plugin-provided skills
- nested project skill directories discovered when Claude works inside a subtree

For exam purposes, personal versus project scope is still the core distinction. In production, it helps to know the system is more flexible than that.

## Where Skills Live and Why Scope Matters

Where you store a skill determines who gets it and how safely it can be shared.

| Scope | Typical path | Best for | Common failure mode |
| --- | --- | --- | --- |
| Personal | `~/.claude/skills/<name>/SKILL.md` | Your personal workflows across projects | Team-required commands never reach teammates |
| Project | `.claude/skills/<name>/SKILL.md` | Shared repo workflows and conventions | Private preferences get committed as team defaults |
| Nested project area | `<subdir>/.claude/skills/<name>/SKILL.md` | Package-local workflows in monorepos | People forget the skill only appears when working there |
| Managed or enterprise | Managed distribution | Org-wide reusable workflows | Over-centralizing repo-specific behavior |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Plugin-packaged capabilities | Treating plugin-specific behavior like normal shared repo policy |

### The exam-safe scope rule

Use project scope when:

- teammates should get the skill automatically with the repository
- the workflow is repo-specific
- the skill encodes shared architecture, release, review, or testing behavior

Use personal scope when:

- the skill reflects your personal style or convenience
- it is useful across many unrelated projects
- it would be noisy or surprising as a shared project command

### Current precedence nuance that matters in practice

Current docs say same-named skills resolve by priority, with enterprise above personal above project. That means a personal skill can shadow a project skill with the same name.

That is useful for personal experimentation, but it can also cause subtle confusion:

- you think you are testing the team's `/review-pr`
- Claude is actually using your private personal version

The safest practice is:

- use project scope for shared canonical commands
- use different names for personal variants instead of silently shadowing shared ones

## When To Use a Skill vs `CLAUDE.md`

This is one of the most likely exam distinctions.

### Use `CLAUDE.md` or rules when the guidance should stay broadly loaded

Good fits for memory:

- repo-wide coding conventions
- test and build commands everyone should follow
- architecture boundaries
- durable repo context Claude should remember on most tasks

### Use a skill when the behavior is reusable but not always relevant

Good fits for skills:

- a deployment checklist
- a PR review rubric
- a migration workflow
- a code-explanation format
- optional legacy-system reference material
- a verbose research or exploration routine

The practical distinction is:

- memory is baseline operating context
- a skill is a reusable tool or playbook

If the instruction would be wasteful or distracting on most turns, it is usually a skill candidate rather than a memory-file candidate.

### A useful exam heuristic

Ask:

1. Should Claude carry this on most turns?
2. Is this a reusable task with a clear trigger?
3. Does it need arguments, isolation, or special tool behavior?

If the answers are mostly yes to the second or third question, a skill is usually the better fit.

## The Three Skill Patterns That Matter Most

Not every skill should be designed the same way.

| Pattern | Best for | Typical frontmatter | Main risk |
| --- | --- | --- | --- |
| Inline reference skill | Optional knowledge or conventions Claude can load when relevant | `description`, sometimes `user-invocable: false` | Turning always-needed guidance into an optional skill |
| Manual task skill | Explicit workflows with timing or side effects | `description`, `argument-hint`, `disable-model-invocation: true` | Letting Claude trigger a side-effectful action automatically |
| Forked task skill | Noisy, exploratory, or verbose work in isolation | `context: fork`, often `agent`, often arguments | Forgetting that the forked run does not inherit the full conversation history |

### Inline reference skill

This is useful when you want Claude to know something reusable, but you do not want it always loaded as baseline memory.

Examples:

- legacy subsystem context
- code review rubric for a rare area
- documentation style guidance used only when writing docs

This pattern is especially useful when the knowledge is specialized enough to help only sometimes.

### Manual task skill

This is the safest pattern for workflows with side effects or timing sensitivity.

Examples:

- `/deploy`
- `/commit`
- `/release-notes`
- `/send-slack-update`

The key design choice is `disable-model-invocation: true`, which prevents Claude from deciding on its own to trigger the workflow.

### Forked task skill

This is the most important advanced pattern in the outline.

Use `context: fork` when:

- the work is exploratory and could get verbose
- you want isolation from the main conversation
- the workflow has its own mini-task and does not need the whole current thread
- you want a specific agent configuration to execute the task

This is a strong fit for:

- deep codebase exploration
- targeted research
- structured review passes
- large synthesis or planning subroutines

It is a weak fit for passive reference material or vague guidelines with no actual task to perform.

## How Skills Load and Invoke

Current Anthropic docs contain an important nuance here.

### In a normal session, descriptions load before full skill content

By default:

- the skill description is available so Claude knows the skill exists
- the full skill body loads only when the skill is invoked

This keeps the normal session lighter than dumping every reusable playbook into memory all the time.

### Manual invocation and automatic invocation are separate decisions

By default, both of these are allowed:

- you can type `/skill-name`
- Claude can invoke the skill automatically when it appears relevant

You change that behavior with frontmatter:

- `disable-model-invocation: true` means only the user can invoke it
- `user-invocable: false` means the user cannot invoke it directly from `/`, but Claude can still use it automatically

This is a classic exam trap. `user-invocable: false` is not the setting that prevents Claude from using a skill. `disable-model-invocation: true` is the more important safety control for that.

### `context: fork` changes the execution model

When a skill uses `context: fork`:

- Claude creates a new isolated context
- the skill content becomes the prompt for that forked run
- the `agent` field chooses the built-in or custom agent configuration
- the result is summarized back into the main conversation

The important implication is that a forked skill does not automatically inherit your full prior conversation history. If the skill needs context, the skill instructions or passed arguments must make that context explicit.

## Frontmatter Fields That Matter Most

The course outline highlights a few fields directly, and current docs add a few more. These are the ones most worth understanding.

| Field | What it controls | Why it matters |
| --- | --- | --- |
| `name` | Slash-command name; if omitted, the directory name is used | Gives the skill a stable invocation identity |
| `description` | What the skill does and when to use it | Drives automatic selection and is the most important field for discoverability |
| `argument-hint` | Autocomplete hint for expected arguments | Helps users invoke the skill correctly and is valuable for task commands |
| `disable-model-invocation` | Whether Claude can auto-invoke the skill | Critical for side-effectful or timing-sensitive workflows |
| `user-invocable` | Whether the skill appears as something the user can call directly | Useful for background knowledge skills that are not meaningful commands |
| `allowed-tools` | Skill-scoped tool approval behavior while the skill is active | Helps narrow or pre-authorize tool usage, but is not a full security policy by itself |
| `context` | Whether the skill runs inline or in a forked context | The key field for isolated execution |
| `agent` | Which agent configuration runs the forked skill | Lets you pair the skill with an execution environment suited to the task |

### `description` is more important than many people expect

Current docs explicitly recommend `description` because Claude uses it to decide when the skill is relevant.

Weak descriptions cause predictable failures:

- the skill does not trigger when it should
- Claude uses it for the wrong kind of task
- two similar skills compete because their descriptions overlap too much

For exam purposes, a strong description should explain:

- what the skill does
- when to use it
- what kind of input or task it expects

### `argument-hint` is about usability, not just cosmetics

`argument-hint` helps the user see the expected invocation shape during autocomplete.

That matters most for skills like:

- `/fix-issue [issue-number]`
- `/migrate-component [component] [from] [to]`
- `/review-path [directory]`

It does not change the business logic of the skill, but it reduces incorrect or ambiguous manual invocation.

### `allowed-tools` needs careful interpretation

The outline frames `allowed-tools` as restricting skill tool access. Current docs are slightly more precise: the field grants listed tools without per-use approval when the skill is active, while baseline permission settings still govern all other tools.

The durable operational takeaway is:

- use `allowed-tools` to shape the skill's execution surface and approval behavior
- do not treat it as a standalone hard security boundary
- combine it with broader permission settings when strict control matters

### `context: fork` only works well with explicit task content

Current docs say `context: fork` is appropriate when the skill body contains an actionable task. If the skill only contains passive guidance such as "follow these API conventions," a forked execution has no real job to do and usually produces weak results.

That is an exam-relevant design rule:

- reference material usually belongs inline
- explicit workflows are the better candidates for forked execution

### Example: a safe shared review skill

This is the kind of project-scoped skill configuration the exam wants you to reason about:

```md
---
name: review-path
description: Review a code path for regressions and missing tests. Use when asked to audit a directory or package.
argument-hint: [path]
context: fork
agent: Explore
disable-model-invocation: true
allowed-tools: Read, Grep, Glob
---

Review `$ARGUMENTS` for:
- behavioral regressions
- missing tests
- risky assumptions

Return findings with specific file references.
See [checklist.md](checklist.md) for the review rubric.
```

What this gets right:

- project teams can share it from `.claude/skills/review-path/SKILL.md`
- the user controls when the review starts
- the task runs in isolation instead of bloating the main thread
- the argument contract is visible during autocomplete
- longer review criteria can live in `checklist.md` instead of overgrowing `SKILL.md`

## Supporting Files, Arguments, and Modular Skill Design

Current docs emphasize that `SKILL.md` is the entrypoint, not necessarily the whole system.

### A good skill package is usually a small folder, not one giant file

A skill directory can include:

- `SKILL.md` for the main instructions and frontmatter
- supporting reference docs
- examples
- templates
- scripts the skill can execute

That design is usually better than a massive `SKILL.md` because:

- the entrypoint stays readable
- detailed reference material loads only when needed
- examples and scripts remain reusable and easier to maintain

Current docs also recommend keeping `SKILL.md` itself reasonably small and moving long reference material elsewhere.

### Arguments are part of why skills beat plain memory

Skills support arguments through placeholders like:

- `$ARGUMENTS`
- `$ARGUMENTS[0]`
- `$0`

This is one of the clearest reasons a skill is often better than `CLAUDE.md` for reusable workflows: the same playbook can be applied to different targets cleanly.

Examples:

- `/fix-issue 123`
- `/review-path packages/billing`
- `/migrate-component SearchBar React Vue`

That makes Topic 3.2 partly about parameterization, not just about storing instructions.

## Implementation or Workflow Guidance

Topic 3.2 is practical. The easiest way to study it is to use a repeatable design workflow.

### Workflow 1: Choose the right packaging model first

Before writing anything, answer:

1. Is this always-needed memory or an occasional reusable workflow?
2. Is it personal or shared?
3. Should Claude be able to trigger it automatically?
4. Should it run inline or in a forked context?

That decision usually leads to the correct shape:

- always-needed shared guidance -> project `CLAUDE.md` or rules
- optional shared workflow -> project skill
- personal helper -> personal skill
- explicit manual operation -> skill with `disable-model-invocation: true`
- noisy exploration -> skill with `context: fork`

### Workflow 2: Start with a strong `SKILL.md` entrypoint

A reliable `SKILL.md` usually has:

- a precise `description`
- the right invocation-control fields
- concise top-level instructions
- links to supporting files when the workflow is complex

The skill should tell Claude:

- what the task is
- what good output looks like
- what constraints matter
- where extra detail lives

This is usually better than pasting an entire internal wiki page into one skill file.

### Workflow 3: Make side effects manual by default

If a skill can:

- commit code
- deploy software
- send a message
- mutate external state

then the safe default is:

- `disable-model-invocation: true`

The exam is likely to reward the answer that preserves explicit human timing control over side-effectful workflows.

### Workflow 4: Use `context: fork` for noisy or exploratory routines

A forked skill is useful when you want Claude to perform a substantial subtask without bloating the main thread.

Good examples:

- deep codebase research
- a structured review pass
- a long-form migration analysis

To make this work well:

1. give the skill an actual task, not just vague principles
2. pass the needed target through arguments
3. choose an agent configuration that matches the work
4. make the expected output format explicit

Weak forked skill:

- "Use these frontend conventions when coding"

Strong forked skill:

- "Review `$ARGUMENTS` for regressions, identify missing tests, and return findings with file references"

### Workflow 5: Keep skills modular and testable

A strong implementation habit is:

1. create the skill folder
2. write `SKILL.md`
3. add supporting files or scripts only when they reduce complexity
4. test direct invocation with `/skill-name`
5. test whether the description causes the intended automatic behavior
6. verify that side-effectful skills are not auto-triggering

Current Claude Code also provides `/skills` so you can inspect what is available in the current environment.

## What Good Skill Design Looks Like

A strong Topic 3.2 implementation usually has these properties:

- the scope matches the audience
- the skill description is specific enough to guide invocation
- side-effectful workflows are manually triggered
- optional knowledge is not bloating baseline memory
- forked skills contain explicit tasks, not just passive advice
- supporting files hold long reference material instead of overgrowing `SKILL.md`
- argument-heavy workflows use `argument-hint` and placeholders cleanly
- shared project skills are not silently shadowed by same-name personal variants

In practice, good skill design improves three things at once:

- consistency, because recurring tasks use the same playbook
- safety, because trigger conditions are explicit
- context quality, because only relevant instructions load when needed

## Common Mistakes

- Putting a team-required workflow in `~/.claude/skills/` and assuming everyone on the project will get it.
- Committing a personal convenience skill into `.claude/skills/` and turning a private habit into accidental team policy.
- Using `CLAUDE.md` for an occasional multi-step workflow that should really be an on-demand skill.
- Forgetting that current docs have folded custom commands into skills, then treating `.claude/commands/` as the preferred modern pattern.
- Letting a skill with side effects stay auto-invocable instead of setting `disable-model-invocation: true`.
- Assuming `user-invocable: false` prevents Claude from using a skill automatically.
- Using `context: fork` for passive background knowledge with no actual task to execute.
- Assuming a forked skill inherits the whole conversation history instead of passing the needed context explicitly.
- Treating `allowed-tools` as a complete security boundary instead of combining it with permission settings.
- Writing vague descriptions so Claude invokes the wrong skill or fails to invoke the right one.
- Packing long reference material into `SKILL.md` instead of splitting it into supporting files.
- Creating a same-name personal variant that silently shadows the project version of a shared command.

## Exam Takeaways

If you remember only a few things for Topic 3.2, remember these:

1. In current Claude Code, skills are the main way to create reusable custom commands.
2. A skill can be invoked directly with `/skill-name` or loaded automatically when its description matches the task.
3. Put shared workflows in `.claude/skills/` and personal workflows in `~/.claude/skills/`.
4. Use a skill instead of `CLAUDE.md` when the behavior is reusable but only occasionally relevant, argument-driven, or task-specific.
5. Use `disable-model-invocation: true` for side-effectful or timing-sensitive workflows.
6. `user-invocable: false` hides direct invocation, but it does not by itself block Claude from using the skill automatically.
7. Use `context: fork` for isolated, explicit task execution, not for passive reference material.
8. `argument-hint` improves correct manual usage, especially for command-like workflows with parameters.
9. `allowed-tools` shapes skill-time tool access and approvals, but broader permission settings still matter.
10. Same-name skills can shadow one another across scopes, so personal variants should usually have distinct names.
11. Current docs still support legacy `.claude/commands/`, but skills are the modern primary abstraction.

## Quick Self-Check

You understand Topic 3.2 if you can answer yes to these questions:

- Can I explain why a reusable deployment workflow is usually a skill rather than `CLAUDE.md` memory?
- Can I explain when a skill belongs in project scope versus personal scope?
- Can I describe the difference between `disable-model-invocation: true` and `user-invocable: false`?
- Can I explain why `context: fork` is useful for exploratory workflows and weak for passive guidance?
- Can I describe how a custom slash command maps to the current Anthropic skill model?
- Can I explain why `allowed-tools` is helpful but not the whole permission story?
- Can I identify when a personal skill variant should use a new name instead of shadowing a shared project command?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Extend Claude with skills": https://code.claude.com/docs/en/skills
- Anthropic, "Built-in commands": https://code.claude.com/docs/en/commands
- Anthropic, "Claude Code settings": https://code.claude.com/docs/en/settings
