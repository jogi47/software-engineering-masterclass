# Claude Architect Foundations

This folder contains study material for the Claude Certified Architect Foundations certification. The content is organized as a broad exam guide plus focused topic notes that go deeper on individual task statements.

## Current Coverage

The current note set covers Domain 1 in full, the first five Domain 2 tool-integration notes, the opening six Domain 3 Claude Code workflow notes, the first six Domain 4 prompt-engineering and structured-output notes, and the opening four Domain 5 context-management, escalation, error-propagation, and large-codebase-exploration notes:

- [claude-certified-architect-foundations-certification-exam-guide.md](claude-certified-architect-foundations-certification-exam-guide.md) - Full study guide with domains, scenarios, sample questions, and preparation advice
- [topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md](topic-1.1-design-and-implement-agentic-loops-for-autonomous-task-execution.md) - Agent loop control, `stop_reason`, and tool-result feedback
- [topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md](topic-1.2-orchestrate-multi-agent-systems-with-coordinator-subagent-patterns.md) - Coordinator-subagent architecture and delegation boundaries
- [topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md](topic-1.3-configure-subagent-invocation-context-passing-and-spawning.md) - Subagent setup, context handoff, and spawning patterns
- [topic-1.4-implement-multi-step-workflows-with-enforcement-and-handoff-patterns.md](topic-1.4-implement-multi-step-workflows-with-enforcement-and-handoff-patterns.md) - Deterministic workflow enforcement and human handoff design
- [topic-1.5-apply-agent-sdk-hooks-for-tool-call-interception-and-data-normalization.md](topic-1.5-apply-agent-sdk-hooks-for-tool-call-interception-and-data-normalization.md) - Hooks, interception points, and normalization workflows
- [topic-1.6-design-task-decomposition-strategies-for-complex-workflows.md](topic-1.6-design-task-decomposition-strategies-for-complex-workflows.md) - Sequential, adaptive, and parallel task decomposition
- [topic-1.7-manage-session-state-resumption-and-forking.md](topic-1.7-manage-session-state-resumption-and-forking.md) - Session continuity, resumption, and fork-based branching
- [topic-2.1-design-effective-tool-interfaces-with-clear-descriptions-and-boundaries.md](topic-2.1-design-effective-tool-interfaces-with-clear-descriptions-and-boundaries.md) - Tool descriptions, interface boundaries, and selection reliability
- [topic-2.2-implement-structured-error-responses-for-mcp-tools.md](topic-2.2-implement-structured-error-responses-for-mcp-tools.md) - Structured MCP tool failures, retryability, and recovery design
- [topic-2.3-distribute-tools-appropriately-across-agents-and-configure-tool-choice.md](topic-2.3-distribute-tools-appropriately-across-agents-and-configure-tool-choice.md) - Role-based tool scoping, constrained tool exposure, and `tool_choice` control
- [topic-2.4-integrate-mcp-servers-into-claude-code-and-agent-workflows.md](topic-2.4-integrate-mcp-servers-into-claude-code-and-agent-workflows.md) - MCP server scoping, shared versus personal setup, discoverability, and current Claude Code versus API integration nuance
- [topic-2.5-select-and-apply-built-in-tools-read-write-edit-bash-grep-glob-effectively.md](topic-2.5-select-and-apply-built-in-tools-read-write-edit-bash-grep-glob-effectively.md) - Built-in tool selection, incremental codebase exploration, `Edit` versus `Read` plus `Write`, and current Claude Code versus API tool-surface nuance
- [topic-3.1-configure-claude-md-files-with-appropriate-hierarchy-scoping-and-modular-organization.md](topic-3.1-configure-claude-md-files-with-appropriate-hierarchy-scoping-and-modular-organization.md) - `CLAUDE.md` hierarchy, shared versus personal scope, `@import`, `.claude/rules/`, and `/memory`-based debugging
- [topic-3.2-create-and-configure-custom-slash-commands-and-skills.md](topic-3.2-create-and-configure-custom-slash-commands-and-skills.md) - Skills as the current custom-command model, project versus personal scope, `context: fork`, invocation controls, and when to use a skill instead of always-loaded memory
- [topic-3.3-apply-path-specific-rules-for-conditional-convention-loading.md](topic-3.3-apply-path-specific-rules-for-conditional-convention-loading.md) - Path-scoped `.claude/rules/`, `paths` glob patterns, conditional loading behavior, and when to prefer path rules over nested `CLAUDE.md`
- [topic-3.4-determine-when-to-use-plan-mode-vs-direct-execution.md](topic-3.4-determine-when-to-use-plan-mode-vs-direct-execution.md) - Plan mode versus execution-oriented workflows, current permission-mode terminology, investigation subagents, and when to plan first versus implement immediately
- [topic-3.5-apply-iterative-refinement-techniques-for-progressive-improvement.md](topic-3.5-apply-iterative-refinement-techniques-for-progressive-improvement.md) - Iterative refinement through concrete examples, executable verification, interview-style clarification, and the judgment to batch interacting issues while separating independent ones
- [topic-3.6-integrate-claude-code-into-ci-cd-pipelines.md](topic-3.6-integrate-claude-code-into-ci-cd-pipelines.md) - Headless CI execution, structured automation output, `CLAUDE.md` as shared pipeline context, independent review runs, deduplicated re-reviews, and higher-value test generation
- [topic-4.1-design-prompts-with-explicit-criteria-to-improve-precision-and-reduce-false-positives.md](topic-4.1-design-prompts-with-explicit-criteria-to-improve-precision-and-reduce-false-positives.md) - Explicit review criteria, trust-preserving scope control, severity rubrics, and prompt patterns for reducing noisy CI findings
- [topic-4.2-apply-few-shot-prompting-to-improve-output-consistency-and-quality.md](topic-4.2-apply-few-shot-prompting-to-improve-output-consistency-and-quality.md) - Few-shot prompting for ambiguous-case handling, output-shape stability, acceptable-versus-reportable boundary teaching, and varied-format extraction reliability
- [topic-4.3-enforce-structured-output-using-tool-use-and-json-schemas.md](topic-4.3-enforce-structured-output-using-tool-use-and-json-schemas.md) - Tool-use and structured-output guarantees, `tool_choice` trade-offs, schema design for abstention, and the boundary between schema validity and semantic correctness
- [topic-4.4-implement-validation-retry-and-feedback-loops-for-extraction-quality.md](topic-4.4-implement-validation-retry-and-feedback-loops-for-extraction-quality.md) - Semantic validation, retry-with-error-feedback, source-missing versus fixable failures, and pattern-tracking loops for extraction quality improvement
- [topic-4.5-design-efficient-batch-processing-strategies.md](topic-4.5-design-efficient-batch-processing-strategies.md) - Message Batches API fit, SLA-aware submission cadence, `custom_id` correlation, and selective retry strategies for large async workloads
- [topic-4.6-design-multi-instance-and-multi-pass-review-architectures.md](topic-4.6-design-multi-instance-and-multi-pass-review-architectures.md) - Independent review runs, per-file and integration review passes, verification stages, and confidence-aware routing for higher-trust code review
- [topic-5.1-manage-conversation-context-to-preserve-critical-information-across-long-interactions.md](topic-5.1-manage-conversation-context-to-preserve-critical-information-across-long-interactions.md) - Context fidelity across long interactions, persistent fact blocks, structured issue state, and current Anthropic context-engineering terminology
- [topic-5.2-design-effective-escalation-and-ambiguity-resolution-patterns.md](topic-5.2-design-effective-escalation-and-ambiguity-resolution-patterns.md) - Resolve versus clarify versus escalate boundaries, explicit human-request handling, policy-gap escalation, and current Anthropic clarification workflow terminology
- [topic-5.3-implement-error-propagation-strategies-across-multi-agent-systems.md](topic-5.3-implement-error-propagation-strategies-across-multi-agent-systems.md) - Structured subagent failure propagation, partial-progress preservation, coordinator recovery logic, and current `Task` versus `Agent` terminology mapping
- [topic-5.4-manage-context-effectively-in-large-codebase-exploration.md](topic-5.4-manage-context-effectively-in-large-codebase-exploration.md) - Scratchpads, subagent-scoped exploration, phase summaries, compaction timing, and structured resume manifests for long codebase investigations

## How To Use This Folder

- Start with the full exam guide if you want the big picture.
- Read the topic notes when you want to study a single task statement in more depth.
- Use the shared terminology carefully when the exam wording and current Anthropic docs do not match exactly.

## What Comes Next

The current material is strongest on Domain 1, covers the early part of Domain 2 through Topic 2.5, extends Domain 3 through Topic 3.6, carries Domain 4 through Topic 4.6, and now extends Domain 5 through Topic 5.4. Future notes can extend the same format through the rest of Domain 5 while keeping the exam guide and topic index aligned.
