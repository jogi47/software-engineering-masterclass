# Topic 2.3: Distribute Tools Appropriately Across Agents and Configure Tool Choice

This note explains why tool reliability depends not only on tool quality but also on tool placement, role boundaries, and per-turn tool-selection controls. For the exam, Topic 2.3 is not mainly about memorizing one SDK flag. It is about designing a tool surface that keeps each agent focused, predictable, and safe.

Topic 2.1 focused on tool-interface quality. Topic 2.2 focused on tool-error structure. Topic 2.3 focuses on tool exposure and invocation control: which agent should see which tools, when a tool call should be optional versus required, and how current Anthropic interfaces map to the exam's simpler wording.

## Why This Topic Matters

Tool selection failures often begin before execution.

If you give an agent:

- too many tools
- the wrong tools for its role
- overly generic tools
- no guardrails on whether a tool must be used

then the agent is more likely to:

- choose a weak shortcut
- misuse a tool outside its specialization
- call a mutation tool when it should only analyze
- waste turns searching when it should synthesize
- produce a plausible answer without grounding it in required data

This matters directly in the exam scenarios:

- a research system works better when search, document analysis, and synthesis have different tool surfaces
- a developer-productivity system works better when read-only exploration agents do not automatically inherit edit or deployment capabilities

The durable principle is simple:

- do not tell an agent to stay in its lane if you can instead give it only the lane it should use

## What the Exam Is Testing

For Topic 2.3, the exam is usually testing whether you understand these ideas:

- too many available tools make tool selection less reliable
- agents tend to misuse tools that do not match their specialization
- scoped tool access improves reliability, observability, and safety
- constrained tools are often better than overly generic tools
- some cross-role tools are useful when they are narrow, frequent, and low-risk
- `tool_choice: "auto"` lets Claude decide whether a tool is needed
- `tool_choice: "any"` forces Claude to call some tool
- forced tool choice such as `{"type": "tool", "name": "..."}` makes a specific tool run first
- forcing one tool does not replace workflow design for all later steps

The exam guide frames this with examples such as:

- restricting a synthesis agent so it does not do web search
- replacing `fetch_url` with a more constrained `load_document`
- forcing `extract_metadata` before later enrichment steps

Those examples are testing the same production habit:

- make the easiest action also the correct action

## The Core Mental Model

The simplest correct mental model is:

```text
agent role
    ->
minimal tool surface for that role
    ->
Claude chooses from a smaller, sharper set
    ->
optional or forced tool-choice policy for this turn
    ->
tool result changes what happens next
```

Topic 2.3 is really about two different control layers:

1. static tool distribution
2. dynamic tool-choice control

Static distribution decides:

- which tools an agent is even allowed to see

Dynamic tool choice decides:

- whether Claude may answer directly
- whether Claude must use some tool
- whether Claude must use one specific tool first

You usually need both.

## Current Anthropic Terminology vs Exam Wording

The exam wording is intentionally simpler than the current product surface.

Current Anthropic docs distinguish among:

- `client tools`, which you define or execute on your side
- `server tools`, which Anthropic hosts
- MCP-connected tools, which the API can access through the MCP connector
- Claude Code subagent tool controls such as `tools`, `disallowedTools`, and `mcpServers`
- API-side MCP tool configuration through `mcp_toolset`, with per-tool `enabled` and `defer_loading` options

The exam guide usually compresses this into broader phrases such as:

- "MCP tools"
- "distribute tools across agents"
- "`tool_choice` as auto, any, or forced tool selection"

That simplification is fine for exam prep as long as you translate it correctly:

- in Claude Code, per-agent tool access is usually configured in the subagent definition
- in API workflows, per-agent tool access usually means passing each agent invocation its own `tools` list or MCP toolset configuration
- in the current Messages API, `tool_choice` actually has four options: `auto`, `any`, `tool`, and `none`

Important exam note:

- the outline emphasizes `auto`, `any`, and forced tool selection because those are the options most directly tied to agent behavior when tools are present
- current docs also include `none`, which disables tool use for that request

## Why Tool Distribution Affects Reliability

### Smaller tool sets are easier to route correctly

Claude chooses tools from the surface you expose.

If that surface is crowded, overlapping, or irrelevant to the agent's role, selection quality drops. The exam outline uses a simple contrast such as giving an agent 18 tools instead of 4-5. Current Anthropic docs make the same point more generally:

- tool search becomes worth considering once you have around 10 or more tools or large tool-definition token costs
- tool-selection accuracy degrades significantly once you expose very large live tool sets, with current docs calling out roughly 30-50 tools as a problem range

Do not memorize one universal threshold.

The safer rule is:

- expose the smallest tool set that still lets the agent do its job cleanly

### Specialization works only if the tools match the role

A synthesis agent is not truly a synthesis agent if it also has broad search and data-mutation tools.

A read-only code explorer is not truly read-only if it inherits write, edit, and deployment actions.

Prompt instructions like:

- "do not search unless necessary"

are weaker than tool scoping like:

- removing the search tool from that agent entirely

The exam repeatedly prefers scoped access over prompt-only restraint.

### Tool surfaces also consume context and attention

Tool descriptions are part of the model's effective prompt context.

That means irrelevant tools impose two costs:

- they consume context budget
- they compete for selection attention

This is one reason current Anthropic docs pair tool distribution guidance with newer features such as tool search and deferred loading. Large catalogs should not be dumped wholesale into every agent context.

### Safety and blast radius improve when capabilities are separated

Role-specific tools are not only about accuracy. They are also about limiting what a mistake can do.

Examples:

- a search agent should not be able to trigger refunds
- a reporting agent should not be able to write to production systems
- a read-only code reviewer should not be able to edit files unless you explicitly want an editing agent

This is a classic least-privilege design principle applied to agent tools.

## Role-Based Tool Distribution

The cleanest way to reason about Topic 2.3 is by role.

| Agent role | Usually should have | Usually should not have | Why |
| --- | --- | --- | --- |
| Coordinator | Orchestration tools, light status or routing tools, possibly the subagent-spawning tool | Every specialist tool "just in case" | The coordinator should route work, not do all specialist work itself |
| Search or retrieval agent | Search, fetch, browse, source-loading tools | Final-report generation or high-risk mutation tools | Keep discovery focused and evidence-oriented |
| Document-analysis agent | Loaded-document tools, extraction tools, summarization tools | Broad live-web search if another agent owns discovery | Avoid mixing discovery with analysis unless the task truly needs both |
| Synthesis agent | Verification, citation, formatting, lightweight lookup tools | Broad exploration tools and most mutation tools | Synthesis quality improves when it cannot wander |
| Action or mutation agent | The specific business-action tools it owns, plus validation context | Unrelated search or reporting tools | Mutating systems should be tightly scoped and auditable |

This is not a rigid taxonomy. The exam wants you to reason about the trade-off:

- give the agent enough tools to do its assigned job well
- avoid giving it tools that encourage cross-role drift

## Scoped Cross-Role Tools

The exam outline includes an important nuance:

- limited cross-role tools can be good design

For example, a synthesis agent might reasonably get:

- `verify_fact`
- `lookup_source_excerpt`
- `format_citation`

even if broader search belongs to a retrieval agent.

Why this works:

- the tool is narrow
- the need is frequent
- it supports the agent's main role
- it avoids round-tripping every tiny check through the coordinator

Why this can go wrong:

- the "small exception" grows into a second full tool suite
- the synthesis agent slowly becomes another search agent

A useful rule is:

- allow cross-role tools only when they support a frequent local need without changing the agent's identity

If the requested action becomes exploratory, high-risk, or multi-step, route back through the coordinator.

## Constrained Tools Beat Overly Generic Tools

This topic overlaps with Topic 2.1, but the emphasis here is different.

Topic 2.1 asked whether the tool interface is clear.

Topic 2.3 asks whether the tool itself is too broad for the role that receives it.

Examples:

- give a research agent `load_document` that validates expected document locations instead of a universal `fetch_url`
- give a support agent `lookup_customer_orders` instead of broad raw database access
- give a code-reading agent `Read`, `Grep`, and `Glob` instead of `Edit` and `Write`

Generic tools are not always wrong. They are wrong when:

- the role is specialized
- the broader capability is unnecessary
- the generic tool encourages unsafe or ambiguous behavior

Constrained tools help in three ways:

- they reduce misuse
- they simplify tool selection
- they make transcript review easier because intent is clearer

## `tool_choice` and What It Actually Controls

Current Anthropic docs describe four `tool_choice` modes:

- `auto`
- `any`
- `tool`
- `none`

For Topic 2.3, the exam mainly cares about the first three.

### `auto`

`auto` means:

- Claude may answer directly
- or Claude may call one or more tools if it decides they are needed

Use `auto` when:

- a tool may be useful, but is not mandatory every turn
- you want the model to decide whether grounding is necessary
- you still want conversational explanation before tool use

This is the default when tools are provided.

### `any`

`any` means:

- Claude must call one of the provided tools
- but Claude can choose which one

Use `any` when:

- a grounded answer must come from some tool result
- it would be unsafe or low-quality to let Claude answer from prior context alone
- multiple tools are acceptable starting points

Examples:

- "Use one of the retrieval tools before answering"
- "Do not answer this request from memory; inspect the environment first"

Important current-doc nuance:

- with `any`, Anthropic's API prefills the assistant to force tool use, so Claude does not emit a normal explanatory text block before the first `tool_use`
- if you need exactly one tool call in that turn, combine this with `disable_parallel_tool_use`

### Forced tool choice with `{"type": "tool", "name": "..."}`

Forced tool choice means:

- Claude must use the named tool first

Use this when:

- the workflow depends on one required first step
- a specific tool must establish ground truth before anything else happens
- you want deterministic entry into a multi-step flow

Examples:

- force `extract_metadata` before content enrichment
- force `get_customer` before any billing action
- force `Read` or `load_document` before downstream analysis in a constrained workflow

The main exam trap is:

- forced tool choice controls the first tool call for that turn
- it does not automatically define the entire later workflow

Another current-doc nuance:

- if you need exactly one forced first tool before any other tool call, use `disable_parallel_tool_use`

After the first tool result returns, you still need normal orchestration:

- continue in another turn
- possibly switch back to `auto`
- possibly narrow the tool list further
- possibly force the next step if the flow truly requires it

### `none`

The exam outline does not emphasize `none`, but current Anthropic docs include it.

`none` means:

- tools are disabled for that request

This is useful when:

- you are doing a synthesis-only or explanation-only turn
- you want to guarantee that Claude answers only from provided context

## `tool_choice` Is Not the Same as Good Architecture

This is one of the most important distinctions in Topic 2.3.

`tool_choice` decides what happens in the current turn.

Tool distribution decides what an agent is capable of at all.

Bad pattern:

- give the agent every tool, then try to steer behavior mostly through prompt text and occasional forced tool calls

Better pattern:

- restrict the agent's tool surface first
- then use `tool_choice` only when the current turn needs extra control

If an agent should never search the web, do not solve that with:

- `tool_choice: auto` plus "avoid searching"

Solve it with:

- no web-search tool in that agent's tool set

## Current Anthropic Nuances That Matter for Exam Answers

### Claude Code subagents inherit tools by default unless you restrict them

Current Claude Code docs say subagents inherit the main conversation's tools, including MCP tools, unless you constrain them with `tools` or `disallowedTools`.

That means a correct production design often requires explicit restriction.

This is directly aligned with the exam principle:

- specialization should be enforced through available tools, not only through agent description text

### MCP-connected tools can now be allowlisted or deferred

Current API docs for the MCP connector expose `mcp_toolset` with per-tool configuration such as:

- `enabled`
- `defer_loading`

This matters because in current Anthropic terminology, "distributing tools" can mean more than passing a short `tools` array. It can also mean:

- disable most tools by default
- enable only the few a given agent needs
- defer large tool descriptions so they are loaded only when needed

### Tool search is complementary, not a replacement for role scoping

Current Anthropic docs now include a tool search tool for very large catalogs.

That does not invalidate the exam principle.

Instead, it sharpens it:

- if a role only needs 3-5 tools, give it 3-5 tools
- if a role legitimately needs access to a large domain catalog, combine role scoping with tool search and deferred loading rather than dumping the full catalog into context

### Forced tool choice has interaction constraints

Current docs note that:

- `any` and forced `tool` choice prefill the assistant to force a tool call
- `any` and forced `tool` are not compatible with extended thinking

For exam prep, the durable lesson is:

- use forced tool choice when determinism matters for the current turn
- do not assume every model mode supports every forcing option

## Implementation Workflow Guidance

A practical workflow for Topic 2.3 looks like this:

### 1. Start from roles, not from the raw tool catalog

Ask:

- what does this agent own
- what decisions should stay with the coordinator
- what actions would be dangerous or distracting for this role

Do not begin with:

- "here are all 24 tools, which ones might be nice to have"

### 2. Build the minimum viable tool surface for each role

For every agent, define:

- required tools
- optional but frequent narrow tools
- explicitly excluded tools

This should usually produce a short allowlist.

### 3. Replace broad tools with constrained alternatives where possible

Check whether the role really needs:

- arbitrary URL fetch
- arbitrary shell access
- arbitrary database query
- arbitrary file edit

If not, replace those with narrower tools that better match the role.

### 4. Decide when the turn requires `auto`, `any`, or forced `tool`

A useful decision rule is:

- use `auto` when direct response is acceptable
- use `any` when some tool grounding is mandatory but the exact starting tool can vary
- use forced `tool` when one specific first step must happen before anything else

### 5. Keep forced workflows turn-local

If step order matters, do not assume one forced tool call solves the entire sequence.

Instead:

1. force the first required tool
2. inspect the result
3. continue with a fresh turn and the right next configuration

This keeps the workflow explicit and easier to debug.

### 6. Evaluate transcript behavior, not only static configuration

Review whether agents:

- call irrelevant tools
- ask the wrong agent to do the work
- skip a required grounding step
- overuse broad fallback tools
- get stuck because their tool set is too narrow

Good tool distribution is iterative. If transcripts show repeated drift, change the available tools before you blame the model.

## Example: Multi-Agent Research System

Suppose you are building the exam's research scenario with four roles:

- coordinator
- web researcher
- document analyst
- report synthesizer

### Weak design

Every agent gets:

- web search
- URL fetch
- document loader
- citation formatter
- report writer
- metadata extractor
- browser tool

Problems:

- the synthesizer starts searching instead of synthesizing
- the researcher starts producing final prose too early
- tool selection becomes noisy because every role sees the same surface
- transcript review becomes harder because role boundaries are blurred

### Stronger design

Coordinator:

- subagent-spawning or orchestration capability
- lightweight status or routing tools
- maybe a narrow planner or verifier if truly needed

Web researcher:

- web search
- source fetch
- source metadata extraction

Document analyst:

- document loader
- extraction tools
- summarization tools

Report synthesizer:

- `verify_fact`
- `format_citation`
- maybe `lookup_source_excerpt`

Important nuance:

- the synthesizer does not get broad discovery tools
- if synthesis reveals a gap that requires new search, the request routes back to the coordinator

That is exactly the kind of reasoning the exam wants.

## Example: Current API Tool Configuration

In current Anthropic API terminology, one way to scope MCP tools tightly is to disable most tools by default and enable only the ones a given agent should see.

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "name": "research-server",
      "url": "https://mcp.example.com"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "research-server",
      "default_config": {
        "enabled": false,
        "defer_loading": true
      },
      "configs": {
        "search_public_web": {
          "enabled": true,
          "defer_loading": false
        },
        "load_document": {
          "enabled": true
        }
      }
    }
  ],
  "tool_choice": {
    "type": "any"
  }
}
```

What this does:

- only the enabled tools are available to this agent
- most MCP tools stay invisible
- `tool_choice: any` guarantees the turn starts with some tool call

For another agent, you would pass a different toolset configuration.

That is how current Anthropic API design maps to the exam phrase:

- distribute tools appropriately across agents

## Example: Claude Code Subagent Scoping

In current Claude Code docs, subagents inherit the main session's tools unless you restrict them.

A study-friendly example looks like this:

```yaml
---
name: safe-researcher
description: Researches the codebase and reports findings without editing files.
tools: Read, Grep, Glob, Bash
---
```

This is useful because:

- the agent can inspect the repository
- the agent cannot write or edit files
- the tool surface matches the role

The exam principle is the same even if the exact interface differs:

- read-only work should usually be backed by read-only tools

## Common Mistakes

- Giving every subagent the full tool set "for flexibility." This weakens specialization and increases routing errors.
- Using prompt text to say "do not use this tool unless necessary" when the tool should really be removed from the agent entirely.
- Treating forced tool choice as a full multi-step workflow engine instead of a way to control the first tool call of a turn.
- Giving a synthesis or reporting agent broad search tools, which encourages it to drift back into discovery.
- Keeping overly generic tools such as unrestricted fetch or execute actions when a constrained role-specific tool would work better.
- Assuming one exact tool-count threshold is universally correct. The durable rule is to minimize the live tool surface, not to memorize a magic number.
- Forgetting that current Anthropic docs also include `tool_choice: none`, even though the exam emphasizes `auto`, `any`, and forced tool selection.
- Forgetting that current Anthropic docs note `any` and forced `tool` choice are not compatible with extended thinking.

## Exam Takeaways

If you remember only a few things for Topic 2.3, remember these:

1. Tool distribution and `tool_choice` solve different problems: one limits capability, the other controls the current turn.
2. Give each agent only the tools it needs for its role. Least privilege improves reliability as well as safety.
3. A specialized agent with irrelevant tools is not truly specialized.
4. Narrow cross-role tools are acceptable when they support a frequent local need without turning the agent into a different role.
5. Constrained tools are often better than generic tools because they reduce misuse and ambiguity.
6. Use `tool_choice: auto` when tools are optional, `any` when some tool call is mandatory, and forced `tool` when one specific first step must happen.
7. Forced tool choice controls the first tool call of the turn. It does not replace broader workflow orchestration.
8. In current Anthropic docs, large tool catalogs are better handled with scoping, deferred loading, and tool search than by exposing everything at once.

## Quick Self-Check

You understand Topic 2.3 if you can answer yes to these questions:

- Can I explain why giving a synthesis agent search tools often makes the system worse?
- Can I describe the difference between per-agent tool scoping and per-turn `tool_choice`?
- Can I choose between `auto`, `any`, and forced `tool` based on whether grounding is optional, mandatory, or sequence-critical?
- Can I explain why a constrained tool such as `load_document` may be safer and more reliable than a generic `fetch_url`?
- Can I identify when a small cross-role tool is a useful exception and when it starts eroding the agent's specialization?
- Can I connect the exam's tool-distribution wording to current Anthropic interfaces such as Claude Code subagent tool allowlists and API-side `mcp_toolset` configuration?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "How to implement tool use": https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use
- Anthropic, "Tool search tool": https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/tool-search-tool
- Anthropic, "MCP connector": https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector
- Anthropic, "Create custom subagents": https://code.claude.com/docs/en/sub-agents
