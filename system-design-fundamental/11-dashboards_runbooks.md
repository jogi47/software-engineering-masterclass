# Dashboards and Runbooks

[← Back to Index](README.md)

An alert fires at 3 AM: checkout errors are rising, latency is climbing, and customers are complaining. The on-call engineer opens the monitoring tool and sees fifty charts, six tabs, and no obvious answer. Then they search the wiki and find three outdated runbooks that disagree with each other.

That is the difference between **having telemetry** and **being able to respond effectively**.

This is where **dashboards and runbooks** matter. Dashboards turn raw telemetry into fast operational visibility. Runbooks turn scattered tribal knowledge into repeatable response steps. Together they reduce confusion, speed up incident response, and make on-call work more reliable.

In this chapter, you will learn:
  * [Why dashboards and runbooks matter during incidents](#1-why-dashboards-and-runbooks-matter)
  * [How dashboard hierarchy should be organized](#2-dashboard-hierarchy)
  * [What makes a dashboard useful instead of noisy](#3-dashboard-design-principles)
  * [How to build graphs that support diagnosis](#4-building-effective-graphs)
  * [What a runbook is and when to use one](#5-what-runbooks-are)
  * [How a runbook should be structured](#6-runbook-structure)
  * [How to write effective operational guidance](#7-writing-effective-runbooks)
  * [How dashboards, runbooks, and alerts should connect](#8-connecting-dashboards-runbooks-and-alerts)
  * [How to maintain them over time](#9-maintenance-and-governance)
  * [What to include in your implementation checklist](#10-summary)


# 1. Why Dashboards and Runbooks Matter

Metrics, logs, traces, and alerts are necessary, but they are not enough by themselves.

During an incident, responders need two things immediately:
- a fast view of system state
- a clear next step

Dashboards provide the first. Runbooks provide the second.

### Without Them

```
Alert fires
  -> responder opens random charts
  -> context is missing
  -> investigation starts from zero
  -> tribal knowledge is required
  -> response is slow and inconsistent
```

### With Them

```
Alert fires
  -> alert links to dashboard
  -> dashboard shows service health and likely bottlenecks
  -> alert links to runbook
  -> runbook gives first checks and safe mitigations
  -> responder moves quickly and consistently
```

### Practical Benefits

Good dashboards and runbooks help you:
- reduce time to detection and diagnosis
- improve consistency across on-call rotations
- make junior responders more effective
- capture knowledge that would otherwise stay tribal
- lower stress during incidents


# 2. Dashboard Hierarchy

Not every dashboard should answer the same question.

The cleanest approach is to organize dashboards by level of decision-making.

### A Useful Hierarchy

```
Executive / business overview
  -> service overview
     -> dependency dashboard
        -> infrastructure dashboard
           -> deep-dive debug dashboard
```

### 1. Overview Dashboards

These answer:
- is the service healthy
- are users impacted
- is traffic normal

Typical panels:
- request rate
- error rate
- latency percentiles
- saturation indicators
- recent deployments or incidents

### 2. Service Dashboards

These are owned by a team and focus on one application or service.

Typical panels:
- golden signals
- dependency latency and failure rate
- queue backlog
- cache hit ratio
- business outcomes such as successful checkouts

### 3. Dependency Dashboards

These focus on critical shared systems:
- database
- cache
- message broker
- external API provider

They are useful when a service dashboard shows symptoms but the root cause may be downstream.

### 4. Deep-Dive Dashboards

These are for diagnosis, not routine monitoring.

Examples:
- JVM GC behavior
- thread pool internals
- Kafka partition lag by consumer group
- per-endpoint latency buckets

### The Rule

Start broad, then drill down.

The first dashboard should tell you whether the system is healthy. Later dashboards should explain why it is not.


# 3. Dashboard Design Principles

A dashboard is useful only if a responder can read it quickly and trust what it shows.

### Good Dashboard Principles

- show the most important signals first
- group related panels together
- use consistent time ranges and units
- make changes over time obvious
- avoid excessive panel count

### Bad vs Good

```
Bad:
├── dozens of unrelated charts
├── different units on every panel
├── unclear titles
└── no obvious story about system health

Good:
├── top row shows golden signals
├── panels grouped by question
├── titles describe what is measured
└── drill-down path is obvious
```

### Design for Questions

Each section of a dashboard should answer a concrete question.

Examples:
- Are users impacted?
- Is demand higher than normal?
- Is a dependency failing?
- Is the service saturated?

If a panel does not help answer an operational question, it may not belong on the dashboard.

### Consistency Matters

Keep these consistent across dashboards:
- color meaning
- units
- naming
- panel order
- environment labels

Responders should not need to relearn the UI during an incident.


# 4. Building Effective Graphs

Graphs are not decoration. They are decision tools.

### Start with the Right Metric

Use:
- rates for throughput and errors
- percentiles for latency
- gauges for current capacity or saturation
- counters with rate functions for totals over time

### Pair Related Signals

The fastest dashboards often place related panels together:

```
Requests | Errors | p95 latency | saturation
```

That makes correlation easier during incidents.

### Show Context on the Graph

Useful context includes:
- deployment markers
- incident annotations
- threshold lines
- baseline comparisons

### Example Service Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Checkout Service Overview                                   │
├──────────────────────────────────────────────────────────────┤
│ Request rate │ Error rate │ p95 latency │ DB pool usage     │
├──────────────────────────────────────────────────────────────┤
│ Payment dependency latency │ Payment error rate             │
├──────────────────────────────────────────────────────────────┤
│ Queue backlog │ Cache hit ratio │ Successful checkouts      │
└──────────────────────────────────────────────────────────────┘
```

### Avoid Misleading Visuals

Be careful with:
- stacked charts that hide per-series changes
- auto-scaling axes that minimize obvious spikes
- inconsistent intervals across related graphs
- too many series on one panel

The graph should make anomalies easier to see, not harder.


# 5. What Runbooks Are

A runbook is a documented procedure for responding to an operational event.

It tells the responder what the alert means, how to investigate, and which actions are safe to take.

### What a Runbook Is For

Runbooks are useful for:
- recurring alerts
- common failure modes
- routine operational procedures
- incident mitigation steps
- escalation guidance

### What It Is Not

A runbook is not:
- a vague architecture document
- a giant incident retrospective dump
- a personal checklist only one engineer understands

### A Practical Definition

```
Runbook:
  -> what this issue means
  -> how to verify it
  -> what to do first
  -> what not to do
  -> when to escalate
```

That is the minimum bar for operational usefulness.


# 6. Runbook Structure

A runbook should be short enough to scan during an incident and structured enough to reduce ambiguity.

### Recommended Structure

```text
Title
Purpose
Symptoms
Impact
Primary checks
Likely causes
Mitigation steps
Escalation path
Recovery validation
References and links
```

### Example Skeleton

```markdown
# checkout high 5xx rate

Purpose:
Handle sustained elevated 5xx responses from checkout-api.

Symptoms:
- alert `CheckoutHighErrorRate` firing
- customer checkout failures

Primary checks:
1. Open service overview dashboard.
2. Check recent deployment markers.
3. Inspect payment dependency latency and timeout rate.
4. Check DB connection pool saturation.

Mitigations:
1. Roll back latest deployment if correlated.
2. Shift traffic if one region is degraded.
3. Enable degraded checkout mode if supported.

Escalate when:
- payment provider outage persists
- error rate remains above threshold after mitigation
```

### Keep It Operational

A responder should be able to move from alert to action without reading a long essay.


# 7. Writing Effective Runbooks

The quality of the writing directly affects incident response quality.

### Good Runbooks Are

- concise
- explicit
- current
- safe
- easy to follow under pressure

### Write for the On-Call Context

Assume the reader:
- may be tired
- may not be the service expert
- needs fast orientation
- needs safe first actions

### Use Clear Commands and Decisions

Good:

```text
1. Check `payment_timeout_rate` on the checkout dashboard.
2. If the timeout rate is elevated only in one region, shift traffic away.
3. If all regions are affected, escalate to the payments team.
```

Bad:

```text
Look around the payment system and see if anything seems wrong.
```

### Include Guardrails

Runbooks should document:
- risky actions
- rollback criteria
- when to stop and escalate
- how to confirm recovery

### Keep Ownership Visible

Every runbook should clearly identify:
- owning team
- last review date
- related alerts
- related dashboards


# 8. Connecting Dashboards, Runbooks, and Alerts

These three tools work best as one response loop.

### The Desired Flow

```
Alert
  -> links to dashboard
  -> dashboard shows current state and likely failure area
  -> alert links to runbook
  -> runbook gives checks and mitigations
  -> responder confirms recovery on dashboard
```

### What to Connect

Every important alert should include:
- dashboard link
- runbook link
- service owner
- severity
- query or threshold context

Every runbook should include:
- the alerts it supports
- the dashboards to open first
- the logs or traces to inspect next

Every dashboard should make it easy to jump to:
- logs
- traces
- related service dashboards
- incident notes if your tooling supports them

### Example Alert Payload

```text
Alert: CheckoutHighLatencyP95
Severity: high
Service: checkout-api
Dashboard: grafana/checkout-overview
Runbook: go/runbooks/checkout-latency
Owner: commerce-platform
```

That turns an alert from a notification into a response entry point.


# 9. Maintenance and Governance

Dashboards and runbooks decay unless someone owns them.

This is where many teams fail: the first version is created, but nobody maintains it after the architecture changes.

### Governance Rules That Help

- assign owners for dashboards and runbooks
- review them after major incidents
- update them after architecture or alert changes
- remove stale panels and obsolete procedures
- standardize templates for consistency

### Signs of Decay

```
Dashboard decay:
├── panels nobody uses
├── broken queries
├── old service names
└── charts that do not match current architecture

Runbook decay:
├── commands no longer work
├── links are broken
├── escalation path is outdated
└── mitigation steps are no longer safe
```

### Review Triggers

You should review dashboards and runbooks after:
- incidents
- new service launches
- alert tuning changes
- major infrastructure migrations
- ownership changes

### Treat Them as Production Artifacts

They should be versioned, reviewed, and improved like code.


# 10. Summary

**Dashboards provide fast situational awareness:**
- They help responders understand system state at a glance.
- Good dashboards are organized by purpose and drill-down path.
- The best ones highlight health, change, and likely failure areas quickly.

**Runbooks provide repeatable operational guidance:**
- They reduce reliance on tribal knowledge.
- They make on-call response more consistent.
- They should focus on checks, mitigations, guardrails, and escalation.

**Their real value comes from connection:**
- Alerts should link to dashboards and runbooks.
- Dashboards should support diagnosis.
- Runbooks should support safe action and recovery verification.

**Implementation checklist:**

```text
Dashboards:
  □ Create overview dashboards for critical services
  □ Organize dashboards by hierarchy and drill-down path
  □ Put golden signals and key dependencies first
  □ Use consistent units, naming, and layout

Runbooks:
  □ Create runbooks for important alerts and recurring failures
  □ Keep steps concise, explicit, and safe
  □ Include escalation criteria and recovery validation
  □ Show owner and review date clearly

Integration:
  □ Link alerts to dashboards and runbooks
  □ Link runbooks to related alerts, logs, and traces
  □ Review dashboards and runbooks after incidents and major changes
  □ Remove stale panels, broken links, and obsolete procedures
```
