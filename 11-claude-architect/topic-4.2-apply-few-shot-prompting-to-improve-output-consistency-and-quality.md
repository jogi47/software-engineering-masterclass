# Topic 4.2: Apply Few-Shot Prompting to Improve Output Consistency and Quality

This note explains when few-shot prompting is the right fix for unstable Claude output and how to use it without turning prompts into a long example dump. For the exam, Topic 4.2 is not mainly about adding more tokens. It is about adding the right examples so Claude learns the decision boundary, the output shape, and the correct handling of ambiguous or incomplete inputs.

Topic 4.1 was about writing the policy clearly. Topic 4.2 is about teaching Claude how to apply that policy consistently when prose instructions alone still leave room for drift.

## Why This Topic Matters

Many production prompt failures are not caused by a missing instruction. They happen because the instruction is still too abstract at the point where judgment is required.

That shows up in predictable ways:

- output format drifts between runs even though the prompt describes the format
- severity labels wobble between similar cases
- acceptable local code patterns get reported as bugs in CI review
- extraction workflows return empty fields for unusual document layouts
- extraction workflows fabricate values because the prompt never showed when to return `null`, `unclear`, or "not found"

Few-shot prompting helps because it replaces abstraction with precedent.

Instead of only saying:

- what a real issue looks like
- what a non-issue looks like
- what a valid extraction looks like
- what to do when the source is ambiguous

you show those cases directly.

For the exam, this matters most in two scenarios:

- Scenario 5: Claude Code for CI/CD, where the goal is higher-signal review output
- Scenario 6: Structured data extraction, where the goal is more reliable extraction across messy inputs

## What the Exam Is Testing

For Topic 4.2, the exam is usually testing whether you understand these ideas:

- Few-shot examples are often the best next step when detailed instructions still produce inconsistent output.
- Examples should teach ambiguous-case handling, not only output formatting.
- Good example sets help Claude generalize to new cases instead of matching one exact pattern mechanically.
- In code review, examples can distinguish acceptable local patterns from genuine defects and reduce false positives.
- In extraction, examples can show how to handle varied source formats and when missing data should stay missing.
- Few-shot prompting improves consistency, but it does not guarantee schema compliance. That is the Topic 4.3 boundary.
- Few-shot prompting is a prompt-design technique, not a replacement for weak tool descriptions, missing evaluation, or deterministic validation.

The durable exam skill is:

```text
When the rule is known but the application of the rule is unstable, add targeted examples that show the boundary in action.
```

## The Core Mental Model

The simplest correct mental model is:

```text
criteria define the rule
    +
few-shot examples show the rule on hard cases
    +
evaluation checks whether the examples actually improved behavior
    ->
more stable output
```

Another useful way to think about Topic 4.2 is:

```text
instructions tell Claude what you want
examples show Claude what that looks like
```

That distinction matters because many failures happen after the instructions are already fairly clear.

Example:

- Topic 4.1 prompt: "Report actionable correctness and security issues only."
- Topic 4.2 addition: one example that shows an acceptable local framework pattern returning no finding, and one example that shows a genuine authorization gap returning a `high` severity finding.

The examples do not replace the rule. They anchor the rule at the places where the model was still guessing.

## Current Anthropic Terminology vs Exam Wording

### The exam says "few-shot prompting"; current Anthropic docs often say "use examples effectively"

Current Anthropic prompt-engineering docs still explicitly describe this technique as "few-shot or multishot prompting," but the broader guidance is organized under "Prompting best practices" and the section name "Use examples effectively."

So if the exam says:

- few-shot prompting

and the current docs say:

- use examples effectively
- few-shot or multishot prompting

that is the same underlying concept.

### The current docs recommend 3-5 examples; the exam guide often frames 2-4 targeted examples

This is not a real contradiction.

The current Anthropic docs say 3-5 relevant, diverse examples usually work best. The local exam guide frames the skill more narrowly as creating 2-4 targeted examples for ambiguous scenarios.

The durable lesson is:

- use enough examples to teach the boundary clearly
- do not add examples just to inflate prompt size

For exam questions, 2-4 sharply chosen examples is often the safe answer because the task statements emphasize targeted ambiguity reduction. In reusable production prompts, 3-5 examples may be the better current-doc default when the token budget allows it.

