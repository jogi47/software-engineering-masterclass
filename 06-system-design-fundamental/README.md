# System Design Fundamentals

This folder contains concept-first system design notes. Use it when you want to understand the underlying ideas before jumping into full project blueprints or interview case studies.

## What Is Here

| Theme | Count | Notes |
| --- | --- | --- |
| Security and identity | 4 | TLS, RBAC, secrets management, SAML |
| Observability | 8 | Logs, metrics, traces, alerts, dashboards, correlation |
| Data systems | 9 | Batch/stream processing, ETL, lakes, warehouses, lakehouse, Lambda/Kappa |
| Platform and service patterns | 8 | Service discovery, API gateway, BFF, sidecar, circuit breaker, bulkhead, strangler fig, service mesh |

## How This Folder Differs From Nearby Folders

- Use this folder for focused concept explanations.
- Use `05-system-design/` for complete system blueprints.
- Use `08-system-design-interview/` for interview-style end-to-end answers.

## Suggested Reading Paths

### Security Foundations

1. [01-ssltls_explained.md](01-ssltls_explained.md)
2. [02-role_based_access_control_rbac.md](02-role_based_access_control_rbac.md)
3. [03-secrets_management.md](03-secrets_management.md)
4. [04-saml_explained.md](04-saml_explained.md)

### Observability Foundations

1. [05-three_pillars_of_observability.md](05-three_pillars_of_observability.md)
2. [06-log_aggregation.md](06-log_aggregation.md)
3. [07-logging_best_practices.md](07-logging_best_practices.md)
4. [08-correlation_ids.md](08-correlation_ids.md)
5. [09-metrics_instrumentation.md](09-metrics_instrumentation.md)
6. [10-alert_monitoring.md](10-alert_monitoring.md)
7. [11-dashboards_runbooks.md](11-dashboards_runbooks.md)
8. [12-distributed_tracing.md](12-distributed_tracing.md)

### Data Platform Foundations

1. [13-batch_vs_stream_processing.md](13-batch_vs_stream_processing.md)
2. [14-mapreduce.md](14-mapreduce.md)
3. [15-etl_pipelines.md](15-etl_pipelines.md)
4. [16-data_lakes.md](16-data_lakes.md)
5. [17-data_warehousing.md](17-data_warehousing.md)
6. [18-data_lakehouse.md](18-data_lakehouse.md)
7. [19-lambda_architecture.md](19-lambda_architecture.md)
8. [20-kappa_architecture.md](20-kappa_architecture.md)
9. [21-streaming_engines.md](21-streaming_engines.md)

### Service Platform Patterns

1. [22-service_discovery.md](22-service_discovery.md)
2. [23-api_gateway_pattern.md](23-api_gateway_pattern.md)
3. [24-backend_for_frontend_bff.md](24-backend_for_frontend_bff.md)
4. [25-sidecar_pattern.md](25-sidecar_pattern.md)
5. [26-circuit_breaker_pattern.md](26-circuit_breaker_pattern.md)
6. [27-bulkhead_pattern.md](27-bulkhead_pattern.md)
7. [28-strangler_fig_pattern.md](28-strangler_fig_pattern.md)
8. [29-service_mesh.md](29-service_mesh.md)

## Full Index

| # | Topic | File | Description |
| --- | --- | --- | --- |
| 01 | SSL/TLS Explained | [01-ssltls_explained.md](01-ssltls_explained.md) | TLS handshake, certificates, encryption |
| 02 | Role-Based Access Control (RBAC) | [02-role_based_access_control_rbac.md](02-role_based_access_control_rbac.md) | Roles, permissions, access control models |
| 03 | Secrets Management | [03-secrets_management.md](03-secrets_management.md) | Secret lifecycle, dynamic credentials, rotation, tooling |
| 04 | SAML Explained | [04-saml_explained.md](04-saml_explained.md) | Enterprise SSO, assertions, bindings, security practices |
| 05 | Three Pillars of Observability | [05-three_pillars_of_observability.md](05-three_pillars_of_observability.md) | Logs, metrics, traces, monitoring vs observability, signal correlation |
| 06 | Log Aggregation | [06-log_aggregation.md](06-log_aggregation.md) | Centralized logging pipelines, storage architectures, scaling, cost control |
| 07 | Logging Best Practices | [07-logging_best_practices.md](07-logging_best_practices.md) | Log levels, structured logging, context design, redaction, performance |
| 08 | Correlation IDs | [08-correlation_ids.md](08-correlation_ids.md) | Request/workflow correlation, context propagation, tracing alignment, debugging |
| 09 | Metrics Instrumentation | [09-metrics_instrumentation.md](09-metrics_instrumentation.md) | Metric types, golden signals, naming, labels, cardinality, Prometheus-style flow |
| 10 | Alert Monitoring | [10-alert_monitoring.md](10-alert_monitoring.md) | Actionable alerts, routing, escalation, alert fatigue, on-call practices |
| 11 | Dashboards and Runbooks | [11-dashboards_runbooks.md](11-dashboards_runbooks.md) | Dashboard hierarchy, graph design, runbook structure, incident response linkage |
| 12 | Distributed Tracing | [12-distributed_tracing.md](12-distributed_tracing.md) | Traces, spans, propagation, sampling, tracing backends, observability linkage |
| 13 | Batch vs Stream Processing | [13-batch_vs_stream_processing.md](13-batch_vs_stream_processing.md) | Bounded vs unbounded data, latency trade-offs, windows, state, micro-batch, architecture choices |
| 14 | MapReduce | [14-mapreduce.md](14-mapreduce.md) | Distributed batch processing model, map/shuffle/reduce flow, fault tolerance, combiners, Hadoop, limitations |
| 15 | ETL Pipelines | [15-etl_pipelines.md](15-etl_pipelines.md) | Extract, transform, load flow, incremental sync, CDC, ELT trade-offs, orchestration, idempotency, data quality |
| 16 | Data Lakes | [16-data_lakes.md](16-data_lakes.md) | Object-storage analytical platforms, layered design, file formats, metadata, governance, and lake vs warehouse trade-offs |
| 17 | Data Warehousing | [17-data_warehousing.md](17-data_warehousing.md) | OLAP systems, dimensional modeling, historical correctness, and warehouse performance |
| 18 | Data Lakehouse | [18-data_lakehouse.md](18-data_lakehouse.md) | Shared analytical tables on object storage with metadata layers and transactions |
| 19 | Lambda Architecture | [19-lambda_architecture.md](19-lambda_architecture.md) | Dual-path data architecture with batch recomputation and speed views |
| 20 | Kappa Architecture | [20-kappa_architecture.md](20-kappa_architecture.md) | Replayable event-log architecture with a unified stream-processing path |
| 21 | Streaming Engines | [21-streaming_engines.md](21-streaming_engines.md) | Stateful stream runtimes, windows, checkpoints, and delivery guarantees |
| 22 | Service Discovery | [22-service_discovery.md](22-service_discovery.md) | Dynamic service naming and resolution for distributed systems |
| 23 | API Gateway Pattern | [23-api_gateway_pattern.md](23-api_gateway_pattern.md) | Client-facing gateway for routing, aggregation, auth, and policy control |
| 24 | Backend for Frontend (BFF) | [24-backend_for_frontend_bff.md](24-backend_for_frontend_bff.md) | Client-specific backend layer for web, mobile, and multi-channel products |
| 25 | Sidecar Pattern | [25-sidecar_pattern.md](25-sidecar_pattern.md) | Colocated helper process for traffic, credentials, observability, or policy |
| 26 | Circuit Breaker Pattern | [26-circuit_breaker_pattern.md](26-circuit_breaker_pattern.md) | Dependency protection and cascading-failure prevention |
| 27 | Bulkhead Pattern | [27-bulkhead_pattern.md](27-bulkhead_pattern.md) | Capacity isolation to prevent noisy-neighbor contention |
| 28 | Strangler Fig Pattern | [28-strangler_fig_pattern.md](28-strangler_fig_pattern.md) | Incremental legacy replacement and modernization |
| 29 | Service Mesh | [29-service_mesh.md](29-service_mesh.md) | Dedicated service-to-service communication layer with identity, policy, and observability |
