# System Design Fundamentals Index

This folder contains foundational system design topics.
When you add a new `NN-topic_name.md` article, add it to this table in sequence.

| # | Topic | File | Description |
|---|-------|------|-------------|
| 01 | **SSL/TLS Explained** | [01-ssltls_explained.md](01-ssltls_explained.md) | TLS handshake, certificates, encryption |
| 02 | **Role-Based Access Control (RBAC)** | [02-role_based_access_control_rbac.md](02-role_based_access_control_rbac.md) | Roles, permissions, access control models |
| 03 | **Secrets Management** | [03-secrets_management.md](03-secrets_management.md) | Secret lifecycle, dynamic credentials, rotation, tooling |
| 04 | **SAML Explained** | [04-saml_explained.md](04-saml_explained.md) | Enterprise SSO, assertions, bindings, security practices |
| 05 | **Three Pillars of Observability** | [05-three_pillars_of_observability.md](05-three_pillars_of_observability.md) | Logs, metrics, traces, monitoring vs observability, signal correlation |
| 06 | **Log Aggregation** | [06-log_aggregation.md](06-log_aggregation.md) | Centralized logging pipelines, storage architectures, scaling, cost control |
| 07 | **Logging Best Practices** | [07-logging_best_practices.md](07-logging_best_practices.md) | Log levels, structured logging, context design, redaction, performance |
| 08 | **Correlation IDs** | [08-correlation_ids.md](08-correlation_ids.md) | Request/workflow correlation, context propagation, tracing alignment, debugging |
| 09 | **Metrics Instrumentation** | [09-metrics_instrumentation.md](09-metrics_instrumentation.md) | Metric types, golden signals, naming, labels, cardinality, Prometheus-style flow |
| 10 | **Alert Monitoring** | [10-alert_monitoring.md](10-alert_monitoring.md) | Actionable alerts, routing, escalation, alert fatigue, on-call practices |
| 11 | **Dashboards and Runbooks** | [11-dashboards_runbooks.md](11-dashboards_runbooks.md) | Dashboard hierarchy, graph design, runbook structure, incident response linkage |
| 12 | **Distributed Tracing** | [12-distributed_tracing.md](12-distributed_tracing.md) | Traces, spans, propagation, sampling, tracing backends, observability linkage |
| 13 | **Batch vs Stream Processing** | [13-batch_vs_stream_processing.md](13-batch_vs_stream_processing.md) | Bounded vs unbounded data, latency trade-offs, windows, state, micro-batch, architecture choices |
| 14 | **MapReduce** | [14-mapreduce.md](14-mapreduce.md) | Distributed batch processing model, map/shuffle/reduce flow, fault tolerance, combiners, Hadoop, limitations |
| 15 | **ETL Pipelines** | [15-etl_pipelines.md](15-etl_pipelines.md) | Extract, transform, load flow, incremental sync, CDC, ELT trade-offs, orchestration, idempotency, data quality |
| 16 | **Data Lakes** | [16-data_lakes.md](16-data_lakes.md) | Object storage-based analytical data platforms, layered lake design, file formats, partitioning, metadata, governance, and lake vs warehouse trade-offs |
| 17 | **Data Warehousing** | [17-data_warehousing.md](17-data_warehousing.md) | Analytical data platforms for reporting and BI, OLTP vs OLAP, dimensional modeling, loading strategy, historical correctness, and warehouse performance |
| 18 | **Data Lakehouse** | [18-data_lakehouse.md](18-data_lakehouse.md) | Shared analytical tables on object storage, metadata layers, snapshots, transactions, schema evolution, mixed-engine access, and lakehouse trade-offs |
| 19 | **Lambda Architecture** | [19-lambda_architecture.md](19-lambda_architecture.md) | Dual-path data architecture with batch recomputation, low-latency speed views, serving-layer merges, replay, corrections, and trade-offs versus simpler unified pipelines |
| 20 | **Kappa Architecture** | [20-kappa_architecture.md](20-kappa_architecture.md) | Replayable event-log architecture with a single primary stream-processing path, materialized views, stateful projections, historical reprocessing, and trade-offs versus Lambda |
| 21 | **Streaming Engines** | [21-streaming_engines.md](21-streaming_engines.md) | Stream-processing runtimes for unbounded event data, partitioned execution, event time, windows, state, checkpoints, delivery guarantees, engine styles, and practical selection trade-offs |
| 22 | **Service Discovery** | [22-service_discovery.md](22-service_discovery.md) | Dynamic service naming and resolution for distributed systems, including registries, DNS, health-aware routing, discovery patterns, load balancing, and practical reliability trade-offs |
| 23 | **API Gateway Pattern** | [23-api_gateway_pattern.md](23-api_gateway_pattern.md) | Client-facing entry point for distributed systems, including routing, aggregation, edge security policies, rate limiting, gateway styles, and practical trade-offs versus adjacent patterns |
| 24 | **Backend for Frontend (BFF)** | [24-backend_for_frontend_bff.md](24-backend_for_frontend_bff.md) | Client-specific backend layer for web, mobile, or other frontend experiences, including response shaping, composition, ownership models, performance trade-offs, and practical guidance on when to use a BFF |
| 25 | **Sidecar Pattern** | [25-sidecar_pattern.md](25-sidecar_pattern.md) | Colocated helper process for one workload, including local communication models, traffic and credential use cases, resource and security trade-offs, adjacent pattern comparisons, and practical guidance on when a sidecar is worth the overhead |
| 26 | **Circuit Breaker Pattern** | [26-circuit_breaker_pattern.md](26-circuit_breaker_pattern.md) | Dependency protection pattern for distributed systems, including breaker states, threshold tuning, fallback policy, comparisons with retries and timeouts, and practical guidance on preventing cascading failures |
| 27 | **Bulkhead Pattern** | [27-bulkhead_pattern.md](27-bulkhead_pattern.md) | Capacity-isolation pattern for distributed systems, including concurrency compartments, queue and connection-pool isolation, budget selection, comparisons with circuit breakers and rate limits, and practical guidance on preventing noisy-neighbor contention |
| 28 | **Strangler Fig Pattern** | [28-strangler_fig_pattern.md](28-strangler_fig_pattern.md) | Incremental legacy-modernization pattern for replacing a monolith or tightly coupled system in slices, including routing seams, migration strategies, data ownership transitions, reconciliation, and practical guidance on avoiding big-bang rewrite risk |
| 29 | **Service Mesh** | [29-service_mesh.md](29-service_mesh.md) | Dedicated service-to-service communication layer for distributed systems, including data plane and control plane roles, service identity, traffic policy, observability, deployment models, and practical guidance on when a mesh is worth the complexity |
