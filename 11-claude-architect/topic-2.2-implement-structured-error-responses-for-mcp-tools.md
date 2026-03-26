# Topic 2.2: Implement Structured Error Responses for MCP Tools

This note explains how to expose MCP tool failures in a form Claude can reason about, why that matters for recovery and escalation, and how to connect the exam's `isError` wording to current Anthropic interfaces. For the exam, Topic 2.2 is not mainly about memorizing one field name. It is about designing failure signals that support good next actions instead of leaving the agent blind.

## Why This Topic Matters

A tool failure is only useful if the agent can tell what failed, whether retrying makes sense, and what to do next.

If your tool only returns:

- `Operation failed`
- `Something went wrong`
- a raw stack trace

then Claude cannot reliably decide whether it should:

- retry
- ask the user for corrected input
- explain a business rule
- escalate to a coordinator or human
- stop retrying and move on

This matters in the main Domain 2 scenarios:

- a customer support agent should retry temporary backend failures, but should not retry a refund that violates policy
- a research agent should distinguish between a temporary search outage and a valid search with zero useful results

Structured error responses turn failures into actionable state rather than dead ends.

## What the Exam Is Testing

For Topic 2.2, the exam is usually testing whether you understand these ideas:

- tool execution failures should be surfaced in a structured way the model can inspect
- transient, validation, business, and permission failures should not all be handled the same way
- retryable and non-retryable failures must be distinguished explicitly
- generic error text prevents intelligent recovery
- subagents should attempt bounded local recovery for transient problems before escalating
- valid empty results are not the same as access failures or backend errors

The exam guide uses fields such as `errorCategory` and `isRetryable` to make this concrete. The durable concept is:

- return enough machine-readable error structure for the agent to choose a good next action

## The Core Mental Model

The simplest correct mental model is:

```text
tool call
    ->
success result or tool-execution error result
    ->
Claude reasons over that result
    ->
retry / repair input / explain / escalate / stop
```

For this topic, a good error response answers five questions:

1. Did the tool fail at execution time?
2. What category of failure was it?
3. Is retrying sensible?
4. What explanation should Claude use in its reasoning?
5. What next action is most appropriate?

Topic 2.2 is really about making failure states legible.

## Current Anthropic Terminology vs Exam Wording

The exam guide uses MCP terminology directly:

- `isError` in the MCP tool result
- "MCP tools" as the general tool-integration concept

Current Anthropic docs use slightly different interface language depending on where you build:

- the MCP specification uses `isError` in a tool result object
- Anthropic's current Messages API MCP connector exposes MCP results as `mcp_tool_result` blocks with an `is_error` field
- Anthropic docs also distinguish among client tools, server tools, and MCP-connected tools depending on the interface

The underlying concept does not change:

- the tool should return an error result that the model can inspect and reason about

So for exam study, the safest interpretation is:

- when the exam says MCP `isError`, think "structured tool-execution failure surfaced to the model"
- when you implement against current Anthropic APIs, expect interface-specific field names such as `is_error` in MCP connector result blocks

## Protocol Errors vs Tool Execution Errors

This distinction is central.

### Protocol errors

These are integration or request-level failures, such as:

- unknown tool name
- malformed request that does not satisfy the tool schema
- server-side transport or JSON-RPC failure before the tool meaningfully runs

The current MCP spec treats these as protocol errors, not normal tool results.

Important nuance:

- if the request is malformed against the declared tool schema, that is usually a protocol-level problem
- if the request passes the schema but fails domain validation inside the tool, returning a structured tool error is often the better recovery path

### Tool execution errors

These are failures that happen while the tool is performing a valid requested action, such as:

- a timeout while calling a downstream API
- invalid input values that the tool can explain clearly
- permission denial from a backend system
- a business-rule rejection such as "refund amount exceeds automatic approval limit"

The current MCP spec recommends surfacing these in the tool result with `isError: true` so the model can potentially self-correct or recover.

For exam purposes, the key rule is:

- if the model could reasonably adapt based on the failure, prefer a structured tool-execution error over a vague generic failure

## What Makes an Error Response Structured

A structured error response is more than a flag plus one sentence.

At minimum, a useful error result should include:

- an explicit error indicator such as MCP `isError`
- human-readable content explaining what went wrong
- machine-readable metadata that tells the agent how to respond

The machine-readable fields are application design choices. The exam guide uses:

- `errorCategory`
- `isRetryable`
- a human-readable explanation

Those names are not mandated by MCP itself, but they are a strong pattern for exam answers and real systems.

If you use MCP `structuredContent` and an `outputSchema`, define a stable shape that can represent both success and failure cleanly. A common pattern is:

- `status: "ok" | "error"`
- `data` for success
- `error` for failure

That keeps downstream handling predictable.

### Example error result shape

```json
{
  "content": [
    {
      "type": "text",
      "text": "Refund request rejected: amount exceeds the automatic approval limit of $500."
    }
  ],
  "structuredContent": {
    "status": "error",
    "errorCategory": "business",
    "isRetryable": false,
    "userMessage": "This refund requires human review because it exceeds the automatic approval threshold.",
    "suggestedNextAction": "escalate_to_human",
    "details": {
      "limit": 500,
      "requestedAmount": 742.1
    }
  },
  "isError": true
}
```

Important nuance:

- `isError` is the protocol-level signal that this is a tool error result
- fields like `errorCategory`, `isRetryable`, and `suggestedNextAction` are your application-level contract

## Error Categories That Matter

The exam outline names four categories repeatedly. They are not equally recoverable.

| Category | Typical example | Retry? | Best next action |
| --- | --- | --- | --- |
| `transient` | Timeout, temporary 429, temporary downstream outage | Usually yes, with limits | Retry locally with backoff, then escalate if still failing |
| `validation` | Bad date format, missing required field, invalid customer ID format | No, not without changed input | Ask for corrected input or repair the request |
| `business` | Refund exceeds policy threshold, action blocked by business rule | No | Explain the rule and choose an alternate workflow |
| `permission` | Expired token, missing scope, forbidden resource | Usually no until credentials or access change | Escalate, re-authenticate, or explain access limitation |

Two clarifications matter:

- "business" is usually an application-level category, not a formal MCP-defined taxonomy
- a permission failure is not the same as "no data found"

## Retryable vs Non-Retryable Is the Main Behavioral Split

The category matters because it drives retry policy.

### Retryable failures

Retryable failures are usually transient:

- rate limiting
- temporary overload
- network timeout
- short-lived downstream unavailability

Good behavior:

- retry locally with bounded attempts
- use backoff and jitter
- honor explicit retry signals such as `retry-after` when available
- surface what was attempted if escalation is still needed

### Non-retryable failures

These usually include:

- validation failures
- business-rule violations
- most permission failures

Good behavior:

- do not keep retrying
- explain the constraint clearly
- steer toward correction, alternate flow, or escalation

The exam logic is simple:

- blind retries are a design failure when the response already told you retrying will not help

## Empty Results Are Not Errors

This is one of the easiest ways to get an exam question wrong.

A valid request can succeed and still return no useful data.

Examples:

- a search tool returns zero matching documents
- a customer lookup returns no order in the requested date range
- a repo query finds no files matching the filter

Those are often successful queries with empty results, not execution errors.

That means:

- do not set `isError` just because the result set is empty
- return a normal success result with an empty collection, zero count, or explicit "no matches" state

By contrast, these are error cases:

- the caller lacked permission to perform the lookup
- the backend timed out
- the input format was invalid

If you blur these together, Claude cannot decide whether it should broaden the search, fix the input, retry, or escalate.

## Implementation Workflow Guidance

A practical implementation workflow for Topic 2.2 looks like this:

### 1. Define the failure taxonomy for each tool

Before coding, list the real failure classes:

- transient infrastructure failures
- validation failures
- business-rule failures
- permission failures
- successful empty-result cases

Do not leave these as a single catch-all bucket.

### 2. Decide what the tool should handle locally

For each category, define:

- whether the tool retries locally
- how many attempts are allowed
- whether backoff is required
- what metadata gets returned if recovery fails

A good rule is:

- local transient recovery happens inside the tool or subagent
- unresolved failures are surfaced upward with structured context

### 3. Design one stable error contract

Pick a consistent shape that every tool can return.

For example:

- `errorCategory`
- `isRetryable`
- `userMessage`
- `suggestedNextAction`
- `details`

Consistency matters more than cleverness. A coordinator cannot recover reliably if every tool invents a different error format.

### 4. Separate agent-facing reasoning context from raw internals

Claude needs enough detail to recover, but you should not dump unnecessary secrets or noisy stack traces into the result.

Good structured detail includes:

- invalid field names
- limit thresholds
- retry-after hints
- backend operation that failed

Weak detail includes:

- raw exception dumps with no classification
- opaque numeric error codes without explanation
- sensitive tokens, credentials, or internal-only secrets

### 5. Implement bounded retry for transient failures

If the downstream service returns something like:

- timeout
- 429 rate limit
- temporary overload

then retry in a controlled way. If it still fails, return a structured transient error describing:

- what failed
- how many retries were attempted
- whether more retrying is worthwhile

### 6. Test the transcript behavior, not only the tool code

Topic 2.2 is about agent behavior, not just exception handling.

Test whether Claude:

- retries transient errors appropriately
- asks for corrected input after validation failures
- stops retrying business-rule failures
- explains permission limitations correctly
- distinguishes no results from real failure

If the transcript still shows repeated wrong behavior, the error contract is underspecified.

## Example: Support Tool Error Design

Imagine an MCP tool called `process_refund`.

The business rule is:

- refunds above `$500` require human approval

This should not be returned as:

- `Operation failed`

It should be returned as a structured, non-retryable business error.

### Weak version

```json
{
  "content": [
    {
      "type": "text",
      "text": "Refund failed."
    }
  ],
  "isError": true
}
```

Why this is weak:

- Claude does not know whether to retry
- Claude does not know whether the user input was wrong
- Claude does not know whether escalation is required

### Stronger version

```json
{
  "content": [
    {
      "type": "text",
      "text": "Automatic refund denied because the requested amount exceeds the $500 approval threshold."
    }
  ],
  "structuredContent": {
    "status": "error",
    "errorCategory": "business",
    "isRetryable": false,
    "userMessage": "This refund requires human review.",
    "suggestedNextAction": "escalate_to_human",
    "details": {
      "threshold": 500,
      "requestedAmount": 742.1
    }
  },
  "isError": true
}
```

Now Claude can reason correctly:

- do not retry
- explain the rule
- move to escalation

## Example: Transient Failure With Local Retry

Imagine a search subagent calling an MCP tool that reaches an external document index.

The first request times out twice, then still fails.

Good subagent behavior is:

1. retry locally with bounded attempts
2. if still failing, return a transient structured error
3. include what was tried so the coordinator does not repeat the same blind loop immediately

Example shape:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Document search is temporarily unavailable after 3 attempts due to upstream timeout."
    }
  ],
  "structuredContent": {
    "status": "error",
    "errorCategory": "transient",
    "isRetryable": true,
    "userMessage": "The search system is temporarily unavailable.",
    "suggestedNextAction": "retry_later_or_use_alternate_source",
    "details": {
      "attempts": 3,
      "failureType": "timeout"
    }
  },
  "isError": true
}
```

That gives the coordinator useful state:

- a transient issue happened
- local recovery was already attempted
- alternate sourcing or delayed retry may be better than immediate repetition

## A Minimal TypeScript Pattern

This is one reasonable implementation shape for an MCP tool handler. The exact helper names are application code, not Anthropic API names.

```ts
type ErrorCategory = "transient" | "validation" | "business" | "permission";

type ToolErrorPayload = {
  status: "error";
  errorCategory: ErrorCategory;
  isRetryable: boolean;
  userMessage: string;
  suggestedNextAction?: string;
  details?: Record<string, unknown>;
};

function errorResult(text: string, payload: ToolErrorPayload) {
  return {
    content: [{ type: "text", text }],
    structuredContent: payload,
    isError: true,
  };
}

async function processRefund(input: {
  customerId?: string;
  orderId?: string;
  amount?: number;
}) {
  if (!input.customerId || !input.orderId || typeof input.amount !== "number") {
    return errorResult("Refund request is missing required fields.", {
      status: "error",
      errorCategory: "validation",
      isRetryable: false,
      userMessage: "Provide customer ID, order ID, and amount.",
      suggestedNextAction: "collect_missing_fields",
      details: { required: ["customerId", "orderId", "amount"] },
    });
  }

  if (input.amount > 500) {
    return errorResult("Automatic refund denied: amount exceeds approval threshold.", {
      status: "error",
      errorCategory: "business",
      isRetryable: false,
      userMessage: "This refund requires human review.",
      suggestedNextAction: "escalate_to_human",
      details: { threshold: 500, requestedAmount: input.amount },
    });
  }

  try {
    const result = await callRefundService(input);

    return {
      content: [{ type: "text", text: `Refund processed: ${result.refundId}` }],
      structuredContent: {
        status: "ok",
        refundId: result.refundId,
      },
    };
  } catch (error) {
    if (isTransient(error)) {
      return errorResult("Refund service temporarily unavailable.", {
        status: "error",
        errorCategory: "transient",
        isRetryable: true,
        userMessage: "The refund system is temporarily unavailable.",
        suggestedNextAction: "retry",
      });
    }

    if (isPermissionError(error)) {
      return errorResult("Refund service denied access.", {
        status: "error",
        errorCategory: "permission",
        isRetryable: false,
        userMessage: "This action cannot be completed with the current access level.",
        suggestedNextAction: "escalate_access_issue",
      });
    }

    throw error;
  }
}
```

That final `throw` represents an unexpected internal failure.

For exam purposes, the safer rule is:

- map expected, model-actionable failures into structured tool errors
- reserve raw exceptions or protocol/server failures for truly unexpected conditions your tool cannot explain meaningfully

The exam point is not this exact code.

The exam point is:

- classify failures deliberately
- surface model-actionable structure
- retry only when retrying makes sense

## Common Mistakes

### 1. Returning the same generic error for every failure

Problem:

- Claude cannot tell whether to retry, repair input, escalate, or stop

Effect:

- poor recovery and repeated useless tool calls

### 2. Treating protocol errors and tool-execution errors as the same thing

Problem:

- the agent gets no meaningful failure state for recoverable tool problems

Effect:

- model self-correction becomes much harder

### 3. Retrying non-retryable failures

Problem:

- validation, business, and most permission errors get retried as if they were outages

Effect:

- wasted turns, user frustration, and noisy transcripts

### 4. Marking empty results as errors

Problem:

- successful "no matches" states get treated like failures

Effect:

- the agent escalates or retries when it should broaden the search or report that nothing matched

### 5. Hiding the reason for a business-rule rejection

Problem:

- the tool says no, but Claude cannot explain why

Effect:

- the agent may retry or communicate poorly to the user

### 6. Returning raw internals with no user-safe summary

Problem:

- the result contains stack traces or opaque backend errors

Effect:

- noisy reasoning context and possible leakage of internal details

### 7. Letting every tool invent a different error shape

Problem:

- coordinators and subagents cannot build consistent recovery logic

Effect:

- error handling becomes prompt glue instead of system design

## Topic 2.2 vs Topic 2.1

Topic 2.1 is about choosing the right tool in the first place.

Topic 2.2 is about what happens when the chosen tool cannot complete successfully.

The connection is important:

- a clear tool interface improves selection before execution
- a clear error contract improves recovery after execution fails

Strong tool systems need both.

## Exam Takeaways

If you remember only a few things for Topic 2.2, remember these:

1. Use structured tool-execution errors the model can inspect, not only generic failure text.
2. Keep protocol errors separate from tool-execution errors.
3. Classify failures into categories such as transient, validation, business, and permission because each implies different recovery behavior.
4. Make retryability explicit so the agent does not waste turns on blind retries.
5. Treat valid empty results as successful outcomes, not as errors.
6. Retry transient failures locally with limits, then escalate with structured context about what was attempted.
7. In current Anthropic APIs, the exam's MCP `isError` concept may appear through interface-specific fields such as `is_error` in `mcp_tool_result` blocks.

## Quick Self-Check

You understand Topic 2.2 if you can answer yes to these questions:

- Can I explain the difference between an MCP protocol error and a tool-execution error?
- Can I describe why `Operation failed` is a poor error contract for an agent?
- Can I classify a failure as transient, validation, business, or permission and choose a matching next action?
- Can I explain when retrying is useful and when retrying is wasteful?
- Can I design a successful empty-result response without incorrectly marking it as an error?
- Can I explain the difference between MCP `isError` wording in the spec and current Anthropic interface fields such as `is_error` in MCP connector results?

## References

- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "MCP connector": https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector
- Anthropic, "Errors": https://docs.anthropic.com/en/api/errors
- Anthropic, "Rate limits": https://docs.anthropic.com/en/api/rate-limits
- Model Context Protocol, "Tools": https://modelcontextprotocol.io/specification/draft/server/tools
- Model Context Protocol, "Schema Reference": https://modelcontextprotocol.io/specification/2025-06-18/schema
