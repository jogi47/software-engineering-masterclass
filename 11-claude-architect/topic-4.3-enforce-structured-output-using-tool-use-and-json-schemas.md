# Topic 4.3: Enforce Structured Output Using Tool Use and JSON Schemas

This note explains how to make Claude return machine-usable output reliably, how `tool_choice` changes the guarantee level, and how schema design can either reduce or accidentally encourage fabrication. For the exam, Topic 4.3 is not mainly about producing "pretty JSON." It is about designing a workflow where downstream systems can trust the shape of the data, while still recognizing that schema validity is not the same thing as factual correctness.

Topic 4.1 defined the rules. Topic 4.2 used examples to stabilize behavior. Topic 4.3 adds the structural contract that makes the output safer for parsers, pipelines, and application code.

## Why This Topic Matters

Many production workflows break at the boundary between model output and software systems:

- a parser fails because the JSON is malformed
- a required field is missing
- an enum value drifts outside the expected set
- a downstream function receives `"2"` instead of `2`
- an extraction pipeline silently accepts a schema-valid answer that still puts the wrong value in the wrong field

Scenario 6 in the exam guide makes this concrete. A structured extraction system is only useful if the output can be consumed predictably by validators, storage layers, rules engines, or human-review queues.

The exam is testing whether you know how to reduce the first class of failure deterministically and how to design schemas that do not pressure Claude into inventing data just to satisfy the contract.

## What the Exam Is Testing

For Topic 4.3, the exam is usually testing whether you understand these ideas:

- Tool use with JSON schemas is the classic exam-safe way to force schema-shaped output.
- `tool_choice: "auto"` still allows free text, so it is weaker when structure is mandatory.
- `tool_choice: "any"` guarantees that one of the provided tools will be used.
- Forced tool selection guarantees that one specific extraction step runs first.
- Strict schemas are the main mechanism for eliminating syntax-shape problems, but they do not solve semantic mistakes.
- Required, optional, nullable, and enum field choices directly affect extraction quality.
- Open-ended categories often need `"other"` plus a companion detail field.
- Ambiguous cases often need an `"unclear"` value instead of a fabricated guess.

The durable exam skill is:

```text
Choose the right output-control mechanism, then design the schema so the model can abstain safely instead of fabricating.
```

## The Core Mental Model

The simplest correct mental model is:

```text
task
    ->
choose whether free text is acceptable
    ->
define a schema that matches the real information surface
    ->
use tool/output controls that enforce the shape
    ->
validate structure first
    ->
validate meaning separately
```

Another useful way to think about Topic 4.3 is:

```text
prompting improves behavior
few-shot examples improve consistency
schemas constrain structure
validation checks truth and business rules
```

That last boundary matters. A schema can guarantee that `total_amount` is a number field. It cannot guarantee that the number is the right total from the document.

## Current Anthropic Terminology vs Exam Wording

### As of March 2026, Anthropic uses "structured outputs" as the umbrella term

The exam wording centers "tool use and JSON schemas." That is still a valid exam framing, especially for agentic extraction workflows. But current Anthropic docs now separate the space more clearly:

- `JSON outputs` control Claude's final response format through `output_config.format`.
- `strict tool use` validates tool names and tool inputs with `strict: true`.
- Agent SDK structured outputs use `outputFormat` or `output_format` so an agent can use tools across multiple turns and still return validated structured data at the end.

So the current production mapping is:

- if you need Claude's final answer in a validated JSON shape, think `structured outputs` / `JSON outputs`
- if you need Claude to call a tool with guaranteed-valid parameters, think `strict tool use`
- if you need both, combine them

The exam may still present Topic 4.3 as if tool use is the main structured-output mechanism. That is not wrong for exam prep, but current docs are more precise.

### Older material may say "JSON mode"

Some older Anthropic material and some search results still use phrasing like "JSON mode." Current docs use "structured outputs" as the clearer umbrella term. If the exam uses older wording, map it mentally to the newer structured-output surfaces rather than assuming it is a separate feature family.

### The exam-safe answer and the current-doc answer are sometimes different levels of precision

If an exam question asks:

- how to guarantee schema-shaped extraction in an agentic workflow

then tool use plus JSON schema is still a strong answer.

If a current implementation question asks:

- how to get validated JSON back from Claude without inventing a fake extraction tool

then `output_config.format` or Agent SDK structured outputs may be the more precise answer.