### Current docs recommend structuring examples clearly

Current Anthropic docs recommend wrapping examples in tags such as `<examples>` and `<example>` so Claude can distinguish them from instructions and live input.

That is a current prompt-structure convention, not a requirement of the exam. The exam is testing whether examples are relevant, diverse, and useful, not whether you memorized one tag name.

### Few-shot prompting is not the same as structured outputs

This boundary matters a lot for Domain 4.

Current Anthropic docs say:

- examples are a reliable way to improve output accuracy and consistency
- structured outputs are the right tool when you need guaranteed schema compliance

So the current mapping is:

- Topic 4.2 = teach the model how to behave more consistently
- Topic 4.3 = constrain the output shape with JSON schemas or strict tool use when schema validity must be guaranteed

If an exam answer claims that few-shot prompting alone guarantees valid JSON, that answer is weak.

### Older consistency techniques may still appear in older material, but some are now deprecated

Current Anthropic docs still mention response prefilling in historical consistency guidance, but explicitly mark it as deprecated for current Claude 4.5 and 4.6 model families. For current practice, Anthropic points you toward stronger prompt structure, examples, and structured outputs instead.

That matters because Topic 4.2 is about a durable technique that still maps cleanly to current docs, not an older interface trick.

### Examples can carry concise rationale when the decision itself is ambiguous

The local exam guide explicitly talks about examples that show why one action was chosen over plausible alternatives.

In current practice, that usually means:

- make the chosen action legible in the example
- include a brief explanation field or note when the workflow needs one
- avoid relying on long, freeform reasoning dumps as the main control mechanism

The important thing is that the example teaches the decision rule clearly. A short rationale such as "reported because this branch changes runtime behavior" is usually more useful than a vague instruction like "use good judgment."

## Few-Shot Prompting Works Best When the Boundary Is Known but Hard to Apply

Few-shot prompting is the right move when:

- you already know the decision policy, but the model applies it inconsistently
- the output shape is known, but formatting still drifts
- the hard part is distinguishing edge cases, not understanding the task at all
- the source inputs vary a lot in structure, and prose instructions are not enough to stabilize behavior

It is the wrong first move when:

- tool descriptions are ambiguous or overlapping
- the prompt never defined the reporting boundary in the first place
- the workflow requires guaranteed machine-valid JSON
- the model is missing necessary source information entirely
- you have no evaluation set, so you cannot tell whether the examples helped

That distinction is exam-relevant.

If the failure comes from bad tool design, fix the tool description first. If the failure comes from schema validity, use structured outputs. If the failure comes from unclear judgment on hard cases, add few-shot examples.

## What Good Few-Shot Examples Actually Teach

A good example set usually teaches four things at once.

### 1. The decision boundary

The example shows not only a positive case, but where the boundary sits.

For review prompts, that often means:

- one example of a real defect
- one example of an acceptable pattern that should not be reported

For extraction prompts, that often means:

- one example where the value is present in a standard location
- one example where the value is absent or ambiguous and should be returned as `null`, `unclear`, or equivalent

### 2. The output contract

If you want output shaped as:

- `path`
- `line`
- `severity`
- `issue`
- `suggested_fix`

then the examples should return exactly that.

This is one of the simplest ways to improve format stability.

### 3. Edge-case handling

A good example set does not stay entirely on the happy path.

It should include cases like:

- unusual but acceptable code patterns
- partial evidence
- multiple plausible interpretations
- inline citations instead of a bibliography
- measurements written informally inside narrative prose instead of a table

This is how examples reduce guesswork.

### 4. What to do when information is missing

This is especially important for Scenario 6.

If the prompt never shows what "missing" looks like, Claude may invent a value because the rest of the example set implies every field should always be filled.

If the prompt does show:

- `dosage_mg: null`
- `citation: null`
- `status: "unclear"`

then Claude has a valid pattern for abstaining without failing the task.

## Why Few-Shot Examples Improve Judgment, Not Just Formatting

A common beginner mistake is thinking examples matter only because they stabilize the shape of the answer.

That is too narrow.

