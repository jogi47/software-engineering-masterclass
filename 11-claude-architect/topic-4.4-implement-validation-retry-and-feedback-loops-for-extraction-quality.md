# Topic 4.4: Implement Validation, Retry, and Feedback Loops for Extraction Quality

This note explains how to make structured extraction workflows more trustworthy after you already have a valid output shape. For the exam, Topic 4.4 is not mainly about "retry a few times and hope." It is about separating structural validity from semantic correctness, feeding specific validation errors back into the next pass, knowing when retrying cannot help, and turning recurring failures into evaluation data that improves the system over time.

Topic 4.3 made the output machine-parseable. Topic 4.4 is about making that output reliable enough to store, route, and act on.

## Why This Topic Matters

A schema-valid extraction can still be wrong in ways that matter operationally:

- line items do not add up to the extracted total
- a dosage is extracted from the wrong paragraph
- a date lands in the wrong field
- a value is invented because the schema pressured the model to fill something in
- a value is technically present but contradicts another part of the same source

Scenario 6 in the exam guide makes this concrete. A document extraction system does not fail only when JSON is malformed. It also fails when the JSON is clean but semantically untrustworthy.

That is why Topic 4.4 exists as a separate task statement. Structured outputs reduce syntax and schema errors. They do not tell you whether the extracted values are supported by the source, internally consistent, or safe for downstream automation.

## What the Exam Is Testing

For Topic 4.4, the exam is usually testing whether you understand these ideas:

- Retry-with-error-feedback is stronger than blind retry because the next pass sees exactly what failed.
- Retries are useful only when the error is fixable from the provided source.
- Semantic validation is different from schema validation.
- Extraction quality improves fastest when failures are logged in a way that reveals recurring patterns.
- Self-correction works better when the extraction includes fields that make validation possible, such as totals, evidence, or conflict flags.
- A strong system stops retrying when the source does not contain the answer and instead abstains, escalates, or records uncertainty explicitly.

The durable exam skill is:

```text
validate meaning, retry only on fixable errors, and convert recurring failures into better prompts, schemas, and evals
```

## The Core Mental Model

The simplest correct mental model is:

```text
source document
    ->
structured extraction
    ->
semantic validation
    ->
if valid: accept
if fixable: retry with explicit feedback
if not fixable: abstain or escalate
    ->
log failure patterns
    ->
improve prompts, schemas, and evals
```

Another useful way to think about Topic 4.4 is:

```text
Topic 4.3 answers "is the shape valid?"
Topic 4.4 answers "is the content trustworthy enough to use?"
```

That boundary matters a lot in exam questions.

If the problem is malformed JSON or missing required keys, Topic 4.3 is the primary fix.

If the problem is:

- wrong field placement
- unsupported values
- contradictory values
- arithmetic mismatches
- recurring false positives or false extractions

then Topic 4.4 is the primary fix.

## Current Anthropic Terminology vs Exam Wording

### Topic 4.4 maps to a system pattern, not one Anthropic feature name

Current Anthropic docs do not present "validation, retry, and feedback loops" as one single API feature. As of March 26, 2026, the underlying ideas are spread across:

- `structured outputs` and `strict tool use` for output-shape reliability
- prompt-engineering guidance for clearer extraction instructions
- evaluation guidance for defining success criteria and measuring failures
- the evaluator-optimizer pattern in Anthropic's engineering guidance when iterative feedback measurably improves output

The exam compresses these into one task statement because the architectural idea is stable even if the interface names evolve.

### The exam may still foreground tool use, while current docs use "structured outputs" more broadly

The exam guide often frames extraction quality through tool use plus JSON schemas. Current Anthropic docs are broader:

- `JSON outputs` constrain Claude's final response shape
- `strict tool use` validates tool names and tool inputs
- both can be used together in agentic workflows

For Topic 4.4, that means the retry and validation pattern does not depend on one exact interface. The workflow still applies whether the first extraction came from:

- a forced extraction tool
- a strict tool use workflow inside an agent loop
- a structured JSON final response

### "Feedback loop" usually means explicit evaluator feedback, not vague self-critique

Anthropic's engineering guidance describes an evaluator-optimizer pattern where one pass generates and another pass evaluates with feedback in a loop. That maps well to Topic 4.4, but only when the evaluation criteria are clear enough to produce useful correction signals.

The exam-safe principle is:

- specific validation feedback helps
- generic feedback like "improve accuracy" does not

### Current citation support helps grounding, but it does not replace validation design

Current Anthropic docs support document citations, which can improve traceability when answering questions from documents. But as of March 26, 2026, current docs also state that citations cannot be combined with `output_config.format` JSON outputs in the same request.

For extraction systems, that means you often need one of these designs:

- include evidence fields directly in the extraction schema
- run a structured extraction pass first and a citation-oriented review pass second
- use strict tool inputs for extraction and preserve supporting snippets separately

Do not assume that "turn on citations" removes the need for Topic 4.4 validation logic.

## Validation Has Layers

Topic 4.4 becomes easier once you separate the validation layers explicitly.

### 1. Structural validation

This is mostly Topic 4.3 territory:

- valid JSON
- required fields present
- allowed enum values
- correct primitive types

Current Anthropic structured-output controls are designed to solve this layer well.

### 2. Semantic validation

This is the main Topic 4.4 layer:

- do line items sum to the stated total?
- does the extracted currency match the source?
- was the correct dose extracted, or just the nearest number?
- did a date land in `effective_date` instead of `expiration_date`?
- does an extracted category contradict another field?

This layer often requires deterministic code checks, cross-field comparison, or domain rules.

### 3. Source-support validation

This asks whether the value is actually supported by the provided source.

Examples:

- the source never states a dosage, so `dosage_mg` should be `null`
- the provided invoice lacks the attachment where the tax ID appears
- the source is internally contradictory, so the right answer is `conflict_detected: true` rather than a confident guess

This layer is where retry limits matter most. If the source does not contain the answer, retrying cannot create it.

## Design Validators That Produce Actionable Feedback

A strong Topic 4.4 workflow does not just say "validation failed." It produces structured errors that tell the next step what actually went wrong.

Good validation errors usually include:

- the field or fields involved
- the error type
- a human-readable explanation
- whether the error is retryable from the current source

Example:

```json
[
  {
    "field": "stated_total",
    "error_type": "sum_mismatch",
    "message": "stated_total 125.00 does not match calculated_total 123.50 from line items plus tax.",
    "retryable": true
  },
  {
    "field": "shipping_address",
    "error_type": "source_missing",
    "message": "No shipping address is present in the provided document.",
    "retryable": false
  }
]
```

This is much better than:

```text
validation failed
```

because the system can now make an informed decision:

- retry the total
- do not retry the missing address

### Prefer deterministic validators first

Current Anthropic evaluation guidance favors code-based grading when possible because it is faster, more reliable, and more scalable than human or LLM grading alone. The same principle applies here.

Use deterministic validation for checks such as:

- numeric sums and ratios
- date-format normalization
- allowed unit conversions
- enum compatibility
- field presence in evidence tables
- duplicate-key consistency
- contradiction detection between paired fields

Use LLM-based evaluation only when the validation requires judgment that code alone cannot express cleanly, and even then give the evaluator a tight rubric.

### Validation errors should be specific enough to fix, but narrow enough not to reopen the whole task

A weak retry instruction says:

- "The extraction is wrong. Try again."

A stronger instruction says:

- `stated_total` does not match the sum of `line_items`
- `effective_date` appears to contain the signature date instead of the contract effective date
- no source support was found for `dosage_mg`; if unsupported, return `null`

That keeps the correction loop grounded instead of encouraging a full re-guess.

## Retry-With-Error-Feedback Is a Targeted Correction Loop

The classic Topic 4.4 pattern is:

1. Run the initial structured extraction.
2. Validate the result.
3. If validation fails, attach the original source, the failed extraction, and the specific validation errors to a follow-up request.
4. Ask Claude to correct only what the source supports.
5. Revalidate the new output.
6. Stop after a small retry budget or when the remaining failures are non-retryable.

The important part is what goes into the retry. A strong retry request usually contains:

- the original source document again
- the prior extraction
- the exact validation failures
- the same schema or tool contract
- an instruction to use `null`, `unclear`, or a conflict flag when the source does not justify a correction

### Pseudocode pattern

```python
MAX_RETRIES = 2

extraction = extract(document)

for attempt in range(MAX_RETRIES + 1):
    errors = validate(extraction)

    if not errors:
        return extraction

    retryable_errors = [e for e in errors if e["retryable"]]

    if not retryable_errors or attempt == MAX_RETRIES:
        return escalate_or_abstain(
            document=document,
            extraction=extraction,
            errors=errors,
        )

    extraction = extract(
        document=document,
        previous_extraction=extraction,
        validation_errors=retryable_errors,
        correction_instruction=(
            "Re-read the source. Correct fields only when the document supports a correction. "
            "If the value is absent or ambiguous, return null or unclear instead of guessing."
        ),
    )
```

This is the core Topic 4.4 pattern:

- validate
- retry selectively
- stop deliberately

### A strong retry prompt pattern

```text
<task>
Correct the structured extraction using the source document.
</task>

<rules>
- Keep the same schema.
- Re-read the source before changing any field.
- Correct only the fields implicated by the validation errors.
- If the source does not support a value, return null or "unclear" instead of guessing.
- If the source is internally inconsistent, set conflict_detected to true and preserve the conflicting evidence.
</rules>

<source_document>
{{document}}
</source_document>

<previous_extraction>
{{failed_extraction}}
</previous_extraction>

<validation_errors>
{{structured_validation_errors}}
</validation_errors>
```

Why this works better than a generic retry:

- the source remains the authority
- the model sees what it produced before
- the model sees exactly what failed
- the retry is constrained toward correction rather than reinvention

## When Retry Helps and When It Is Pointless

This is one of the most exam-relevant distinctions in Topic 4.4.

Retries help when the error is fixable from the material already in context.

### Good retry candidates

- The value is present, but Claude mapped it to the wrong field.
- A non-standard table or paragraph layout caused a missed extraction.
- A normalization step failed, such as extracting `"12 March 2026"` but returning the wrong canonical date.
- A total does not match because Claude copied the subtotal instead of the final amount.
- Two plausible values were present and the model chose the wrong one, but the source itself is sufficient to resolve the ambiguity.

### Bad retry candidates

- The source never states the missing value.
- The required information exists only in an attachment or external record that was not provided.
- The source image or OCR is too poor to read reliably.
- The source is internally contradictory and no rule exists to resolve the contradiction.
- The requested field requires outside business context or world knowledge rather than extraction.

The durable exam shortcut is:

```text
Retry when the source can correct the mistake.
Abstain or escalate when the source cannot.
```

If an exam answer recommends repeated retries for a source that simply lacks the needed data, that answer is weak.

## Design The Extraction So It Can Be Checked

Some extractions are hard to validate because the schema gives you no hooks for validation. Topic 4.4 rewards designs that make self-correction possible.

### Add paired fields for cross-checking

Examples:

- `stated_total` and `calculated_total`
- `document_date` and `signature_date`
- `normalized_status` and `raw_status_text`
- `dosage_mg` and `dosage_text_span`

These pairs let downstream code verify whether the cleaned value still maps back to the raw evidence.

### Add explicit conflict markers

Fields such as these are high value:

- `conflict_detected`
- `conflict_summary`
- `source_missing_fields`

These fields give the model a valid way to report unresolved source problems without fabricating certainty.

### Add evidence fields

Evidence fields help both human review and automated validation.

Example:

```json
{
  "invoice_number": "INV-1042",
  "stated_total": 125.00,
  "calculated_total": 123.50,
  "conflict_detected": true,
  "evidence": [
    {
      "field": "stated_total",
      "quote": "Total Due: $125.00"
    },
    {
      "field": "line_items",
      "quote": "Subtotal $118.50, Tax $5.00"
    }
  ]
}
```

This design makes the failure legible:

- the extracted number is visible
- the evidence is visible
- the conflict is visible

### Add `detected_pattern` or equivalent analysis fields

The exam guide explicitly mentions `detected_pattern`. The deeper reason is operational: if people keep dismissing or correcting outputs from the same pattern, you need a way to group those failures.

Examples:

- `table_footer_total`
- `inline_measurement_phrase`
- `signature_block_date`
- `header_metadata_guess`

`detected_pattern` is not a truth guarantee. It is instrumentation. It helps you answer questions like:

- Which document layouts are causing the most retries?
- Which patterns produce the most human dismissals?
- Which edge cases should be added to the eval set next?

That is the "feedback loop" part of Topic 4.4.

## Feedback Loops Should Improve The System, Not Just The Current Document

A mature extraction pipeline does not stop at one corrected response. It records what failed and uses that information to improve the next version of the workflow.

Useful things to log include:

- document type
- prompt version
- schema version
- model version
- validation error types
- retry count
- whether retry succeeded
- `detected_pattern`
- human override or dismissal reason

Once that exists, you can start doing higher-value work:

- cluster recurring failures by pattern
- identify which errors are mostly retryable versus mostly source-missing
- add new few-shot examples for the layouts that fail often
- adjust the schema so unsupported values can stay `null`
- tighten validators where they are too weak
- promote recurring failures into a standing eval set

Current Anthropic evaluation guidance emphasizes task-specific evaluation with real edge cases. Topic 4.4 is where those edge cases often come from in the first place: actual production failures.

## A Practical Quality-Improvement Loop

Here is a strong exam-safe improvement cycle:

1. Start with a structured extraction schema that allows abstention.
2. Add deterministic semantic validators.
3. Retry only when the validation error is fixable from the provided source.
4. Escalate or mark uncertainty when the source is insufficient.
5. Log error types, retry outcomes, and detected patterns.
6. Convert common failures into eval cases.
7. Improve prompts, examples, validators, or schema based on those eval failures.
8. Measure whether the change reduced the actual error pattern instead of assuming it did.

This is one of the cleanest places where prompt engineering and evaluation connect directly.

## Human Review And Stop Conditions Still Matter

Topic 4.4 is not an excuse to build an unbounded correction loop.

Good production safeguards include:

- a small retry budget such as 1-2 correction attempts
- a non-retryable classification for source-missing cases
- escalation when conflicts remain unresolved
- preserving the original source, failed extraction, and validation record for review

Anthropic's engineering guidance for agents emphasizes ground truth, feedback, and stop conditions. That applies here directly. A retry loop without stopping rules is not robustness. It is uncontrolled cost and drift.

## Weak Loop vs Strong Loop Thinking

### Weak extraction quality loop

```text
Extract data.
If it looks wrong, retry up to 5 times.
If it still looks wrong, maybe ask a human.
```

Problems:

- no distinction between retryable and non-retryable failures
- no structured validation criteria
- no explicit feedback to guide correction
- no learning signal for future prompt or schema improvements

### Stronger extraction quality loop

```text
Extract with structured outputs.
Run deterministic semantic validators.
Classify errors as retryable or non-retryable.
Retry with the original source, prior extraction, and exact validation failures.
Stop after a small retry budget.
Escalate unresolved or source-missing cases.
Log patterns and convert recurring failures into eval cases.
```

The stronger version is not just "more robust." It is more diagnosable, cheaper to improve, and easier to justify in an exam scenario.

## Common Mistakes

- Treating schema compliance as if it proves semantic correctness.
- Retrying without telling Claude what failed.
- Retrying when the source simply does not contain the information.
- Returning guessed values instead of `null`, `unclear`, or a conflict marker.
- Designing a schema with no evidence, raw-value, or cross-check fields, making validation harder than it needs to be.
- Logging retries but not logging error types or detected patterns, so the system never gets better systematically.
- Using broad human review for everything instead of deterministic checks for arithmetic, normalization, and other codable rules.
- Leaving retry loops unbounded, which increases cost and can compound errors.
- Confusing a model-confidence statement with a real validation signal.
- Forgetting that current Anthropic docs separate structured outputs, evaluations, and prompt-improvement techniques instead of packaging Topic 4.4 as one feature.
- Assuming current citation support removes the need for validation design in structured extraction workflows.

## Exam Takeaways

If you remember only a few things for Topic 4.4, remember these:

1. Topic 4.4 is about semantic quality and correction loops, not basic JSON validity.
2. Retry-with-error-feedback is stronger than blind retry because the model sees the exact validation failures.
3. A retry should usually include the original source, the failed extraction, and specific error messages.
4. Retry only when the source can actually resolve the mistake.
5. If the source lacks the answer, the right move is usually `null`, `unclear`, `conflict_detected`, or human escalation, not more retries.
6. Deterministic validators should handle as much as possible before you reach for human or LLM-based review.
7. Self-correction works better when the schema includes checkable fields such as `stated_total`, `calculated_total`, evidence fields, and conflict markers.
8. `detected_pattern` is valuable because it turns repeated failures into analyzable patterns instead of one-off anecdotes.
9. Current Anthropic docs distribute this topic across structured outputs, evaluation guidance, and evaluator-optimizer style workflows rather than one single "validation loop" feature.
10. Topic 4.3 gives you the structure contract; Topic 4.4 tells you whether the structured content is trustworthy enough to use.

## Quick Self-Check

You understand Topic 4.4 if you can answer yes to these questions:

- Can I explain the difference between schema validation and semantic validation clearly?
- Can I design a retry request that includes the original source, the failed extraction, and field-specific validation errors?
- Can I explain why some validation failures are retryable and others are not?
- Can I design an extraction schema that includes evidence or paired fields to make downstream validation easier?
- Can I explain why `detected_pattern` helps improve the system over time, not just one extraction?
- Can I describe when the right answer is to abstain or escalate instead of retrying again?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Structured outputs": https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic, "How to implement tool use": https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
- Anthropic, "Define success criteria and build evaluations": https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- Anthropic, "Increase output consistency": https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- Anthropic, "Citations": https://platform.claude.com/docs/en/build-with-claude/citations
- Anthropic Engineering, "Building Effective AI Agents": https://www.anthropic.com/engineering/building-effective-agents
