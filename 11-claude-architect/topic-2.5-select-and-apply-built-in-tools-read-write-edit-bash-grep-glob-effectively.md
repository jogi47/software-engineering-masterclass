# Topic 2.5: Select and Apply Built-In Tools (Read, Write, Edit, Bash, Grep, Glob) Effectively

This note explains how to use Claude Code's core built-in tools as an ordered workflow rather than a grab bag. For the exam, Topic 2.5 is not mainly about memorizing that `Grep` searches contents and `Glob` matches filenames. It is about choosing the cheapest tool that answers the current question, escalating only when needed, and knowing when the exam's Claude Code-centric wording does not map exactly to current Anthropic interfaces.

Topics 2.1 through 2.4 focused on tool design, error contracts, tool distribution, and MCP integration. Topic 2.5 shifts from tool architecture to operator judgment: given a real engineering task, which built-in tool should Claude use first, which one should it avoid, and when should it switch strategies?

## Why This Topic Matters

Many developer-productivity failures are not reasoning failures. They are workflow failures caused by choosing the wrong tool too early.

Common examples:

- reading entire files before narrowing the search space
- using `Grep` when the real problem is filename discovery
- using `Bash` for routine search tasks that `Grep` or `Glob` would answer more cheaply
- forcing `Edit` through ambiguous anchors until the change becomes brittle
- overwriting a whole file with `Write` when a small targeted edit would have been safer

In practice, good built-in tool usage improves four things at once:

- context efficiency
- correctness
- change reliability
- safety

This matters directly in the exam's developer-productivity scenarios. A strong candidate is expected to know not just what each tool does, but how to sequence them so Claude explores unfamiliar code incrementally, edits only when it has enough context, and verifies behavior with real environment feedback when needed.

## What the Exam Is Testing

For Topic 2.5, the exam is usually testing whether you understand these ideas:

- `Grep` is for searching file contents by symbol, message, import, or pattern.
- `Glob` is for finding files by path or naming pattern.
- `Read` is for loading the actual contents of a specific file once you know it matters.
- `Edit` is for small, targeted modifications when the intended anchor is unique enough to identify one location reliably.
- `Write` is for creating or replacing a whole file when that is more reliable than a targeted edit.
- `Read` plus `Write` is the fallback when `Edit` becomes unreliable because the matching text is repeated, ambiguous, or drifting.
- `Bash` is the right tool when you need environment truth such as test output, build behavior, script execution, or shell-native inspection.
- Codebase exploration should usually start narrow and become deeper only as evidence accumulates.
- Tracing behavior across wrapper layers requires systematic symbol search, not random file reading.

The exam guide's examples are simple on purpose:

- use `Glob` for `**/*.test.tsx`
- use `Grep` for function callers or error messages
- use `Read` before deciding how to change a file
- switch from `Edit` to `Read` plus `Write` when the edit anchor is not stable

Those examples are testing a broader production habit:

- use the least invasive tool that can answer the current question with confidence

## The Core Mental Model

The simplest correct mental model is:

```text
need candidate files?
    ->
use Glob

know a symbol, string, or pattern?
    ->
use Grep

need actual file context?
    ->
use Read

need a small, well-anchored change?
    ->
use Edit

need a broad or full-file rewrite?
    ->
use Read + Write

need runtime or shell feedback?
    ->
use Bash
```

Another way to frame Topic 2.5 is as a decision ladder:

1. Narrow the search space.
2. Inspect only the files that matter.
3. Make the smallest reliable change.
4. Verify against the real environment when behavior matters.

This is why `Grep` and `Glob` usually come before `Read`, and why `Read` usually comes before `Edit` or `Write`.

## Current Anthropic Terminology vs Exam Wording

This topic is mostly aligned with current Claude Code docs, but there are still a few important nuances.

### The six tool names in the exam are still current Claude Code tool names

Unlike some exam topics, Topic 2.5 does not mainly suffer from outdated naming. Current Claude Code docs still list:

- `Read`
- `Write`
- `Edit`
- `Bash`
- `Grep`
- `Glob`

