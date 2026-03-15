# Cloudflare Workers Runtime - V8 Isolate Engine Project Plan

## 1. Project Overview

Build a serverless JavaScript runtime similar to Cloudflare Workers. This project focuses on creating a V8 isolate-based execution engine that can run JavaScript/TypeScript code with very low startup latency and strong security isolation. This is the most technically specialized project, diving deep into JavaScript engine internals.

### Core Value Proposition
- Execute JavaScript at the edge with isolate-based low-latency startup
- Strong isolation between tenants (no shared state)
- Low memory overhead per execution context
- Web-standard APIs (Fetch, crypto, etc.)

### Key Learning Outcomes
- V8 isolate architecture and lifecycle
- JavaScript runtime internals
- Web APIs implementation (Fetch, Streams, etc.)
- Memory isolation and security
- Rust/C++ systems programming
- Performance optimization at the microsecond level

---

## 2. Features & Requirements

### MVP (Must-Have)
- [ ] V8 isolate-based JavaScript execution
- [ ] Request/Response handling (Fetch API)
- [ ] Console logging
- [ ] Basic crypto (random, hashing)
- [ ] TextEncoder/TextDecoder
- [ ] setTimeout/setInterval (limited)
- [ ] Environment variables
- [ ] Script deployment API
- [ ] HTTP request routing to workers

### V2 Features (Nice-to-Have)
- [ ] WebCrypto API (full)
- [ ] Cache API
- [ ] KV storage
- [ ] Durable Objects (stateful workers)
- [ ] WebSocket support
- [ ] Cron triggers
- [ ] Tail workers (logging)
- [ ] CPU time limits
- [ ] Wrangler-like CLI
- [ ] TypeScript support
- [ ] npm module bundling

---

## 3. Tech Stack

### Runtime Core
| Technology | Purpose |
|------------|---------|
| Rust | Primary language (memory safety, V8 bindings) |
| V8 (rusty_v8/deno_core) | JavaScript engine |
| Tokio | Async runtime |
| Hyper | HTTP server |

### Alternative Stack
| Technology | Purpose |
|------------|---------|
| C++ | V8 embedding (traditional approach) |
| libuv | Event loop |
| libcurl | HTTP client |

### Web APIs (Rust crates)
| Technology | Purpose |
|------------|---------|
| ring | Cryptography |
| url | URL parsing |
| base64 | Encoding |
| serde_json | JSON handling |

### Deployment & Routing
| Technology | Purpose |
|------------|---------|
| Traefik/Nginx | Edge routing |
| etcd/Redis | Script storage |
| PostgreSQL | Metadata |
| Prometheus | Metrics |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
│                                                                              │
│  curl https://my-worker.edge.local/api/hello                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EDGE ROUTER                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Traefik/Nginx                                  │  │
│  │  - TLS termination                                                    │  │
│  │  - Route by hostname → worker ID                                      │  │
│  │  - Load balancing to runtime nodes                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME NODE (Rust)                                 │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         HTTP Server (Hyper)                            │  │
│  │  - Parse incoming request                                              │  │
│  │  - Extract worker ID from Host header                                  │  │
│  │  - Route to Isolate Pool                                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Isolate Pool                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    V8 Platform (single)                          │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐             │  │
│  │  │   Isolate 1   │  │   Isolate 2   │  │   Isolate 3   │             │  │
│  │  │   worker-a    │  │   worker-b    │  │   worker-c    │             │  │
│  │  │               │  │               │  │               │             │  │
│  │  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │             │  │
│  │  │ │  Context  │ │  │ │  Context  │ │  │ │  Context  │ │             │  │
│  │  │ │  - fetch  │ │  │ │  - fetch  │ │  │ │  - fetch  │ │             │  │
│  │  │ │  - crypto │ │  │ │  - crypto │ │  │ │  - crypto │ │             │  │
│  │  │ │  - console│ │  │ │  - console│ │  │ │  - console│ │             │  │
│  │  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │             │  │
│  │  └───────────────┘  └───────────────┘  └───────────────┘             │  │
│  │         │                  │                  │                       │  │
│  │         └──────────────────┼──────────────────┘                       │  │
│  │                            │                                          │  │
│  │                            ▼                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Isolate Cache (LRU)                          │  │  │
│  │  │  - Keep warm isolates for fast reuse                            │  │  │
│  │  │  - Evict after idle timeout                                     │  │  │
│  │  │  - Memory limit enforcement                                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Script Store                                   │  │
│  │  - Fetch compiled scripts from Redis/etcd                             │  │
│  │  - Cache compiled V8 snapshots                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### V8 Isolate Detail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              V8 ISOLATE                                      │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Heap (per-isolate)                             │  │
│  │  - New Space (young generation)                                       │  │
│  │  - Old Space (old generation)                                         │  │
│  │  - Code Space (compiled code)                                         │  │
│  │  - Memory limit: 128MB default                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Context                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Global Object                                │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │  │
│  │  │  │   console   │  │    fetch    │  │   crypto    │             │  │  │
│  │  │  │  .log()     │  │ (Request,   │  │ .randomUUID │             │  │  │
│  │  │  │  .error()   │  │  Response)  │  │ .subtle     │             │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │  │
│  │  │                                                                  │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │  │  │
│  │  │  │    URL      │  │ TextEncoder │  │  setTimeout │             │  │  │
│  │  │  │URLSearchPar │  │ TextDecoder │  │  (limited)  │             │  │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘             │  │  │
│  │  │                                                                  │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │  │  │
│  │  │  │                    User Script                           │   │  │  │
│  │  │  │  addEventListener('fetch', (event) => {                  │   │  │  │
│  │  │  │    event.respondWith(handleRequest(event.request));      │   │  │  │
│  │  │  │  });                                                     │   │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Properties:                                                                 │
│  - Complete memory isolation from other isolates                            │
│  - Cannot access file system, network (except via provided APIs)            │
│  - CPU time can be limited via V8 interrupts                                │
│  - Sub-millisecond creation with snapshots                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Execution Flow

