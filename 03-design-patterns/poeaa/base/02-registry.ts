/**
 * REGISTRY
 *
 * A well-known object that other objects can use to find common
 * objects and services.
 *
 * Characteristics:
 * - Global access point for shared services
 * - Similar to Service Locator pattern
 * - Can be singleton or thread-scoped
 * - Use sparingly - can hide dependencies
 */

// Services that will be registered
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface Config {
  get(key: string): string | undefined;
}

// Concrete implementations
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  error(message: string): void {
    console.log(`[ERROR] ${message}`);
  }
}

class MemoryCache implements CacheService {
  private store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
}

class AppConfig implements Config {
  private settings = new Map<string, string>([
    ["app.name", "MyApp"],
    ["app.version", "1.0.0"],
    ["db.host", "localhost"],
  ]);

  get(key: string): string | undefined {
    return this.settings.get(key);
  }
}

// REGISTRY - singleton pattern for global service access
class Registry {
  private static instance: Registry;
  private services = new Map<string, unknown>();

  // Private constructor for singleton
  private constructor() {}

  static getInstance(): Registry {
    if (!Registry.instance) {
      Registry.instance = new Registry();
    }
    return Registry.instance;
  }

  // Register a service
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
    console.log(`[Registry] Registered: ${name}`);
  }

  // Get a service
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service as T;
  }

  // Check if service exists
  has(name: string): boolean {
    return this.services.has(name);
  }

  // Convenience accessors for common services
  static logger(): Logger {
    return Registry.getInstance().get<Logger>("logger");
  }

  static cache(): CacheService {
    return Registry.getInstance().get<CacheService>("cache");
  }

  static config(): Config {
    return Registry.getInstance().get<Config>("config");
  }
}

// SCOPED REGISTRY - for request-scoped services
class ScopedRegistry {
  private services = new Map<string, unknown>();

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found in scope: ${name}`);
    }
    return service as T;
  }
}

// Request context using scoped registry
class RequestContext {
  private static currentContext: ScopedRegistry | null = null;

  static run<T>(fn: () => T): T {
    RequestContext.currentContext = new ScopedRegistry();
    try {
      return fn();
    } finally {
      RequestContext.currentContext = null;
    }
  }

  static current(): ScopedRegistry {
    if (!RequestContext.currentContext) {
      throw new Error("No active request context");
    }
    return RequestContext.currentContext;
  }
}

// Service that uses registry
class UserService {
  findUser(id: string): { id: string; name: string } | null {
    const logger = Registry.logger();
    const cache = Registry.cache();
    const config = Registry.config();

    logger.log(`Finding user ${id} in ${config.get("app.name")}`);

    // Check cache
    const cached = cache.get(`user:${id}`);
    if (cached) {
      logger.log("Cache hit!");
      return cached as { id: string; name: string };
    }

    // Simulate DB lookup
    const user = { id, name: `User ${id}` };

    // Cache result
    cache.set(`user:${id}`, user);
    logger.log("Cached user");

    return user;
  }
}

// Usage
console.log("=== Registry Pattern ===\n");

// Bootstrap - register services at application startup
const registry = Registry.getInstance();
registry.register("logger", new ConsoleLogger());
registry.register("cache", new MemoryCache());
registry.register("config", new AppConfig());

console.log(""); // spacing

// Use services through registry
const userService = new UserService();

// First call - cache miss
console.log("First lookup:");
const user1 = userService.findUser("123");
console.log("Result:", user1);

console.log("\nSecond lookup (cached):");
const user2 = userService.findUser("123");
console.log("Result:", user2);

// Direct access to services
console.log("\nDirect service access:");
const appName = Registry.config().get("app.name");
console.log(`App name from config: ${appName}`);

// Scoped registry example
console.log("\n--- Scoped Registry ---");
RequestContext.run(() => {
  // Register request-scoped service
  RequestContext.current().register("currentUser", { id: "u1", name: "Alice" });

  // Access within request
  const currentUser = RequestContext.current().get<{ id: string; name: string }>("currentUser");
  console.log("Current user in request:", currentUser);
});

// Outside request context - would throw
try {
  RequestContext.current();
} catch (e) {
  console.log("Outside request context: No active request context");
}

// Make this file a module to avoid global scope pollution
export {};