The principle is stable even if the interface names evolve:

- do not rely on prose formatting alone when downstream code requires a strict structure

## Why Prompting Alone Is Not Enough

A prompt can say:

- "return valid JSON"
- "use these exact keys"
- "do not add extra fields"

and Claude will often comply.

But "often" is not the same as "safe for automation."

Prompt-only JSON workflows still risk:

- malformed syntax
- missing keys
- unexpected extra fields
- type drift
- wrapper text before or after the JSON

That is why Topic 4.3 exists. Once the output is feeding software, not just a human reader, you need a stronger contract than polite instructions.

## `tool_choice` Determines Whether Free Text Is Still Allowed

This is one of the most important exam details.

Anthropic's tool controls currently work like this:

- `auto`: Claude may call a tool or may answer in text. This is the default when tools are present.
- `any`: Claude must call one of the provided tools, but it can choose which one.
- `tool`: Claude must call one named tool.
- `none`: Claude cannot use tools.

For Topic 4.3, the practical interpretation is:

- use `auto` when structured output is helpful but not mandatory
- use `any` when one of several structured extraction tools must be called
- use `tool` when workflow order depends on a specific extraction step

### Why `auto` is risky for mandatory extraction

If you expose extraction tools but keep `tool_choice: "auto"`, Claude may still answer in natural language when it thinks it already knows enough.

That is fine for chat. It is weak for:

- batch document extraction
- routing into typed application code
- pipelines where free text is an outright failure

If the question is "how do I guarantee structured output?", `auto` is usually not the best answer.

### When `any` is the right exam answer

`tool_choice: "any"` is the right pattern when:

- multiple extraction tools exist
- the model should decide which schema fits the current document
- free-text output is not acceptable

Example:

- `extract_invoice`
- `extract_receipt`
- `extract_contract_metadata`

If the document type is unknown but one structured extraction must happen, `any` is a strong fit.

### When forced tool selection is the right answer

Forced tool selection is the right pattern when order matters.

Example:

1. `extract_metadata`
2. `enrich_with_lookup`
3. `classify_risk`

If metadata extraction must happen before enrichment, forcing `extract_metadata` first is better than hoping the model picks that order on its own.

### Current-doc nuance that is worth knowing

Current Anthropic docs note two details that matter operationally:

- when `tool_choice` is `any` or `tool`, Claude will not emit a natural-language preamble before the `tool_use` block
- with extended thinking, `tool_choice: "any"` and forced `tool` are not supported

Those details are more implementation nuance than exam core, but they matter if you are building the workflow today.

## Schema Design Determines Whether Claude Abstains or Fabricates

The schema does not just control parsing. It teaches Claude what counts as a valid answer surface.

Bad schema design often creates hidden pressure to invent values.

### Required fields should reflect true source expectations

Make a field required when the source really should contain it for the task.

Good examples:

- a parsed issue list requires `title`, `severity`, and `explanation`
- a contact record requires `name` if the task is "extract named contacts only"

Bad example:

- requiring `dosage_mg` when many medical reports do not state the dosage

If the schema says a field is always required but the source often omits it, you are nudging Claude toward fabrication.

### Optional and nullable fields are not the same thing

Use these deliberately:

- optional: the field may be omitted entirely
- nullable: the field is present, but the value may be `null`

In extraction workflows, nullable fields are often easier for downstream systems because they preserve a stable shape while still allowing abstention.

Example:

- `invoice_number: null`

is often easier to handle than:

- no `invoice_number` field at all

That said, current structured-output docs also warn that optional fields and union types increase schema complexity. Use them where they reflect reality, not everywhere by default.

### Enums should support ambiguity and open-ended cases

Closed enums are useful until reality stops fitting the list.

If your schema says:

- `document_type` must be one of `invoice`, `receipt`, `contract`

then a purchase order or a mixed-format document creates pressure to misclassify.

A safer extraction pattern is often:

- known enum values
- `"other"` for open-ended but identifiable cases
- `"unclear"` when the source is ambiguous
- a companion detail field such as `document_type_other`

This preserves structure without forcing false certainty.

### `additionalProperties: false` is often the right default

If downstream code expects a tight contract, allowing extra keys can create drift over time.

Using `additionalProperties: false` helps with:

- parser stability
- contract clarity
- easier evaluation

It is not magic, but it reduces "close enough" outputs that break consumers later.