So if the exam asks directly about these built-in tools, the wording is still current enough to use as-is.

### Current Claude Code has a broader built-in tool surface than the exam highlights

Current Anthropic docs describe more built-in tools than the exam's six-tool list, including tools for subagents, planning, task management, web access, MCP resources, and code intelligence.

That does not make the exam wording wrong. It means the exam is focusing on the core developer-productivity subset. The safe interpretation is:

- Topic 2.5 tests the foundational local-workflow tools, not the entire current Claude Code tool catalog

### Claude Code built-ins are not the same thing as API tool names

This distinction matters in production even if the exam compresses it.

In Claude Code, the built-in local file and shell tools are named `Read`, `Write`, `Edit`, `Bash`, `Grep`, and `Glob`.

In the Claude API, Anthropic also exposes tool-use surfaces for similar work, but not with the exact same interface:

- the API has an Anthropic-defined Bash tool
- the API has a Text Editor tool rather than Claude Code's separate `Read`, `Write`, and `Edit` tool naming

So if a question is specifically about Claude Code built-in tools, use the exam's six-tool framing. If a question is about API implementation, map the principle rather than copying Claude Code tool names blindly.

### Bash behavior differs between Claude Code and API tool use

This is the most important interface nuance in Topic 2.5.

Current Claude Code docs say:

- each `Bash` command runs in a separate process
- the working directory persists across commands
- environment variables do not persist across commands

Current API Bash tool docs describe a persistent bash session instead.

So the durable exam principle is:

- use `Bash` when you need real command execution

But the implementation detail depends on the interface:

- in Claude Code, do not assume `export FOO=bar` in one `Bash` call will survive the next command
- in API tool use, the Anthropic Bash tool is documented as a persistent session

## Choosing the Right Tool First

The most practical way to remember Topic 2.5 is by first-choice selection.

| Tool | Best first use | Avoid as first choice when | Why |
| --- | --- | --- | --- |
| `Glob` | Find files by path, extension, or naming convention | You need to know where a symbol or message appears inside files | `Glob` narrows candidate paths, not contents |
| `Grep` | Find symbols, imports, strings, log lines, error messages, or callers | You only know the file pattern, or you need full semantics of one file | `Grep` gives evidence hits, not full context |
| `Read` | Inspect the actual code or text in a promising file | You have not narrowed the search space yet | `Read` is higher-context than search and should be focused |
| `Edit` | Make a small, local change in a known file with a stable unique anchor | The matching text appears multiple times or the change is broad | `Edit` is reliable when the target location is unambiguous |
| `Write` | Create a file or replace the whole contents after you know the intended final state | A small targeted change would be safer | `Write` has a larger blast radius because it replaces the file |
| `Bash` | Run tests, builds, scripts, formatters, git commands, or shell-native inspection | A search or file-read tool can answer the question directly | `Bash` gives environment truth but is noisier and higher risk than discovery tools |

Current Claude Code docs also make a useful safety distinction:

- `Bash`, `Edit`, and `Write` require permission
- `Read`, `Grep`, and `Glob` do not

That is not the whole reason to prefer search tools first, but it reinforces the right habit:

- start with lower-risk discovery tools, then escalate to mutation or execution only when the task demands it

## Incremental Exploration Beats Reading Everything

The exam guide explicitly emphasizes incremental codebase understanding. That is a durable pattern, not an exam trick.

Bad exploration pattern:

- open several large files
- skim randomly
- guess where the relevant logic lives

Good exploration pattern:

1. Use `Glob` if you know a naming pattern such as tests, routes, migrations, or config files.
2. Use `Grep` if you know a function name, error message, import, environment variable, or log text.
3. `Read` only the files that the search results suggest are central.
4. Follow imports, exports, and call sites with more `Grep` rather than reading unrelated files.
5. Stop exploring once you have enough evidence to act.

This matters because search hits and file contents serve different purposes:

- `Glob` and `Grep` reduce uncertainty about where to look
- `Read` reduces uncertainty about what the code actually does

You usually need both, but not in the wrong order.

## Implementation Workflow Guidance