Few-shot examples also help Claude learn:

- which signals matter
- which signals do not matter
- which edge cases count as exceptions
- how to resolve ambiguity when more than one interpretation looks superficially plausible

That is why the local exam guide emphasizes examples for:

- ambiguous tool or action selection
- branch-level test coverage gaps
- distinguishing acceptable code from actual bugs
- handling documents with different structures

The model is not just copying a surface format. It is inferring the judgment pattern behind the examples.

This is also why diversity matters. If every example has the same superficial shape, Claude can learn the wrong thing.

## Generalization vs Memorization

The goal of few-shot prompting is not to build a lookup table.

The goal is to show enough variation that Claude learns the rule behind the examples and applies it to new inputs.

Current Anthropic docs make this point indirectly by recommending examples that are:

- relevant
- diverse
- structured

The diversity part is critical.

Bad example set:

- three examples with the same document format
- three examples where every field is present
- three review examples where every case is a valid bug

That teaches a narrow pattern.

Better example set:

- one real finding
- one acceptable non-finding
- one ambiguous case resolved conservatively
- one extraction case with a non-standard layout
- one extraction case with a missing field returned as `null`

That teaches the general rule much more effectively.

## Few-Shot Patterns for CI Review and Pull-Request Feedback

Scenario 5 is where many Topic 4.2 questions become concrete.

In CI review systems, few-shot examples are often doing one or more of these jobs:

- showing the exact finding format
- teaching severity consistency
- distinguishing acceptable local patterns from real defects
- showing when a missing test is a real coverage gap versus just a possible improvement

### Example pattern: acceptable pattern vs real issue

This is one of the highest-value few-shot structures for review prompts.

Example A:

- input diff shows a local caching pattern that looks unusual but matches existing repo conventions
- output is no finding

Example B:

- input diff removes an authorization check on an admin action
- output is one `high` severity finding with path, line, explanation, and impact

Those two examples do more than a long paragraph saying "avoid false positives."

They teach:

- not every unusual pattern is a bug
- security-sensitive behavior overrides stylistic similarity
- what a qualifying finding should look like

### Example pattern: real coverage gap vs vague test suggestion

The exam guide explicitly mentions branch-level test coverage gaps.

A good example pair might show:

- a change that introduces a new error branch with no test coverage, reported as a valid issue because the branch changes behavior materially
- a change where equivalent branch behavior is already covered elsewhere, producing no finding because "more tests would be nice" is not the same as a concrete defect

That helps Claude stop turning every testing thought into a finding.

### A stronger review prompt pattern

```text
<instructions>
Review the diff for actionable correctness and security issues only.
Return findings with:
- path
- line
- severity
- issue
- explanation
- suggested_fix
Return an empty findings list if there are no qualifying issues.
</instructions>

<examples>
  <example>
    <input>
    Diff summary: Local helper is renamed and the callsites are updated consistently.
    </input>
    <output>
    {"findings":[]}
    </output>
  </example>

  <example>
    <input>
    Diff summary: Endpoint handler removes the admin-role check before deleting user data.
    </input>
    <output>
    {
      "findings":[
        {
          "path":"src/routes/admin.ts",
          "line":42,
          "severity":"high",
          "issue":"Authorization check removed from destructive admin action",
          "explanation":"The delete flow is now reachable without verifying admin privileges, which can allow unauthorized data deletion.",
          "suggested_fix":"Restore the admin authorization guard before executing the delete action."
        }
      ]
    }
    </output>
  </example>
</examples>

<diff>
{{current_diff}}
</diff>
```

This works better than prose alone because the examples show both:

- the empty-findings case
- the shape and bar for a real finding

## Few-Shot Patterns for Structured Data Extraction

Scenario 6 is the other major Topic 4.2 setting.

In extraction systems, few-shot examples are often doing one or more of these jobs:

- showing how to map messy source text into a stable field structure
- showing what to do when information appears in an unusual location
- showing when a required business field should remain `null` because the source does not support a value
- showing how to handle citation differences across documents

### Example pattern: varied document structure

The local exam guide calls out cases such as:

- inline citations versus bibliographies
- methodology sections versus embedded details

That matters because extraction prompts often fail when the real-world documents stop looking like the one clean example used during development.

If every example is:

- heading
- table
- citation block

then Claude may underperform when the next document is:

- narrative prose with measurements embedded in a paragraph
- appendix notes with no explicit heading
- footnotes instead of a references section

### Example pattern: missing data should stay missing

This is one of the most valuable extraction examples you can give.

If a field is absent, the example should show the correct abstention behavior explicitly.

For example:

```text
<example>
  <input>
  "The report describes symptom improvement over 8 weeks but does not state a dosage."
  </input>
  <output>
  {
    "dosage_mg": null,
    "duration_weeks": 8,
    "evidence": "symptom improvement over 8 weeks",
    "notes": "Dosage not stated in the source."
  }
  </output>
</example>
```

That teaches Claude that leaving a field empty can be the correct answer.

### A stronger extraction prompt pattern

```text
<instructions>
Extract the study fields from the document.
If a field is not supported directly by the source, return null.
Do not infer missing values from typical practice.
</instructions>

<examples>
  <example>
    <input>
    The treatment section states: "Participants received 50 mg daily for 6 weeks."
    </input>
    <output>
    {
      "dosage_mg": 50,
      "duration_weeks": 6,
      "citation_style": "inline"
    }
    </output>
  </example>

  <example>
    <input>
    Results were measured weekly for 6 weeks. The paper does not state the treatment dose.
    </input>
    <output>
    {
      "dosage_mg": null,
      "duration_weeks": 6,
      "citation_style": "none"
    }
    </output>
  </example>
</examples>

<document>
{{source_document}}
</document>
```

This is not only about output format. It teaches a policy:

- extract what is supported
- preserve absence when the source is silent

## Why Few-Shot Prompting Often Reduces Extraction Hallucinations

Anthropic's current docs emphasize examples as a way to improve accuracy and consistency. The local exam guide goes one step further and frames few-shot prompting as a way to reduce hallucinations in extraction tasks.

The safest way to understand those together is:

- official docs explicitly support the accuracy and consistency claim
- the hallucination-reduction effect is a practical consequence when examples make abstention behavior explicit

In other words, this is partly an inference from the docs plus the exam framing.

Why it works:

- examples reduce pressure to invent values just to match a pattern
- examples show that `null`, `unclear`, or equivalent can be valid outputs
- examples show where evidence is expected to come from
- examples help Claude map unusual source layouts without guessing from stereotypes

Few-shot prompting does not eliminate hallucination risk by itself. But in extraction workflows, it often lowers fabrication pressure significantly when the main failure mode is ambiguous or varied source formatting.

## Few-Shot Prompting Is Not a Substitute for Topic 4.1 or Topic 4.3

This is one of the most important exam distinctions.

### Topic 4.1 writes the rule

Topic 4.1 defines:

- what counts
- what does not count
- what severity means
- what evidence is required

If that boundary is still vague, examples alone will not rescue the prompt reliably.

### Topic 4.2 teaches the rule on hard cases

Topic 4.2 adds:

- examples of the desired structure
- examples of ambiguous decisions
- examples of acceptable non-cases
- examples of missing-data handling

### Topic 4.3 enforces machine-readable output shape

Topic 4.3 adds:

- JSON schema validation
- strict tool use
- structured outputs

That solves a different problem:

- guaranteed schema conformance

Few-shot prompting improves how Claude chooses and formats content. Structured outputs constrain the final shape of that content.

## Weak Example Set vs Strong Example Set

### Weak example set

```text
Examples:
1. A clear bug with a `high` severity finding
2. Another clear bug with a `high` severity finding
3. Another clear bug with a `high` severity finding
```

Problems:

- no acceptable non-issue case
- no medium-severity case
- no ambiguous boundary
- no demonstration of empty output
- teaches "always find something"

### Stronger example set

```text
Examples:
1. A genuine security issue reported as `high`
2. A real correctness issue reported as `medium`
3. An acceptable local pattern returning no findings
4. A structurally unusual extraction case with one field set to `null`
```

Benefits:

- teaches both action and restraint
- teaches severity differentiation
- teaches abstention behavior
- teaches variation

## Implementation or Workflow Guidance

