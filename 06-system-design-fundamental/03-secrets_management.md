# Secrets Management

[← Back to Index](README.md)

Every application has secrets: database passwords, API keys, encryption keys, OAuth tokens, webhook signing secrets, and machine credentials. If these leak, an attacker can often skip your application logic entirely and go straight to your data or infrastructure.

Good code does not save you from leaked credentials. Secrets management is about reducing that blast radius through identity-first access, short lifetimes, strong auditing, and safe rotation.

In this chapter, you will learn:
  * [What secrets are and why they are different from normal config](#1-what-are-secrets)
  * [Why secrets management is hard in real systems](#2-why-secrets-management-is-hard)
  * [Common mistakes that repeatedly cause breaches](#3-common-secrets-management-mistakes)
  * [How secrets management evolved from `.env` files to dynamic credentials](#4-the-evolution-of-secrets-management)
  * [How modern secret managers work internally](#5-how-modern-secrets-management-systems-work)
  * [Secret retrieval patterns and their trade-offs](#6-secret-retrieval-patterns)
  * [Dynamic secrets and lease-based revocation](#7-dynamic-secrets)
  * [Popular tools and when to use each](#8-popular-tools-and-when-to-use-them)
  * [A practical leak-response playbook](#9-secret-leak-response-playbook)
  * [A production checklist for secure secrets handling](#10-best-practices-checklist)


# 1. What Are Secrets?

A **secret** is sensitive data that grants access to something protected or enables cryptographic operations.

If exposed, it can be directly abused.

### Secret vs Configuration

```
Configuration (usually low impact if exposed):
- PORT=8080
- FEATURE_X_ENABLED=true
- CACHE_TTL=300

Secrets (high impact if exposed):
- DB_PASSWORD=...
- JWT_SIGNING_KEY=...
- STRIPE_API_KEY=...
- TLS_PRIVATE_KEY=...
```

The key idea is **asymmetry of damage**.
Leaking a port number is usually harmless. Leaking a production database password can be catastrophic.

### Common Secret Types

| Secret Type | Example | What It Can Compromise |
|-------------|---------|------------------------|
| Database credentials | `postgres://user:pass@...` | User data, schema, backups |
| API keys/tokens | Stripe, OpenAI, GitHub tokens | Paid API usage, account abuse |
| Encryption keys | AES data keys, KMS decrypt rights | Data confidentiality/integrity |
| Signing keys | JWT signing key, webhook HMAC key | Token forgery, request forgery |
| TLS private keys | `privkey.pem` | MITM/impersonation risk |
| Cloud credentials | IAM access keys, service account keys | Infrastructure takeover |
| CI/CD secrets | deploy tokens, registry passwords | Supply-chain compromise |

### Secret Metadata Matters Too

A mature program tracks metadata for each secret:
- owner/team
- purpose
- environment scope
- creation date
- last rotation date
- max lifetime/expiry
- dependent systems

Without metadata, rotation and incident response become guesswork.


# 2. Why Secrets Management Is Hard

Secrets management is difficult because secrets move through many systems and many time horizons.

### Secrets Span the Full Delivery Path

```
Developer laptop
  -> Git hooks / local env
  -> CI pipeline
  -> artifact build
  -> deployment system
  -> runtime (pods/VMs/functions)
  -> logs/metrics/traces
  -> backups/snapshots
```

Any weak link can leak a secret.

### The "Secret Zero" Problem

To fetch a secret from a manager, a workload must authenticate first.
What credential does it use for that initial authentication?

Modern platforms solve this with workload identity:
- cloud metadata identity (AWS IAM roles, Azure managed identities, GCP workload identity)
- Kubernetes projected service account tokens
- SPIFFE/SPIRE workload identities

### Rotation Without Outage Is Non-Trivial

Rotating secrets sounds easy until:
- multiple services share the same credential
- old and new credentials must overlap
- clients cache secrets with inconsistent TTLs
- downstream services have rate limits or maintenance windows

If rotation is manual, outages and drift are common.

### Human and Organizational Friction

Secrets systems fail when:
- ownership is unclear
- teams over-share credentials
- developers bypass controls for speed
- security and platform teams use incompatible tools

This is as much an operating-model problem as a technical one.


# 3. Common Secrets Management Mistakes

### 1. Hardcoding secrets in source code

Still one of the most frequent failures:
```ts
const dbPassword = "ProdPassword!123";
```

Even private repos are not safe enough. Forks, logs, screenshots, and copied snippets spread secrets.

### 2. Treating environment variables as "secure by default"

Environment variables are useful, but they can leak via:
- debug endpoints
- crash reports
- process inspection tools
- accidental logging

Google Cloud Secret Manager guidance cautions against relying blindly on environment variables or file-based delivery in cases where stronger controls or platform-native retrieval patterns are available.

### 3. Long-lived static credentials everywhere

If credentials never expire, leaks are persistent by default.
Kubernetes guidance prefers short-lived, projected service account tokens over legacy long-lived secret-based tokens.

### 4. Overly broad access

If one app can read all production secrets, compromise of one app becomes compromise of everything.

Least privilege must be applied at secret/object level, not only project/account level.

### 5. No auditability

If you cannot answer:
- who accessed which secret
- from where
- using what identity
- at what time

then incident response is slow and incomplete.

### 6. "Base64 encoded" mistaken for encrypted

Kubernetes explicitly cautions that by default Secret data in etcd can be unencrypted unless you configure encryption at rest.

### 7. Rotation policies that exist only on paper

Policy without automation degrades quickly.
OWASP recommends automated rotation and dynamic secrets where possible.


# 4. The Evolution of Secrets Management

### Phase 1: Embedded Secrets

```
Code/config files contain plaintext credentials.
```

Pros: simple.
Cons: severe leak risk, hard rotation.

### Phase 2: Environment/CI Variable Storage

```
Secrets stored in CI/CD or runtime env vars.
```

Pros: better than hardcoding.
Cons: still static; often broad visibility.

### Phase 3: Centralized Secret Managers

```
Applications fetch secrets from a managed store at runtime.
```

Pros: central policy, audit logs, versioning, rotation workflows.
Cons: needs strong auth bootstrap and runtime integration.

### Phase 4: Identity-First + Dynamic Secrets

```
Workload authenticates via platform identity.
Secret manager issues short-lived, scoped credentials.
```

Pros: minimum standing privilege, easier revocation, better traceability.
Cons: more system design and platform maturity required.


# 5. How Modern Secrets Management Systems Work

A modern design has five control planes:

```
1) Identity plane
   Workload proves identity (OIDC/JWT/mTLS/metadata identity)

2) Policy plane
   RBAC/ABAC rules decide which secret or path is allowed

3) Storage plane
   Secret encrypted at rest (often envelope encryption with KMS/HSM)

4) Delivery plane
   Secret returned via API, sidecar, volume mount, or agent

5) Audit plane
   Every read/write/rotation event is logged and queryable
```

### Reference Flow

```
Service starts
  -> obtains workload identity token
  -> calls secret manager auth endpoint
  -> receives scoped access token/lease
  -> reads required secret version
  -> caches in memory with TTL
  -> refreshes/rotates before expiry
  -> emits access/rotation audit logs
```

### Static vs Dynamic Secrets in the Same System

Most platforms support both:
- **Static**: stored value with versioning and rotation policy
- **Dynamic**: generated on demand with lease and automatic expiry

Example: Vault database engine generates per-client DB users dynamically; AWS Secrets Manager and Azure Key Vault focus strongly on managed static secrets with rotation workflows.


# 6. Secret Retrieval Patterns

No single retrieval pattern fits every workload.

### Pattern A: Startup Fetch + In-Memory Cache

```
app boot -> fetch secret once -> keep in memory -> refresh on schedule
```

Good for: web backends, workers.
Risks: stale secrets if refresh logic is weak.

### Pattern B: Sidecar/Agent Injection

```
app <-> local agent/sidecar <-> secret manager
```

Good for: polyglot workloads, legacy apps.
Strength: centralizes auth/renewal logic.
Trade-off: extra moving parts per workload.

### Pattern C: CSI/Volume Mount in Kubernetes

Using Secrets Store CSI Driver or equivalent integrations to mount external secrets into pods.

Good for: Kubernetes clusters with external secret providers.
Trade-off: file-based secrets still need careful runtime protection.

### Pattern D: On-Demand Fetch per Request

```
each request -> fetch secret live
```

Good for: rare high-security cases with strict freshness.
Trade-off: latency/cost/availability coupling to secret manager.

### Pattern E: Secretless Access (Preferred When Possible)

Use workload identity tokens directly to call managed services, avoiding persistent application secrets.

Examples:
- Azure managed identities
- GCP Workload Identity Federation
- AWS role-based temporary credentials
- SPIFFE/SPIRE-issued workload identities

When feasible, this is often the most robust pattern because there is less secret material to steal.


# 7. Dynamic Secrets

Dynamic secrets are generated per client request with short TTL and scoped permissions.

### Why Dynamic Credentials Matter

Static credential reuse is dangerous.
Dynamic credentials reduce:
- credential sharing
- dwell time after leaks
- ambiguity during audits

HashiCorp Vault documents this clearly for database secrets: each workload instance can receive unique credentials, then lease expiry/revocation invalidates them.

### Lifecycle

```
1. Workload authenticates to secret manager
2. Manager generates ephemeral credential (e.g., DB user/password)
3. Credential returned with lease TTL
4. Workload renews lease or lets it expire
5. Manager revokes/cleans up credential automatically
```

### When Dynamic Secrets Are Ideal

- CI/CD jobs
- ephemeral compute
- serverless or short-lived workers
- high-sensitivity databases
- multi-tenant platforms requiring strong attribution

### When Static + Rotation May Be Better

- legacy systems that cannot handle frequent credential churn
- integrations with strict account-provisioning limits
- systems where dynamic plugins are unavailable

In these cases, enforce aggressive automated rotation and strict least privilege.


# 8. Popular Tools and When to Use Them

Use tool choice as an architecture decision, not a branding decision.

| Tool | Best For | Strengths | Trade-offs |
|------|----------|-----------|------------|
| AWS Secrets Manager | AWS-native app/db secrets | Native IAM, rotation workflows, replication, audit integrations | Cost and service coupling in AWS |
| AWS SSM Parameter Store (`SecureString`) | Simpler config + secrets in AWS | Hierarchical parameters, KMS encryption, broad integration | Less full-featured rotation UX than Secrets Manager |
| Google Secret Manager | GCP workloads | Strong IAM model, versioning, regional secrets, audit logs | Requires careful IAM/project design |
| Azure Key Vault | Azure workloads | Tight Entra ID and managed identity integration, lifecycle controls | Operational limits require caching and retry strategy |
| HashiCorp Vault | Multi-cloud/hybrid + dynamic secrets | Rich dynamic engines, policy flexibility, lease/revocation model | Operational complexity if self-managed |
| Kubernetes Secrets + etcd encryption | Kubernetes local secret objects | Native and simple for cluster use | Must configure encryption/RBAC; defaults can be unsafe |
| External Secrets Operator / Secrets Store CSI Driver | Sync or mount external secrets in K8s | Clean bridge between K8s and external stores | Extra CRDs/controllers and policy surface |
| SOPS / Sealed Secrets | GitOps workflows | Git-safe encrypted manifests | Key lifecycle and controller/process management still required |
| GitHub/GitLab secret scanning | Leak prevention in SDLC | Detects committed secrets; push protection blocks leaks earlier | Detection only; still need strong rotation/remediation |

### Practical Selection Heuristic

```
Single-cloud, mostly managed services:
  Prefer cloud-native secret manager + workload identity.

Multi-cloud, on-prem, custom dynamic credential needs:
  Prefer Vault (possibly with cloud KMS/HSM integration).

Kubernetes-heavy platform:
  External store + ESO/CSI + strict RBAC + etcd encryption.

GitOps-heavy delivery:
  SOPS/Sealed Secrets for Git, but runtime secrets still from manager.
```


# 9. Secret Leak Response Playbook

When a secret leaks, speed matters more than perfect forensics in the first minutes.

### Immediate Response (First Hour)

1. **Contain**
   - disable/revoke leaked credential immediately
   - block related accounts/roles if needed
2. **Rotate**
   - issue replacement secret
   - deploy consumers with new version
3. **Assess blast radius**
   - inspect audit logs for suspicious usage
   - identify affected environments and downstream systems
4. **Eradicate exposure points**
   - remove secret from repo/history/artifacts/logs where feasible
5. **Communicate**
   - notify security + service owners + incident channel

### Follow-Up (24-72 Hours)

- confirm no active abuse
- rotate adjacent secrets if trust boundaries are unclear
- add or tighten detection rules
- document timeline and root cause
- codify preventive controls

### Metrics to Track

- MTTD (mean time to detect leaked secret)
- MTTRotate (time to rotate and deploy replacement)
- percentage of secrets with owner + expiry + rotation policy
- percentage of workloads using short-lived identity-based auth


# 10. Best Practices Checklist

### Architecture

- Prefer identity-based auth over static credentials whenever possible.
- Minimize total secret count by using managed identity and short-lived tokens.
- Separate secrets from non-sensitive config.

### Access Control

- Enforce least privilege at secret/path level.
- Separate read, write, and admin permissions.
- Use separate identities per service/environment (no shared global creds).

### Storage and Transport

- Encrypt at rest and in transit.
- For Kubernetes, explicitly enable etcd encryption and strict RBAC.
- Avoid broad plaintext propagation through env vars/files unless justified.

### Rotation and Lifetime

- Automate rotation; avoid manual-only runbooks.
- Prefer short-lived/dynamic credentials for high-risk services.
- Use dual-credential or staged cutover patterns for zero-downtime rotation.

### Runtime Safety

- Cache in memory with bounded TTL and refresh logic.
- Never log secret values.
- Redact secrets in telemetry and error payloads.

### Auditing and Detection

- Log every secret read/write/rotation/revocation action.
- Alert on unusual access patterns (sudden fan-out reads, new principals).
- Enable secret scanning and push protection in source-control workflows.

### Operations and Resilience

- Maintain owner, purpose, and dependency metadata per secret.
- Test break-glass and recovery paths regularly.
- Backup and restore secret-manager state securely, with access controls.

### Quick Production Checklist

```
Identity:
  [ ] Workloads authenticate without embedded long-lived credentials

Policy:
  [ ] Least-privilege access enforced per secret/path

Storage:
  [ ] Encryption at rest + TLS in transit

Rotation:
  [ ] Automated rotation for all critical secrets
  [ ] Dynamic credentials used where feasible

Detection:
  [ ] Secret scanning + push protection enabled
  [ ] Audit logs centralized and alerting configured

Kubernetes (if used):
  [ ] etcd encryption enabled
  [ ] Secret RBAC hardened
  [ ] External secret provider pattern reviewed
```


# References

Official documentation and standards used for this chapter:

- OWASP Secrets Management Cheat Sheet
  https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- NIST SP 800-57 Part 1 Rev. 5 (Key Management)
  https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
- AWS Secrets Manager: What it is
  https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
- AWS Secrets Manager Best Practices
  https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html
- AWS Secrets rotation by Lambda
  https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html
- AWS Systems Manager Parameter Store
  https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- Google Secret Manager Best Practices
  https://cloud.google.com/secret-manager/docs/best-practices
- Azure Key Vault: Secure Secrets
  https://learn.microsoft.com/en-us/azure/key-vault/secrets/secure-secrets
- Azure Secrets Best Practices
  https://learn.microsoft.com/en-us/azure/security/fundamentals/secrets-best-practices
- Managed identities for Azure resources
  https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
- Kubernetes Secrets
  https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Good Practices for Secrets
  https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes Service Accounts and TokenRequest guidance
  https://kubernetes.io/docs/concepts/security/service-accounts/
- HashiCorp Vault Database Secrets Engine
  https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Agent Injector
  https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- External Secrets Operator
  https://external-secrets.io/latest/
- Secrets Store CSI Driver
  https://secrets-store-csi-driver.sigs.k8s.io/
- GitHub Secret Scanning and Push Protection
  https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
- GitLab Secret Detection
  https://docs.gitlab.com/user/application_security/secret_detection/
- SOPS documentation
  https://getsops.io/docs/
- Sealed Secrets documentation
  https://github.com/bitnami-labs/sealed-secrets
