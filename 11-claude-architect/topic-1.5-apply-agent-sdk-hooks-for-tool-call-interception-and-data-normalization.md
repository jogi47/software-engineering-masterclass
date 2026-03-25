# Topic 1.5: Apply Agent SDK Hooks for Tool Call Interception and Data Normalization

This note explains how hooks let your application intercept agent execution at deterministic points, why that matters for compliance and reliability, how `PreToolUse` and `PostToolUse` differ, and how to normalize inconsistent tool outputs before Claude reasons over them.

Topic 1.4 focused on workflow design: what must be enforced, when to branch, and when to escalate. Topic 1.5 goes one level deeper into implementation: which SDK interception points you use to enforce those decisions and clean up incoming tool data.

## Why This Topic Matters

Prompt instructions tell the model what it should do.

Hooks let your application decide what is actually allowed, changed, or appended at specific execution points.

That matters when:

- a tool call must be blocked if it violates policy
- a tool input should be rewritten before execution
- tool outputs arrive in inconsistent formats
- the agent needs deterministic context about why an action was denied
- compliance rules must apply even when the model suggests the wrong next step

## What the Exam Is Testing

For this topic, the exam is usually looking for these ideas:

- hooks are deterministic interception points in the SDK lifecycle
- `PreToolUse` is the main hook for validating, blocking, or modifying outgoing tool calls
- `PostToolUse` is the main hook for auditing results or appending normalized context after a tool returns
- hooks are better than prompt-only instructions when compliance must be guaranteed
- heterogeneous tool outputs should be normalized before the model uses them for downstream reasoning
- blocked actions should often be redirected into alternate flows, such as clarification or human escalation

## The Core Mental Model

The simplest correct mental model is:

```text
Claude proposes a tool call
    ->
your hook inspects it
    ->
allow / deny / modify / ask
    ->
tool runs if permitted
    ->
post-tool hook inspects the result
    ->
normalized context is appended
    ->
Claude reasons again using the cleaned-up state
```

Topic 1.5 is really about controlling the transition points around tool use.

## What Hooks Are

Anthropic's current SDK docs describe hooks as callback functions that run your code in response to agent events.

Important consequences:

- hooks run in your application process
- they do not live inside the model's context window
- they can block, allow, modify, or annotate execution deterministically

That makes hooks fundamentally different from natural-language instructions inside prompts.

## Why Hooks Are Stronger Than Prompts for Enforcement

This is the single most important exam idea in Topic 1.5.

A prompt can say:

- "Do not issue refunds above $500."

A hook can enforce:

- if `process_refund.amount > 500`, deny the tool call and redirect to human escalation

The prompt is guidance.

The hook is control.

That is why the exam guide emphasizes hooks when business rules require guaranteed compliance rather than probabilistic compliance.

## Where Hooks Sit in the Execution Flow

Hooks are part of the agent loop itself.

Anthropic's current docs say:

- `PreToolUse` fires before a tool executes
- `PostToolUse` fires after a tool returns
- hooks can short-circuit the loop

That means a `PreToolUse` rejection can prevent the tool from executing at all, and Claude receives the rejection context instead of the real tool result.

## The Two Most Important Hooks for This Topic

### `PreToolUse`

Use `PreToolUse` when you need to intercept an outgoing tool call before it happens.

This is the right place to:

- validate inputs
- block policy-violating actions
- auto-approve safe actions
- rewrite tool inputs
- ask for approval when needed

Examples:

- block refunds above a threshold
- deny writes to protected paths
- redirect file writes into a sandbox
- require explicit approval for production commands

### `PostToolUse`

Use `PostToolUse` when you need to react to the result after a tool has completed.

This is the right place to:

- audit outcomes
- attach normalized context
- add clarifying interpretation for downstream reasoning
- record metrics or side effects

Examples:

- convert mixed timestamp formats into one canonical interpretation
- map numeric status codes to readable semantic states
- append policy-relevant interpretation after a tool returns

## What `PreToolUse` Can Do

In the current hooks docs, `PreToolUse` supports the most important control actions for this exam topic:

- `permissionDecision`: allow, deny, or ask
- `permissionDecisionReason`: explain the decision
- `updatedInput`: modify the tool input before execution

This makes `PreToolUse` ideal for enforcement.

## Example: Blocking a Policy-Violating Tool Call

Imagine a customer support workflow with a refund threshold.

Rule:

- refunds above `$500` must be escalated to a human

The right hook behavior is:

```python
async def enforce_refund_policy(input_data, tool_use_id, context):
    if input_data["hook_event_name"] != "PreToolUse":
        return {}

    if input_data["tool_name"] != "process_refund":
        return {}

    amount = input_data["tool_input"].get("amount", 0)
    if amount > 500:
        return {
            "systemMessage": "Refunds above $500 require human approval.",
            "hookSpecificOutput": {
                "hookEventName": input_data["hook_event_name"],
                "permissionDecision": "deny",
                "permissionDecisionReason": "Refund exceeds automatic approval threshold."
            }
        }

    return {}
```

This is exactly what Topic 1.5 wants you to understand:

