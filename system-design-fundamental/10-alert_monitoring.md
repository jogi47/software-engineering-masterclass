# Alert Monitoring

[← Back to Index](README.md)

Your dashboards look great during the day. Metrics are flowing, traces are searchable, and logs are centralized. Then at 3 AM, the database connection pool gets exhausted, checkout starts failing, and nobody notices until customers complain.

That is the gap between **having observability data** and **acting on it in time**.

This is where **alert monitoring** matters. Alerts turn passive telemetry into active incident detection, but only if they are designed carefully. Bad alerts create noise, wake people up for normal behavior, and eventually get ignored. Good alerts are actionable, prioritized, and routed to the right people.

In this chapter, you will learn:
  * [Why alerting exists and what it should accomplish](#1-the-purpose-of-alerting)
  * [What makes an alert actionable](#2-designing-good-alerts)
  * [How a typical alerting pipeline works](#3-alerting-architecture)
  * [How routing and escalation should be structured](#4-alert-routing-and-escalation)
  * [How to reduce alert fatigue](#5-reducing-alert-fatigue)
  * [How on-call practices affect alert quality](#6-on-call-best-practices)
  * [Which alert patterns work well in production](#7-common-alerting-patterns)
  * [Which anti-patterns create noise and outages](#8-common-alerting-anti-patterns)
  * [How to implement alerts pragmatically](#9-practical-implementation-pattern)
  * [What to include in your alerting checklist](#10-summary)


# 1. The Purpose of Alerting

Monitoring shows the state of your system. Alerting decides when that state needs attention now.

### The Core Question

An alert should answer:

```text
Does a human need to know about this right now?
```

If the answer is no, it probably should not page someone.

### What Alerts Should Do

Good alerts help you:
- detect incidents quickly
- reduce time to response
- surface user-visible failures
- catch capacity problems before they become outages
- escalate issues when automatic recovery is not enough

### What Alerts Should Not Do

Alerts should not:
- duplicate every dashboard panel
- notify on every minor anomaly
- page for events that self-heal routinely
- replace logs, traces, or dashboards

### A Practical Model

```
Telemetry
  -> metrics show degradation
  -> alert rule evaluates thresholds or error budgets
  -> notification reaches the right responder
  -> responder uses dashboards, traces, and logs to diagnose
```

Alerting is not the diagnosis system. It is the wake-up system.


# 2. Designing Good Alerts

The best alert is actionable, meaningful, and tied to an operational response.

### Actionable Means Clear Next Steps

A responder should be able to answer:
- what is failing
- how severe it is
- what users are affected
- where to start investigating

### Good Alert Properties

A good alert is:
- tied to user impact or real operational risk
- specific enough to reduce guesswork
- stable enough to avoid flapping
- urgent enough to justify interruption

### Bad vs Good

```
Bad:
├── "cpu high"
├── "error happened"
├── "latency spike"
└── pages every time load changes briefly

Good:
├── checkout 5xx rate > 5% for 10 minutes
├── payment dependency timeout rate above baseline
├── db connection pool saturation sustained above 90%
└── checkout p95 latency above SLO threshold for 15 minutes
```

### Symptom-Based vs Cause-Based Alerts

Symptom-based alerts focus on what users experience:
- error rate
- high latency
- request failures
- unavailability

Cause-based alerts focus on internal precursors:
- disk nearly full
- queue backlog rising
- certificate nearing expiration
- DB pool saturation

In practice, you usually want both, but symptom-based alerts are often the higher priority for paging.

### Add Time Windows Carefully

Short spikes happen in healthy systems. That is why alert rules usually include conditions like:

```text
error_rate > 5% for 10m
queue_depth > 10000 for 15m
availability < 99.5% over 30m
```

The goal is to avoid paging on noise while still catching sustained problems.


# 3. Alerting Architecture

A typical alerting pipeline looks like this:

```
┌──────────────┐      ┌──────────────┐      ┌───────────────┐
│ Instrumented │─────▶│ Metrics /    │─────▶│ Alert Rules   │
│ services     │      │ logs / traces│      │ evaluation    │
└──────────────┘      └──────────────┘      └───────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Alert manager / │
                                              │ dedup / routing │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Pager / chat /  │
                                              │ ticket / email  │
                                              └─────────────────┘
```

### Common Components

- telemetry source: services, queues, databases, infrastructure
- rule engine: evaluates alert conditions
- alert manager: deduplicates, groups, silences, and routes alerts
- notification channels: pager, chat, email, ticketing

### Metrics, Logs, and Trace Alerts

Metrics are the most common basis for operational alerts because they are efficient for threshold and rate evaluation.

Logs can also drive alerts for specific patterns such as:
- repeated auth failures
- crash loops
- audit anomalies

Traces can support alerting too, especially around latency or error trends, though they are often used more for diagnosis than first-line paging.

### Link Alerts to Investigation Data

Every useful alert should ideally include:
- alert name and severity
- affected service
- current value and threshold
- time window
- runbook or dashboard link
- ownership information


# 4. Alert Routing and Escalation

An alert is only useful if it reaches the right responder at the right time.

### Basic Routing Model

```
Severity:
  -> critical: page primary on-call
  -> high: notify team channel and secondary escalation
  -> medium: create ticket or business-hours notification
  -> low: dashboard only or backlog review
```

### Route by Ownership

Common routing keys include:
- service name
- team name
- environment
- severity
- region

### Escalation Flow

```
Critical alert
  -> primary on-call paged
  -> no acknowledgement in 5 minutes
  -> secondary on-call paged
  -> still unresolved
  -> incident commander or manager escalation
```

### Deduplication and Grouping

Without grouping, one underlying failure can create dozens of near-identical alerts.

Grouping is useful for events like:
- many hosts failing in the same region
- repeated alerts from the same service outage
- a burst of dependency errors caused by one upstream incident

### Silence and Maintenance Windows

Planned work needs controlled suppression.

Use silences or maintenance windows for:
- deployments
- schema migrations
- load tests
- regional failover drills

That prevents expected operational events from generating meaningless noise.


# 5. Reducing Alert Fatigue

Alert fatigue happens when responders see so many low-value alerts that they stop trusting the system.

This is one of the biggest operational failures in monitoring programs.

### Common Causes

- thresholds set too low
- no time window or hysteresis
- duplicate alerts from multiple layers
- alerts without ownership
- alerts on symptoms and causes without coordination
- noisy warning alerts sent through paging channels

### How to Reduce It

1. Page only for issues that need immediate human action.
2. Send lower-priority alerts to chat, dashboards, or ticket queues.
3. Review noisy alerts after incidents and tune or delete them.
4. Group duplicate alerts where possible.
5. Use burn-rate or error-budget style alerts for SLO-driven systems.

### Alert Review Questions

After an alert fires, ask:
- Was it actionable?
- Was it timely?
- Was it routed correctly?
- Was the threshold appropriate?
- Did it help reduce user impact?

If the answer is consistently no, fix or remove it.


# 6. On-Call Best Practices

Alerting quality and on-call quality are tightly connected.

Bad alert design makes on-call unsustainable. Weak on-call practice makes even good alerts ineffective.

### Good On-Call Systems Need

- clear ownership
- defined escalation paths
- documented runbooks
- access to dashboards, logs, and traces
- manageable alert volume

### Runbooks Matter

A good alert should not force the responder to start from zero.

Useful runbook content includes:
- what the alert means
- likely causes
- first diagnostic commands or dashboards
- safe mitigations
- escalation criteria

### Example Alert Payload

```text
Alert: checkout_high_5xx_rate
Severity: critical
Service: checkout-api
Condition: 5xx rate > 5% for 10m
Current value: 8.2%
Runbook: go/runbooks/checkout-5xx
Dashboard: grafana/checkouts
Owner: commerce-platform
```

### Post-Incident Feedback Loop

After significant incidents, review:
- which alerts fired
- which alerts should have fired but did not
- which alerts were noisy or redundant
- whether the runbook helped

Good teams treat alerts as production code that needs continuous improvement.


# 7. Common Alerting Patterns

### 1. Symptom Alerts

These focus on user-visible problems.

Examples:
- high 5xx rate
- elevated request latency
- drop in successful checkouts
- API availability below target

### 2. Saturation Alerts

These catch exhaustion risks.

Examples:
- queue backlog growing too fast
- DB connection pool near capacity
- memory pressure sustained
- disk space approaching limit

### 3. Dead Man's Switch

This pattern alerts when expected signals stop arriving.

Examples:
- heartbeat metric missing
- scheduled job stopped running
- backup success metric absent

### 4. Error Budget and Burn Rate Alerts

For SLO-based systems, alerts can be tied to how quickly the service is consuming its error budget.

This often helps prioritize user-impacting issues better than simple static thresholds alone.

### 5. Composite Alerts

Sometimes one signal is too noisy by itself.

A composite pattern might require:

```text
high latency
AND
high error rate
AND
traffic above minimum threshold
```

That can reduce false positives in low-traffic environments.


# 8. Common Alerting Anti-Patterns

### 1. Paging on CPU Alone

High CPU is not always a problem. It may reflect healthy load.

Without user impact or saturation context, this is often a noisy page.

### 2. Alerting on Every Host Separately

Large fleets need grouping. Otherwise one regional issue can trigger dozens or hundreds of pages.

### 3. Alerting Without Runbooks

An alert without response guidance increases time-to-diagnosis.

### 4. Static Thresholds for Highly Variable Traffic

A fixed number can be too sensitive at peak and too blind at off-hours.

### 5. No Minimum Traffic Guardrails

A tiny service can show a large error percentage from only a few requests.

Traffic floors can help avoid misleading alerts.

### 6. Never Retiring Old Alerts

Systems change. Old alerts accumulate and become background noise.

### Good vs Bad

```
Bad:
├── pages for every transient spike
├── duplicated alerts across many hosts
├── unclear ownership
└── no runbook or dashboard links

Good:
├── user-impacting alerts page humans
├── warning alerts go to lower-noise channels
├── alerts include context and response links
└── alert rules are reviewed and tuned regularly
```


# 9. Practical Implementation Pattern

A pragmatic alerting design usually starts with service-level metrics and a small set of high-value rules.

### Baseline Service Alerts

For each critical service, start with:
- elevated 5xx or failure rate
- elevated p95 or p99 latency
- availability below target
- dependency failure or timeout rate
- saturation of a key bottleneck

### Example Rule Set

```yaml
groups:
  - name: checkout-alerts
    rules:
      - alert: CheckoutHighErrorRate
        expr: (
          rate(http_requests_total{service="checkout",status_code=~"5.."}[10m])
          / rate(http_requests_total{service="checkout"}[10m])
        ) > 0.05
          and rate(http_requests_total{service="checkout"}[10m]) > 1
        for: 10m
        labels:
          severity: critical
          team: commerce-platform
        annotations:
          summary: "checkout 5xx rate is above 5%"
          runbook: "go/runbooks/checkout-5xx"

      - alert: CheckoutHighLatencyP95
        expr: histogram_quantile(
          0.95,
          sum(rate(http_request_duration_seconds_bucket{service="checkout"}[10m])) by (le)
        ) > 0.3
        for: 15m
        labels:
          severity: high
          team: commerce-platform
        annotations:
          summary: "checkout p95 latency is above 300ms"
          runbook: "go/runbooks/checkout-latency"
```

### Implementation Guidance

- keep the first version small and high-signal
- test alerts during game days or failure drills
- make severity mappings explicit
- add links to dashboards and runbooks
- review fired alerts regularly
- add traffic floors where percentage-based alerts would be misleading at low volume


# 10. Summary

**Alert monitoring turns observability into response:**
- Metrics, logs, and traces are only useful operationally when the right people are notified in time.
- Alerting should focus on action, not noise.
- The goal is timely detection of meaningful problems.

**Good alerts are specific and actionable:**
- They describe a real issue.
- They are tied to user impact or operational risk.
- They include enough context for the responder to start immediately.

**Routing and review matter as much as thresholds:**
- Alerts need ownership, escalation, and maintenance controls.
- Noisy rules should be tuned or removed.
- Runbooks and post-incident reviews improve alert quality over time.

**Implementation checklist:**

```text
Design:
  □ Page only for issues needing immediate human action
  □ Prefer symptom-based paging alerts for user-impacting failures
  □ Add cause-based alerts where they prevent bigger incidents

Routing:
  □ Route alerts by severity and team ownership
  □ Configure escalation for unacknowledged critical alerts
  □ Use grouping, deduplication, and maintenance windows

Operations:
  □ Include runbook and dashboard links in alerts
  □ Review noisy alerts after incidents
  □ Retire outdated or low-value rules
  □ Test important alerts during drills or controlled failures
```
