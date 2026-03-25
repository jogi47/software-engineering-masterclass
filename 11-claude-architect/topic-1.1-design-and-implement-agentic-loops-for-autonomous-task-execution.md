# Topic 1.1: Design and Implement Agentic Loops for Autonomous Task Execution

This note explains the core execution pattern behind a Claude agent: the agentic loop. For the exam, this topic is not about memorizing one SDK API. It is about understanding the control flow, why the loop works, how Claude decides what to do next, and what implementation mistakes break reliability.

## Why This Topic Matters

An agent is not just "Claude with tools." It is a system where:

1. Claude receives the current state of the task.
2. Claude decides whether it needs to call a tool or can finish.
3. Your application executes requested tools.
4. Tool results are fed back into Claude.
5. Claude reasons again using the new ground truth.
6. The loop continues until the task is complete.

This is the foundation for customer support agents, coding agents, research agents, and document-processing agents.

## What the Exam Is Testing

The exam expects you to understand three things clearly:

- The execution loop should be driven by structured signals such as `stop_reason`, not by parsing the assistant's natural language.
- Tool results must be added back into the conversation so Claude can reason over fresh evidence.
- The loop should stay model-driven. Claude decides the next tool or next step from context, instead of your code hardcoding a fixed sequence in most cases.

## The Core Mental Model

The simplest correct mental model is:

`prompt -> Claude response -> tool call or final answer -> tool execution -> tool result -> Claude response -> ...`

Anthropic describes agents as systems that use tools based on environmental feedback in a loop. That environmental feedback is the key. Claude should not blindly continue from its own guesses; it should continue from real tool results, code execution results, retrieved files, database lookups, or other external evidence.

## What an Agentic Loop Is

An agentic loop is the repeated cycle in which Claude:

- reads the current conversation state
- decides what to do next
- optionally requests tool calls
- receives tool results
- updates its reasoning
- either continues or finishes

You can implement this manually with the Messages API, or let the Claude Agent SDK run the loop for you. In both cases, the underlying logic is the same.

## The Loop Lifecycle Step by Step

### Step 1: Start with the current task state

Claude receives:

- the user request
- the system prompt
- tool definitions
- any relevant prior conversation history
- any prior tool results already accumulated in the session

At this point, Claude has enough context to decide whether:

- it can answer directly
- it needs one tool
- it needs multiple tools
- it needs to continue investigating

### Step 2: Claude evaluates the state and responds

Claude returns a response with a structured `stop_reason`.

For Topic 1.1, the two most important values are:

- `tool_use`: Claude wants your application to execute one or more tools.
- `end_turn`: Claude has completed its response for the current turn.

These structured signals are what should drive your loop.

### Step 3: If `stop_reason == "tool_use"`, execute the tool call(s)

When Claude wants tools, the assistant response includes one or more `tool_use` blocks. Each block contains:

- a tool use ID
- the tool name
- the structured input for that tool

Your application should:

1. extract each tool request
2. run the corresponding real tool
3. collect the results
4. send those results back in the next user message as `tool_result` blocks

This is the feedback phase of the loop.

### Step 4: Append the tool results correctly

This is one of the most important implementation details.

Tool results are not just logs for your system. They become part of Claude's next reasoning context. That is how the model learns what actually happened in the environment.

The message sequence should look like this:

```text
user -> asks for task
assistant -> emits tool_use
user -> sends tool_result
assistant -> reasons again with the result
```

If the tool result is omitted, malformed, or placed incorrectly, the loop becomes unreliable or fails outright.

### Step 5: Claude reasons again using the new ground truth

Once the tool result is back in the conversation, Claude can decide:

- call another tool
- synthesize a final answer
- revise its plan
- recover from a failed attempt
- ask for clarification if needed

This is what makes the loop agentic. The model is not simply following a static script; it is reacting to evidence.

### Step 6: If `stop_reason == "end_turn"`, finish

When Claude returns `end_turn`, the loop has reached a natural stopping point for that turn.

For Topic 1.1, the usual interpretation is:

- if there are no pending tool calls and Claude has completed its output, the task is done
- your application can return the final answer or hand off control to the next layer of the system

## The Minimal Correct Loop

Here is the essential control flow in pseudocode:

```python
messages = [
    {"role": "user", "content": "Help me resolve this customer refund issue."}
]

while True:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        system=system_prompt,
        tools=tools,
        messages=messages,
        max_tokens=1024,
    )

    messages.append({
        "role": "assistant",
        "content": response.content,
    })

    if response.stop_reason == "tool_use":
        tool_results = []

        for block in response.content:
            if block.type == "tool_use":
                result = run_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages.append({
            "role": "user",
            "content": tool_results,
        })
        continue

    if response.stop_reason == "end_turn":
        break

    raise RuntimeError(f"Unexpected stop reason: {response.stop_reason}")
```

This captures the core exam concept:

- loop on `tool_use`
- stop on `end_turn`
- feed results back into the conversation

## What Changes in the Agent SDK

If you use the Claude Agent SDK, the SDK runs the same loop for you:

- Claude evaluates
- the SDK executes tools
- tool results go back into Claude
- the loop repeats until there are no more tool calls

You still need to understand the lifecycle because:

- debugging requires understanding what happens in each turn
- hooks, permissions, cost limits, and turn limits affect loop behavior
- the exam tests the concept, not only whether you know an SDK convenience wrapper

## Why `stop_reason` Matters So Much

`stop_reason` is the structured contract between Claude and your application.

It tells you why Claude stopped generating output successfully. For Topic 1.1, the most important logic is:

- `tool_use` means "do work in the environment, then come back"
- `end_turn` means "I am done with this turn naturally"

This is far more reliable than checking if the model said things like:

- "I am finished"
- "Here is the answer"
- "No further action is needed"

Natural language is probabilistic. `stop_reason` is the control signal.

## How Tool Results Enable Autonomous Reasoning

The loop only works if Claude sees the outcome of its actions.

Examples:

- If Claude runs `lookup_order`, it must see the actual order result before deciding whether to refund.
- If Claude runs `npm test`, it must see the test failures before deciding which file to edit.
- If Claude reads a document, it must see the extracted content before planning another search or synthesis step.

Without tool results, Claude is reasoning over assumptions. With tool results, Claude is reasoning over state changes and evidence.

That is why tool results are not optional decoration. They are the engine of the next turn.

## Correct Message Formatting Matters

For client tools, Anthropic's docs are strict about tool-result formatting:

- tool result blocks must immediately follow the corresponding tool use response
- in the user message that returns tool results, `tool_result` blocks must come first

If you insert extra text before the tool result, the API can reject the request or the loop can behave incorrectly.

### Correct pattern

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_123",
      "content": "Order status: delivered"
    }
  ]
}
```

### Risky pattern

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Here is the result" },
    {
      "type": "tool_result",
      "tool_use_id": "toolu_123",
      "content": "Order status: delivered"
    }
  ]
}
```

## Model-Driven Decision Making vs Hardcoded Workflows

This distinction is directly tested in the exam.

### Model-driven loop

In a true agentic loop:

- Claude decides whether to call a tool
- Claude chooses which tool to call next
- Claude adapts based on returned evidence
- Claude may change course after seeing results

This is best for open-ended or uncertain tasks.

### Hardcoded workflow

In a rigid scripted flow:

- your code forces fixed steps
- the model has little or no discretion
- branching is determined mostly in application logic

This can still be useful for deterministic business processes, but it is not the same as an agentic loop.

### The exam nuance

The exam does not say "never hardcode anything." In fact, some workflows require deterministic guardrails. The key point is:

- use model-driven logic for open-ended problem solving
- use deterministic controls when correctness or policy compliance requires them

## Why Arbitrary Iteration Limits Are Not the Primary Stopping Mechanism

The exam specifically warns against treating arbitrary caps as the main way to detect task completion.

Bad pattern:

- "Run the loop 5 times and assume it is done."

Better pattern:

- Stop because Claude returned `end_turn`.
- Use limits such as max turns or budget as safety guardrails, not as your main completion signal.

This distinction matters:

- completion logic should be semantic and structured
- guardrails should be operational and protective

## Practical Example

Imagine a customer asks:

> "I never got my refund. Can you check what happened?"

An agentic loop might behave like this:

1. Claude receives the request and sees available tools.
2. Claude emits `tool_use` for `get_customer`.
3. Your system runs `get_customer` and returns the result.
4. Claude emits `tool_use` for `lookup_order`.
5. Your system runs `lookup_order` and returns the result.
6. Claude sees that the order was returned but the refund failed.
7. Claude emits `tool_use` for `process_refund` or decides to escalate depending on policy.
8. After the final tool result, Claude returns `end_turn` with a final answer.

At every step, the next move depends on actual returned evidence.

## Common Implementation Mistakes

### 1. Using assistant text to decide whether the loop should stop

Wrong:

- checking whether Claude said "done"
- looking for certain phrases in the response

Right:

- checking `stop_reason`

### 2. Forgetting to append tool results back into the conversation

Wrong:

- executing the tool and logging the result locally
- not returning the result to Claude

Right:

- sending a proper `tool_result` block back to the model

### 3. Treating max-iteration limits as the main completion rule

Wrong:

- "after N turns, we assume success"

Right:

- use turn or budget caps only as safety controls

### 4. Breaking the required message ordering

Wrong:

- inserting extra messages between `tool_use` and `tool_result`
- placing text before tool results

Right:

- return tool results immediately and in the correct block order

### 5. Turning an agent into a brittle script

Wrong:

- hardcoding the exact tool sequence for every case

Right:

- allow Claude to choose the next action when the task is open-ended

## Adjacent Stop Reasons You Should Know

Topic 1.1 centers on `tool_use` and `end_turn`, but in real systems you should also recognize these adjacent cases:

- `max_tokens`: the response was truncated by output limit
- `pause_turn`: relevant with server tools when Claude needs continuation
- `refusal`: the model declined for safety reasons
- `model_context_window_exceeded`: the context window was reached

These are not the main exam focus for this topic, but they matter in production loops.

## Design Principles for Strong Agentic Loops

Anthropic's guidance is consistent on a few high-level principles:

- keep the design simple
- rely on real environmental feedback
- document tools clearly
- add complexity only when it improves outcomes
- keep guardrails around cost, turns, and risky actions

In practice, the best loops are usually:

- short
- explicit
- tool-driven
- easy to debug
- grounded in real state changes

## Exam Takeaways

If you remember only a few things for Topic 1.1, remember these:

1. The loop is driven by `stop_reason`.
2. `tool_use` means execute tools and return the results.
3. `end_turn` means Claude finished naturally.
4. Tool results must go back into the conversation.
5. The next step should be based on returned evidence, not guesswork.
6. Do not parse natural language to decide whether the loop is done.
7. Turn limits are guardrails, not the primary completion signal.

## Quick Self-Check

You understand Topic 1.1 if you can answer yes to these questions:

- Can I explain the full loop from user request to final answer?
- Can I explain the difference between `tool_use` and `end_turn`?
- Can I show where `tool_result` fits in the message history?
- Can I explain why tool results are required for the next reasoning step?
- Can I explain why parsing assistant text is weaker than using `stop_reason`?
- Can I explain the difference between a model-driven loop and a hardcoded workflow?

## References

- Anthropic, "Handling stop reasons": https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- Anthropic, "How to implement tool use": https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
- Anthropic, "How the agent loop works" (Agent SDK): https://platform.claude.com/docs/en/agent-sdk/agent-loop
- Anthropic, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
