# Topic 1.4: Implement Multi-Step Workflows with Enforcement and Handoff Patterns

This note explains when a multi-step workflow should be enforced in code instead of merely described in prompts, how prerequisite gates work, when to split work into parallel branches, and how to hand off a partially resolved case to a human cleanly.

Topic 1.1 focused on the basic agent loop. Topics 1.2 and 1.3 focused on multi-agent orchestration and subagent mechanics. Topic 1.4 focuses on workflow control: making sure the right steps happen in the right order, especially when some steps are mandatory.

## Why This Topic Matters

Many agent failures are not reasoning failures. They are workflow failures.

Examples:

- issuing a refund before identity verification finishes
- writing to production before approval is granted
- answering a multi-part support issue but forgetting one branch entirely
- escalating to a human without enough context to continue the case

In these situations, a good prompt helps, but a prompt alone is not enough when compliance must be guaranteed.

## What the Exam Is Testing

For this topic, the exam is usually looking for these ideas:

- prompt guidance is probabilistic, but programmatic enforcement is deterministic
- fixed multi-step workflows are often better implemented as explicit pipelines with gates
- critical prerequisites should block downstream actions until required evidence exists
- multi-concern requests can often be decomposed into parallel investigation branches
- human handoff summaries must be structured because the receiver may not have the transcript
- the workflow should preserve enough evidence for downstream synthesis or escalation

## The Core Mental Model

The simplest correct mental model is:

```text
receive request
    ->
classify workflow type
    ->
complete required prerequisites
    ->
open parallel branches only where independence exists
    ->
synthesize findings
    ->
either complete the action or hand off to a human with structured context
```

This topic is really about two questions:

1. Which steps are required before an action is allowed?
2. If the agent cannot finish, what exact information must survive the handoff?

## Prompt Guidance vs Programmatic Enforcement

This is the most important distinction in Topic 1.4.

### Prompt guidance

Prompt guidance means you tell the model what order to follow:

- "Verify identity before issuing a refund."
- "Check the account status before modifying billing."
- "If the refund exceeds the policy threshold, escalate."

This is useful, but it is still model behavior. It is not a guarantee.

### Programmatic enforcement

Programmatic enforcement means your application or SDK configuration prevents invalid transitions:

- do not allow `process_refund` unless verification succeeded
- do not allow a write tool unless approval has been granted
- do not continue to the execution step if the validation step failed

This is deterministic because the workflow constraint exists outside the model's natural-language reasoning.

## Why Prompts Alone Are Not Enough for Critical Steps

Anthropic's workflow guidance draws a useful distinction here:

- workflows are predefined code paths
- agents are model-directed loops

For critical business constraints, you often need a workflow element inside an agentic system.

That is the exam point:

- use flexible agent behavior where flexibility helps
- use deterministic gates where the system cannot tolerate non-zero failure

Good examples of deterministic requirements:

- identity verification before financial operations
- policy checks before destructive actions
- approval before privileged commands
- validation before final publication or commit

## Workflow Patterns That Matter for Topic 1.4

Anthropic's workflow guidance gives a strong mental map for this topic.

### 1. Prompt chaining

Use prompt chaining when the task is a fixed sequence:

```text
step 1 -> validate output -> step 2 -> validate output -> step 3
```

This is a good fit when:

- the task decomposes cleanly into ordered steps
- each step depends on the previous one
- intermediate validation improves reliability

For Topic 1.4, prerequisite gating is often a prompt-chaining pattern with explicit validation between steps.

### 2. Routing

Use routing when different request types need different downstream workflows.

Examples:

- general support question -> answer flow
- refund request -> refund workflow
- technical issue -> troubleshooting workflow

This matters because not every request should go through the same sequence.

### 3. Parallelization

Use parallelization when distinct concerns can be investigated independently.

Examples:

- billing issue
- shipping issue
- account access issue

If they can be investigated separately, parallel branches improve speed and coverage.

### 4. Handoff

Handoff is the controlled transition from automated handling to a human or another system.

A good handoff is not:

- "Escalated due to issue. Please review."

A good handoff is:

- structured
- evidence-backed
- specific about the unresolved blocker
- actionable for the next operator

## What a Prerequisite Gate Actually Is

A prerequisite gate is a programmatic checkpoint that blocks downstream actions until required evidence is present.

In plain terms:

- the agent may want to call a tool
- the system checks whether the required condition has been satisfied
- if not, the tool call is denied, redirected, or converted into a clarification or escalation flow

That condition might be:

- a verified customer identity
- an approved permission decision
- a validated input payload
- a policy threshold check

## Example: Refund Workflow with Enforcement

This is the canonical exam-style example.

User asks:

> "Refund my last order."

A weak workflow says:

- "Always verify identity before refunding."

A stronger workflow enforces:

```text
1. get_customer
2. verify identity
3. fetch order and refund eligibility
4. only then allow process_refund
5. if any prerequisite fails, branch to clarification or human escalation
```

The important detail is not the wording of the instruction. It is the gate between steps 3 and 4.

## Pseudocode for a Deterministic Gate

```python
state = {
    "customer_id": None,
    "identity_verified": False,
    "eligible_for_refund": False,
}


def can_process_refund(state):
    return (
        state["customer_id"] is not None
        and state["identity_verified"]
        and state["eligible_for_refund"]
    )


def handle_tool_request(tool_name, tool_input, state):
    if tool_name == "process_refund" and not can_process_refund(state):
        return {
            "decision": "deny",
            "reason": "Refunds require verified identity and eligibility confirmation."
        }

    return {"decision": "allow"}
```

This is the essence of Topic 1.4:

- the model can propose the next action
- the workflow gate decides whether that action is allowed yet

## Where Enforcement Lives in the Claude Agent SDK

In current Anthropic SDK docs, the main enforcement mechanisms are:

- hooks, especially `PreToolUse`, for blocking or modifying tool calls before execution
- permission rules and permission modes for declarative control
- `canUseTool` for runtime approval flows when user input is needed

The key ordering matters:

- hooks run first
- then deny rules
- then permission mode
- then allow rules
- then `canUseTool` if still unresolved

That means strict workflow rules should usually be enforced before the model gets to "just try the tool anyway."

## Hooks Matter Here, But Topic 1.4 Is Not Mainly About Hook APIs

This is an important exam distinction.

Topic 1.4 is about:

- deciding that a workflow requires enforcement
- designing the prerequisite logic
- structuring the handoff and escalation path

Topic 1.5 goes deeper into:

- which hook to use
- how to transform tool results
- how to intercept and normalize data in the SDK

So for Topic 1.4, think at the workflow level first.

## Enforcement Patterns You Should Know

### 1. Hard gate

The action is blocked completely unless prerequisites are satisfied.

Example:

- do not allow `process_refund` without verified identity

Use when:

- compliance is mandatory
- risk of incorrect action is high

### 2. Redirected flow

The invalid action is blocked and the workflow is redirected.

Example:

- refund over threshold -> escalate to human approval
- missing identity proof -> ask clarifying question

Use when:

- the task might still continue through an alternate route

### 3. Approval checkpoint

The action pauses until an explicit user or operator decision is returned.

Example:

- sensitive tool request requires approval

Use when:

- the action is valid in some cases but not safe to auto-approve

### 4. Validation checkpoint

The workflow continues only if an intermediate result satisfies required criteria.

Example:

- generated summary must include all required fields before publication

Use when:

- intermediate quality directly affects downstream correctness

## When to Use Parallel Investigation

The exam guide also expects you to recognize when a request contains multiple concerns that should be investigated separately.

Example customer message:

> "My package is late, I was charged twice, and I still cannot update my password."

This is not one issue. It is three issues:

- shipping delay
- billing anomaly
- account access problem

Good workflow:

- split into distinct branches
- investigate each branch in parallel where feasible
- preserve shared identifiers like customer ID and case ID
- synthesize one final response

Bad workflow:

- treat it as one vague support problem
- investigate only the first visible issue
- lose track of the others

## What "Shared Context Before Synthesis" Means

Parallel branches do not mean total independence forever.

The usual shape is:

```text
shared customer context
    ->
branch A investigates billing
branch B investigates shipping
branch C investigates authentication
    ->
all branches return structured findings
    ->
main workflow synthesizes one response
```

Shared context should include only what every branch truly needs, such as:

- customer ID
- order ID
- product or account identifiers
- policy constraints

Do not dump the full transcript into every branch unless it is actually needed.

## What a Good Human Handoff Contains

The exam guide is very explicit here: the human may not have the transcript.

That means the handoff must stand on its own.

At minimum, a strong handoff usually includes:

- customer or case identifier
- brief issue summary
- what the agent already checked
- root cause or leading hypothesis
- actions already taken
- exact blocker or reason for escalation
- recommended next action
- critical evidence, amounts, timestamps, and policy notes

## Example Handoff Template

```json
{
  "case_id": "CS-18472",
  "customer_id": "cust_9182",
  "issue_summary": "Customer requested refund for duplicate charge and reported shipment delay.",
  "findings": [
    {
      "area": "billing",
      "root_cause": "Duplicate settlement detected on the same order.",
      "evidence": "Two successful charges for order 55182 within 3 minutes."
    },
    {
      "area": "shipping",
      "root_cause": "Carrier exception due to address validation hold.",
      "evidence": "Tracking status shows validation hold since 2026-03-22."
    }
  ],
  "actions_taken": [
    "Verified customer identity",
    "Confirmed duplicate charge",
    "Confirmed shipment exception"
  ],
  "blocked_action": "Refund over manager approval threshold",
  "recommended_next_action": "Human support lead should approve refund and contact carrier operations."
}
```

This is effective because the next person can continue immediately without reconstructing the whole conversation.

## Handoff Quality Principles

Good handoffs are:

- concise
- structured
- evidence-based
- explicit about uncertainty
- explicit about what was already attempted
- explicit about what still needs a human decision

Weak handoffs are:

- long narrative transcripts
- vague summaries with no identifiers
- conclusions without evidence
- escalations that do not explain the blocker

## A Full Example Workflow

Imagine this support request:

> "I was charged twice, my shipment is delayed, and I want a refund."

A strong workflow might look like this:

```text
1. classify concerns: billing + shipping + refund
2. fetch shared customer and order context
3. verify identity
4. investigate billing branch in parallel
5. investigate shipping branch in parallel
6. evaluate refund eligibility using the evidence from billing and shipping
7. if refund is allowed within policy, process it
8. if policy threshold or ambiguity blocks auto-resolution, create structured human handoff
9. return unified customer-facing response
```

This example combines:

- routing
- prerequisite enforcement
- parallel investigation
- synthesis
- conditional handoff

That combination is exactly what Topic 1.4 is trying to test.

## Common Failure Modes

### 1. Describing a critical rule only in the prompt

Problem:

- the prompt says "verify identity first," but nothing actually blocks the refund tool

Effect:

- non-zero chance of policy violation

### 2. Treating every request as a single linear issue

Problem:

- the workflow misses that the user asked about multiple independent concerns

Effect:

- shallow or partial resolution

### 3. Serializing work that could be parallel

Problem:

- billing, shipping, and access checks are done one after another even though they are independent

Effect:

- unnecessary latency

### 4. Passing weak state between steps

Problem:

- later steps do not know whether verification actually succeeded

Effect:

- unreliable gates and confused downstream behavior

### 5. Escalating without a structured handoff

Problem:

- the human sees "needs review" with no usable context

Effect:

- the case has to be re-investigated from scratch

### 6. Confusing workflow enforcement with hook mechanics

Problem:

- the implementation jumps straight to hook APIs without first defining the business workflow

Effect:

- technically correct hooks attached to a poorly designed process

## Topic 1.4 vs Topic 1.5

These two topics are intentionally adjacent.

Topic 1.4 is mostly about:

- workflow design
- prerequisite gates
- deterministic enforcement decisions
- parallel branch structure
- escalation and handoff design

Topic 1.5 is mostly about:

- hook points like `PreToolUse` and `PostToolUse`
- intercepting calls and results inside the SDK
- normalization and policy enforcement mechanics

A good way to remember it:

- Topic 1.4 = "What workflow must be enforced, and how does the case move forward or escalate?"
- Topic 1.5 = "Which SDK hook implements that enforcement or transformation?"

## Design Principles to Remember

Strong multi-step workflows are usually:

- explicit about required order
- strict where policy demands certainty
- flexible where independent investigation is useful
- structured in how they preserve state
- disciplined in how they escalate

The main design question is:

- Which steps should Claude decide dynamically, and which transitions must the system enforce deterministically?

That is the heart of Topic 1.4.

## Exam Takeaways

If you remember only a few things for Topic 1.4, remember these:

1. Prompt instructions are useful, but they do not guarantee compliance.
2. Critical prerequisite rules should be enforced programmatically.
3. Fixed sequential workflows often need explicit gates between steps.
4. Multi-concern requests should be decomposed into distinct branches when independence exists.
5. Parallel branches still need shared identifiers and a final synthesis step.
6. Human handoffs must stand on their own because the human may not have the transcript.
7. A good handoff includes identifiers, cause, evidence, actions taken, blocker, and recommended next action.

## Quick Self-Check

You understand Topic 1.4 if you can answer yes to these questions:

- Can I explain the difference between prompt guidance and deterministic enforcement?
- Can I design a prerequisite gate that blocks a forbidden downstream action?
- Can I explain when a request should be routed into multiple parallel investigations?
- Can I describe what shared state parallel branches need before final synthesis?
- Can I produce a structured human handoff summary without relying on the transcript?
- Can I explain the difference between workflow design in Topic 1.4 and hook mechanics in Topic 1.5?

## References

- Anthropic, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, "Control execution with hooks": https://platform.claude.com/docs/en/agent-sdk/hooks
- Anthropic, "Configure permissions": https://platform.claude.com/docs/en/agent-sdk/permissions
- Anthropic, "Handle approvals and user input": https://platform.claude.com/docs/en/agent-sdk/user-input
- Anthropic, "How the agent loop works": https://platform.claude.com/docs/en/agent-sdk/agent-loop
