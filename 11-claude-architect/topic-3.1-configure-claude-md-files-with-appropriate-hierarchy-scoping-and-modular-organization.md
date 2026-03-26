# Topic 3.1: Configure `CLAUDE.md` Files with Appropriate Hierarchy, Scoping, and Modular Organization

This note explains how Claude Code instruction files should be placed, split, and debugged so Claude sees the right guidance at the right time. For the exam, Topic 3.1 is not mainly about memorizing one filename. It is about understanding instruction scope, shared versus personal ownership, modular rule organization, and how to diagnose behavior when Claude appears to ignore project guidance.

Topic 3.1 also sits at one of the main terminology fault lines in the exam. The exam wording focuses on `CLAUDE.md` hierarchy. Current Anthropic docs frame this more broadly as how Claude Code "remembers your project," which includes `CLAUDE.md`, `.claude/rules/`, and auto memory. The durable concept is still the same: scope guidance carefully, keep it modular, and verify what actually loaded.

## Why This Topic Matters

Claude Code only follows instructions it can actually see, and the location of those instructions determines who gets them and when they load.

When teams get Topic 3.1 wrong, the failures are usually operational rather than theoretical:

- a required build command lives only in one developer's `~/.claude/CLAUDE.md`, so new teammates never get it
- personal preferences are committed into a shared project file, creating noise and conflict
- one giant `CLAUDE.md` accumulates unrelated rules until adherence drops
- directory-specific guidance is placed at the root, so Claude carries irrelevant context everywhere
- a nested `CLAUDE.md` exists, but nobody realizes it only loads when Claude works in that subtree
- people assume `CLAUDE.md` is an enforcement layer, when it is really behavioral guidance in context

This matters directly in the exam's Claude Code scenarios because questions often hide the real issue inside a practical symptom:

- "Why doesn't a new teammate get the instruction?"
- "Why is Claude inconsistent across packages?"
- "Why are rules bloating context?"
- "Why is a team standard being overridden by someone's personal preference?"

## What the Exam Is Testing

For Topic 3.1, the exam is usually testing whether you understand these ideas:

- `CLAUDE.md` guidance has different scopes, and putting a rule in the wrong scope causes predictable failures.
- User-level instructions in `~/.claude/CLAUDE.md` are personal and are not shared through version control.
- Project-level instructions belong in the repository so the team gets the same baseline guidance.
- More specific instruction locations should hold more local guidance, while broad locations should hold durable defaults.
- `@import` is the right answer when one file is becoming too large or needs to reference focused supporting documents.
- `.claude/rules/` is the modular alternative to stuffing every rule into one monolithic `CLAUDE.md`.
- `/memory` is the debugging tool for checking which memory and rule files are actually loaded in the current session.
- `CLAUDE.md` shapes behavior, but it does not technically enforce permissions or policy the way managed settings do.

The exam guide phrases Topic 3.1 around user, project, and directory scopes. Current Anthropic docs still support that mental model, but they also add more nuance around managed organization-wide `CLAUDE.md`, rules files, auto memory, and exclusions in large monorepos.

## The Core Mental Model

The simplest correct mental model is:

- project scope carries the repository's shared truth
- user scope carries your personal defaults
- more specific subtree files refine the project baseline for one area
- imports and rules keep the instruction set modular instead of bloated

Another useful way to think about Topic 3.1 is:

```text
always needed by the team?
    ->
project scope

only for me?
    ->
user scope

only for one area of the repo?
    ->
nested CLAUDE.md or scoped rule

too large for one file?
    ->
split with @import or .claude/rules/

only needed for a specific task?
    ->
skill, not always-loaded memory
```

Topic 3.1 is really about three design questions:

1. Who should receive this instruction?
2. When should this instruction load?
3. Should this instruction live inline, be imported, or become its own rule file?

If you answer those three questions correctly, the rest of the hierarchy usually falls into place.

## Current Anthropic Terminology vs Exam Wording

This is one of the exam topics where the docs are slightly richer than the course-outline shorthand.