Topic 2.5 is practical. The best way to study it is by learning repeatable workflows.

### Workflow 1: Understand an unfamiliar code path

Use this when you need to answer, "Where does this behavior come from?"

1. Start with `Grep` for the most specific available clue:
   - function name
   - error message
   - config key
   - route path
   - class name
2. If the clue is only a naming convention, start with `Glob` instead.
3. `Read` the likely definition file or entry point.
4. Use `Grep` again for imports, callers, or re-exported names.
5. `Read` only the next few files needed to confirm the flow.

This is how you avoid the classic mistake of reading a whole package when the real answer lives in three files.

### Workflow 2: Trace function usage across wrapper layers

The exam outline calls this out directly because it tests disciplined search behavior.

Suppose a function is wrapped, re-exported, or renamed through several modules. A reliable workflow is:

1. Use `Grep` to find the original definition and exported names.
2. `Read` that module to see:
   - direct exports
   - aliases
   - wrapper functions
   - re-exports
3. Use `Grep` for each exported or wrapped name across the codebase.
4. `Read` the wrapper modules that actually transform arguments, add defaults, or add side effects.
5. Continue until you locate the business boundary that matters:
   - runtime entry point
   - controller or handler
   - service call
   - mutation point

The exam is not testing whether you know one special search syntax. It is testing whether you search systematically rather than assuming the first matching function name is the whole story.

### Workflow 3: Make a small reliable change

Use this when the task is localized and the target file is known or easy to confirm.

1. Use `Grep` to locate the symbol, string, or branch you need to change.
2. `Read` the target file so you understand the surrounding logic.
3. If the target location is uniquely identifiable, use `Edit`.
4. If the change affects behavior, use `Bash` to run the smallest relevant verification:
   - a unit test
   - a type check
   - a linter
   - a build command
   - a focused script

The key decision is not "Can I technically edit this file?" It is:

- "Is a targeted edit the most reliable way to apply the intended change?"

### Workflow 4: Escalate from `Edit` to `Read` plus `Write`

This is one of the highest-signal exam patterns in Topic 2.5.

`Edit` is not wrong when it fails. It becomes wrong when you keep insisting on it after the conditions for a reliable targeted edit are gone.

Switch to `Read` plus `Write` when:

- the anchor text appears multiple times
- the file has several similar blocks and the intended target is not unique
- the change is broad enough that many small edits would be harder to reason about than one full rewrite
- the file structure is changing significantly
- repeated edit attempts are making the operation more brittle, not less

The reliable fallback is:

1. `Read` the full file.
2. Determine the exact intended final contents.
3. `Write` the full file once.
4. Verify with `Read` or `Bash`, depending on what matters.

The reason this works is simple:

- once targeted matching becomes ambiguous, whole-file replacement is often easier to reason about than incremental patching

That does not mean `Write` is always better. It means `Write` is the safer tool once the problem is no longer local.

## How to Think About `Edit`

The exam guide describes `Edit` as the targeted-modification tool when the anchor is unique. That wording encodes a practical rule:

- `Edit` is for precision, not for wrestling with ambiguity

Good `Edit` situations:

- changing one conditional branch in a clearly identified function
- updating one error string in a file where that text appears only once
- modifying one import or one constant with obvious surrounding context

Poor `Edit` situations:

- several repeated JSX blocks with the same text
- generated code with many identical patterns
- a refactor that changes several connected regions of the file
- a file you have not read yet

The main failure mode is not only "the edit fails." It is:

- the edit lands in the wrong plausible location because the anchor was not specific enough

For exam purposes, if you see ambiguous repeated text, the answer is usually moving away from `Edit`, not trying to force it harder.

## How to Think About `Write`

`Write` is powerful because it is simple:

- Claude replaces the file with the intended final content

That makes it the right tool when:

- creating a new file
- replacing a file completely
- applying a broad rewrite after reading the current file carefully

It also makes `Write` the easiest tool to misuse.

Common bad pattern:

- use `Write` for a tiny change in a file you barely inspected

Why that is weak:

- it increases blast radius
- it makes it easier to lose nearby content unintentionally
- it skips the question of whether a smaller, more reliable edit was possible

The safe rule is:

- do not reach for `Write` just because it can always force the file into a new state

Use it when whole-file replacement is actually the clearest operation.

## Using `Bash` Without Letting `Bash` Replace Better Tools

`Bash` is essential, but it is not the default answer to every engineering subtask.

Use `Bash` when you need something only the environment can tell you:

- whether tests pass
- whether the project builds
- what a script outputs
- what `git status` shows
- how a formatter or type checker reacts
- whether a command-line tool can find or generate something the shell owns natively

Do not use `Bash` as a replacement for:

- `Glob` when the task is filename discovery
- `Grep` when the task is content search
- `Read` when the task is understanding a specific file

You can use shell commands for those things, but that is usually a worse default in Claude Code because:

- the built-in search and read tools are more direct
- they are often lower-risk
- they keep the workflow easier to interpret

### A practical `Bash` rule

Use `Bash` for execution truth, not for speculative exploration.

That means:

- search with search tools
- inspect with file tools
- execute with `Bash`

### Current behavior nuance that matters

In current Claude Code, the working directory persists across `Bash` calls, but environment-variable changes do not persist automatically across commands.

That means a workflow like this is unsafe to assume:

1. `Bash`: `export FEATURE_FLAG=1`
2. `Bash`: run tests expecting that export to remain

For exam prep, this matters because "persistent shell state" is not a universal rule across Anthropic interfaces.

## Common Mistakes

- Confusing `Glob` and `Grep`, then searching contents when the real task is file discovery or vice versa.
- Starting with `Read` on many files before narrowing the search space with `Glob` or `Grep`.
- Using `Bash` as the default search tool instead of the built-in search primitives.
- Treating search hits as if they were full understanding, without reading the relevant file.
- Using `Edit` in files with repeated matching text and then being surprised by brittle or incorrect targeting.
- Reaching for `Write` before reading the current file carefully.
- Forgetting that `Read` plus `Write` is the intended fallback when targeted editing becomes unreliable.
- Running broad verification commands with `Bash` when a small focused test or check would answer the question faster.
- Assuming the API Bash tool and Claude Code `Bash` have identical persistence semantics.
- Copying Claude Code built-in tool names into API architecture discussions without translating them to the current API tool surface.

## Exam Takeaways

If you remember only a few things for Topic 2.5, remember these:

1. Use `Glob` for file-pattern discovery and `Grep` for content search. They solve different problems.
2. `Read` should usually happen after search has narrowed the candidate files, not before.
3. Use `Edit` only when the target is local and uniquely identifiable.
4. When `Edit` becomes ambiguous, `Read` plus `Write` is the reliable fallback.
5. `Write` is for whole-file creation or replacement, not for every small change.
6. Use `Bash` when you need runtime or shell feedback, not as a substitute for every read or search task.
7. Explore codebases incrementally: search, shortlist, read, then act.
8. Trace wrapper-heavy call paths systematically by searching definitions, exports, aliases, and callers.
9. The exam's six tool names are still current for Claude Code, but API tool names and `Bash` behavior differ by interface.

## Quick Self-Check

You understand Topic 2.5 if you can answer yes to these questions:

- Can I explain when `Glob` is the right first tool and when `Grep` is the right first tool?
- Can I explain why reading everything up front is usually weaker than incremental exploration?
- Can I describe the difference between a search hit and the need to `Read` a file?
- Can I explain when a small targeted `Edit` is reliable and when it is not?
- Can I explain why `Read` plus `Write` is the right fallback when edit anchors are ambiguous?
- Can I describe when `Bash` provides necessary environment truth rather than unnecessary noise?
- Can I distinguish the Claude Code built-in tool surface from the current Anthropic API tool surface for file editing and shell execution?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Tools reference": https://code.claude.com/docs/en/tools-reference
- Anthropic, "Claude Code settings": https://code.claude.com/docs/en/settings
- Anthropic, "Bash tool": https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool
- Anthropic, "Text editor tool": https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool
