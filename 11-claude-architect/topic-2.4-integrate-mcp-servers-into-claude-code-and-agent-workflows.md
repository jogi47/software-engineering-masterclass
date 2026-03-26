# Topic 2.4: Integrate MCP Servers into Claude Code and Agent Workflows

This note explains how MCP servers fit into real Claude-based systems, how to configure them cleanly for team and personal use, and where the exam's simplified wording does not fully match current Anthropic interfaces. For the exam, Topic 2.4 is not mainly about memorizing one config file. It is about understanding capability scoping, discoverability, credential handling, and when MCP should extend Claude instead of being treated like a generic integration bucket.

Topic 2.1 focused on tool-interface quality. Topic 2.2 focused on tool-error structure. Topic 2.3 focused on tool distribution and `tool_choice`. Topic 2.4 focuses on where MCP servers live, how they become available to Claude Code and agent workflows, and how to make them discoverable enough that Claude actually uses them well.

## Why This Topic Matters

MCP is often the bridge between Claude and the systems that matter in production:

- issue trackers
- internal documentation
- databases
- monitoring platforms
- design tools
- custom business APIs

When MCP integration is done well, Claude can work with external systems using structured, domain-specific capabilities instead of guessing from partial context.

When it is done badly, the failure is usually not "the server does not start." The more common failures are:

- the wrong server is shared with the wrong audience
- secrets get committed into a shared config
- Claude falls back to weaker built-in tools because the MCP tools are vague
- agents waste turns discovering what data exists
- every agent gets every server, which hurts reliability and increases risk

This topic matters because MCP is not only a transport or protocol detail. It is part of the agent architecture.

## What the Exam Is Testing

For Topic 2.4, the exam is usually testing whether you understand these ideas:

- shared team MCP setup belongs in project-scoped configuration, not in each developer's private config
- personal or experimental servers should stay in user-scoped configuration, not in the shared project file
- secrets should be supplied through environment-variable expansion instead of hardcoded into versioned config
- MCP resources can reduce exploratory tool calls by exposing a browsable catalog of available content
- Claude is more likely to use strong MCP tools when their names, descriptions, and outputs are clearer than the available built-ins
- standard SaaS integrations are often better served by an existing community or vendor-provided MCP server than by a rushed custom server
- current Anthropic interfaces differ between Claude Code and API-based agent workflows, so a good answer must separate durable principles from interface-specific details

The exam outline phrases this mostly as project-level versus user-level MCP setup. Current Anthropic docs now expose a slightly richer picture, especially in Claude Code, so you need the concept rather than only the older labels.

## The Core Mental Model

The simplest correct mental model is:

```text
MCP server
    ->
exposes tools and sometimes resources/prompts
    ->
scope determines who can use it
    ->
tool and resource design determine how discoverable it is
    ->
agent architecture determines which workflows should see it
```

Topic 2.4 is really about four design questions:

1. Where should this server be configured?
2. How should it authenticate without leaking secrets?
3. What should Claude discover first: tools, resources, or prompts?
4. Which workflows and agents should be allowed to use it?

If you answer those four questions well, the MCP integration is usually on solid ground.

## Current Anthropic Terminology vs Exam Wording

This topic is one of the places where current Anthropic terminology matters.

### In Claude Code, MCP scope is now richer than the exam's two-level framing

The exam outline emphasizes:

- project-scoped `.mcp.json`
- user-scoped `~/.claude.json`

Current Claude Code docs still use those files for MCP servers, but the scope model is broader:

- `local` scope is the default and is private to you within one project
- `project` scope is shared through `.mcp.json`
- `user` scope is private to you across projects in `~/.claude.json`
- managed organization-level controls can also restrict or predefine allowed MCP servers

There is also older naming baggage:

- current `local` scope was called `project` in older Claude Code versions
- current `user` scope was called `global` in older versions

That means an exam answer should follow the exam's project-versus-user distinction when that is clearly what the question is testing, but you should also know that current Claude Code has a `local` scope that is often the safest default for personal experiments.

### General Claude Code settings and MCP server storage are not the same thing

Current Claude Code settings are documented under `.claude/settings.json`, `.claude/settings.local.json`, and related settings files.

MCP server configuration is separate:

- shared project MCP servers live in `.mcp.json`
- user and local MCP servers live in `~/.claude.json`

This is an easy place to get confused if you memorize file names without understanding what they configure.

### Claude Code and API agent workflows do not expose identical MCP features

Current Anthropic docs distinguish two major integration surfaces:

1. Claude Code
2. API-side MCP integration through the Messages API connector

In current docs:

- Claude Code can work with MCP tools, resources, prompts, and other MCP-driven capabilities such as dynamic capability refresh
- the Messages API MCP connector currently supports remote MCP tool calls, but not the full MCP feature set such as resources and prompts
- the API connector uses `mcp_servers` plus `mcp_toolset` configuration rather than Claude Code scope files

The exam wording compresses these details into "integrate MCP servers into Claude Code and agent workflows." The safe interpretation is:

- in Claude Code, think about server placement and developer workflow
- in API or SDK-based agent workflows, think about which MCP servers and tools each agent invocation should receive

## Where MCP Servers Belong

The fastest way to get this topic wrong is to put every server in the same place.

### Project scope: shared team tooling

Use project scope when the MCP server is part of how the team works in that repository.

Typical examples:

- GitHub, GitLab, or Jira integrations the whole team uses
- internal documentation servers needed to work in the codebase
- monitoring or analytics servers used in the same shared workflow
- team-standard database or design-tool integrations

Why project scope is usually correct here:

- the server belongs to the project, not to one developer
- the setup should be reproducible across collaborators
- the config can live in version control via `.mcp.json`

Current Claude Code docs also note a practical security nuance:

- project-scoped servers from `.mcp.json` require approval before use

That is consistent with the exam's emphasis on treating shared MCP configuration as a deliberate collaboration surface, not an invisible local preference.

### User scope: personal utilities across projects

Use user scope when the server is useful to you across many projects but should not be committed into one repository.

Typical examples:

- a personal notes or task-management server
- a private development helper you use in many repos
- a personal utility integration that teammates may not want

Why user scope is usually correct here:

- the server is private to your workflow
- it should follow you across repositories
- it should not become part of every team's shared setup by accident

### Local scope: current-doc nuance worth knowing

The exam outline does not call this out, but current Claude Code does.

Local scope is useful when:

- the server is experimental
- the credentials are sensitive
- the integration is only relevant inside one repository
- you are testing a server before deciding whether it should become shared

This is a practical current-doc nuance for production work:

- not every private server should jump straight from "only on my laptop" to project-shared `.mcp.json`

Often the right progression is:

`local experiment -> user utility or project-shared server`

## Shared Config Without Shared Secrets

This is a core exam theme.

The right pattern is:

- share the server definition
- do not share the raw secret

Current Claude Code supports environment-variable expansion in `.mcp.json`, including both `${VAR}` and `${VAR:-default}` style expansion. That means a team can commit a shared config that points to:

- a common URL
- a common command path pattern
- a per-user token or API key supplied from the shell environment

This is better than hardcoding credentials because it preserves both:

- reproducibility
- secret hygiene

### Example: shared project MCP config

```json
{
  "mcpServers": {
    "jira": {
      "type": "http",
      "url": "${JIRA_MCP_URL:-https://mcp.company.example/jira}",
      "headers": {
        "Authorization": "Bearer ${JIRA_TOKEN}"
      }
    },
    "docs": {
      "type": "stdio",
      "command": "${DOCS_MCP_COMMAND:-npx}",
      "args": ["-y", "@company/docs-mcp-server"],
      "env": {
        "DOCS_API_KEY": "${DOCS_API_KEY}"
      }
    }
  }
}
```

What this gets right:

- the shared capability names are versioned with the project
- secrets stay outside the repository
- machine-specific paths and URLs can still vary safely

What this avoids:

- committing tokens
- forcing every developer to rewrite the server definition locally
- creating "works on my machine" MCP drift

## Discoverability: Tools, Resources, and Prompts

MCP integration is not only about attaching more tools.

Current Claude Code docs make an important distinction:

- MCP servers can expose tools
- MCP servers can expose resources
- MCP servers can expose prompts that appear as slash commands

For Topic 2.4, resources are the most exam-relevant extension because they directly affect discoverability.

### Why resources matter

Resources let a server expose content that Claude can browse or reference directly.

Examples:

- issue records
- documentation hierarchies
- database schemas
- runbook indexes
- API reference sections

In Claude Code, resources can be referenced through `@` mentions. That matters because it changes the workflow from:

`search around blindly -> call tools to see what exists -> inspect results`

to:

`see the catalog -> reference the right resource directly -> reason from attached content`

That is exactly the kind of efficiency gain the exam is hinting at when it says resources reduce exploratory tool calls.

### Resource catalogs are especially good for stable content maps

Resources are a strong fit when the real problem is not "execute an action" but "know what data exists."

Good fits:

- docs trees
- issue summaries
- incident runbooks
- schemas
- internal service catalogs

Weaker fits:

- high-frequency mutating actions
- complex workflows that still require procedural tool calls

The exam principle is:

- if the agent keeps wasting turns discovering the landscape, expose the landscape directly

### Prompts are a current-doc extension worth knowing

Current Claude Code also lets MCP servers expose prompts that appear as commands such as `/mcp__servername__promptname`.

This is useful in practice for repeated workflows, but it is not the main point of the Topic 2.4 outline. Treat it as a current-platform extension:

- tools expose actions
- resources expose content
- prompts expose reusable workflow starters

## Why Claude Sometimes Prefers Built-Ins Over MCP Tools

This is one of the most practical exam traps.

Even if the MCP server is connected correctly, Claude may still choose a built-in tool such as search, file reading, or grep-like exploration if the MCP tool surface is weak.

Typical reasons:

- the MCP tool name is vague
- the description does not explain when it is better than the built-in alternative
- the output is noisy or low-signal
- the tool feels too generic or too risky

Example:

- a vague `search` or `lookup` MCP tool may lose to built-in `Grep` or project search behavior
- a strong `jira_get_issue_context` tool that returns issue summary, status, owner, linked PRs, and acceptance criteria is much easier for Claude to select correctly

This ties Topic 2.4 back to Topic 2.1:

- MCP integration quality depends heavily on tool-interface quality

### How to make MCP tools win the comparison

Use names and descriptions that explain:

- what system the tool operates on
- what entity it retrieves or changes
- what it returns
- when to use it instead of a built-in
- what it does not do

Prefer outputs that are:

- structured
- concise
- rich in domain meaning
- light on irrelevant raw payloads

If the server exposes domain-aware capabilities but the tool descriptions make them sound like generic fetch wrappers, Claude has no reason to prefer them.

## Current Nuance: "All Tools Are Available" Does Not Mean "All Tool Descriptions Must Be Preloaded"

The exam guide phrases this topic as if tools from configured MCP servers are discovered together and available to the agent.

That is directionally correct, but current Claude Code adds an important nuance:

- when MCP tool descriptions would consume too much context, Claude Code can use MCP Tool Search and deferred loading

In other words:

- connected servers still contribute to the overall capability pool
- but Claude Code may not load every tool description into context upfront

This is a good example of how to reconcile exam wording with current behavior:

- the exam tests the architectural idea that connected MCP servers extend Claude's available capabilities
- current Claude Code optimizes how those capabilities are surfaced when the tool catalog gets large

For exam answers, do not overcomplicate this unless the question is specifically about current Claude Code behavior. The durable lesson is:

- large MCP catalogs need discoverability and loading discipline, not just more connected servers

## Claude Code Workflow Guidance

A practical workflow for Topic 2.4 in Claude Code looks like this:

### 1. Decide the right scope first

Ask:

- is this shared team tooling
- a private cross-project utility
- or a one-repo local experiment

Then choose:

- project scope for team-shared `.mcp.json`
- user scope for private cross-project utilities
- local scope for current-project experiments or sensitive personal setup

### 2. Keep secrets out of shared config

Use environment-variable expansion instead of committing raw tokens, passwords, or private URLs when those values differ per user.

### 3. Prefer proven integrations for standard systems

For common services such as Jira, GitHub, Notion, or Sentry, start by evaluating an existing vendor-provided or community server before building your own.

Why this is often the better answer:

- lower implementation cost
- faster time to value
- more realistic maintenance story

A custom MCP server makes more sense when:

- the workflow is team-specific
- the underlying systems are internal
- the standard server does not expose the needed business logic

### 4. Improve discoverability, not just connectivity

Check whether the server exposes:

- well-described tools
- high-signal outputs
- useful resources for catalogs or indexes
- prompts for common workflow entry points if repeated command execution matters

### 5. Review actual transcripts

Look for signs that Claude is:

- ignoring the MCP tools
- overusing built-ins
- wasting turns discovering available data
- using the right tool but receiving too much noise

Then refine the server surface, not only the prompt.

## Agent Workflow Guidance Beyond Claude Code

The topic title also mentions agent workflows, which matters because not every production system runs inside Claude Code.

### In API-driven workflows, think per agent invocation

Current Anthropic API docs for the MCP connector use:

- `mcp_servers` to define remote server connections
- `mcp_toolset` entries in `tools` to decide which tools from each server are enabled and how they are loaded

That means the agent-workflow question becomes:

- which MCP servers and tools should this particular agent call receive

This is Topic 2.4 meeting Topic 2.3.

Good pattern:

- the retrieval agent gets the relevant documentation and ticketing MCP toolsets
- the reporting agent gets a smaller set, maybe with verification tools only
- destructive or high-risk tools are disabled unless the agent truly owns that action

### Current API limitation worth knowing

Current Anthropic docs say the Messages API MCP connector supports tool calls, not the full MCP feature set, and it connects to remote HTTP-based MCP servers rather than local stdio servers.

That means:

- Claude Code can use resources and prompt-style workflow affordances from MCP
- API-side MCP integration is currently more tool-centric

For exam prep, the durable conclusion is:

- do not assume every Anthropic interface exposes every MCP capability in the same way

### Example: API-side MCP configuration

```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 1200,
  "messages": [
    {
      "role": "user",
      "content": "Investigate issue ENG-4521 and summarize the relevant context."
    }
  ],
  "mcp_servers": [
    {
      "type": "url",
      "name": "jira",
      "url": "https://mcp.company.example/jira",
      "authorization_token": "JIRA_TOKEN_FROM_RUNTIME"
    },
    {
      "type": "url",
      "name": "docs",
      "url": "https://mcp.company.example/docs",
      "authorization_token": "DOCS_TOKEN_FROM_RUNTIME"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "jira"
    },
    {
      "type": "mcp_toolset",
      "mcp_server_name": "docs",
      "default_config": {
        "enabled": true,
        "defer_loading": true
      }
    }
  ]
}
```

This example is useful because it highlights a current-production distinction:

- Claude Code decides MCP server availability through scope files and CLI management
- API workflows decide MCP server availability per request or per agent invocation

## When to Build a Custom MCP Server

The exam outline pushes you toward a pragmatic answer:

- use an existing standard server when the integration is standard
- build a custom server when the workflow is specific

That is the right production instinct.

### Prefer an existing server when:

- the service is a common external platform
- the required workflow is conventional
- the server is already maintained well enough for your risk tolerance
- your main problem is integration, not domain modeling

### Build a custom server when:

- the workflow depends on private systems or internal business objects
- the agent needs task-shaped capabilities that standard servers do not expose
- you need stricter output formats, policies, or resource catalogs than the generic server provides

The stronger exam answer is usually:

- avoid unnecessary custom surface area
- customize where the business logic actually lives

## Common Mistakes

- Putting a personal experimental server into `.mcp.json`, which turns one developer's local preference into team configuration.
- Hardcoding API keys or bearer tokens in shared MCP config instead of using environment-variable expansion.
- Forgetting that current Claude Code also has `local` scope and treating project versus user as the only possible distinction.
- Confusing Claude Code settings files with MCP server config files.
- Assuming that because an MCP server is connected, Claude will automatically prefer it over built-in tools.
- Exposing only tools when the real discoverability problem calls for resources or a catalog.
- Building a custom MCP server for a standard SaaS integration before checking whether a maintained existing server already solves the need.
- Giving every agent access to every MCP server, which weakens specialization and increases blast radius.
- Assuming Claude Code MCP features and API MCP connector features are identical.
- Treating "all connected tools are available" as "all tool descriptions should always be loaded into context upfront," ignoring current tool-search and deferred-loading behavior.

## Exam Takeaways

If you remember only a few things for Topic 2.4, remember these:

1. Put team-shared MCP integrations in project-scoped `.mcp.json`; keep personal or experimental integrations out of shared repo config.
2. In current Claude Code, `user` and `project` are not the full picture; `local` scope also exists and is often the right place for one-project private experiments.
3. Use environment-variable expansion to share configuration without committing secrets.
4. MCP integration quality depends on discoverability as much as connectivity. Strong tool descriptions and useful resources matter.
5. Resources are a good answer when the agent needs a browsable content map, not just another action tool.
6. Prefer maintained existing servers for standard integrations; reserve custom servers for team-specific workflows and business logic.
7. In Claude Code, MCP can expose more than tools. In the current API MCP connector, integration is more tool-centric.
8. Large MCP catalogs need scoping, good descriptions, and sometimes deferred loading or tool search rather than indiscriminate exposure.

## Quick Self-Check

You understand Topic 2.4 if you can answer yes to these questions:

- Can I explain when an MCP server belongs in project scope, user scope, or local scope?
- Can I explain why `.mcp.json` should usually contain shared server definitions but not raw secrets?
- Can I describe how MCP resources reduce exploratory tool calls compared with purely tool-driven discovery?
- Can I explain why Claude might still choose built-in tools over an MCP tool that is technically available?
- Can I distinguish Claude Code MCP configuration from API-side MCP connector configuration?
- Can I explain when an existing Jira- or GitHub-style server is a better choice than writing a custom server?

## References

- Local course outline: [factory/course-outline.md](./factory/course-outline.md)
- Local exam guide: [claude-certified-architect-foundations-certification-exam-guide.md](./claude-certified-architect-foundations-certification-exam-guide.md)
- Anthropic, "Connect Claude Code to tools via MCP": https://code.claude.com/docs/en/mcp
- Anthropic, "Claude Code settings": https://code.claude.com/docs/en/settings
- Anthropic, "MCP connector": https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- Anthropic, "Writing effective tools for agents": https://www.anthropic.com/engineering/writing-tools-for-agents