## Strict Schemas Remove Syntax Errors, Not Meaning Errors

This is the most important conceptual boundary in Topic 4.3.

In a successful structured-output response, a strict schema can guarantee things like:

- valid JSON
- correct field names
- correct primitive types
- required-field presence
- allowed enum values

It cannot guarantee:

- the right invoice date was chosen
- line items sum correctly
- a medication dose was extracted from the correct paragraph
- an issue was classified into the right enum bucket
- a field is grounded in the source rather than a plausible guess

Current Anthropic docs also note two practical exceptions:

- a refusal can take precedence over schema constraints
- a `max_tokens` cutoff can leave the structured output incomplete

So even in a strong Topic 4.3 design, production code should still check the outcome of the call rather than assuming every response is schema-valid automatically.

That is why the exam guide separates Topic 4.3 from Topic 4.4.

Topic 4.3 solves:

- structural validity

Topic 4.4 solves:

- validation, retry, and feedback loops for quality

If an answer says "use a JSON schema, so the extraction will be correct," that answer is incomplete.

## A Strong Extraction Pattern

Here is a practical pattern for Scenario 6 using strict tool use.

```json
{
  "tools": [
    {
      "name": "extract_study_record",
      "description": "Extract study metadata from the provided source. Use null when a field is not directly supported. Use study_type='unclear' when the source is ambiguous. Use study_type='other' only when the source supports a specific type outside the enum and then fill study_type_other.",
      "strict": true,
      "input_schema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "title": { "type": "string" },
          "study_type": {
            "type": "string",
            "enum": ["randomized_trial", "cohort", "case_series", "other", "unclear"]
          },
          "study_type_other": { "type": ["string", "null"] },
          "dosage_mg": { "type": ["number", "null"] },
          "duration_weeks": { "type": ["number", "null"] },
          "evidence": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "field": { "type": "string" },
                "quote": { "type": "string" }
              },
              "required": ["field", "quote"]
            }
          }
        },
        "required": ["title", "study_type", "study_type_other", "dosage_mg", "duration_weeks", "evidence"]
      }
    }
  ],
  "tool_choice": { "type": "tool", "name": "extract_study_record" }
}
```

Why this is stronger than a prompt that says "return JSON":

- the output shape is constrained
- ambiguity has an allowed representation
- missing values can stay `null`
- the extraction includes evidence, which helps later review and validation
- free-text drift is blocked because the workflow forces a tool call

The exact schema will vary by domain. The important part is the design logic, not this one schema.

## When Current Structured Outputs Are More Precise Than a Fake Extraction Tool

The exam often frames Topic 4.3 through tool use. Current Anthropic docs are broader.

In current production work:

- use `JSON outputs` when you need Claude's final response as validated JSON
- use `strict tool use` when Claude must call tools with guaranteed-valid arguments
- use both when Claude must interact with tools during the workflow and still return a validated final object
- use Agent SDK structured outputs when an agent may take many steps, use tools, and then return typed data in `structured_output`

That means a "fake extraction tool" is not always the best modern implementation if no external tool execution is actually needed.

The exam principle still holds:

- stronger structural controls beat prompt-only formatting

But the current interface you choose should match what you actually need to constrain:

- Claude's final answer
- Claude's tool arguments
- or both

## Schemas Should Be Tight, But Not Fragile

A common overcorrection is to make the schema so elaborate that it becomes harder to satisfy than the task itself.

Current Anthropic docs explicitly warn that:

- complex schemas can increase retries or fail validation in the Agent SDK
- strict structured-output schemas can hit complexity limits
- optional fields and union types add compilation cost

So the right design target is not "most detailed schema possible."

It is:

- enough structure for downstream reliability
- enough flexibility for real document variation
- minimal complexity beyond what the task needs

This is another exam-relevant trade-off. Over-constraining can be just as harmful as under-constraining.

## Weak Schema vs Strong Schema Thinking

### Weak extraction design

```text
Return valid JSON with:
- study_type
- dosage_mg
- duration_weeks
- outcome
```

Problems:

- no guarantee that Claude will actually return valid JSON
- no control over missing versus inferred values
- no ambiguity handling
- no allowed abstention path
- no evidence fields

### Stronger extraction design

```text
Use a strict schema with:
- required core fields
- nullable fields for source-dependent values
- enum values that include "other" and "unclear" where needed
- additionalProperties: false
- evidence fields that tie extracted values back to the source
```