- the model may request the action
- the hook decides whether the action is permitted
- the system remains policy-compliant even if the model guessed wrong

## Example: Modifying Tool Inputs Before Execution

Hooks are not only for blocking.

They can also rewrite inputs when your system needs a safer or more standardized version of the request.

Example:

- redirect all writes into `/sandbox/...`
- attach a required argument that the model omitted
- rewrite an unsafe target path to an approved workspace path

Anthropic's hooks docs show this pattern with `updatedInput`.

Important detail:

- when you use `updatedInput`, you also return `permissionDecision: "allow"`
- you should return a new object, not mutate the original tool input

## Why Input Rewriting Can Be Better Than Prompting

Suppose the prompt says:

- "Always write inside `/sandbox`."

That still relies on model compliance.

A `PreToolUse` hook that rewrites `file_path` to `/sandbox/...` guarantees the path policy at runtime.

That is the difference between advice and enforcement.

## What `PostToolUse` Can Do

`PostToolUse` is not mainly about permission control. It is mainly about shaping what Claude sees next after the tool has already run.

Current Anthropic docs say that for `PostToolUse`, you can use `additionalContext` to append information to the tool result.

That matters because many real tool ecosystems return inconsistent data:

- one MCP tool returns Unix timestamps
- another returns ISO 8601 strings
- another returns integer status codes
- another returns human-readable text with no standard field names

If you send all of that raw and inconsistent data straight back into Claude, the next reasoning step becomes noisier and more error-prone.

## Example: Data Normalization with `PostToolUse`

Imagine three systems return payment status differently:

- `"approved"`
- `2`
- `"ok"`

And timestamps arrive as:

- `1711228800`
- `"2026-03-25T09:30:00Z"`
- `"03/25/2026 09:30 UTC"`

One good pattern is to let the raw tool output exist, but append normalized context that Claude can reason over consistently.

```python
async def normalize_payment_result(input_data, tool_use_id, context):
    if input_data["hook_event_name"] != "PostToolUse":
        return {}

    if input_data["tool_name"] != "mcp__payments__lookup_status":
        return {}

    raw = input_data.get("tool_response", {})

    normalized_status = map_status(raw.get("status"))
    normalized_timestamp = normalize_timestamp(raw.get("timestamp"))

    return {
        "hookSpecificOutput": {
            "hookEventName": input_data["hook_event_name"],
            "additionalContext": (
                f"Normalized status={normalized_status}; "
                f"normalized_timestamp_utc={normalized_timestamp}"
            ),
        }
    }
```

The exam point is not this exact API shape.

The exam point is:

- heterogeneous tool outputs should be normalized before the next reasoning step
- hooks are the deterministic place to do that

## What "Normalization" Really Means

Normalization means converting different source formats into one consistent representation for downstream reasoning.

Common normalization targets:

- timestamps -> one canonical UTC format
- numeric status codes -> semantic labels
- booleans encoded as strings -> actual boolean semantics
- tool-specific enum names -> shared domain vocabulary
- source-specific field names -> one canonical schema

The goal is not cosmetic cleanup. The goal is reducing ambiguity before the model reasons again.

## Hook Outputs You Should Know

The current hooks docs separate outputs into two broad categories.

### Top-level conversation outputs

These affect loop or conversation handling at the top level:

- `systemMessage`
- `continue` / `continue_`

These are useful when:

- you want Claude to understand why a tool was blocked
- you want to inject a policy reminder into the next turn
- you want to control whether the agent continues running after the hook

### Hook-specific outputs

These affect the current operation:

- `permissionDecision`
- `permissionDecisionReason`
- `updatedInput`
- `additionalContext`

For Topic 1.5, these are the fields that matter most.

## A Useful Policy Pattern: Block Plus Explain

One of the strongest hook patterns is:

1. block the bad action
2. explain the reason in machine-enforced form
3. inject enough context so Claude can choose a better next action

For example:

- deny refund over threshold
- explain that human approval is required
- inject a system message reminding Claude to escalate rather than retry

This is better than a silent block because it keeps the agent from repeating the same invalid attempt.

## Hooks and Permission Flow

Current Anthropic docs say the SDK evaluates tool permissions in this order:

1. hooks
2. deny rules
3. permission mode
4. allow rules
5. `canUseTool`

This has two important implications:

- hooks are the earliest deterministic interception point
- `canUseTool` is for runtime approval handling, not your first line of enforcement logic

Anthropic's docs also explicitly say hooks execute before `canUseTool`.

## When to Use Hooks vs `canUseTool`

Use hooks when:

- the rule is deterministic
- your application already knows the policy
- the action should be automatically blocked, modified, or approved

Use `canUseTool` when:

- a human decision is actually required
- the SDK should pause and wait for user input

This distinction matters for the exam.

If the business rule is fixed, the best answer is usually:

- enforce it with hooks, not with a prompt and not with manual operator review every time

## Synchronous vs Asynchronous Hooks

The current hooks docs also distinguish between normal hook execution and async outputs.

Important rule:

- async hook outputs are for side effects such as logging, metrics, and notifications
- async outputs cannot block, modify, or inject context into the current operation because the agent has already moved on

