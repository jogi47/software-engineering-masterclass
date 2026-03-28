# Topic 4.5: Design Efficient Batch Processing Strategies

This note explains when batch processing is the right architectural choice, how to trade latency for lower cost and higher throughput without missing downstream SLAs, and why efficient batch design starts before the batch is submitted. For the exam, Topic 4.5 is not mainly about knowing that the Message Batches API exists. It is about choosing the right execution mode for the workload, shaping requests so large runs succeed on the first pass, and handling failures surgically instead of rerunning everything.

Topic 4.4 made single-request extraction more reliable. Topic 4.5 is about scaling that work economically once the extraction design is already good enough to run at volume.

## Why This Topic Matters

In production, many Claude workloads are not interactive:

- overnight technical-debt reports
- nightly test-generation jobs
- weekly compliance audits
- bulk document extraction
- large evaluation runs

These jobs usually care more about:

- total throughput
- cost per item
- manageable retry behavior
- finishing before a business deadline

than about immediate per-request latency.

That is exactly the space where batch processing helps.

But the exam is also testing whether you know where batch processing does **not** belong.

If the workflow blocks a merge, a customer interaction, or an approval decision, a cheaper asynchronous path is usually the wrong trade. Efficient batch design is therefore partly a cost topic and partly a systems-judgment topic.

## What the Exam Is Testing

For Topic 4.5, the exam is usually testing whether you understand these ideas:

- The Message Batches API is for asynchronous, latency-tolerant workloads rather than blocking user flows.
- Batch processing trades immediate response time for lower cost and higher throughput.
- Current Anthropic docs say batches usually finish in under an hour, but the exam-safe worst-case planning window is still 24 hours, not "probably fast enough."
- `custom_id` is the key for correlating requests and results because batch output order is not guaranteed.
- Failed items should be diagnosed and resubmitted selectively rather than rerunning the whole dataset.
- Prompt and schema issues should be debugged on a sample set before large-scale submission.
- A strong design accounts for queueing cadence, batch completion time, validation time, and retry headroom against the real downstream SLA.

The durable exam skill is:

```text
use synchronous requests for blocking work, use batches for latency-tolerant work, and design the retry/correlation path before you scale the volume
```

## The Core Mental Model

The simplest correct mental model is:

```text
incoming work
    ->
classify by latency requirement
    ->
if interactive or blocking: synchronous path
if offline or delay-tolerant: batch path
    ->
dry-run a representative sample
    ->
submit independent requests with stable custom_id values
    ->
poll batch status
    ->
download out-of-order results
    ->
map by custom_id
    ->
accept successes
retry only fixable failures
escalate or abstain on non-fixable ones
```

Another useful way to think about Topic 4.5 is:

```text
batch efficiency is not "send everything at once"
batch efficiency is "shape the workload so most items succeed on the first pass and the remaining failures are cheap to isolate"
```

## Current Anthropic Terminology vs Exam Wording

### "Message Batches API" is still the current product name

As of March 26, 2026, Anthropic's current docs still use the name `Message Batches API`. There is no important naming mismatch here. The exam wording is aligned with the current platform terminology.

### The exam's "24-hour processing window" is a planning bound, not a promise of typical latency

Current Anthropic docs say:

- most batches finish in less than 1 hour
- batch results are available when all messages finish or after 24 hours, whichever comes first
- batches expire if processing does not complete within 24 hours

The exam guide compresses that into a simpler architectural rule:

- assume up to a 24-hour batch window
- do not treat batch processing as having a guaranteed low-latency SLA

That is the safer exam answer and the safer production design default. "Usually under an hour" is helpful for expectations. It is not a contractual latency guarantee.

### The exam wording about tool calling needs one important nuance

The local exam guide says the batch API does not support multi-turn tool calling within a single request. Current Anthropic docs also say that any Messages API request can be batched, including:

- tool use
- multi-turn conversations
- beta features

Those statements are not actually contradictory once you separate **request shape** from **runtime loop behavior**.

The practical inference from the current docs is:

- you can batch any self-contained Messages request, including one that contains prior conversation history
- you can batch requests that use server-side features which complete inside one request
- but a batch item is still one asynchronous Messages API request, not an interactive client-side agent loop

So if a batched request ends in a client-side `tool_use` stop reason and needs your application to execute tools and return `tool_result` blocks, that continuation does not happen automatically inside the same batch item. For exam purposes, that is the idea being tested.

### Current docs add a few operational details that the exam may not foreground

Current Anthropic docs also note that:

- Message Batches are not eligible for Zero Data Retention
- results stay downloadable for 29 days after creation
- prompt caching can be combined with batch processing

Those details are useful in real designs, but the core exam judgment is still about latency fit, failure handling, and request correlation.

## When Batch Processing Is The Right Choice

Batch processing is strong when all of these are true:

- the workload is not user-blocking
- individual items are independent
- results can arrive later and out of order
- cost or throughput matters more than per-item latency
- you can tolerate selective reprocessing

Strong fits include:

- nightly code-quality or technical-debt reports
- scheduled repository analysis across many repos
- bulk document extraction for back-office processing
- large-scale eval runs
- moderation or classification of large content backlogs
- backfills over historical data

These workloads benefit from the two main batch advantages emphasized by current docs:

- 50% token-price reduction relative to standard API pricing
- asynchronous high-throughput processing

## When Batch Processing Is The Wrong Choice

Batch processing is weak when the workflow needs an answer before the next business action can happen.

Weak fits include:

- pre-merge checks that gate developer flow
- live support workflows
- approval or escalation decisions that must happen during the current turn
- agent loops that depend on tool feedback between turns
- debugging workflows where humans need to inspect results immediately and iteratively adjust prompts

The exam-safe rule is simple:

```text
if delay blocks the workflow, batch processing is usually the wrong default
```

That is why the exam guide's CI scenario favors batch for overnight analysis but not for merge-blocking review.

## Design The Batch Around The Real SLA

This is one of the most important Topic 4.5 skills.

Many teams hear "24-hour batch window" and immediately think:

- "Our external SLA is 30 hours, so we are fine."

That is incomplete.

The real worst-case latency is closer to:

```text
submission wait time
+ batch processing time
+ result retrieval time
+ validation or post-processing time
+ retry or escalation buffer
```

### A simple planning formula

If new work arrives continuously and you submit a batch every `S` hours, then the worst-case end-to-end time is approximately:

```text
S + batch_completion_budget + downstream_processing + retry_buffer
```

If the only hard number you trust for batch completion is 24 hours, then a 30-hour SLA does **not** mean you should submit once every 24 hours.

It means your submission interval must leave enough headroom for everything after arrival.

### Why the exam guide's 4-hour example is reasonable

Purely mathematically, if you assumed:

- up to 24 hours for the batch
- zero downstream work
- zero retry budget

then a 30-hour SLA would imply a maximum submission interval of 6 hours.

But real systems are not that clean.

You still need time for:

- polling and result retrieval
- validation and routing
- retrying expired or malformed items
- human review for the small tail that still fails

That is why the exam guide's example of 4-hour submission windows is a good operational answer. It preserves headroom instead of spending the entire SLA on the raw batch window.

## Keep Requests Independent And Easy To Reprocess

Efficient batch strategies depend on request independence.

Each item should ideally be processable, diagnosable, and retryable on its own.

That means:

- one document, file, or unit of analysis per request unless chunking is required
- stable inputs that do not depend on another batch item finishing first
- enough metadata in `custom_id` or surrounding storage to reconstruct the original work item

### Use meaningful `custom_id` values

Current docs explicitly recommend meaningful `custom_id` values because results can return in any order.

Weak `custom_id` values:

- `1`
- `2`
- `3`

Stronger `custom_id` values:

- `invoice-00423-pass1`
- `repo-api-gateway-2026-03-26-nightly`
- `resume-screening-candidate-1187-v2`

The goal is not beauty. The goal is cheap diagnosis:

- what item failed?
- which prompt or pass produced it?
- is this an original run or a retry?

### Do not rely on result order

Batch results come back as `.jsonl`, and current docs say the results may not match input order.

That means:

- correlate by `custom_id`
- store results keyed by `custom_id`
- generate retry lists from `custom_id`

not from line number or original array position.

## Dry-Run Before You Scale

This is one of the easiest exam traps.

Batch processing is not where you discover whether your prompt, schema, or request shape is fundamentally broken.