Use this workflow when adding few-shot prompting to a Claude system:

1. Define the rule before adding examples.
   Write the reporting criteria or extraction policy first. Examples work best when they apply a clear rule.
2. Identify the unstable failure mode precisely.
   Is the problem format drift, false positives, severity wobble, empty extractions, or fabricated values?
3. Add targeted examples around that failure mode.
   Use examples that match the actual ambiguity instead of generic happy-path cases.
4. Include both positive and negative cases.
   Show what should be reported and what should be skipped, or what should be extracted and what should stay `null`.
5. Make the examples relevant and diverse.
   Current Anthropic docs explicitly recommend both. Do not let all examples share the same superficial pattern.
6. Match the exact output structure you want.
   If you want `findings: []` for no-issue cases, show that exact output.
7. Use concise structure around the examples.
   Tags such as `<examples>` and `<example>` make prompt sections clearer and are consistent with current Anthropic guidance.
8. Keep the example count purposeful.
   The exam often frames 2-4 targeted examples; current docs often recommend 3-5. Use enough to cover the boundary without bloating the prompt.
9. Evaluate on held-out cases.
   Do not judge success only on the examples embedded in the prompt. Test on separate cases that reflect the real task distribution.
10. Escalate to stronger controls when needed.
    If the remaining problem is schema validity, use structured outputs. If the remaining problem is missing information, improve retrieval or source coverage.

One practical current-doc tip is worth remembering:

- Anthropic explicitly suggests asking Claude to evaluate your examples for relevance and diversity, or to help generate more examples from an initial set

That is useful for prompt iteration, but you still need human judgment to decide whether the generated examples teach the right boundary.

## Common Mistakes

- Adding examples before defining the underlying rule clearly.
- Using only happy-path examples with no acceptable non-issue or missing-data case.
- Showing the same superficial pattern repeatedly, so Claude learns a shortcut instead of the real rule.
- Letting examples contradict the prose instructions or severity rubric.
- Expecting few-shot prompting to guarantee valid JSON or strict schema compliance.
- Using few-shot examples to compensate for poorly described or overlapping tools instead of fixing the tool descriptions.
- Forgetting to show what "no finding" or `null` should look like.
- Adding too many low-value examples and wasting tokens without increasing coverage of the true ambiguity.
- Treating examples as static forever, even after the codebase conventions or extraction taxonomy changes.
- Confusing Topic 4.2 with Topic 4.1 and trying to solve policy vagueness only with examples.
- Confusing Topic 4.2 with Topic 4.3 and treating prompt examples as a substitute for deterministic output validation.

## Exam Takeaways

If you remember only a few things for Topic 4.2, remember these:

1. Few-shot prompting is usually the right next step when the rule is clear but the output is still inconsistent.
2. Good examples teach judgment boundaries, not just formatting.
3. Include examples of both qualifying cases and non-qualifying cases.
4. For extraction, show how to handle varied document structures and how to leave unsupported fields as `null` or `unclear`.
5. Diverse examples generalize better than repetitive examples.
6. Current Anthropic docs often frame this as "use examples effectively" and recommend 3-5 examples; the exam guide often frames it as 2-4 targeted examples for ambiguous cases.
7. Few-shot prompting improves consistency, but structured outputs are the right tool when you need guaranteed schema compliance.
8. Topic 4.1 defines the rule, Topic 4.2 teaches the rule on hard cases, and Topic 4.3 constrains the final output shape.

## Quick Self-Check

You understand Topic 4.2 if you can answer yes to these questions:

- Can I explain why examples help with ambiguous decisions, not just output formatting?
- Can I design a review prompt that includes both a real issue example and an acceptable non-issue example?
- Can I explain why repetitive happy-path examples are weaker than diverse examples?
- Can I design an extraction example that explicitly shows `null` or `unclear` for unsupported fields?
- Can I explain when few-shot prompting is the right fix and when structured outputs or better tool design are the real fix?
- Can I explain the boundary between Topic 4.1, Topic 4.2, and Topic 4.3 clearly?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Prompting best practices": https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic, "Increase output consistency": https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- Anthropic, "Structured outputs": https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic, "Define success criteria and build evaluations": https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
