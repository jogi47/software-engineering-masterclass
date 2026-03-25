# Topic 1.7: Manage Session State, Resumption, and Forking

This note explains what a session actually stores, how to continue useful work across runs, when to resume a prior session versus starting fresh, and how forking lets you explore alternate approaches without destroying the original thread of analysis.

Topic 1.6 focused on task decomposition within a run. Topic 1.7 focuses on continuity across runs: how the agent keeps or reuses prior context over time, and how to avoid being misled by stale conversation state.

## Why This Topic Matters

Many real tasks do not finish in one uninterrupted session.

Examples:

- a code investigation pauses and resumes the next day
- a refactor branches into two different implementation strategies
- a CI agent hits a turn or budget limit and must continue later
- files change after an earlier analysis, so the old context is only partly reliable

If you handle session state badly, you get one of two failure modes:

- you throw away useful context and re-do expensive analysis
- you trust stale context and build on incorrect assumptions

Topic 1.7 is about managing that tradeoff correctly.

## What the Exam Is Testing

For this topic, the exam is usually looking for these ideas:

- resumption is useful when prior context is still mostly valid
- forking is useful when you want to explore an alternative without overwriting the original thread
- sessions preserve conversation state, not the real-time filesystem state
- resumed sessions should be told what changed if the underlying files or facts have moved
- sometimes a fresh session with a structured summary is safer than resuming stale tool results

## Important Terminology Note

The exam guide mixes CLI-style and SDK-style wording:

- `--resume <session-name>` reflects Claude Code CLI usage
- `fork_session` reflects the Python Agent SDK

Current Anthropic docs split this across multiple interfaces:

- in Claude Code CLI, `--continue` resumes the most recent conversation
- in Claude Code CLI, `--resume` can resume a named conversation or open a picker to choose a prior conversation
- in the TypeScript Agent SDK, `continue: true` resumes the most recent session in the directory
- in the Python Agent SDK, `continue_conversation=True` resumes the most recent session in the directory
- in both SDKs, `resume: <session-id>` resumes a specific session by ID
- in the TypeScript Agent SDK, `forkSession` branches a session into a new one
- in the Python Agent SDK, `fork_session` branches a session into a new one

For exam prep, the important concept is not memorizing one exact spelling. It is understanding the difference between continue, resume, and fork across the CLI and SDKs.

## What a Session Actually Stores

Anthropic's current SDK docs define a session as the conversation history the agent accumulates while it works.

That includes:

- prompts
- assistant responses
- tool calls
- tool results
- intermediate reasoning context accumulated through the run

The key warning from the docs is:

- sessions persist the conversation, not the filesystem

That single sentence explains most of Topic 1.7.

## The Core Mental Model

The simplest correct mental model is:

```text
session = saved conversation history
resume = continue from that history
fork = create a new branch from that history
fresh session = start over and inject only the state you still trust
```

The central question is:

- how much of the previous context is still valid?

## Continue vs Resume vs Fork

These three ideas are closely related, but they are not the same.

### Continue

Continue means:

- pick up the most recent session automatically
- do not manually choose a session ID

Use it when:

- there is one obvious recent thread
- you want quick continuity
- you do not need to branch or select among multiple past sessions

### Resume

Resume means:

- return to a specific prior session
- keep building on that exact conversation history

Use it when:

- you have multiple prior sessions
- you want a specific older thread, not just the latest one
- the prior analysis is still mostly valid

### Fork

Fork means:

- create a new session that begins from a copy of an earlier session's history
- preserve the original session unchanged

Use it when:

- you want to try a different approach from the same baseline
- you want separate experimental branches
- you do not want the original reasoning path to be overwritten

## What Forking Preserves and What It Does Not

Forking preserves:

- the conversation history up to the fork point
- the prior analysis already stored in that history

Forking does not preserve:

- a separate copy of the filesystem
- automatic isolation of file changes

Anthropic's current SDK docs are explicit here:

- forking branches the conversation history, not the filesystem

That means if one fork edits files in the same working directory, those changes are real and visible to other sessions using that directory.

This is one of the most important practical warnings in Topic 1.7.

## When to Resume a Session

Resume is the right choice when:

- the prior analysis is still mostly accurate
- the workspace has not changed in a way that invalidates key tool results
- you want to continue a linear thread of work
- the cost of re-analysis would be high

Good examples:

- resuming after a short interruption
- continuing after a previous run ended on a budget or turn limit
- following up on a completed analysis with an implementation step

## When to Fork a Session

Fork is the right choice when:

- you want to compare two strategies from a shared starting point
- you want to preserve the original branch as a reference
- you want divergent exploration without mixing the histories

Examples:

- compare two testing strategies for the same module
- try REST and GraphQL approaches from the same analysis baseline
- branch a refactor into conservative and aggressive versions

This is why the exam guide pairs session resumption with forking. They solve different continuity problems.

## When to Start Fresh Instead

Starting fresh is often safer than resume when:

- the filesystem changed substantially
- earlier tool results are stale
- the old transcript is noisy or misleading
- the new task is only loosely related to the old one
- you can summarize the trusted conclusions more cleanly than the raw history can

Anthropic's current docs support this logic indirectly by emphasizing that session files are local transcripts, not live state.

If the world changed, the transcript did not.

## Why Stale Tool Results Are Dangerous

Suppose an earlier session:

- read files
- ran tests
- inspected logs
- drew conclusions

Then the code changes.

If you resume without telling the agent what changed, it may:

- trust old file contents
- rely on outdated failing tests
- assume a bug still exists after it was fixed
- skip re-checking the exact area that changed

That is why the exam guide emphasizes informing resumed sessions about file changes.

## The Practical Rule: Tell the Agent What Changed

When resuming, do not assume the prior state is still accurate just because the session remembers it.

A strong resume prompt often includes:

- which files changed
- whether tests were rerun
- whether key findings are still valid or now uncertain
- what the agent should re-check first

Weak resume:

- "Continue."

Strong resume:

- "Resume the auth investigation. Since the last session, `auth/service.ts` and `auth/policy.ts` changed, tests were rerun, and the prior JWT expiry finding may be stale. Re-check those files first, then continue the refactor plan."

This is exactly the kind of habit Topic 1.7 is trying to teach.

## Fresh Session with Structured Summary

Sometimes the safest approach is:

1. start a new session
2. inject a compact structured summary of trusted prior findings
3. explicitly call out what may be stale
4. ask the agent to verify only the changed areas

This works well when:

- the prior transcript is long
- only some conclusions still matter
- the file system changed enough that raw resumption is risky
- you want a cleaner starting point

In other words:

- resume when history is still mostly good
- restart when only the conclusions are still good

## Example: Resume vs Fresh Session

Imagine an earlier session analyzed a payment module and recommended a refactor.

Since then:

- two files changed
- tests were fixed
- a teammate merged another related patch

Bad choice:

- resume blindly and ask the agent to implement the old plan without re-checking anything

Better choice:

- either resume and explicitly list the changed files
- or start fresh with a summary of the earlier findings plus a request to re-verify the changed surfaces

The best option depends on how much of the prior context you still trust.

## Example: Forking Two Alternatives

Imagine a session already mapped the codebase and identified two viable testing strategies.

You want to compare:

- a focused unit-test expansion
- a broader integration-test harness

Good use of fork:

```text
original session:
    codebase mapping
    risk analysis
    existing test harness analysis

fork A:
    pursue unit-test-heavy strategy

fork B:
    pursue integration-test-heavy strategy
```

This preserves the shared analysis baseline while keeping the later reasoning separate.

## Session Scope and Locality

Anthropic's current SDK docs add two important implementation details:

- session files are local to the machine that created them
- resume depends on the working directory matching the original session location

That means session reuse can break if:

- you resume on another host without moving the session file
- you resume from the wrong directory

This is another reason structured summaries are sometimes more portable than raw session continuation.

## Resume Across Hosts

For CI workers, ephemeral containers, or distributed systems, there are two broad options:

1. move the session file to the matching path and host context
2. do not rely on raw resumption, and instead pass forward structured application state

Anthropic's current docs explicitly present both patterns.

For many production systems, the second approach is more robust:

- persist the trusted analysis
- persist key decisions
- persist relevant diffs or outputs
- inject those into a fresh session when needed

## Common Failure Modes

### 1. Blindly resuming after the world changed

Problem:

- the session transcript is treated as live truth even though files changed

Effect:

- stale reasoning and incorrect follow-up actions

### 2. Throwing away useful context too early

Problem:

- a mostly valid session is discarded and all analysis is repeated

Effect:

- wasted time and tokens

### 3. Using resume when you really need a fork

Problem:

- an alternative approach is explored inside the original session

Effect:

- the original reasoning path is polluted or lost

### 4. Assuming fork isolates file changes

Problem:

- a fork is treated like a separate filesystem branch

Effect:

- unexpected interference between branches

### 5. Resuming with no change summary

Problem:

- the agent is not told which files, facts, or results became stale

Effect:

- it trusts the wrong prior context

### 6. Treating raw transcripts as the only continuity mechanism

Problem:

- the system depends entirely on stored sessions

Effect:

- poor portability and brittle recovery across hosts or environments

## Topic 1.7 vs Topic 1.3

These topics sound similar because both are about context, but they solve different problems.

Topic 1.3 is mostly about:

- context handoff between coordinator and subagents inside one broader execution
- what a subagent inherits and what must be passed explicitly

Topic 1.7 is mostly about:

- context continuity across separate runs over time
- when to resume, fork, or restart
- how to manage stale prior state

A good way to remember it:

- Topic 1.3 = "What context does another agent need right now?"
- Topic 1.7 = "How much of yesterday's context should I still trust today?"

## Design Principles to Remember

Strong session management is usually:

- explicit about what is still valid
- cautious about stale tool results
- willing to fork for alternatives
- willing to restart when the transcript is noisier than the trusted summary
- aware that session history and filesystem state are different things

The main design question is:

- Do I want to continue the exact old thread, branch from it, or carry only the trusted conclusions into a fresh run?

That is the heart of Topic 1.7.

## Exam Takeaways

If you remember only a few things for Topic 1.7, remember these:

1. Sessions preserve conversation history, not live filesystem state.
2. Resume when prior context is still mostly valid.
3. Fork when you want to explore an alternative without overwriting the original thread.
4. Tell resumed sessions exactly what changed if files or facts moved.
5. A fresh session with a structured summary is often safer than resuming stale raw history.
6. Forking branches conversation history, not the filesystem.
7. Session reuse across hosts or directories is less reliable than portable structured state.

## Quick Self-Check

You understand Topic 1.7 if you can answer yes to these questions:

- Can I explain the difference between continue, resume, and fork?
- Can I explain why sessions preserve conversation state but not filesystem reality?
- Can I decide when a fork is better than a straight resume?
- Can I explain when starting fresh with a summary is safer than resuming?
- Can I write a resume prompt that identifies exactly what changed?
- Can I explain why cross-host or wrong-directory resumption can fail?

## References

- Anthropic, "Work with sessions": https://platform.claude.com/docs/en/agent-sdk/sessions
- Anthropic, "Common workflows" (Claude Code): https://docs.anthropic.com/en/docs/claude-code/tutorials