Current Anthropic docs explicitly recommend testing request shapes with the standard Messages API first because batch validation happens asynchronously and you only see validation errors after the batch run ends.

That leads to a strong workflow:

1. Pick a representative sample set.
2. Include easy cases, edge cases, and known troublesome formats.
3. Test with the synchronous Messages API first.
4. Refine the prompt, schema, and chunking strategy until first-pass behavior is acceptable.
5. Only then submit at scale through the Message Batches API.

This is more than a convenience tactic. It is the main way to avoid paying batch-scale costs for a design flaw you could have caught on ten examples.

## Prompt Refinement On A Sample Set Saves Money

The exam guide explicitly calls out prompt refinement before running large batches. The reason is operational, not cosmetic.

If your prompt has a systematic flaw, batch scale amplifies it:

- the same ambiguity hits thousands of items
- the same missing abstention path creates thousands of fabrications
- the same context overload causes repeated failures
- the same schema mismatch forces a mass retry

Batch efficiency therefore starts with first-pass accuracy.

A good sample-set refinement loop usually checks:

- whether the instruction is specific enough
- whether the schema allows `null`, `"unclear"`, or conflict flags where needed
- whether document chunking is necessary
- whether certain document classes need a different prompt or model
- whether the output is reliable enough that retries are an exception rather than the norm

The exam-safe principle is:

```text
debug small, then batch large
```

## Failure Handling Should Be Selective, Not Global

A strong Topic 4.5 design assumes that some requests will fail and plans for that without throwing away the whole run.

Current Anthropic docs describe four result types for batch items:

- `succeeded`
- `errored`
- `canceled`
- `expired`

Current docs surface the batch-wide overview in `request_counts` and the per-item detail in the `.jsonl` results at `results_url`.

This matters because not all failures mean the same thing, and one item failing does not invalidate the rest of the batch.

### Diagnose the failure class first

Examples:

- `errored` because the request was invalid
- `errored` because the platform returned an internal error
- `expired` because the batch hit its 24-hour limit before the request ran
- `succeeded` structurally, but your own validator rejected the content semantically

Each case suggests a different response.

### Good retry logic asks "what changed?"

Weak retry behavior:

- rerun the entire batch
- resubmit unchanged bad inputs repeatedly
- treat every failure as transient

Stronger retry behavior:

- retry only the `custom_id` values that failed
- change the request when the failure cause is understood
- keep already-succeeded items out of the retry path

Examples of appropriate modifications before resubmission:

- chunk a document that was too large
- shorten repeated instructions
- move oversized context into a cached shared prefix when appropriate
- route a hard subset to a different prompt or model
- send semantically failed items through a validation-feedback correction pass

### Example result-processing pattern

```python
for item in stream_jsonl(results_url):
    custom_id = item["custom_id"]
    result = item["result"]

    if result["type"] == "succeeded":
        store_success(custom_id, result["message"])
        continue

    if result["type"] == "errored":
        error = result["error"]
        retry_plan = diagnose_and_adjust(custom_id, error)
        enqueue_retry_if_fixable(custom_id, retry_plan)
        continue

    if result["type"] == "expired":
        enqueue_retry_if_fixable(
            custom_id,
            plan={"reason": "expired", "action": "resubmit_in_next_batch"},
        )
        continue

    if result["type"] == "canceled":
        mark_for_manual_decision(custom_id)
```

The key idea is not the exact code. The key idea is that retries are item-level and cause-aware.

## Tool Use And Multi-Turn Nuance In Batch Workflows

Topic 4.5 often causes confusion because current Anthropic docs say tool use can be included in batched Messages requests, while the exam guide warns that the batch API does not support multi-turn tool calling within a single request.

The clean way to remember this is:

- batched requests can include the same Messages API parameters you would normally send
- but the batch processor is not running a client-side agent loop for you across multiple request-response cycles

So there are two different cases:

### Case 1: Self-contained request behavior

If the request can finish within one Messages call, batching can still make sense.

Examples:

- plain extraction or classification
- summarization
- a request that includes prior conversation history but already has everything it needs
- server-side features that complete within the request lifecycle

### Case 2: Interactive loop behavior

If the workflow needs this pattern:

```text
Claude requests a tool
    ->
your app executes the tool
    ->
your app sends tool_result
    ->
Claude continues reasoning
```

that is not one self-contained batch item anymore. That is a multi-step interactive loop, and the synchronous Messages API or an agent runtime is usually the better fit.

For exam purposes, prefer the simpler statement:

```text
batch requests are for self-contained asynchronous work, not for interactive tool-feedback loops
```

## Prompt Caching Can Improve Batch Economics, But It Is Not A Guarantee

Current Anthropic docs say prompt caching and batch processing can be combined, and they specifically suggest considering the 1-hour cache duration because batch requests may take longer than 5 minutes to process.

That matters when many requests share large repeated context, such as:

- a long policy document
- a shared codebase rubric
- a common extraction instruction block

The important nuance is that cache hits in batch processing are best-effort, not guaranteed. So prompt caching is a helpful optimization, but it does not change the basic Topic 4.5 decision:

- batch because the workload is latency-tolerant
- use caching because many requests share large repeated prefixes

Do not reverse that logic.

## Split Batches For Manageability, Not Just For Size Limits

Current docs say a Message Batch is limited to 100,000 requests or 256 MB, whichever comes first. Those are hard limits, but efficient strategies usually shard earlier for operational reasons.

Reasons to split work into multiple batches:

- easier retry scopes
- easier monitoring
- lower blast radius if one prompt variant is weak
- better separation by document type, repo, customer segment, or pass number
- simpler downstream scheduling

Examples:

- one batch for invoices and one for contracts
- one batch for nightly repo summaries and another for test-generation drafts
- separate first-pass extraction from correction-pass retries

The exam angle here is not "always split." It is "make failure isolation and resubmission cheap."

## Common Mistakes

- Choosing batch processing for merge-blocking or user-blocking workflows just to save money.
- Planning around "most batches finish in under an hour" instead of the safer 24-hour bound.
- Submitting huge runs before validating prompt quality on a representative sample.
- Using meaningless `custom_id` values that make diagnosis and retry expensive.
- Assuming batch results come back in input order.
- Rerunning the whole batch when only a small subset failed.
- Treating every failure as transient instead of diagnosing whether the input or prompt must change.
- Forgetting that a client-side tool-feedback loop is not the same as a self-contained batched request.
- Ignoring downstream validation, human review, or retry time when calculating SLA compliance.

## Exam Takeaways

If you remember only a few things for Topic 4.5, remember these:

1. The Message Batches API is for asynchronous, non-blocking workloads where latency can be traded for lower cost and higher throughput.
2. The exam-safe worst-case planning number is the 24-hour processing window, even though current docs say many batches finish sooner.
3. Use synchronous requests for blocking workflows such as pre-merge checks or live user interactions.
4. `custom_id` is essential because batch results may be returned out of order.
5. Dry-run request shapes with the Messages API before large batch submission because batch validation errors arrive asynchronously.
6. Efficient batch design means high first-pass success rates, not merely large submission size.
7. Retry only failed items, and change the request when the failure cause is understood.
8. Batch requests can include Messages API features, but interactive client-side tool loops do not continue automatically within a single batch item.
9. Submission cadence must be designed against the full downstream SLA, not just raw batch completion time.
10. Splitting work into manageable batches often improves retry isolation and operational control.

## Quick Self-Check

You understand Topic 4.5 if you can answer yes to these questions:

- Can I explain when batch processing is a better fit than synchronous Messages API calls?
- Can I explain why pre-merge checks usually should not move to the Message Batches API?
- Can I calculate how often batches must be submitted to meet a downstream SLA without using the full 24-hour window as my only assumption?
- Can I explain why `custom_id` matters more than result order?
- Can I describe a retry strategy that resubmits only failed items and changes the request when needed?
- Can I explain the difference between batching a self-contained Messages request and running a multi-turn client-side tool loop?
- Can I explain why prompt refinement on a sample set is part of batch efficiency, not an optional extra?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Batch processing": https://platform.claude.com/docs/en/build-with-claude/batch-processing
- Anthropic, "Message Batches API reference": https://platform.claude.com/docs/en/api/messages/batches
- Anthropic, "Pricing": https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic, "How to implement tool use": https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
