# Topic 5.3: Implement Error Propagation Strategies Across Multi-Agent Systems

This note explains how failures should travel through a multi-agent Claude system so the coordinator can recover intelligently, preserve partial progress, and tell the truth about what the system did and did not complete. For the exam, Topic 5.3 is not mainly about catching exceptions or retrying everything. It is about turning subagent failures into usable coordination state.

Topic 2.2 focused on structured error responses for tools. Topic 5.3 moves one level up: once a subagent hits a tool problem, access problem, or dead end, what should it send back so the coordinator can decide whether to retry, reroute, ask for input, escalate, or finish with explicit gaps?

## Why This Topic Matters

Multi-agent systems fail differently from single-agent systems.

In a single-agent workflow, a tool failure is often just one local problem. In a multi-agent workflow, that same failure can distort the coordinator's picture of the entire task unless it is propagated clearly.

If failures are suppressed:

- the coordinator may synthesize an answer as if coverage were complete
- downstream agents may treat missing evidence as evidence of absence
- humans may receive a polished answer that quietly omitted blocked branches

If every failure aborts the whole workflow:

- useful partial results are discarded
- transient branch failures destroy successful work from other branches
- the system escalates too often and loses the value of parallelism

This matters directly in the exam scenarios:

- In Scenario 1, a support coordinator may verify the customer and order successfully but fail to reach a refund backend. The system should preserve verified facts, communicate what was attempted, and escalate or retry intelligently.
- In Scenario 3, a research coordinator may get strong findings from some subagents while others hit access issues or source outages. The final report should preserve what was found and annotate what coverage is missing.

Anthropic's June 13, 2025 engineering post on their multi-agent research system reinforces the same production lesson: agents are stateful, errors compound, and restart-from-scratch is often the wrong default. Their write-up emphasizes resumability, checkpoints, observability, and letting agents adapt when tools fail rather than hiding those failures.

## What the Exam Is Testing

For Topic 5.3, the exam is usually testing whether you understand these ideas:

- subagent failures should be returned as structured outcome context, not vague prose like `research failed`
- valid empty results are different from access failures, tool failures, and permission denials
- transient failures should usually trigger bounded local recovery before coordinator-level escalation
- partial progress should be preserved and propagated upward
- the coordinator should decide based on failure type and workflow impact, not only on whether a branch "succeeded"
- silent suppression and whole-workflow termination are both weak defaults
- final synthesis should disclose coverage gaps when some branches could not complete

The durable exam skill is:

```text
propagate enough structured failure context upward so the coordinator can make the next decision without pretending the branch either fully succeeded or fully disappeared
```

## Current Anthropic Terminology vs Exam Wording

### The exam may still say `Task`; current SDK docs say `Agent`

As of March 26, 2026, current Anthropic Agent SDK docs describe subagent invocation through the `Agent` tool and the `agents` parameter. Older exam wording and some Claude Code compatibility surfaces still use `Task`.

For Topic 5.3, the safe exam interpretation is:

- `Task` in exam wording maps to current `Agent`-tool-based subagent invocation
- if you are thinking about error propagation, think "subagent result returned through the `Agent` tool result"

Important current nuance from Anthropic's docs:

- current SDK releases emit `Agent` in `tool_use` blocks
- some compatibility surfaces still mention `Task`

That terminology mismatch matters because exam answers should reflect the concept, while real implementations should use the current interface language.

### The parent does not automatically see the subagent's full trace

Current Anthropic subagent docs make a crucial point: a subagent runs in its own fresh conversation, and the parent receives the subagent's final message as the `Agent` tool result. The parent does not automatically inherit the subagent's whole conversation history or intermediate tool results.

That means Topic 5.3 is fundamentally about explicit propagation.

If a subagent encounters:

- a timeout
- an access denial
- a partial document set
- a blocked workflow step

the coordinator will only know about those details if the subagent includes them in its returned result.

### Runtime approval and business failure are different layers

Current Anthropic docs separate runtime control mechanisms such as:

- `canUseTool`
- allow and deny rules
- hooks

from application-level business routing such as support escalation or alternate workflows.

For Topic 5.3, a permission denial can be one failure type that gets propagated upward, but it is not the whole topic. The coordinator still needs enough context to decide whether the next move is:

- retry later
- ask the user for input
- reroute to another branch
- escalate to a human
- finish with an explicit limitation note

## The Core Mental Model

The simplest correct mental model is:

```text
tool or access problem happens inside a subagent
    ->
subagent classifies the problem and attempts bounded local recovery
    ->
if unresolved, subagent returns a structured outcome packet with:
    failure type + attempted actions + partial results + impact on coverage
    ->
coordinator decides whether to retry, reroute, ask, escalate, or finalize with gaps
    ->
final answer preserves successful work and names missing coverage honestly
```

