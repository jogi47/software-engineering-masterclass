# Topic 2.1: Design Effective Tool Interfaces with Clear Descriptions and Boundaries

This note explains why tool selection becomes unreliable when tools are vague, overlapping, or poorly scoped, and how to design tool interfaces that help Claude choose the right action consistently. For the exam, Topic 2.1 is not mainly about memorizing one MCP field or one SDK helper. It is about understanding how the model perceives a tool surface and how interface design affects routing, recovery, and downstream reasoning.

## Why This Topic Matters

Many tool failures are selection failures before they are execution failures.

If Claude picks the wrong tool, every later step gets worse:

- the wrong backend call runs
- the wrong arguments are inferred
- retries increase
- irrelevant data comes back into context
- the agent may get stuck between similar tools

This matters in every exam scenario that uses tools:

- a support agent should not confuse lookup tools with mutation tools
- a research agent should not use a document-analysis tool for live web results
- a coding agent should not choose a generic fetch tool when a more constrained project tool exists

Good tool interfaces reduce ambiguity before the first tool call ever happens.

## What the Exam Is Testing

For Topic 2.1, the exam is usually testing whether you understand these ideas:

- tool descriptions are a primary signal Claude uses when choosing among tools
- each tool should explain what it does, when to use it, and when not to use it
- overlapping tools create routing mistakes even if each tool works correctly on its own
- renaming or splitting tools is often better than trying to fix ambiguity only with prompt wording
- input format, examples, parameter meaning, and output expectations all contribute to a usable tool contract
- system prompt wording can unintentionally bias tool selection because it sits alongside tool definitions in the model's prompt context

## The Core Mental Model

The simplest correct mental model is:

```text
tool name + description + schema + examples + surrounding prompt
    ->
Claude forms a mental model of what each tool is for
    ->
Claude matches the current subtask to the sharpest-fitting tool
    ->
clear boundaries improve selection reliability
```

Topic 2.1 is really about interface legibility.

Claude does not see your internal architecture diagram or your intentions as the developer. It sees the tool surface you expose:

- the tool name
- the description
- the input schema
- any examples
- the broader prompt context

If that surface is muddled, tool choice becomes muddled too.

## Current Anthropic Terminology vs Exam Wording

The exam guide often talks about "MCP tools" in a broad architectural sense.

Current Anthropic docs are more specific:

- `client tools` are tools you define or implement on your side
- `server tools` are Anthropic-hosted tools such as web search
- the `MCP connector` lets the Messages API access remote MCP server tools directly
- Claude Code can also expose connected MCP server tools alongside built-in tools

The durable concept does not change across those interfaces:

- Claude chooses among available tools based on the tool surface it is given

So when the exam says "tool interface" or "MCP tool description," the production interpretation is broader:

- design the exposed tool contract so the model can distinguish the right action from neighboring actions

## Why Tool Descriptions Matter So Much

Anthropic's current tool-use docs are explicit here:

- detailed descriptions are the most important factor in tool performance

That makes sense because the API constructs a tool-use system prompt from:

- the tool definitions
- tool configuration
- any user-specified system prompt

So tool descriptions are not just comments for developers. They become part of what Claude reads when deciding whether a tool fits the current need.

For Topic 2.1, this leads to an important exam rule:

- if tool routing is unreliable, improve the tool interface first before assuming the model is the problem

## What a Strong Tool Interface Includes

### 1. A clear purpose

A tool should have one crisp job from Claude's perspective.

Good:

- "Search public web sources and return the top relevant results for a query"
- "Verify a factual claim against a supplied source passage"

Weak:

- "Analyze content"
- "Process data"

If the tool name or description could apply to many unrelated subtasks, the boundary is already weak.

### 2. Positive and negative boundaries

A strong description says both:

- when to use the tool
- when not to use the tool

Example:

- use `search_public_web` to find external sources on the live web
- do not use it for uploaded PDFs or already-retrieved document text

This matters because many routing failures happen between adjacent tools, not between obviously unrelated tools.

### 3. A precise input contract

The tool interface should make parameter meaning unambiguous.

That includes:

- required versus optional fields
- accepted formats
- units and ranges
- whether the tool can infer missing values safely
- what defaults actually do

For complex or format-sensitive tools, current Anthropic docs also support `input_examples` for user-defined tools. This is useful when the model needs to see valid patterns, not just field names.

### 4. A clear output contract

Claude also needs to know what kind of result a tool returns.

Helpful descriptions explain:

- whether the tool returns raw records, a summary, extracted facts, or a yes/no verification result
- whether the output is concise or detailed
- what important data is omitted

If the tool does not return full content, IDs, or downstream action fields, say so.

### 5. Limitations and caveats

A tool should expose what it cannot do just as clearly as what it can do.

Examples:

- only searches indexed public web pages
- does not mutate backend state
- returns summaries, not full document text
- supports only one customer ID at a time

This keeps Claude from treating the tool like a universal adapter.

## Example: Weak vs Strong Tool Design

Imagine a research system with these tools:

- `search_web`: Search the web
- `analyze_content`: Analyze content
- `analyze_document`: Analyze documents

All three technically work, but the interface is weak.

Problems:

- `analyze_content` overlaps with almost everything
- `analyze_document` may refer to uploaded files, retrieved web pages, or structured source passages
- none of the names say what kind of output Claude gets back

A stronger version might look like this:

- `search_public_web`: Find relevant external web pages for a natural-language query and return titles, URLs, and snippets. Use this when you need discovery on the live web. Do not use it for analyzing text you already have.
- `summarize_document`: Summarize a provided document or passage that is already loaded into context. Use this for comprehension of known source text. Do not use it for source discovery or fact verification.
- `verify_claim_against_source`: Check a specific claim against a provided source passage and return supported, contradicted, or insufficient evidence with quoted evidence spans. Use this when synthesis needs factual grounding, not broad summarization.

This stronger tool set improves selection because each tool has:

- a different input shape
- a different job
- a different output contract
- a clearer boundary from neighboring tools

## Consolidate vs Split: The Real Trade-off

This topic has an important nuance.

Current Anthropic docs recommend consolidating related operations into fewer tools because too many small tools can increase selection ambiguity.

The exam outline also says to replace generic tools with purpose-specific tools where needed.

These ideas are not contradictory.

A useful rule is:

- consolidate operations that belong to one natural user intent
- split tools when one interface covers meaningfully different intents, inputs, or outputs

Good consolidation:

- `schedule_event` instead of separate low-level tools for listing users, checking availability, and creating the calendar event

Good splitting:

- separate `summarize_document` from `verify_claim_against_source`

Bad consolidation:

- one `analyze_everything` tool that searches, summarizes, extracts, and verifies depending on loosely described parameters

Bad splitting:

- five tiny tools that all mean "look up customer information" with barely distinguishable names

A useful design test is:

- does this tool correspond to one recognizable action the agent can reason about cleanly?

If not, either consolidate or split until the answer becomes yes.

## Naming and Namespacing Matter

Names are not cosmetic.

Anthropic's tool-design guidance notes that namespacing can help agents distinguish overlapping tools, especially when many MCP servers or services are connected.

Useful naming patterns include:

- service prefixes such as `jira_search` and `asana_search`
- resource-oriented names such as `asana_projects_search`
- purpose-based verbs such as `verify_claim_against_source`

Weak naming patterns include:

- overloaded verbs like `process`, `handle`, or `analyze`
- synonyms that mean nearly the same thing
- names that reflect backend implementation instead of agent intent

The best tool names usually sound like a human-readable action, not an internal RPC.

## Output Shaping Is Part of the Interface

Topic 2.1 is not only about selection. It is also about whether the selected tool returns the right amount and type of context.

Anthropic's current engineering guidance emphasizes:

- return high-signal information
- prefer semantically meaningful fields over cryptic identifiers
- control verbosity with filtering, pagination, truncation, or response modes when needed

That matters because a tool that returns too much low-value data creates a second failure:

- the model picked the right tool, but now has to reason over noisy output

Examples of better output shaping:

- return relevant log lines with surrounding context, not the entire log file
- return `customer_name` and `account_status`, not only opaque internal IDs
- expose concise and detailed modes if downstream calls sometimes need identifiers

Topic 2.2 goes deeper on structured error responses, but even here the principle is the same:

- the interface should steer the next reasoning step toward a better decision

## System Prompt Wording Can Override Good Tool Design

The exam outline correctly warns that system prompt wording can bias tool selection.

Current Anthropic docs do not frame this as magic keyword behavior. The simpler explanation is structural:

- tool definitions and the user system prompt are combined into the tool-use system prompt

From that, it is reasonable to infer that repeated wording in the system prompt can create accidental associations with one tool over another.

Example:

- if the system prompt repeatedly says "analyze content from the web" and you also have a vague tool named `analyze_content`, Claude may over-prefer that tool even when a more specific web-retrieval or verification tool would be better

Better prompt design usually means:

- describe goals, policies, and workflow expectations
- avoid inventing broad aliases that overlap with tool names
- let the tool descriptions carry the boundary details

When routing is off, review the prompt and the tool descriptions together. Looking at only one of them is often too shallow.

## Implementation Workflow Guidance

A practical workflow for Topic 2.1 looks like this:

### 1. Map the real tasks the agent must perform

Start from user intents, not backend endpoints.

Examples:

- find the relevant customer record
- verify a refund condition
- search public sources
- summarize an already-loaded document

### 2. Design the smallest tool set with distinct purposes

Ask:

- which actions are genuinely different from Claude's point of view
- which low-level operations should be consolidated behind one higher-level tool
- where tool overlap would create confusion

### 3. Write detailed descriptions before you optimize schemas

For each tool, explicitly state:

- purpose
- when to use it
- when not to use it
- what important parameters mean
- what it returns
- what it does not return

If the description is still only one sentence long for a non-trivial tool, it is probably underspecified.

### 4. Add schema constraints and examples where ambiguity remains

Use the schema to tighten:

- enums
- required fields
- nested structure
- format-sensitive inputs

Then add `input_examples` for complex user-defined tools if the valid call pattern is not obvious from the schema alone.

### 5. Audit the surrounding system prompt