### Current docs treat this as the Claude Code memory system

Current Anthropic docs describe `CLAUDE.md` files and auto memory together as Claude Code's persistent memory mechanisms. The exam wording still says "configure `CLAUDE.md` files," which is fine for the test, but in practice you should know that:

- `CLAUDE.md` is human-authored persistent guidance
- auto memory is Claude-authored persistent notes
- both are loaded as context, not as a hard policy engine

That means a strong exam answer should not confuse "loaded into context" with "enforced by the client."

### Current docs include a managed organization-wide `CLAUDE.md`

The exam guide emphasizes:

- user-level `~/.claude/CLAUDE.md`
- project-level `./CLAUDE.md` or `./.claude/CLAUDE.md`
- directory-level `CLAUDE.md` files

Current docs add another layer:

- managed policy `CLAUDE.md` deployed at the machine or organization level

This is mainly a current-doc nuance for real deployments. For exam questions, the core tested distinction is usually still personal versus shared versus path-specific. But in production, you should know there can be an org-managed layer above repo and user guidance.

### Current docs explicitly support both root and `.claude/CLAUDE.md`

Older community examples sometimes assume only a root `CLAUDE.md`. Current docs explicitly allow both:

- `./CLAUDE.md`
- `./.claude/CLAUDE.md`

So if a question asks for project-level shared instructions, either location fits the current docs. The important part is that the file is project-scoped and version-controlled with the repository.

### `CLAUDE.md` is current; `AGENTS.md` is not what Claude Code reads directly

Current Anthropic docs are explicit:

- Claude Code reads `CLAUDE.md`
- it does not directly read `AGENTS.md`

If a repository already uses `AGENTS.md` for other tools, the current-doc pattern is to create a `CLAUDE.md` that imports `@AGENTS.md` and then adds Claude-specific instructions below it.

This matters because some multi-agent repositories use `AGENTS.md` as a cross-tool convention. For Claude Code, `CLAUDE.md` is still the primary file.

### `CLAUDE.md` guidance is behavioral, not enforced configuration

This distinction is easy to miss and shows up in exam distractors.

Current docs state that:

- managed settings enforce things like denied tools and sandbox policy
- `CLAUDE.md` provides behavioral guidance such as coding standards and workflow instructions

So if a rule must be technically guaranteed, the right answer is usually not "put it in `CLAUDE.md` and hope."

## Choose the Right Scope First

The fastest way to get Topic 3.1 wrong is to put every instruction in the same place.

| Scope | Typical location | Best for | Bad fit for |
| --- | --- | --- | --- |
| Managed policy | OS-specific managed `CLAUDE.md` path | Organization-wide behavioral standards | Per-repo workflows or personal preferences |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Shared architecture, test commands, repo conventions | One developer's habits |
| Directory or subtree | Nested `CLAUDE.md` in a subdirectory | Rules that truly apply to one package or area | Cross-repo concerns spread across many folders |
| User | `~/.claude/CLAUDE.md` | Personal preferences across all projects | Team-required instructions |
| Rules | `.claude/rules/` or `~/.claude/rules/` | Modular topic files, optionally scoped by path | Task-specific one-off workflows that should not always load |

The practical placement rule is simple:

- shared repo truth belongs in project scope
- personal defaults belong in user scope
- localized conventions belong near the relevant subtree or in scoped rules
- always-loaded behavior should stay concise

## How `CLAUDE.md` Files Actually Load

This is one of the most exam-relevant operational details.

Current Claude Code docs say it walks up the directory tree from the current working directory and loads `CLAUDE.md` files it finds there. It also discovers `CLAUDE.md` files in subdirectories below the current working directory, but those load on demand when Claude reads files in those subdirectories.

That means the hierarchy is not just "global, then project, then local." It is more like:

1. Load relevant ancestor files at launch.
2. Load more specific subtree files when Claude actually enters those areas.
3. Use `/memory` to verify what was included in the current session.

### Example: same repo, different starting points

```text
repo/
├── CLAUDE.md
└── packages/
    └── billing/
        ├── CLAUDE.md
        └── src/service.ts
```

If you start Claude Code in `repo/`:

- `repo/CLAUDE.md` loads at launch
- `packages/billing/CLAUDE.md` does not load immediately
- it loads when Claude reads files under `packages/billing/`

If you start Claude Code in `repo/packages/billing/`:

- `repo/CLAUDE.md` loads at launch
- `repo/packages/billing/CLAUDE.md` also loads at launch

This is exactly the kind of subtle hierarchy behavior that can explain "Claude followed the rule yesterday but not today."

### Specificity matters more than file count

The right lesson is not "add more `CLAUDE.md` files everywhere." The right lesson is:

- keep broad instructions broad
- add more specific files only where the repo really has different local conventions

In a monorepo, this often means:

- one shared project-level baseline
- a few subtree-specific files for genuinely different packages or stacks
- modular rules for concerns that cut across many directories

## Shared Instructions vs Personal Instructions

This distinction is one of the easiest exam wins.

### What belongs in project scope

Put these in project scope:

- build and test commands the whole team needs
- architecture boundaries and important folder conventions
- shared coding standards
- deployment, migration, or review workflows that are repo-specific
- known project pitfalls Claude should remember for everyone

If a new teammate clones the repo and should receive the instruction automatically, that is a project-scope signal.

### What belongs in user scope

Put these in user scope:

- your personal wording preferences
- your preferred explanation style
- your personal workflow defaults across repositories
- preferences for how Claude should communicate with you
- private conveniences that should not become team policy

If the instruction would be strange or noisy for teammates, it probably belongs in `~/.claude/CLAUDE.md` or `~/.claude/rules/`.

### Common placement mistake

A classic failure mode looks like this:

- one senior engineer stores "run `pnpm test:unit` before finalizing" in `~/.claude/CLAUDE.md`
- they assume Claude "knows the project standard"
- other engineers never receive that instruction

That is not a model failure. It is a scope failure.

## Modular Organization with `@import`

`@import` exists so `CLAUDE.md` does not have to become a dumping ground.

Current docs say:

- `CLAUDE.md` can import additional files with `@path/to/file`
- relative paths resolve relative to the file containing the import
- absolute paths are allowed
- imports can recurse up to five levels deep
- external imports require an approval step the first time Claude Code encounters them in a project

This makes `@import` a good fit for two cases:

- bringing in focused reference documents that Claude should always see
- splitting stable project guidance into maintainable modules without losing a simple entrypoint

### Good `@import` use cases

- import a short workflow guide for build and test commands
- import package-specific standards from a package-local file
- import an existing `AGENTS.md` so Claude Code shares the same baseline instructions as other tools

### Weak `@import` use cases

- chaining so many imports that nobody understands what Claude is loading
- importing long, noisy reference documents just because they exist
- using imports as a substitute for choosing the right scope

### Example: focused project-level imports

```md
# Repository Standards

See @README.md for the project overview.

## Workflow
- Follow @docs/testing.md for the test matrix.
- Follow @docs/review-checklist.md before finalizing a change.

## Shared Agent Guidance
@AGENTS.md
```

What this gets right:

- the main entrypoint stays small
- supporting instructions are grouped by concern
- shared agent guidance is reused rather than duplicated

What it avoids:

- one unreadable 500-line root file
- copying the same rules into multiple places

## When to Use `.claude/rules/`

For larger projects, current Anthropic docs recommend `.claude/rules/` as a modular alternative to one giant `CLAUDE.md`.

This is the part of Topic 3.1 where the current docs and the exam guide align closely:

- keep rules topic-specific
- use descriptive filenames
- split large instruction sets into focused modules

### Why rules are often better than a monolith

Rules help because they:

- keep instruction ownership clearer
- reduce merge conflicts in one shared mega-file
- let teams group conventions by topic such as testing, security, or API design
- support path-specific loading when needed

Current docs also say that rules without `paths` frontmatter load unconditionally, while path-scoped rules only load when Claude works with matching files.