That design does not guarantee truth, but it creates a much better contract for validation, review, and downstream processing.

## Implementation or Workflow Guidance

Use this workflow when designing structured-output extraction with Claude:

1. Decide what actually needs a guarantee.
   Is the requirement about final JSON output, tool arguments, or both?
2. Use the strongest relevant control.
   Do not rely on prompt wording alone if downstream code requires structure.
3. Set `tool_choice` deliberately.
   Use `auto` only when free text is acceptable, `any` when one structured tool must be called, and forced `tool` when order matters.
4. Design the schema around source reality, not wishful completeness.
   Make fields required only when the source is expected to support them consistently.
5. Prefer safe abstention paths.
   Use nullable fields and `"unclear"` states so Claude can avoid guessing.
6. Handle open taxonomies explicitly.
   Add `"other"` plus a detail field when categories are not truly closed.
7. Keep the schema tight.
   Use `additionalProperties: false` when contract drift would hurt downstream systems.
8. Keep the schema simple enough to be practical.
   Avoid unnecessary nesting and gratuitous optionality.
9. Add prompt guidance about evidence and non-fabrication.
   The schema controls shape, but the prompt should still say to use `null` when unsupported and not infer absent values.
10. Validate semantics after structure.
   Check totals, ranges, cross-field consistency, and source grounding in a separate step.
11. Evaluate on messy inputs.
   Test documents with missing fields, conflicting evidence, odd formatting, and out-of-taxonomy categories.
12. Treat retry logic as the next layer.
   If structural validation fails, Topic 4.4 patterns apply. If the information is absent, the correct answer may still be `null`.

## Common Mistakes

- Using `tool_choice: "auto"` in a workflow where free-text output is a failure.
- Assuming schema-valid output is automatically factually correct.
- Making fields required even when the source often omits them.
- Omitting `"other"` or `"unclear"` from enums that face real-world ambiguity.
- Forgetting a companion detail field when using `"other"`.
- Designing schemas so complex that they become fragile or hard to satisfy.
- Relying on prompt wording like "return JSON" instead of actual structured-output controls.
- Using a fake extraction tool when current structured outputs would more directly constrain the final response.
- Forgetting that forced tool choice suppresses natural-language preambles before `tool_use`.
- Confusing Topic 4.3 structural enforcement with Topic 4.4 semantic validation and retry logic.

## Exam Takeaways

If you remember only a few things for Topic 4.3, remember these:

1. Topic 4.3 is about enforcing output shape, not just asking politely for JSON.
2. `tool_choice: "auto"` is weaker because Claude may still answer in free text.
3. `tool_choice: "any"` guarantees a tool call but lets Claude choose which tool.
4. Forced tool selection is the right answer when a specific extraction step must run first.
5. Strict schemas eliminate syntax and shape errors, not semantic mistakes.
6. Required versus optional versus nullable is not a formatting detail. It changes whether the model is likely to abstain or fabricate.
7. `"other"` plus a detail field and `"unclear"` are high-value schema patterns for open-ended or ambiguous categories.
8. Current Anthropic docs group this space under "structured outputs," which now includes JSON outputs, strict tool use, and Agent SDK structured outputs.
9. The exam framing is still useful, but current production implementations may use newer interface names than the exam wording.
10. Topic 4.3 gives you a safer structure contract; Topic 4.4 handles retries, validation, and semantic feedback loops.

## Quick Self-Check

You understand Topic 4.3 if you can answer yes to these questions:

- Can I explain why `tool_choice: "auto"` is weaker than `any` or forced `tool` when structured output is mandatory?
- Can I explain the difference between controlling Claude's final JSON response and validating Claude's tool arguments?
- Can I design a schema that uses nullable fields so unsupported values stay missing instead of fabricated?
- Can I explain why `"other"` plus a detail field and `"unclear"` are often better than a brittle closed enum?
- Can I explain why schema compliance does not guarantee semantic correctness?
- Can I explain when the exam-safe answer is "tool use with JSON schemas" and when the current-doc answer is "structured outputs" more broadly?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Structured outputs": https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic, "How to implement tool use": https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
- Anthropic, "Get structured output from agents": https://platform.claude.com/docs/en/agent-sdk/structured-outputs
- Anthropic, "Increase output consistency (JSON mode)": https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency
