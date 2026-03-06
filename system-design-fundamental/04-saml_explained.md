# SAML Explained

[← Back to Index](README.md)

Last Updated: January 10, 2026

If you have ever logged into a corporate application using your company's credentials, you have probably used **SAML** behind the scenes. That flow where you sign in once and then access Salesforce, Jira, Slack, and other enterprise tools without repeated logins is often powered by SAML SSO.

**SAML (Security Assertion Markup Language)** has been a core enterprise single sign-on protocol for more than two decades. SAML 1.0 was standardized in 2002, and SAML 2.0 (the version used in practice today) was standardized in 2005.

While OpenID Connect is now common for modern web/mobile products, SAML remains deeply embedded in enterprise identity stacks.

In this chapter, you will learn:
  * [What SAML is and why it exists](#1-what-is-saml)
  * [The key players in SAML authentication](#2-the-key-players-in-saml-authentication)
  * [How the SAML flow works step-by-step](#3-how-the-saml-flow-works-step-by-step)
  * [How to read a SAML Assertion](#4-understanding-saml-assertions)
  * [SAML bindings and their trade-offs](#5-saml-bindings-and-their-trade-offs)
  * [SP-Initiated vs IdP-Initiated SSO](#6-sp-initiated-vs-idp-initiated-sso)
  * [How SAML metadata establishes trust](#7-saml-metadata)
  * [How Single Logout (SLO) works and why it is hard](#8-single-logout-slo)
  * [Security best practices for SAML deployments](#9-security-considerations-and-best-practices)
  * [SAML vs OAuth 2.0 vs OpenID Connect](#10-saml-vs-oauth-20-vs-openid-connect)
  * [Common implementation mistakes and how to avoid them](#11-common-implementation-mistakes)


# 1. What is SAML?

SAML is an XML-based standard for exchanging authentication and identity data between two parties:
- **Identity Provider (IdP):** authenticates the user
- **Service Provider (SP):** consumes identity assertions and grants access

SAML exists to solve a practical enterprise problem:

```
Without federation:
  User has separate credentials per app
  -> weak passwords
  -> password reuse
  -> hard offboarding

With SAML federation:
  User authenticates once at IdP
  -> SP trusts IdP assertion
  -> centralized login policy and lifecycle
```

### What SAML Is Not

- SAML is primarily for **authentication** and identity federation.
- SAML is not a good fit for API delegation patterns (that is OAuth 2.0 territory).
- SAML does not replace fine-grained authorization design inside your application.

### Common SAML Use Cases

- Workforce SSO for enterprise SaaS apps
- Legacy enterprise portals
- B2B federation across organizations
- Centralized access controls tied to HR lifecycle (joiner/mover/leaver)


# 2. The Key Players in SAML Authentication

SAML has a small set of actors and artifacts.

```
┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
│    User      │  uses   │ Browser/UserAgent│  talks  │ Service Provider│
│ (Principal)  │────────▶│      (UA)        │────────▶│       (SP)      │
└──────────────┘         └──────────────────┘         └────────┬────────┘
                                                                │ trusts
                                                                ▼
                                                        ┌─────────────────┐
                                                        │ Identity Provider│
                                                        │      (IdP)       │
                                                        └─────────────────┘
```

### Core Components

- **Principal:** the human user
- **User Agent:** usually the browser carrying SAML messages
- **Service Provider (SP):** app user wants to access
- **Identity Provider (IdP):** authenticates user and issues signed assertions
- **Metadata:** machine-readable trust configuration (endpoints, entity IDs, certs)

### Important Identifiers

- **Entity ID:** unique URI-like identifier for IdP or SP
- **ACS URL (Assertion Consumer Service):** SP endpoint that receives SAML responses
- **NameID:** user identifier in assertion subject


# 3. How the SAML Flow Works (Step-by-Step)

The most common flow is **SP-Initiated SSO**.

### SP-Initiated Sequence

```
User/Browser                SP                           IdP
    |                       |                            |
1.  | GET /app              |                            |
    |---------------------->|                            |
2.  |                       | No session                 |
    |                       | Build AuthnRequest         |
3.  | 302 Redirect + SAMLRequest                         |
    |<----------------------|                            |
4.  |-------------------------------> /sso?SAMLRequest   |
    |                                                    |
5.  |                               Authenticate user    |
    |                               (MFA/policy)         |
6.  |<------------------------------- HTML form + SAMLResponse
7.  | POST SAMLResponse to ACS                           |
    |---------------------->|                            |
8.  | Verify signature, audience, time, destination      |
9.  | Create local session                                |
10. |<---------------------- 302 /app                    |
```

### Message Types in the Flow

- **AuthnRequest** (SP -> IdP): "Please authenticate this user"
- **Response** (IdP -> SP): envelope containing status + assertion(s)
- **Assertion** (inside Response): identity claims, auth context, conditions

### RelayState

`RelayState` preserves where the user wanted to go before redirecting to IdP.  
Treat it as untrusted input and validate/allowlist values to prevent open redirects.


# 4. Understanding SAML Assertions

A SAML assertion is the identity statement the SP relies on.

### Assertion Structure

```xml
<saml:Assertion ID="_abc123" IssueInstant="2026-01-10T08:30:00Z" Version="2.0">
  <saml:Issuer>https://idp.example.com/metadata</saml:Issuer>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      alice@company.com
    </saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData
        Recipient="https://sp.example.com/saml/acs"
        InResponseTo="_req987"
        NotOnOrAfter="2026-01-10T08:35:00Z"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-01-10T08:29:00Z" NotOnOrAfter="2026-01-10T08:35:00Z">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com/metadata</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-01-10T08:30:00Z">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="email"><saml:AttributeValue>alice@company.com</saml:AttributeValue></saml:Attribute>
    <saml:Attribute Name="groups"><saml:AttributeValue>engineering</saml:AttributeValue></saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

### What Must Be Validated

- signature trust chain and algorithm
- assertion/response issuer
- audience restriction
- recipient/destination/ACS URL
- time window (`NotBefore`, `NotOnOrAfter`)
- replay resistance (`InResponseTo` and assertion ID tracking)

### TypeScript Example: Post-Parse Assertion Checks

```typescript
type SamlClaims = {
  issuer: string;
  audience: string;
  recipient: string;
  inResponseTo?: string;
  notBefore: number;      // epoch ms
  notOnOrAfter: number;   // epoch ms
  nameId: string;
  attributes: Record<string, string | string[]>;
};

type SpValidationConfig = {
  expectedIssuer: string;
  expectedAudience: string;
  expectedRecipient: string;
  expectedRequestId?: string;
  clockSkewMs: number;
};

export function validateClaims(claims: SamlClaims, cfg: SpValidationConfig, now = Date.now()): void {
  if (claims.issuer !== cfg.expectedIssuer) throw new Error("Invalid issuer");
  if (claims.audience !== cfg.expectedAudience) throw new Error("Invalid audience");
  if (claims.recipient !== cfg.expectedRecipient) throw new Error("Invalid recipient");
  if (cfg.expectedRequestId && claims.inResponseTo !== cfg.expectedRequestId) {
    throw new Error("Unexpected InResponseTo");
  }

  const notBefore = claims.notBefore - cfg.clockSkewMs;
  const notAfter = claims.notOnOrAfter + cfg.clockSkewMs;
  if (now < notBefore || now >= notAfter) throw new Error("Assertion outside valid time window");
}
```

Use a proven SAML library for XML signature parsing/verification. The checks above are the policy layer you still need on top.


# 5. SAML Bindings and Their Trade-offs

Bindings define how SAML protocol messages are transported.

| Binding | Typical Use | Strengths | Trade-offs |
|---------|-------------|-----------|------------|
| HTTP Redirect | AuthnRequest from SP to IdP | Simple browser redirect, no form needed | URL length limits, query-parameter exposure in browser history/logs |
| HTTP POST | SAML Response from IdP to SP | Handles larger payloads, widely supported | Browser form post dependency |
| HTTP Artifact | Browser carries small artifact; message fetched back-channel | Keeps large assertion off browser front-channel | More setup complexity and extra round-trip |
| SOAP (often with SLO) | Back-channel protocol operations | Server-to-server control plane | Harder operations/debugging; less common in simple SaaS integrations |

### Common Real-World Pattern

- Redirect binding for `AuthnRequest`
- POST binding for `Response`

That combination is simple and broadly interoperable.


# 6. SP-Initiated vs IdP-Initiated SSO

Both patterns are used, but they have different security/UX properties.

### SP-Initiated

```
User starts at SP -> SP issues AuthnRequest -> IdP authenticates -> returns Response
```

Pros:
- request/response correlation via `InResponseTo`
- stronger anti-replay posture
- better app deep-link handling

Cons:
- slightly more integration logic on SP side

### IdP-Initiated

```
User starts at IdP portal -> IdP sends unsolicited Response to SP
```

Pros:
- convenient "app launcher" portal experience
- easier in some legacy enterprise setups

Cons:
- no original AuthnRequest correlation
- higher risk if destination/relay handling is weak

### Recommendation

Prefer **SP-initiated** when possible.  
If you support IdP-initiated, apply stricter destination validation and short assertion lifetimes.


# 7. SAML Metadata

Metadata is how IdP and SP exchange trust and endpoint details.

### Why Metadata Matters

Without metadata, teams manually copy:
- entity IDs
- ACS URLs
- certificates
- supported bindings

Manual setup causes most integration mistakes.

### Typical Metadata Fields

- `entityID`
- SSO/SLO endpoints
- ACS endpoints
- signing/encryption keys (`KeyDescriptor`)
- supported NameID formats

### Example (Simplified)

```xml
<EntityDescriptor entityID="https://sp.example.com/metadata">
  <SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true">
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://sp.example.com/saml/acs"
      index="0"/>
    <KeyDescriptor use="signing">
      <KeyInfo>...</KeyInfo>
    </KeyDescriptor>
  </SPSSODescriptor>
</EntityDescriptor>
```

### Key Rotation Practice

- publish new cert in metadata before cutover
- keep overlap window for old/new keys
- monitor signature failures during rollout


# 8. Single Logout (SLO)

SLO attempts to end the user session across all relying applications, not just one SP.

### Conceptual Flow

```
User logs out from SP A
  -> SP A sends LogoutRequest to IdP
  -> IdP fans out logout to SP B, SP C, ...
  -> each SP confirms
```

### Why SLO Is Difficult

- many SPs with different reliability and timeout behavior
- browser/front-channel fragility
- partial failures are common

### Practical Guidance

- decide explicit UX for partial logout
- use short local session TTLs
- clearly communicate "logged out from this app" vs "logged out everywhere"


# 9. Security Considerations and Best Practices

SAML security issues are usually configuration and validation mistakes, not protocol math failures.

### Critical Controls

1. Verify XML signatures correctly against trusted IdP certs.
2. Require signed response and/or signed assertion per your trust policy.
3. Reject weak algorithms (for example, SHA-1 based signatures).
4. Validate `Issuer`, `Audience`, `Destination`, and `Recipient`.
5. Enforce strict time checks with minimal clock skew.
6. Correlate `InResponseTo` for SP-initiated flows.
7. Prevent replay by storing assertion IDs until expiry.
8. Validate and constrain `RelayState` values.
9. Harden ACS endpoint (HTTPS only, CSRF-safe handling, strict input parsing).
10. Keep certificates and metadata fresh; plan key rollover.

### Threats to Explicitly Defend Against

- XML Signature Wrapping (XSW)
- replay of captured assertions
- open redirect abuse via RelayState
- acceptance of assertions meant for another SP (audience confusion)
- clock skew exploitation with lax time validation

### Operational Security

- log authentication decisions (without leaking assertions/secrets)
- monitor auth failure spikes and certificate mismatch events
- include SAML integration in incident response runbooks


# 10. SAML vs OAuth 2.0 vs OpenID Connect

These protocols are often confused because they appear together in the same identity platforms.

| Protocol | Primary Purpose | Typical Token/Format | Best Fit |
|----------|------------------|----------------------|----------|
| SAML 2.0 | Enterprise SSO (authentication federation) | XML assertions | Workforce and legacy enterprise SaaS SSO |
| OAuth 2.0 | Delegated authorization | Access token (opaque/JWT depending on AS) | API authorization between clients/services |
| OpenID Connect | Authentication layer on top of OAuth 2.0 | ID Token (JWT) + OAuth flows | Modern web/mobile login and API ecosystems |

### Rule of Thumb

- Need enterprise app federation with existing corporate IdP? -> SAML is usually expected.
- Need delegated API access? -> OAuth 2.0.
- Need modern user authentication for apps/mobile/SPAs? -> OpenID Connect.

Many enterprises run both: SAML for workforce SaaS, OIDC/OAuth for modern internal and external apps.


# 11. Common Implementation Mistakes

### 1. Accepting unsigned assertions

If signature requirements are loose, attackers may inject forged identity claims.

### 2. Skipping audience and recipient checks

This can let your SP accept assertions intended for a different service.

### 3. Overly broad clock skew

Large skew windows increase replay risk.

### 4. Ignoring `InResponseTo` in SP-initiated flows

You lose request/response correlation and weaken replay defenses.

### 5. Trusting unvalidated RelayState

Can become an open redirect or state injection vector.

### 6. Hardcoding stale IdP certificates

Breaks integrations during key rollover or causes insecure fallback behavior.

### 7. Mapping attributes directly to admin roles

Always authorize through your own role policy layer; do not blindly trust external groups.

### 8. Treating SAML as authorization for APIs

Use OAuth 2.0/OIDC access tokens for API authorization flows.


# 12. Summary

**SAML remains critical in enterprise SSO:**
- It centralizes authentication in the IdP and lets SPs trust signed assertions.
- Correct validation of issuer, audience, destination, time, and signatures is non-negotiable.
- SP-initiated SSO is generally safer and easier to reason about than IdP-initiated SSO.

**Most failures are implementation mistakes, not protocol limitations:**
- weak signature policy
- poor replay protections
- unsafe RelayState handling
- broken metadata/certificate lifecycle

**Implementation checklist:**

```
Trust Setup:
  □ Exchange and validate metadata (entity IDs, ACS URLs, certs)
  □ Enforce expected issuer and audience
  □ Plan certificate rollover windows

Flow Security:
  □ Prefer SP-initiated SSO when possible
  □ Validate InResponseTo for SP-initiated requests
  □ Enforce short assertion validity windows
  □ Store assertion IDs for replay prevention

Message Validation:
  □ Verify signatures with trusted certs
  □ Reject weak signature algorithms
  □ Validate destination/recipient/ACS URL exactly
  □ Validate and constrain RelayState

Operations:
  □ Log auth decisions and failures safely
  □ Monitor certificate and metadata drift
  □ Test SLO behavior and partial-failure UX
```