```
1. HTTP Request arrives
         │
         ▼
2. Router extracts worker ID from hostname
   my-worker.edge.local → worker_id: "my-worker"
         │
         ▼
3. Check isolate cache for warm isolate
   ├── Cache HIT → Reuse existing isolate (fast path, <1ms)
   └── Cache MISS → Create new isolate
         │
         ▼
4. Create new isolate (cold start):
   a. Create V8 Isolate with memory limits
   b. Create Context with Web APIs
   c. Load and compile user script
   d. ~5-50ms depending on script size
         │
         ▼
5. Execute handler:
   a. Create Request object from HTTP
   b. Dispatch 'fetch' event
   c. Run user code in isolate
   d. Await Response promise
         │
         ▼
6. Return response:
   a. Serialize Response to HTTP
   b. Add isolate back to cache
   c. Send response to client
         │
         ▼
7. Cache maintenance:
   - Keep isolate warm for 30s
   - Evict on memory pressure
   - Reset state between requests (if stateless)
```

---

## 5. API Design

### Worker Script Format

```javascript
// User's worker script (ES Modules style)
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/hello') {
      return new Response(JSON.stringify({ message: 'Hello, World!' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// Or Service Worker style
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  return new Response('Hello from Worker!');
}
```

### Deployment API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workers` | Deploy new worker |
| PUT | `/api/workers/:id` | Update worker script |
| GET | `/api/workers/:id` | Get worker details |
| DELETE | `/api/workers/:id` | Delete worker |
| GET | `/api/workers/:id/logs` | Get worker logs |
| GET | `/api/workers` | List all workers |

**Deploy Worker Request**
```json
POST /api/workers
{
  "name": "my-worker",
  "script": "export default { async fetch(request) { return new Response('Hello'); } }",
  "routes": ["my-worker.edge.local/*"],
  "env": {
    "API_KEY": "secret123"
  }
}
```

**Response**
```json
{
  "id": "worker_abc123",
  "name": "my-worker",
  "url": "https://my-worker.edge.local",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## 6. Implementation Details

### V8 Isolate Wrapper (Rust)

```rust
// src/isolate.rs
use rusty_v8 as v8;
use std::sync::Arc;

pub struct WorkerIsolate {
    isolate: v8::OwnedIsolate,
    context: v8::Global<v8::Context>,
    script_id: String,
}

impl WorkerIsolate {
    pub fn new(script: &str, script_id: &str) -> Result<Self, String> {
        // Create isolate with limits
        let params = v8::CreateParams::default()
            .heap_limits(0, 128 * 1024 * 1024); // 128MB heap limit

        let mut isolate = v8::Isolate::new(params);

        let context = {
            let handle_scope = &mut v8::HandleScope::new(&mut isolate);
            let context = v8::Context::new(handle_scope);
            let scope = &mut v8::ContextScope::new(handle_scope, context);

            // Install global APIs
            install_console(scope);
            install_fetch_api(scope);
            install_crypto(scope);
            install_text_encoding(scope);
            install_url_api(scope);

            // Compile and run the script
            let code = v8::String::new(scope, script).unwrap();
            let script = v8::Script::compile(scope, code, None)
                .ok_or("Failed to compile script")?;
            script.run(scope).ok_or("Failed to run script")?;

            v8::Global::new(scope, context)
        };

        Ok(WorkerIsolate {
            isolate,
            context,
            script_id: script_id.to_string(),
        })
    }

    pub async fn handle_request(&mut self, request: Request) -> Result<Response, String> {
        let handle_scope = &mut v8::HandleScope::new(&mut self.isolate);
        let context = v8::Local::new(handle_scope, &self.context);
        let scope = &mut v8::ContextScope::new(handle_scope, context);

        // Get the fetch handler
        let global = context.global(scope);
        let handler_key = v8::String::new(scope, "default").unwrap();
        let handler = global.get(scope, handler_key.into())
            .ok_or("No default export")?;

        let handler_obj = handler.to_object(scope)
            .ok_or("Default export is not an object")?;

        let fetch_key = v8::String::new(scope, "fetch").unwrap();
        let fetch_fn = handler_obj.get(scope, fetch_key.into())
            .ok_or("No fetch handler")?;

        let fetch_fn = v8::Local::<v8::Function>::try_from(fetch_fn)
            .map_err(|_| "fetch is not a function")?;

        // Create Request object
        let request_obj = create_request_object(scope, request)?;

        // Call the handler
        let result = fetch_fn.call(scope, handler.into(), &[request_obj.into()])
            .ok_or("Handler threw an exception")?;

        // Await if promise
        let response = await_promise(scope, result)?;

        // Convert to Response
        parse_response_object(scope, response)
    }
}

fn install_console(scope: &mut v8::ContextScope<v8::HandleScope>) {
    let global = scope.get_current_context().global(scope);

    let console = v8::Object::new(scope);

    // console.log
    let log_fn = v8::Function::new(scope, |scope: &mut v8::HandleScope,
                                         args: v8::FunctionCallbackArguments,
                                         _rv: v8::ReturnValue| {
        let message = args.get(0).to_string(scope).unwrap();
        let msg = message.to_rust_string_lossy(scope);
        println!("[worker] {}", msg);
    }).unwrap();

    let log_key = v8::String::new(scope, "log").unwrap();
    console.set(scope, log_key.into(), log_fn.into());

    let console_key = v8::String::new(scope, "console").unwrap();
    global.set(scope, console_key.into(), console.into());
}

fn install_fetch_api(scope: &mut v8::ContextScope<v8::HandleScope>) {
    // Install Request class
    let request_template = v8::FunctionTemplate::new(scope, request_constructor);
    // ... add prototype methods

    // Install Response class
    let response_template = v8::FunctionTemplate::new(scope, response_constructor);
    // ... add prototype methods

    // Install global fetch function
    let fetch_fn = v8::Function::new(scope, |scope: &mut v8::HandleScope,
                                           args: v8::FunctionCallbackArguments,
                                           mut rv: v8::ReturnValue| {
        // Create promise for async fetch
        let resolver = v8::PromiseResolver::new(scope).unwrap();
        let promise = resolver.get_promise(scope);

        // Spawn async task to perform fetch
        // ... implementation details

        rv.set(promise.into());
    }).unwrap();

    let global = scope.get_current_context().global(scope);
    let fetch_key = v8::String::new(scope, "fetch").unwrap();
    global.set(scope, fetch_key.into(), fetch_fn.into());
}
```

### HTTP Server (Rust with Hyper)

```rust
// src/server.rs
use hyper::{Body, Request, Response, Server};
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct WorkerRuntime {
    isolate_pool: Arc<RwLock<IsolatePool>>,
    script_store: Arc<ScriptStore>,
}

impl WorkerRuntime {
    pub async fn handle_request(
        &self,
        req: Request<Body>
    ) -> Result<Response<Body>, hyper::Error> {
        // Extract worker ID from Host header
        let host = req.headers()
            .get("host")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown");

        let worker_id = extract_worker_id(host);

        // Get or create isolate
        let mut pool = self.isolate_pool.write().await;
        let isolate = match pool.get(&worker_id) {
            Some(isolate) => isolate,
            None => {
                // Load script and create new isolate
                let script = self.script_store.get(&worker_id).await?;
                let isolate = WorkerIsolate::new(&script, &worker_id)?;
                pool.insert(worker_id.clone(), isolate);
                pool.get(&worker_id).unwrap()
            }
        };

        // Convert hyper Request to worker Request
        let worker_request = convert_request(req).await?;

        // Execute in isolate
        let start = std::time::Instant::now();
        let response = isolate.handle_request(worker_request).await?;
        let duration = start.elapsed();

        println!("[{}] {} {} {:?}",
            worker_id,
            response.status(),
            worker_request.url(),
            duration
        );

        // Convert worker Response to hyper Response
        convert_response(response)
    }
}

#[tokio::main]
async fn main() {
    // Initialize V8
    let platform = v8::new_default_platform(0, false).make_shared();
    v8::V8::initialize_platform(platform);
    v8::V8::initialize();

    let runtime = Arc::new(WorkerRuntime::new());

    let make_svc = hyper::service::make_service_fn(move |_conn| {
        let runtime = runtime.clone();
        async move {
            Ok::<_, hyper::Error>(hyper::service::service_fn(move |req| {
                let runtime = runtime.clone();
                async move { runtime.handle_request(req).await }
            }))
        }
    });

    let addr = ([0, 0, 0, 0], 8080).into();
    let server = Server::bind(&addr).serve(make_svc);

    println!("Worker runtime listening on http://{}", addr);

    if let Err(e) = server.await {
        eprintln!("Server error: {}", e);
    }
}
```

### Isolate Pool with LRU Cache

```rust
// src/pool.rs
use lru::LruCache;
use std::num::NonZeroUsize;
use tokio::time::{Duration, Instant};

pub struct IsolatePool {
    cache: LruCache<String, CachedIsolate>,
    max_isolates: usize,
    idle_timeout: Duration,
}

struct CachedIsolate {
    isolate: WorkerIsolate,
    last_used: Instant,
    request_count: u64,
}

impl IsolatePool {
    pub fn new(max_isolates: usize, idle_timeout_secs: u64) -> Self {
        IsolatePool {
            cache: LruCache::new(NonZeroUsize::new(max_isolates).unwrap()),
            max_isolates,
            idle_timeout: Duration::from_secs(idle_timeout_secs),
        }
    }

    pub fn get(&mut self, worker_id: &str) -> Option<&mut WorkerIsolate> {
        if let Some(cached) = self.cache.get_mut(worker_id) {
            cached.last_used = Instant::now();
            cached.request_count += 1;
            return Some(&mut cached.isolate);
        }
        None
    }

    pub fn insert(&mut self, worker_id: String, isolate: WorkerIsolate) {
        self.cache.put(worker_id, CachedIsolate {
            isolate,
            last_used: Instant::now(),
            request_count: 1,
        });
    }

    pub fn cleanup_idle(&mut self) {
        let now = Instant::now();
        let timeout = self.idle_timeout;

        // Collect keys to remove
        let to_remove: Vec<String> = self.cache
            .iter()
            .filter(|(_, cached)| now.duration_since(cached.last_used) > timeout)
            .map(|(k, _)| k.clone())
            .collect();

        for key in to_remove {
            self.cache.pop(&key);
        }
    }
}
```

### Web APIs Implementation

```rust
// src/apis/fetch.rs

/// Request class implementation
pub fn request_constructor(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let url = args.get(0).to_string(scope).unwrap();
    let url_str = url.to_rust_string_lossy(scope);

    let this = args.this();

    // Store URL
    let url_key = v8::String::new(scope, "_url").unwrap();
    this.set(scope, url_key.into(), url.into());

    // Store method
    let method_key = v8::String::new(scope, "_method").unwrap();
    let method = v8::String::new(scope, "GET").unwrap();
    this.set(scope, method_key.into(), method.into());

    // Store headers
    let headers_key = v8::String::new(scope, "_headers").unwrap();
    let headers = v8::Object::new(scope);
    this.set(scope, headers_key.into(), headers.into());

    rv.set(this.into());
}