Another useful way to remember Topic 5.3 is:

```text
silent suppression loses truth
whole-workflow abort loses value
structured propagation preserves both truth and progress
```

There are usually three outcome classes that should stay distinct:

| Outcome class | Meaning | Typical coordinator reaction |
| --- | --- | --- |
| `success` | The branch completed with usable output | incorporate result |
| `success_empty` | The branch completed correctly but found no matches or no evidence | broaden search, accept no-match, or mark as empty coverage |
| `partial_failure` or `failed` | The branch could not complete fully | inspect failure type, partial progress, retryability, and impact |

That middle case is easy to miss. A search that ran successfully and found nothing is not the same as a search tool that could not run.

## Implementation and Workflow Guidance

### 1. Give every subagent a stable outcome envelope

Do not make the coordinator reverse-engineer failure state from freeform prose.

A strong pattern is for every subagent to return the same top-level structure whether it succeeds, finds nothing, or fails partially:

```yaml
subagent_result:
  task_id: research-internal-pricing-policy
  status: partial_failure
  summary: Found the public pricing policy, but could not access the internal exception document.
  attempted_actions:
    - searched the policy wiki
    - fetched the public pricing page
    - attempted internal drive access twice
  partial_results:
    public_policy_url: https://example.com/pricing-policy
    key_facts:
      - Standard price adjustments are allowed within 14 days
      - No public rule mentions competitor matching
  failure:
    category: permission
    stage: source_access
    retryable: false
    message: Internal drive connector denied access to the exception-policy folder
  coverage_impact:
    missing_scope:
      - internal exception handling policy
    blocks_final_answer: false
  suggested_next_actions:
    - ask user for access
    - escalate policy exception handling
    - answer with explicit gap note
```

The exact field names can vary. The point is not this exact schema.

The point is that the coordinator should not have to guess:

- what failed
- what was attempted
- what still succeeded
- whether retrying makes sense
- whether the missing branch blocks the whole workflow

### 2. Keep empty results separate from failed access

This is one of the clearest exam traps.

These are not the same:

- "The search completed and found zero matching documents."
- "The search could not run because the source was unavailable."
- "The search was blocked because the agent lacked access."

Those states imply different next actions.

| Branch result | What it means | Better next move |
| --- | --- | --- |
| `success_empty` | The branch ran correctly and found nothing | widen scope, try a different source, or report no matches |
| `transient_failure` | The branch could not complete because of a temporary outage or timeout | bounded retry or alternate source |
| `permission_failure` | The branch was blocked by access limits | ask for approval, reroute, or escalate |
| `validation_failure` | The branch received bad or incomplete input | repair input or ask a clarifying question |

If you collapse all four into `failed`, the coordinator loses the ability to behave intelligently.

### 3. Recover locally from transient failures before escalating

The outline explicitly tests this.

A subagent should usually try bounded local recovery when the failure is likely transient, such as:

- rate limiting
- temporary source outages
- short-lived network failures
- intermittent MCP or backend unavailability

Good local recovery usually means:

- use small retry limits
- include backoff or alternate source selection
- stop once the branch is no longer making progress
- return what was attempted if recovery fails

Weak pattern:

- first timeout -> immediately bubble failure upward with no context

Also weak:

- infinite or excessive retries that waste turns and hide the fact that the branch is stalled

The exam-safe principle is:

```text
recover locally when the branch still has a plausible self-healing path
escalate upward when the branch no longer has one
```

### 4. Preserve partial progress explicitly

If a branch fails after doing useful work, that work should not disappear.

For research systems, partial progress may include:

- sources already checked
- citations already collected
- extracted facts with provenance
- artifact references to saved notes or reports

For support systems, partial progress may include:

- verified customer identity
- confirmed order ID
- refund amount or policy window already established
- actions already attempted in backend systems

This matters because many multi-agent workflows are partially blocking, not fully blocking.

Example:

- a subagent successfully verified the customer and order
- the refund execution step then hit a permission-controlled backend

The correct propagated result is not:

- `refund workflow failed`

It is closer to:

- identity verified
- order verified
- refund action not executed
- reason: approval or access boundary
- recommended next action: escalate or request authorization

That preserves value and shortens the next step.

### 5. Teach the coordinator to reason over impact, not only error count

Not every branch failure matters equally.

A coordinator should reason about whether the failure is:

- a blocked prerequisite
- a missing optional branch
- a coverage reduction that still permits a qualified answer
- a fatal error that invalidates the whole synthesis

In Scenario 1, failure to verify the customer may block everything.

In Scenario 3, failure to access one secondary source may reduce completeness without blocking a useful answer, as long as the final report names the gap.

A practical coordinator policy often looks like this:

```text
if the failed branch blocks a required prerequisite -> escalate, clarify, or pause
if the failed branch is retryable and important -> retry or reroute
if the failed branch is non-blocking but reduces coverage -> continue and annotate the gap
if enough branches failed that synthesis quality is no longer trustworthy -> stop pretending and escalate
```

This is the main judgment Topic 5.3 is testing.

### 6. Make coverage gaps visible in the final synthesis

If some branches were unavailable, the final answer should say so clearly.

This is especially important in research and analytics workflows, where the most dangerous failure mode is often false completeness.

A strong final synthesis often includes a short limitation block such as:

```text
Coverage note:
- Public sources and the uploaded contract were reviewed successfully.
- The internal pricing-exception folder could not be accessed.
- Conclusions about standard refund policy are high-confidence.
- Conclusions about exception handling remain incomplete and require human review or additional access.
```

That kind of annotation is much stronger than:

- saying nothing about the missing branch
- collapsing the whole report into `Unable to complete task`

### 7. Store large partial outputs outside the coordinator's main prompt when needed

Anthropic's engineering guidance on multi-agent systems notes that artifact-based handoffs can reduce the "game of telephone." That applies to failure propagation too.

If a subagent already produced:

- a draft report
- a structured extraction table
- a list of verified sources

then a later failure should not force you to squeeze all of that detail through a short failure string. A better pattern is:

- save the artifact externally
- return a lightweight reference plus the failure envelope
- let the coordinator decide whether to use the artifact now or later

This preserves fidelity without bloating the main context.

### 8. Add checkpoints and traces so recovery is possible after interruption

Anthropic's research-system post is explicit that agents are stateful, errors compound, and restart-from-scratch is a poor default for long tasks.

For Topic 5.3, that means a production-friendly system often checkpoints:

- completed branches
- pending branches
- branch outcome envelopes
- important artifacts
- coordinator decisions already made

Without those checkpoints, a transient infrastructure failure can destroy successful subagent work and make propagation moot because there is nothing durable left to propagate.

### 9. Use current runtime controls to enrich propagated failures when relevant

Current Anthropic SDK docs give you several runtime control points:

- hooks
- allow and deny rules
- `canUseTool`
- `AskUserQuestion`

These do not replace Topic 5.3, but they can feed it.

Examples:

- a `canUseTool` denial can become a propagated `permission` failure with a specific reason
- a hook can attach additional context about why a tool was blocked
- a missing identifier can be converted into a user-question path instead of a fake "tool failure"

The exam is not asking you to memorize every interface detail. It is asking you to recognize that the coordinator needs actionable failure context, whatever runtime layer generated it.

## A Practical Coordinator Contract

One useful way to design Topic 5.3 systems is to normalize all branch outcomes into a coordinator-facing contract.

```json
{
  "branch_id": "support-refund-resolution",
  "status": "partial_failure",
  "blocking_level": "required_for_resolution",
  "attempted_actions": [
    "get_customer",
    "lookup_order",
    "process_refund"
  ],
  "completed_actions": [
    "get_customer",
    "lookup_order"
  ],
  "partial_results": {
    "customer_id": "C-18427",
    "order_id": "O-99152",
    "refund_amount_usd": 84.99
  },
  "failure": {
    "category": "permission",
    "retryable": false,
    "stage": "refund_execution",
    "message": "Refund tool requires elevated approval above standard threshold"
  },
  "next_options": [
    "request approval",
    "escalate to human",
    "explain policy boundary to customer"
  ]
}
```

This lets the coordinator apply clear routing logic:

```python
if result.status == "success":
    incorporate(result)
elif result.status == "success_empty":
    mark_empty_coverage(result)
elif result.failure["category"] == "transient" and result.failure["retryable"]:
    retry_or_reroute(result)
elif result.blocking_level == "required_for_resolution":
    escalate_or_ask_user(result)
else:
    synthesize_with_gap_annotation(result)
```

Again, the exact code is not the point.

The exam point is:

- normalize branch outcomes
- preserve partial state
- route from explicit failure metadata instead of vibes

## Topic 5.3 vs Topic 2.2 and Topic 5.2

These topics are adjacent, but they are not identical.

### Topic 2.2

Topic 2.2 is about tool-level error contracts.

Question:

```text
How should a tool expose its own failure so the model can reason about it?
```

### Topic 5.3

Topic 5.3 is about orchestration-level failure propagation.

Question:

```text
Once a subagent branch hits a problem, what should travel back to the coordinator so the workflow can recover correctly?
```

### Topic 5.2

Topic 5.2 is about the routing boundary among resolve, clarify, and escalate.

Question:

```text
When should the system keep going, ask a question, or hand the case off?
```

Topic 5.3 supplies the structured branch outcome that makes Topic 5.2 decisions possible.

## Common Mistakes

### 1. Returning generic failure labels like `research failed`

Problem:

- the coordinator cannot tell whether the branch timed out, found nothing, lacked access, or hit a policy boundary

Effect:

- poor recovery decisions and low-trust final synthesis

### 2. Treating empty results as failures

Problem:

- successful no-match states get routed like outages or access denials

Effect:

- wasted retries, unnecessary escalation, and confused synthesis

### 3. Silently suppressing branch failures

Problem:

- the coordinator answers as if a branch completed when it actually vanished

Effect:

- false completeness and hidden coverage gaps

### 4. Aborting the entire workflow on every branch failure

Problem:

- one non-critical failure destroys successful work from other branches

Effect:

- multi-agent parallelism loses most of its value

### 5. Escalating transient failures too early

Problem:

- the branch had a plausible local recovery path, but the subagent never tried it

Effect:

- excess escalations and slower workflows

### 6. Retrying forever without surfacing what was attempted

Problem:

- the branch burns turns while hiding the fact that it is stuck

Effect:

- noisy transcripts and no useful coordinator decision point

### 7. Dropping partial progress when a later step fails

Problem:

- verified facts, useful citations, or completed sub-steps disappear behind a final error message

Effect:

- duplicate work and slower recovery

### 8. Assuming the coordinator can inspect the subagent's whole internal trace

Problem:

- the subagent returns only a vague summary, expecting the parent to reconstruct the details

Effect:

- the coordinator lacks the exact context needed for recovery

### 9. Hiding missing coverage in the final answer

Problem:

- the output sounds complete even though some branches failed or sources were inaccessible

Effect:

- overconfident answers and weak human handoff

## Design Principles to Remember

- Classify branch outcomes explicitly.
- Preserve partial progress whenever possible.
- Keep empty, blocked, and failed states separate.
- Recover locally from transient issues before escalating upward.
- Make the coordinator reason about impact on the overall workflow.
- Surface coverage gaps honestly in the final synthesis.
- Checkpoint enough state that recovery does not require full restart.

## Exam Takeaways

If you remember only a few things for Topic 5.3, remember these:

1. Topic 5.3 is about coordinator-visible failure context, not just tool exceptions.
2. A subagent should return failure type, attempted actions, partial results, and impact on coverage.
3. Successful empty results are not the same as access failures or execution failures.
4. Transient failures usually deserve bounded local recovery before coordinator escalation.
5. Silent suppression and whole-workflow abort are both poor defaults.
6. The coordinator should decide based on whether the failure blocks prerequisites, reduces coverage, or is fatal.
7. Final synthesis should annotate missing coverage when some branches were unavailable.
8. Current Anthropic docs use the `Agent` tool for subagents, even if older exam wording still says `Task`.
9. Because subagents run in isolated contexts, failure details must be returned explicitly; the parent does not automatically see the subagent's full trace.

## Quick Self-Check

You understand Topic 5.3 if you can answer yes to these questions:

- Can I explain why tool-level error structure by itself is not enough in a multi-agent system?
- Can I distinguish a valid empty branch result from an access failure or transient outage?
- Can I describe what failure metadata a subagent should send back to a coordinator?
- Can I explain when a subagent should retry locally versus escalate upward?
- Can I identify which branch failures should block the entire workflow and which should only reduce coverage?
- Can I design a final answer that preserves useful work while explicitly naming missing coverage?
- Can I explain why the coordinator cannot rely on automatically seeing the subagent's full internal trace?
- Can I connect older exam wording like `Task` to current Anthropic `Agent` terminology without confusing the underlying concept?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Subagents in the SDK": https://platform.claude.com/docs/en/agent-sdk/subagents
- Anthropic, "Handle approvals and user input": https://platform.claude.com/docs/en/agent-sdk/user-input
- Anthropic, "Configure permissions": https://platform.claude.com/docs/en/agent-sdk/permissions
- Anthropic, "Intercept and control agent behavior with hooks": https://platform.claude.com/docs/en/agent-sdk/hooks
- Anthropic Engineering, "How we built our multi-agent research system" (June 13, 2025): https://www.anthropic.com/engineering/multi-agent-research-system