That path-specific mechanism becomes more central in Topic 3.3. For Topic 3.1, the key idea is simpler:

- `.claude/rules/` is the modular structure
- path scoping is an optional refinement on top of that structure

### Example: a cleaner large-project layout

```text
repo/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── testing.md
│       ├── security.md
│       └── backend/
│           └── api-design.md
├── packages/
│   └── billing/
│       └── CLAUDE.md
└── docs/
    ├── testing.md
    └── review-checklist.md
```

A sensible arrangement here would be:

- `.claude/CLAUDE.md` for universal repo standards
- `.claude/rules/testing.md` and `.claude/rules/security.md` for focused cross-project concerns
- `packages/billing/CLAUDE.md` for billing-package-specific workflows

That is usually cleaner than putting everything into one project root file.

### User-level rules are the modular personal equivalent

Current docs also support:

- `~/.claude/rules/`

These are useful for personal preferences that you want modularized across all projects. Anthropic's docs note that user-level rules load before project rules, which gives project rules the later and more specific voice.

That is the right model for team work:

- your personal defaults can travel with you
- the repository can still override them where the team needs consistency

## Directory-Level `CLAUDE.md` vs Rules Files

Both mechanisms are useful, but they solve different problems.

Use a nested directory `CLAUDE.md` when:

- an entire subtree has its own workflow
- a package has different commands, architecture, or constraints
- the guidance naturally belongs to that directory as local context

Use `.claude/rules/` when:

- you want topic-based modularization
- the same convention applies in more than one place
- you need a cleaner alternative to a huge root file
- you eventually want path-specific loading

The practical exam heuristic is:

- directory-based differences suggest nested `CLAUDE.md`
- concern-based differences suggest rule files

If a rule applies to tests scattered all over a monorepo, many subdirectory `CLAUDE.md` files are usually the wrong tool. That is a strong hint toward rules, especially once you introduce path-scoped loading.

## Implementation Workflow Guidance

Topic 3.1 is practical. The best way to study it is to learn a repeatable workflow for setting up and debugging instruction hierarchy.

### Workflow 1: Build the baseline hierarchy

1. Start with a small project `CLAUDE.md` or `.claude/CLAUDE.md`.
2. Put only team-shared, always-relevant guidance there.
3. Move personal preferences to `~/.claude/CLAUDE.md` or `~/.claude/rules/`.
4. Add nested `CLAUDE.md` files only where a subtree genuinely differs.
5. Split large cross-cutting topics into `.claude/rules/`.

The key discipline is to avoid solving every instruction problem by adding more content to the root file.

### Workflow 2: Split a growing monolithic file

If your project `CLAUDE.md` keeps growing, the current docs give a clear signal:

- target under about 200 lines per `CLAUDE.md` file

That is not a hard protocol limit. It is a practical adherence guideline. Once the file grows too large:

1. keep the project entrypoint short
2. move detailed topics into `@import` files or `.claude/rules/`
3. remove duplicate or contradictory instructions
4. separate universal rules from area-specific rules

Good split dimensions include:

- testing
- security
- API conventions
- review workflow
- package-specific instructions

### Workflow 3: Diagnose hierarchy bugs with `/memory`

`/memory` is the operational debugging tool for Topic 3.1.

Current docs say `/memory` can:

- list all loaded `CLAUDE.md` and rules files for the current session
- let you edit memory files
- show and toggle auto memory

This means the right debugging flow is:

1. run `/memory`
2. confirm the expected `CLAUDE.md` or rule file is listed
3. if it is missing, fix scope or loading assumptions first
4. if it is present, check for conflicting or vague instructions

Questions `/memory` helps answer quickly:

- did the right project file load at all?
- did the nested subtree file load yet?
- is the rule file active in this session?
- is auto memory adding a conflicting preference?

### Workflow 4: Debug inconsistent behavior in a monorepo

Suppose Claude follows the API convention in one package but not another.

A strong debugging sequence is:

1. check where Claude Code was started
2. identify which ancestor `CLAUDE.md` files should load at launch
3. check whether the relevant package-specific file only loads on demand
4. run `/memory` to verify the actual loaded set
5. look for conflicts between root instructions, nested instructions, and rules
6. if one team's instructions are irrelevant noise, consider `claudeMdExcludes` or narrower rule placement

This is a better answer than vague advice like "make the prompt clearer."

## What Good Hierarchy Design Looks Like

A strong Topic 3.1 design usually has these properties:

- the root or project file is short and clearly shared
- personal preferences are not committed into the repository
- package-level differences live close to the package
- cross-cutting concerns are split into rule files
- giant documents are not loaded just because they exist
- loaded files can be verified quickly with `/memory`
- behavioral guidance is not confused with technical enforcement

In practice, good hierarchy design improves three things at once:

- adherence, because instructions are clearer and less noisy
- maintainability, because teams can update focused files instead of one monolith
- debugging, because you can reason about where a behavior came from

## Common Mistakes

- Putting team-required instructions in `~/.claude/CLAUDE.md` and then wondering why collaborators do not get them.
- Putting personal stylistic preferences in the shared project file and turning private habits into accidental team policy.
- Treating `CLAUDE.md` as an enforcement layer for security or permissions instead of using managed settings or other technical controls.
- Growing one giant `CLAUDE.md` until it becomes contradictory, noisy, and hard for both humans and Claude to follow.
- Using nested directory files for rules that actually span many unrelated directories.
- Assuming a subdirectory `CLAUDE.md` loads immediately even when Claude has not touched that subtree yet.
- Forgetting that `CLAUDE.md` and rule files are context, so vague wording and conflicting instructions reduce reliability.
- Failing to use `/memory` before concluding that Claude is "ignoring" instructions.
- Copying instructions between `AGENTS.md` and `CLAUDE.md` instead of importing shared guidance once.
- Using rules or imports for one-off task playbooks that would be better modeled as on-demand skills.

## Exam Takeaways

If you remember only a few things for Topic 3.1, remember these:

1. Put team-shared instructions in project scope and personal preferences in user scope.
2. Current Claude Code supports project files in either `./CLAUDE.md` or `./.claude/CLAUDE.md`.
3. Claude loads ancestor `CLAUDE.md` files at launch and loads subdirectory files when it works in those areas.
4. Use `@import` to keep instruction files modular, not to hide a messy scope design.
5. Use `.claude/rules/` when the instruction set is getting too large or needs topic-based modularization.
6. Nested `CLAUDE.md` files are good for subtree-specific guidance; rules are better for cross-cutting concerns.
7. `/memory` is the right debugging tool for checking what actually loaded in the current session.
8. Current docs add managed organization-wide `CLAUDE.md` and rule-file nuance beyond the exam's simpler hierarchy framing.
9. `CLAUDE.md` shapes behavior, but enforced controls belong in settings and other technical guardrails.
10. Claude Code reads `CLAUDE.md`, not `AGENTS.md`; if a repo already uses `AGENTS.md`, import it from `CLAUDE.md`.

## Quick Self-Check

You understand Topic 3.1 if you can answer yes to these questions:

- Can I explain why a rule in `~/.claude/CLAUDE.md` will not automatically help a teammate?
- Can I describe when a nested directory `CLAUDE.md` is the right tool and when `.claude/rules/` is cleaner?
- Can I explain how ancestor and subdirectory `CLAUDE.md` files load differently in Claude Code?
- Can I describe what `@import` does and why it is better than endlessly extending one big file?
- Can I explain why `/memory` is the first debugging step when Claude seems to miss a rule?
- Can I distinguish behavioral guidance in `CLAUDE.md` from enforced configuration in managed settings?
- Can I explain why task-specific workflows often belong in skills rather than always-loaded memory files?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "How Claude remembers your project": https://code.claude.com/docs/en/memory
- Anthropic, "Built-in commands": https://code.claude.com/docs/en/commands
- Anthropic, "Claude Code settings": https://code.claude.com/docs/en/settings