So if you need enforcement or normalization that affects the next reasoning step:

- do not rely on async side-effect hooks

## Matchers and Scope

Hooks can be filtered with matchers.

Important exam-relevant details:

- tool-based matchers filter by tool name
- they do not filter by file path or other tool arguments
- if you need finer control, inspect the tool input inside the hook callback

This matters because many policy rules depend on:

- file paths
- refund amounts
- command content
- target environments

Those are usually argument-level checks, not matcher-level checks.

## Common Hook Patterns You Should Know

### 1. Compliance enforcement

Example:

- deny destructive commands in production

Best hook:

- `PreToolUse`

### 2. Input rewriting

Example:

- redirect writes to a sandbox path

Best hook:

- `PreToolUse`

### 3. Result normalization

Example:

- convert timestamps and status codes into a consistent interpretation

Best hook:

- `PostToolUse`

### 4. Audit and notification side effects

Example:

- send a Slack message when approval is required

Best hook:

- `PermissionRequest` if you want to react to approval prompts specifically, or an async hook side effect for general logging/notifications

## A Full Example Flow

Imagine a support agent that can issue refunds and consult multiple payment systems.

Good design:

```text
1. Claude proposes process_refund(amount=650)
2. PreToolUse checks refund amount
3. Hook denies the tool call and injects policy context
4. Claude sees that auto-refund is blocked
5. Claude creates a human escalation path instead
6. Later, another payment lookup tool returns status=2 and timestamp=1711228800
7. PostToolUse appends normalized interpretation
8. Claude reasons using normalized status and timestamp
```

That single example shows both major 1.5 patterns:

- deterministic interception of outgoing calls
- deterministic normalization of incoming tool results

## Common Failure Modes

### 1. Using prompts instead of hooks for hard rules

Problem:

- the prompt says "never do X," but no runtime enforcement exists

Effect:

- non-zero chance of policy violation

### 2. Putting enforcement in async hooks

Problem:

- the hook logs the issue after the agent already moved on

Effect:

- no actual blocking or modification happens

### 3. Confusing `PostToolUse` with pre-execution validation

Problem:

- trying to block an unsafe command after the tool has already run

Effect:

- enforcement happens too late

### 4. Passing heterogeneous tool output directly to the model

Problem:

- raw timestamps, codes, and schemas vary by source

Effect:

- more brittle downstream reasoning

### 5. Using matchers as if they inspect arguments

Problem:

- assuming a matcher can filter by file path or refund amount

Effect:

- the hook fires too broadly or misses the real policy condition

### 6. Blocking without explanation

Problem:

- the tool is denied, but Claude gets no useful context about why

Effect:

- repeated invalid attempts or poor fallback decisions

## Topic 1.5 vs Topic 1.4

These topics are tightly related, but they are not the same.

Topic 1.4 is mostly about:

- which workflow rules exist
- which prerequisites must hold
- when to branch, escalate, or hand off

Topic 1.5 is mostly about:

- where to intercept execution in the SDK
- how to block or modify tool calls
- how to append normalized context after tools return

A good way to remember it:

- Topic 1.4 = "What must the workflow enforce?"
- Topic 1.5 = "Which hook enforces or normalizes it?"

## Design Principles to Remember

Strong hook design is usually:

- narrow in scope
- deterministic
- explicit about policy
- careful about what gets modified
- careful about what context gets injected
- used only where runtime control is actually needed

Hooks are powerful, so the goal is not to attach them everywhere.

The goal is to place them at the exact execution points where deterministic control or normalization is necessary.

## Exam Takeaways

If you remember only a few things for Topic 1.5, remember these:

1. Hooks are deterministic interception points in the SDK lifecycle.
2. `PreToolUse` is for validating, blocking, asking, or modifying outgoing tool calls.
3. `PostToolUse` is for reacting to tool results and appending normalized context before the next reasoning step.
4. Hooks are better than prompt-only instructions when business rules require guaranteed compliance.
5. Normalize inconsistent tool outputs before Claude reasons over them again.
6. Hooks execute before `canUseTool`, so fixed policies usually belong in hooks.
7. Async hooks are for side effects, not enforcement.

## Quick Self-Check

You understand Topic 1.5 if you can answer yes to these questions:

- Can I explain why hooks are stronger than prompts for deterministic enforcement?
- Can I explain when `PreToolUse` is the right interception point?
- Can I explain when `PostToolUse` is the right interception point?
- Can I describe how to normalize mixed timestamps or status codes before the next reasoning step?
- Can I explain why `canUseTool` is different from hook-based enforcement?
- Can I explain why async hooks are not suitable for blocking or modifying the current operation?

## References

- Anthropic, "Control execution with hooks": https://platform.claude.com/docs/en/agent-sdk/hooks
- Anthropic, "Configure permissions": https://platform.claude.com/docs/en/agent-sdk/permissions
- Anthropic, "Handle approvals and user input": https://platform.claude.com/docs/en/agent-sdk/user-input
- Anthropic, "How the agent loop works": https://platform.claude.com/docs/en/agent-sdk/agent-loop
- Anthropic, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