/// Response class implementation
pub fn response_constructor(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let body = args.get(0);
    let init = args.get(1);

    let this = args.this();

    // Store body
    let body_key = v8::String::new(scope, "_body").unwrap();
    this.set(scope, body_key.into(), body);

    // Parse init object for status, headers
    if init.is_object() {
        let init_obj = init.to_object(scope).unwrap();

        // Status
        let status_key = v8::String::new(scope, "status").unwrap();
        if let Some(status) = init_obj.get(scope, status_key.into()) {
            let status_store = v8::String::new(scope, "_status").unwrap();
            this.set(scope, status_store.into(), status);
        }

        // Headers
        let headers_key = v8::String::new(scope, "headers").unwrap();
        if let Some(headers) = init_obj.get(scope, headers_key.into()) {
            let headers_store = v8::String::new(scope, "_headers").unwrap();
            this.set(scope, headers_store.into(), headers);
        }
    }

    rv.set(this.into());
}

/// crypto.randomUUID()
pub fn crypto_random_uuid(
    scope: &mut v8::HandleScope,
    _args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let uuid = uuid::Uuid::new_v4().to_string();
    let uuid_v8 = v8::String::new(scope, &uuid).unwrap();
    rv.set(uuid_v8.into());
}

/// TextEncoder
pub fn text_encoder_encode(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let input = args.get(0).to_string(scope).unwrap();
    let rust_string = input.to_rust_string_lossy(scope);
    let bytes = rust_string.as_bytes();

    let array_buffer = v8::ArrayBuffer::new(scope, bytes.len());
    let backing_store = array_buffer.get_backing_store();
    // Copy bytes to backing store
    unsafe {
        std::ptr::copy_nonoverlapping(
            bytes.as_ptr(),
            backing_store.data().unwrap().as_ptr() as *mut u8,
            bytes.len(),
        );
    }

    let uint8_array = v8::Uint8Array::new(scope, array_buffer, 0, bytes.len()).unwrap();
    rv.set(uint8_array.into());
}
```

---

## 7. Security Model

### Isolation Guarantees

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY BOUNDARIES                                  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. V8 Isolate Boundary                                                │  │
│  │     - Separate heap per isolate                                        │  │
│  │     - No shared JavaScript objects                                     │  │
│  │     - Memory limits enforced                                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  2. No Native Access                                                   │  │
│  │     - No file system access                                            │  │
│  │     - No raw network sockets                                           │  │
│  │     - No process spawning                                              │  │
│  │     - No eval/Function with arbitrary strings (optional)               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  3. Controlled APIs                                                    │  │
│  │     - fetch() only to allowed destinations                             │  │
│  │     - crypto only for safe operations                                  │  │
│  │     - console for logging only                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  4. Resource Limits                                                    │  │
│  │     - CPU time: 50ms per request (configurable)                        │  │
│  │     - Memory: 128MB heap limit                                         │  │
│  │     - No setTimeout > 30s                                              │  │
│  │     - Request timeout: 30s                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CPU Time Limiting

```rust
// Using V8 interrupts to limit CPU time
fn setup_cpu_limit(isolate: &mut v8::Isolate, max_ms: u64) {
    let start = std::time::Instant::now();

    isolate.set_promise_hook(move |_type, _promise, _parent| {
        // Check time on each promise
    });

    // Use terminate_execution when limit exceeded
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(max_ms));
        // isolate.terminate_execution();
    });
}
```

---

## 8. Implementation Phases

### Phase 1: Basic V8 Embedding
1. Set up Rust project with rusty_v8
2. Create simple V8 isolate wrapper
3. Execute basic JavaScript
4. Implement console.log
5. Test with simple scripts

### Phase 2: Web APIs
1. Implement Request class
2. Implement Response class
3. Implement Headers class
4. Add URL and URLSearchParams
5. Add TextEncoder/TextDecoder
6. Basic crypto (randomUUID)

### Phase 3: Fetch API
1. Implement global fetch()
2. Handle async/await in V8
3. Implement fetch event dispatching
4. Test with real HTTP requests

### Phase 4: HTTP Server
1. Create Hyper-based server
2. Route requests to isolates
3. Implement isolate pool
4. Add LRU caching

### Phase 5: Deployment API
1. Create management API
2. Script storage (Redis/etcd)
3. Routing configuration
4. Environment variables

### Phase 6: Production Features
1. Add CPU time limits
2. Memory limit enforcement
3. Logging and metrics
4. Error handling
5. Graceful shutdown

### Phase 7: Advanced Features
1. WebCrypto API (subtle)
2. KV storage API
3. Cache API
4. WebSocket support

---

## 9. DevOps Roadmap Concepts Covered

| # | Concept | How It's Used |
|---|---------|---------------|
| 1 | Bash/Terminal | Build scripts, deployment |
| 2 | VMs/Baremetal | Understanding V8 at hardware level |
| 3 | Process management | Isolate lifecycle |
| 4 | Certificates | HTTPS for edge routing |
| 5 | ASGs/MIGs | Scaling runtime nodes |
| 6 | Containers | Optional containerization |
| 7 | Docker | Development environment |
| 8 | Kubernetes | Optional deployment |
| 9 | Kubernetes | Optional deployment |
| 10 | CI/CD | Build and deploy pipeline |
| 11 | Monitoring | Prometheus metrics |
| 12 | IaC | Terraform for infra |
| 13 | CDNs | Edge routing concept |
| 14 | Sandboxing | V8 isolate security |

---

## 10. Folder Structure

```
cloudflare-workers-runtime/
├── src/
│   ├── main.rs                     # Entry point
│   ├── server.rs                   # HTTP server
│   ├── isolate.rs                  # V8 isolate wrapper
│   ├── pool.rs                     # Isolate pool/cache
│   ├── script_store.rs             # Script storage
│   └── apis/
│       ├── mod.rs
│       ├── console.rs              # console API
│       ├── fetch.rs                # fetch, Request, Response
│       ├── crypto.rs               # crypto API
│       ├── encoding.rs             # TextEncoder/Decoder
│       ├── url.rs                  # URL API
│       └── timers.rs               # setTimeout/setInterval
├── management/
│   ├── src/
│   │   ├── main.rs                 # Management API server
│   │   └── routes.rs
│   └── Cargo.toml
├── examples/
│   ├── hello-world.js
│   ├── json-api.js
│   └── proxy.js
├── tests/
│   ├── isolate_tests.rs
│   ├── api_tests.rs
│   └── integration_tests.rs
├── deployments/
│   ├── docker-compose.yml
│   └── kubernetes/
├── Cargo.toml
├── Cargo.lock
└── README.md
```

---

## 11. Development Commands

```bash
# Initialize Rust project
cargo init cloudflare-workers-runtime

# Add dependencies (Cargo.toml)
# rusty_v8 = "0.82"
# tokio = { version = "1", features = ["full"] }
# hyper = { version = "0.14", features = ["server", "http1"] }

# Build
cargo build --release

# Run
cargo run --release

# Test
cargo test

# Deploy a worker
curl -X POST http://localhost:8080/api/workers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hello",
    "script": "export default { fetch() { return new Response(\"Hello!\"); } }"
  }'

# Test the worker
curl http://hello.localhost:8080/
```

---

## 12. Performance Considerations

### Cold Start Optimization

1. **V8 Snapshots**: Pre-compile scripts to snapshots
2. **Isolate Pooling**: Pre-warm isolates
3. **Lazy API Loading**: Only load APIs when used
4. **Memory Balancing**: Share code pages between isolates

### Benchmarks to Target

| Metric | Target |
|--------|--------|
| Cold start | < 5ms |
| Warm request | < 1ms overhead |
| Memory per isolate | < 10MB base |
| Requests/second | > 10,000 |

---

## Summary

The Cloudflare Workers Runtime is the most technically deep project, requiring understanding of V8 internals, Rust systems programming, and runtime design. Start with basic JavaScript execution, then incrementally add Web APIs. The isolate pooling and caching strategy is critical for performance.

**Estimated Complexity**: Expert
**Core Skills**: Rust, V8 internals, Systems Programming, HTTP
**Unique Challenge**: Building a production-quality JavaScript runtime
