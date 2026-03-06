# SSL/TLS Explained

[← Back to Index](README.md)

Every time you see that padlock icon in your browser, there is a sophisticated cryptographic protocol working behind the scenes. That protocol is **TLS (Transport Layer Security)**, and it is the foundation of secure communication on the internet.

Without TLS, every password you type, every credit card number you enter, and every private message you send would travel across the internet in plain text. Anyone sitting between you and the server, whether that is your ISP, a coffee shop's WiFi network, or a malicious actor, could read everything.

In this chapter, you will learn:
  * [Why plaintext communication is dangerous](#the-problem-insecure-communication)
  * [How the TLS handshake establishes a secure connection](#how-the-tls-handshake-works)
  * [The role of certificates and Certificate Authorities](#certificates-and-certificate-authorities)
  * [Symmetric vs asymmetric encryption and why TLS uses both](#symmetric-vs-asymmetric-encryption)
  * [How TLS 1.3 improves on previous versions](#tls-13-a-faster-handshake)
  * [Mutual TLS (mTLS) for service-to-service communication](#mutual-tls-mtls)
  * [Common attacks and how to defend against them](#common-tls-attacks-and-mitigations)


These concepts apply whether you are building web applications, APIs, or microservices. Understanding TLS is essential for any engineer working on systems that handle sensitive data.

# The Problem: Insecure Communication

Before diving into TLS, let us understand what happens without it.

### Plaintext Communication

When data travels over the internet without encryption, it passes through many intermediate systems: routers, switches, ISPs, and potentially compromised networks. At any of these points, an attacker can:

```
Your Computer → Router → ISP → Internet → ISP → Server
                  ↑        ↑       ↑
              Attacker could be listening anywhere
```

**Without TLS:**
```
POST /login HTTP/1.1
Host: bank.example.com

username=john&password=MySecretPassword123
```

Anyone capturing this traffic sees everything in plain text.

**With TLS:**
```
17 03 03 00 45 14 a2 3b 8c 7f 91 e4 5a 2d 1c 8b
9e 3f a7 2c 5d 8e 1b 4a 7c 9d 2e 6f 3a 8b 1c 5d
...
```

The same data is now encrypted and unreadable without the session keys.

### The Three Threats TLS Addresses

**1. Eavesdropping (Confidentiality)**
Without encryption, attackers can read all data in transit. TLS encrypts the entire communication channel.

**2. Tampering (Integrity)**
Attackers could modify data in transit. You request a $100 transfer, and an attacker changes it to $10,000. TLS includes message authentication codes (MACs) that detect any modification.

**3. Impersonation (Authentication)**
An attacker could pretend to be your bank. TLS uses certificates to verify the server's identity before you send any sensitive data.

# What is TLS?

TLS (Transport Layer Security) is a cryptographic protocol that provides secure communication over a network. It sits between the application layer (HTTP, SMTP, etc.) and the transport layer (TCP).

### SSL vs TLS: A Brief History

You will often hear "SSL" and "TLS" used interchangeably. Here is the history:

```
SSL 1.0 (1994) - Never released (security flaws)
SSL 2.0 (1995) - First public release (deprecated)
SSL 3.0 (1996) - Major redesign (deprecated)
TLS 1.0 (1999) - SSL 3.0 with minor changes
TLS 1.1 (2006) - Security improvements (deprecated)
TLS 1.2 (2008) - Still widely used
TLS 1.3 (2018) - Current recommended version
```

**Bottom line:** SSL is deprecated and insecure. Modern systems use TLS 1.2 or TLS 1.3. When someone says "SSL certificate," they almost always mean a certificate used with TLS.

### Where TLS Fits in the Stack

```
┌─────────────────────────────────────┐
│        Application Layer            │
│     (HTTP, SMTP, FTP, etc.)         │
├─────────────────────────────────────┤
│           TLS Layer                 │  ← Encryption happens here
│   (Handshake, Record Protocol)      │
├─────────────────────────────────────┤
│        Transport Layer              │
│            (TCP)                    │
├─────────────────────────────────────┤
│         Network Layer               │
│            (IP)                     │
└─────────────────────────────────────┘
```

When you connect to `https://example.com`:
1. TCP connection is established (port 443)
2. TLS handshake occurs
3. Encrypted HTTP traffic flows over the TLS connection

### What TLS Provides

| Property | How TLS Achieves It |
|----------|---------------------|
| **Confidentiality** | Symmetric encryption (AES, ChaCha20) |
| **Integrity** | Message Authentication Codes (HMAC, AEAD) |
| **Authentication** | X.509 certificates, Certificate Authorities |

# How the TLS Handshake Works

The TLS handshake is how the client and server establish a secure connection. They must agree on encryption algorithms and exchange keys, all while potentially being observed by attackers.

### TLS 1.2 Handshake (2-RTT)

```
    Client                                          Server
       |                                               |
       |  ────── Client Hello ──────────────────────>  |
       |         (supported versions, cipher suites,   |
       |          client random)                       |
       |                                               |
       |  <────── Server Hello ──────────────────────  |
       |          (chosen version, cipher suite,       |
       |           server random)                      |
       |  <────── Certificate ───────────────────────  |
       |  <────── Server Key Exchange ───────────────  |
       |  <────── Server Hello Done ─────────────────  |
       |                                               |
       |  ────── Client Key Exchange ────────────────> |
       |  ────── Change Cipher Spec ─────────────────> |
       |  ────── Finished ───────────────────────────> |
       |                                               |
       |  <────── Change Cipher Spec ────────────────  |
       |  <────── Finished ──────────────────────────  |
       |                                               |
       |  ═══════ Encrypted Application Data ════════  |
```

### Step-by-Step Breakdown

**1. Client Hello**
The client initiates the connection by sending:
- Highest TLS version it supports
- List of cipher suites it supports (in preference order)
- A random number (client random)
- Session ID (for resumption)
- Extensions (SNI, supported groups, etc.)

**2. Server Hello**
The server responds with:
- Chosen TLS version
- Chosen cipher suite
- A random number (server random)
- Session ID

**3. Certificate**
The server sends its certificate chain. This allows the client to verify the server's identity.

**4. Server Key Exchange**
For cipher suites using ephemeral keys (DHE, ECDHE), the server sends its public key parameters.

**5. Client Key Exchange**
The client generates its portion of the key exchange. With ECDHE, this is the client's ephemeral public key.

**6. Key Derivation**
Both sides now have:
- Client random
- Server random
- Pre-master secret (from key exchange)

They derive the same session keys independently:
```
Master Secret = PRF(pre_master_secret, "master secret",
                    client_random + server_random)

Session Keys = PRF(master_secret, "key expansion",
                   server_random + client_random)
```

**7. Finished Messages**
Both sides send a "Finished" message encrypted with the new keys. This verifies the handshake was not tampered with.

# TLS 1.3: A Faster Handshake

TLS 1.3 redesigned the handshake for both security and performance.

### 1-RTT Handshake

```
    Client                                          Server
       |                                               |
       |  ────── Client Hello + Key Share ──────────>  |
       |                                               |
       |  <────── Server Hello + Key Share ──────────  |
       |  <────── {Encrypted Extensions} ────────────  |
       |  <────── {Certificate} ─────────────────────  |
       |  <────── {Certificate Verify} ──────────────  |
       |  <────── {Finished} ────────────────────────  |
       |                                               |
       |  ────── {Finished} ─────────────────────────> |
       |                                               |
       |  ═══════ Encrypted Application Data ════════  |
```

The key difference: the client sends its key share in the first message. The server can compute the session keys immediately after receiving Client Hello.

### What TLS 1.3 Removed

TLS 1.3 removed insecure and obsolete features:

```
Removed:
├── RSA key exchange (no forward secrecy)
├── Static DH key exchange
├── CBC mode ciphers (BEAST, Lucky13 vulnerabilities)
├── RC4, DES, 3DES encryption
├── MD5, SHA-1 for handshake hashes
├── Compression (CRIME attack)
└── Renegotiation
```

**Only secure options remain:**
- Key exchange: ECDHE, DHE (forward secrecy required)
- Encryption: AES-GCM, AES-CCM, ChaCha20-Poly1305 (AEAD only)
- Signatures: RSA-PSS, ECDSA, EdDSA

### 0-RTT Resumption

TLS 1.3 supports sending application data in the first message when resuming a previous session:

```
    Client                                          Server
       |                                               |
       |  ────── Client Hello + Key Share ──────────>  |
       |  ────── (Early Data) ──────────────────────>  |  ← Application data!
       |                                               |
       |  <────── Server Hello ──────────────────────  |
       |  ...                                          |
```

**Trade-off:** 0-RTT data is vulnerable to replay attacks. Only use it for idempotent requests (GET, not POST).

```
Safe for 0-RTT:
✓ GET /api/products
✓ GET /api/user/profile

Not safe for 0-RTT:
✗ POST /api/transfer?amount=1000
✗ POST /api/order
```

# Certificates and Certificate Authorities

Certificates are how TLS proves identity. Without them, you would have no way to verify that you are actually talking to your bank and not an imposter.

### What a Certificate Contains

An X.509 certificate includes:

```
Certificate:
    Data:
        Version: 3
        Serial Number: 04:5c:b9:7d:...
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C=US, O=DigiCert Inc, CN=DigiCert TLS RSA SHA256 2020 CA1
        Validity:
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After:  Dec 31 23:59:59 2024 GMT
        Subject: C=US, ST=California, L=San Francisco,
                 O=Example Inc, CN=www.example.com
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
            RSA Public-Key: (2048 bit)
        X509v3 Extensions:
            Subject Alternative Name:
                DNS:www.example.com, DNS:example.com
            Key Usage: Digital Signature, Key Encipherment
            Extended Key Usage: TLS Web Server Authentication
    Signature Algorithm: sha256WithRSAEncryption
    Signature: 5d:3a:8b:...
```

### The Chain of Trust

Browsers do not trust certificates directly. They trust **Root Certificate Authorities (CAs)**, which are built into the operating system and browser.

```
┌─────────────────────────────────────────┐
│           Root CA Certificate            │  ← Trusted by browsers
│      (DigiCert, Let's Encrypt, etc.)    │
└────────────────────┬────────────────────┘
                     │ Signs
                     ▼
┌─────────────────────────────────────────┐
│       Intermediate CA Certificate        │
│                                          │
└────────────────────┬────────────────────┘
                     │ Signs
                     ▼
┌─────────────────────────────────────────┐
│         Server Certificate               │  ← Your website
│        (www.example.com)                 │
└─────────────────────────────────────────┘
```

When the server presents its certificate:
1. Browser checks if the certificate is signed by a trusted intermediate
2. Browser checks if the intermediate is signed by a trusted root
3. If the chain validates, the connection proceeds

### Certificate Validation Checks

The browser performs several checks:

```
1. Expiration
   └── Is current time between "Not Before" and "Not After"?

2. Domain Match
   └── Does the certificate's CN or SAN match the requested domain?

3. Chain of Trust
   └── Can we trace signatures back to a trusted root?

4. Revocation
   └── Has the certificate been revoked? (CRL or OCSP check)

5. Key Usage
   └── Is the certificate allowed for TLS server authentication?
```

### Let's Encrypt and Automated Certificates

Let's Encrypt provides free, automated certificates using the ACME protocol:

```
1. Your server proves domain ownership (HTTP or DNS challenge)
2. Let's Encrypt issues a 90-day certificate
3. Certbot (or similar) auto-renews before expiration
```

**Common setup with Certbot:**
```bash
# Initial certificate
certbot certonly --webroot -w /var/www/html -d example.com

# Auto-renewal (typically via cron or systemd timer)
certbot renew
```

Short validity periods (90 days) encourage automation and limit exposure if a key is compromised.

# Symmetric vs Asymmetric Encryption

TLS uses both types of encryption. Understanding why requires understanding their trade-offs.

### Asymmetric Encryption (Public Key)

**How it works:**
- Two mathematically related keys: public and private
- Encrypt with public key → only private key can decrypt
- Sign with private key → anyone can verify with public key

**Common algorithms:**
- RSA (2048+ bits)
- ECDSA (P-256, P-384)
- Ed25519

**Used in TLS for:**
- Key exchange (establishing shared secrets)
- Digital signatures (certificate verification)

**Trade-off:** Very slow for bulk data encryption.

```
RSA-2048 encryption: ~1,000 operations/second
AES-256-GCM:         ~1,000,000,000 bytes/second
```

### Symmetric Encryption

**How it works:**
- Single shared key for both encryption and decryption
- Both parties must have the same key

**Common algorithms:**
- AES-128-GCM, AES-256-GCM
- ChaCha20-Poly1305

**Used in TLS for:**
- Encrypting application data after handshake

**Trade-off:** Fast, but how do you share the key securely?

### Why TLS Uses Both

TLS uses asymmetric encryption to solve the key distribution problem, then switches to symmetric encryption for performance:

```
1. Handshake Phase (Asymmetric)
   ├── Server proves identity with certificate (signature)
   ├── Key exchange establishes shared secret (ECDHE)
   └── Both sides derive symmetric session keys

2. Data Transfer Phase (Symmetric)
   └── All application data encrypted with AES or ChaCha20
```

This hybrid approach gives you:
- **Authentication** (asymmetric signatures verify identity)
- **Forward secrecy** (ephemeral key exchange)
- **Performance** (symmetric bulk encryption)

### Forward Secrecy

Forward secrecy means that compromising a server's long-term private key does not compromise past sessions.

**Without forward secrecy (RSA key exchange):**
```
If attacker records encrypted traffic AND later steals private key
  → Attacker can decrypt all recorded sessions
```

**With forward secrecy (ECDHE):**
```
Each session uses ephemeral keys that are discarded
  → Even with private key, past sessions cannot be decrypted
```

TLS 1.3 requires forward secrecy. TLS 1.2 supports it but does not require it.

# Cipher Suites

A cipher suite specifies the algorithms used for key exchange, authentication, encryption, and integrity.

### Cipher Suite Format

TLS 1.2 format:
```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
 │    │     │        │    │     │
 │    │     │        │    │     └── PRF hash (key derivation)
 │    │     │        │    └── Authentication mode
 │    │     │        └── Symmetric cipher
 │    │     └── Signature algorithm
 │    └── Key exchange
 └── Protocol
```

TLS 1.3 simplified format:
```
TLS_AES_256_GCM_SHA384
```

Key exchange and signature algorithms are negotiated separately in TLS 1.3.

### Recommended Cipher Suites

**TLS 1.3 (all are secure):**
```
TLS_AES_256_GCM_SHA384
TLS_AES_128_GCM_SHA256
TLS_CHACHA20_POLY1305_SHA256
```

**TLS 1.2 (secure options):**
```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
```

### Cipher Suites to Avoid

```
Bad (no forward secrecy):
TLS_RSA_WITH_AES_256_CBC_SHA256

Bad (weak encryption):
TLS_RSA_WITH_3DES_EDE_CBC_SHA
TLS_RSA_WITH_RC4_128_SHA

Bad (vulnerable to attacks):
TLS_RSA_WITH_AES_256_CBC_SHA  (CBC padding oracle attacks)
```

### Checking Your Configuration

**OpenSSL:**
```bash
openssl s_client -connect example.com:443 -tls1_3
```

**Nmap:**
```bash
nmap --script ssl-enum-ciphers -p 443 example.com
```

**Online tools:**
- SSL Labs (ssllabs.com/ssltest)
- testssl.sh

# Mutual TLS (mTLS)

Standard TLS authenticates only the server. Mutual TLS (mTLS) adds client authentication, where the client also presents a certificate.

### Standard TLS vs mTLS

```
Standard TLS:
  Client ──────> Server
         "Who are you?"
  Client <────── Server presents certificate
         "I verified your certificate"
  Client ══════> Server
         Encrypted communication

mTLS:
  Client ──────> Server
         "Who are you?"
  Client <────── Server presents certificate
         "Who are you?"
  Client ──────> Server (client presents certificate)
         "We both verified each other"
  Client ══════> Server
         Encrypted communication
```

### When to Use mTLS

**Ideal for:**
- Service-to-service communication in microservices
- Zero trust network architectures
- API authentication between trusted partners
- IoT device authentication

**Example: Service Mesh**
```
┌─────────────────────────────────────────────────┐
│                    Kubernetes                    │
│                                                  │
│  ┌─────────────┐         ┌─────────────┐        │
│  │   Service A │  mTLS   │   Service B │        │
│  │   (Envoy)   │◄───────►│   (Envoy)   │        │
│  └─────────────┘         └─────────────┘        │
│                                                  │
│  Istio/Linkerd manages certificates              │
└─────────────────────────────────────────────────┘
```

### mTLS Implementation Considerations

**Certificate management:**
- Every client needs a certificate
- Certificates need to be rotated
- Certificate revocation must be handled

**Practical approaches:**
```
1. Service mesh (Istio, Linkerd)
   └── Automatic certificate provisioning and rotation

2. HashiCorp Vault
   └── PKI secrets engine issues short-lived certificates

3. SPIFFE/SPIRE
   └── Workload identity framework with automatic rotation
```

**Trade-offs:**
```
Pros:
✓ Strong authentication (no shared secrets)
✓ Works with zero trust architecture
✓ Automatic with service meshes

Cons:
✗ Certificate management complexity
✗ Additional latency for handshake
✗ Debugging can be harder
```

# Common TLS Attacks and Mitigations

Understanding attacks helps you configure TLS correctly.

### Man-in-the-Middle (MITM)

**Attack:** Attacker intercepts connection, presents their own certificate.

**Mitigation:**
- Certificate validation (always enabled)
- Certificate pinning (optional, for high-security apps)
- HSTS (prevents downgrade to HTTP)

```
Normal:     Client ←──────────────────────→ Server
                         TLS

MITM:       Client ←───→ Attacker ←───────→ Server
                   TLS           TLS
                   (Attacker's   (Legitimate
                    certificate)  certificate)
```

If the attacker's certificate is not trusted, the client rejects it.

### Downgrade Attacks

**Attack:** Attacker forces use of weaker TLS version or cipher suite.

**Examples:**
- POODLE (forces SSL 3.0)
- DROWN (forces SSLv2)
- Logjam (forces weak DH)

**Mitigation:**
```
1. Disable old protocols
   └── Only TLS 1.2 and TLS 1.3

2. Disable weak cipher suites
   └── No RSA key exchange, no CBC mode, no RC4

3. TLS_FALLBACK_SCSV
   └── Prevents protocol downgrade
```

### Certificate-Related Attacks

**Expired certificates:** Browsers warn users, but they often click through.
```
Mitigation: Automate renewal with Let's Encrypt/certbot
```

**Revoked certificates:** Attacker uses stolen certificate after revocation.
```
Mitigation: OCSP stapling, short-lived certificates
```

**Fraudulent certificates:** CA issues certificate to wrong party.
```
Mitigation: Certificate Transparency logs, CAA records
```

### Heartbleed (Historical)

**Attack:** Buffer over-read in OpenSSL leaked server memory, including private keys.

**Mitigation:**
- Keep TLS libraries updated
- Use modern, actively maintained implementations

# TLS Best Practices

### Version Configuration

```
Minimum: TLS 1.2
Recommended: TLS 1.3 preferred, TLS 1.2 fallback

# Nginx example
ssl_protocols TLSv1.2 TLSv1.3;

# Apache example
SSLProtocol -all +TLSv1.2 +TLSv1.3
```

### Cipher Suite Configuration

**Nginx:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;  # Let client choose in TLS 1.3
```

**Apache:**
```apache
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
SSLHonorCipherOrder off
```

### HTTP Strict Transport Security (HSTS)

HSTS tells browsers to always use HTTPS for your domain:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**What this does:**
- Browser remembers to use HTTPS for 1 year
- Applies to all subdomains
- Can be added to browser preload lists

**Warning:** Once enabled, you cannot easily go back to HTTP. Start with a short max-age.

### Certificate Best Practices

```
1. Use automated certificate management
   └── Let's Encrypt + certbot

2. Use short-lived certificates
   └── 90 days (Let's Encrypt default)

3. Use Certificate Transparency
   └── Monitor CT logs for unauthorized certificates

4. Set CAA records
   └── Restricts which CAs can issue for your domain

DNS CAA record example:
example.com. CAA 0 issue "letsencrypt.org"
example.com. CAA 0 iodef "mailto:security@example.com"
```

### OCSP Stapling

OCSP stapling improves privacy and performance by having the server fetch and cache revocation status:

```nginx
# Nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
```

Without stapling, the client contacts the CA's OCSP server, leaking browsing information.

### Testing Your Configuration

**SSL Labs:** https://www.ssllabs.com/ssltest/

Aim for an A or A+ rating. Common issues:
- Old protocol versions enabled
- Weak cipher suites
- Missing HSTS
- Certificate chain issues

# Summary

**TLS provides secure communication through three properties:**
- **Confidentiality:** Encryption prevents eavesdropping
- **Integrity:** MACs detect tampering
- **Authentication:** Certificates verify identity

**Key concepts:**
- The TLS handshake establishes shared session keys using asymmetric cryptography, then switches to fast symmetric encryption for data transfer
- TLS 1.3 reduces handshake latency (1-RTT vs 2-RTT) and removes insecure options
- Certificates and Certificate Authorities provide the trust model that allows clients to verify server identity
- Forward secrecy (ECDHE) ensures past sessions stay secure even if long-term keys are compromised
- Mutual TLS adds client authentication for service-to-service communication

**Best practices checklist:**
```
Protocol Version:
  □ Disable SSL 3.0, TLS 1.0, TLS 1.1
  □ Enable TLS 1.2 and TLS 1.3

Cipher Suites:
  □ Use ECDHE key exchange (forward secrecy)
  □ Use AEAD ciphers (AES-GCM, ChaCha20-Poly1305)
  □ Disable CBC mode ciphers in TLS 1.2

Certificates:
  □ Automate renewal (Let's Encrypt)
  □ Use 2048-bit RSA or P-256 ECDSA
  □ Enable OCSP stapling
  □ Set CAA DNS records

Headers:
  □ Enable HSTS with appropriate max-age
  □ Consider HSTS preload for production

Monitoring:
  □ Monitor certificate expiration
  □ Test with SSL Labs regularly
  □ Watch Certificate Transparency logs
```