Check whether your prompt:

- repeats ambiguous words that match one tool too broadly
- tells Claude to prefer a style of action that conflicts with the tool boundaries
- gives step instructions that make one tool look like the default for every case

### 6. Review transcripts and evaluation failures

Anthropic's engineering guidance strongly recommends evaluating how agents actually use tools.

Look for patterns such as:

- the wrong tool selected repeatedly for similar requests
- correct tool selected with wrong parameter format
- redundant calls caused by incomplete tool outputs
- retries that indicate a boundary problem rather than a model problem

Tool design should be iterative. The first draft of the interface is rarely the final one.

## Practical Refactor Example

Suppose a support agent has these tools:

- `get_customer`
- `lookup_order`
- `analyze_case`
- `process_refund`

`analyze_case` is the weak point.

It sounds useful, but from Claude's perspective it is unclear:

- what input it expects
- whether it summarizes facts or decides policy
- whether it should be used before or after lookup tools
- whether it returns a recommendation, a classification, or supporting evidence

A stronger design could be:

- keep `get_customer`
- keep `lookup_order`
- replace `analyze_case` with `classify_support_issue`
- add `check_refund_policy` if policy evaluation is distinct from issue classification

Now the boundaries are sharper:

- retrieval tools fetch state
- classification interprets the request
- policy checking evaluates refund eligibility
- mutation happens only in `process_refund`

This is the kind of refactor the exam wants you to recognize.

## Common Mistakes

### 1. Writing one-line descriptions for complex tools

Problem:

- the tool exists, but Claude does not know its real scope

Effect:

- weak or inconsistent tool selection

### 2. Creating overlapping tools with vague names

Problem:

- two or more tools appear to solve the same subtask

Effect:

- misrouting, redundant calls, and unstable behavior across similar prompts

### 3. Designing tools around backend endpoints instead of agent tasks

Problem:

- the tool surface mirrors raw APIs rather than natural actions

Effect:

- too many low-level tools and poor context efficiency

### 4. Using one generic mega-tool for unrelated intents

Problem:

- one tool handles too many distinct jobs through loose parameters

Effect:

- vague selection, vague outputs, and poor downstream reasoning

### 5. Ignoring output shape and token cost

Problem:

- the tool returns large, low-signal data blobs

Effect:

- the model wastes context after making the correct selection

### 6. Letting the system prompt blur tool boundaries

Problem:

- prompt wording repeatedly favors one broad tool concept

Effect:

- the prompt quietly undermines the careful tool descriptions

### 7. Skipping evaluation and transcript review

Problem:

- you assume a clean interface because the tool works in isolation

Effect:

- routing problems persist in production because the tool surface was never tested from the model's perspective

## Topic 2.1 vs Topic 2.3

These topics are closely related, but they are not the same.

Topic 2.1 is mostly about:

- what each tool means
- how clearly each tool is described
- whether boundaries between tools are sharp enough for reliable selection

Topic 2.3 is mostly about:

- which agents get which tools
- how many tools each agent should have
- when to force or constrain tool choice

A good way to remember it:

- Topic 2.1 = "Is each tool interface legible?"
- Topic 2.3 = "Is the tool surface distributed and configured appropriately?"

## Design Principles to Remember

Strong tool interfaces are usually:

- explicit about purpose
- explicit about boundaries
- small in number but not overly generic
- clear about inputs and outputs
- designed around agent tasks, not raw backend plumbing
- iterated through transcript review and evaluation

The main design question is:

- if Claude had never seen my backend before, would the tool surface still make the right action obvious?

That is the heart of Topic 2.1.

## Exam Takeaways

If you remember only a few things for Topic 2.1, remember these:

1. Tool descriptions are one of the strongest signals Claude uses for selection.
2. A good description says what the tool does, when to use it, when not to use it, what inputs mean, and what the tool returns.
3. Overlapping or generic tools cause routing errors even when the implementations are correct.
4. Rename, consolidate, or split tools based on natural task boundaries, not raw backend structure.
5. `input_schema` and, for user-defined tools, `input_examples` help tighten format-sensitive interfaces.
6. System prompt wording can bias selection because it is combined with tool definitions in the prompt context.
7. The right way to improve tool choice is to inspect transcripts and refine the interface, not just blame the model.

## Quick Self-Check

You understand Topic 2.1 if you can answer yes to these questions:

- Can I explain why a tool description affects selection reliability more than a short function name alone?
- Can I rewrite an ambiguous tool like `analyze_content` into clearer purpose-specific tools?
- Can I explain when related operations should be consolidated and when a generic tool should be split?
- Can I describe how input format, examples, and output contract contribute to tool usability?
- Can I explain why system prompt wording can interfere with otherwise strong tool descriptions?
- Can I review a transcript and tell whether a routing failure came from overlap, poor naming, or missing boundary text?

## References

- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Tool use with Claude": https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview
- Anthropic, "How to implement tool use": https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use
- Anthropic, "MCP connector": https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector
- Anthropic, "Writing effective tools for AI agents": https://www.anthropic.com/engineering/writing-tools-for-agents
- Anthropic, "Be clear, direct, and detailed": https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct
