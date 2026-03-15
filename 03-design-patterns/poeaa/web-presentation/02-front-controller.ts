/**
 * FRONT CONTROLLER
 *
 * A controller that handles all requests for a web site. Centralizes
 * common behavior like security, i18n, view selection, and routing.
 *
 * Characteristics:
 * - Single entry point for all requests
 * - Centralizes cross-cutting concerns
 * - Dispatches to specific handlers/commands
 * - Used by most web frameworks (Express, Django, Rails)
 */

// Request object (simplified HTTP request)
interface HttpRequest {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  params: Record<string, string>;
  body?: unknown;
  headers: Record<string, string>;
  user?: { id: string; role: string };
}

// Response object
interface HttpResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

// Command interface for handlers
interface Command {
  execute(request: HttpRequest): HttpResponse;
}

// Concrete commands for different routes
class HomeCommand implements Command {
  execute(_request: HttpRequest): HttpResponse {
    return {
      status: 200,
      body: { message: "Welcome to the homepage" },
      headers: { "Content-Type": "application/json" },
    };
  }
}

class UserListCommand implements Command {
  execute(_request: HttpRequest): HttpResponse {
    return {
      status: 200,
      body: {
        users: [
          { id: "1", name: "Alice" },
          { id: "2", name: "Bob" },
        ],
      },
      headers: { "Content-Type": "application/json" },
    };
  }
}

class UserDetailCommand implements Command {
  execute(request: HttpRequest): HttpResponse {
    const userId = request.params.id;
    return {
      status: 200,
      body: { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` },
      headers: { "Content-Type": "application/json" },
    };
  }
}

class NotFoundCommand implements Command {
  execute(request: HttpRequest): HttpResponse {
    return {
      status: 404,
      body: { error: `Route not found: ${request.path}` },
      headers: { "Content-Type": "application/json" },
    };
  }
}

// FRONT CONTROLLER
class FrontController {
  private routes = new Map<string, Command>();
  private defaultCommand: Command = new NotFoundCommand();

  // Register routes
  addRoute(pattern: string, command: Command): void {
    this.routes.set(pattern, command);
  }

  // Handle all requests - single entry point
  handleRequest(request: HttpRequest): HttpResponse {
    console.log(`\n[FrontController] ${request.method} ${request.path}`);

    // 1. Apply cross-cutting concerns (security, logging, etc.)
    this.logRequest(request);

    if (!this.authenticate(request)) {
      return {
        status: 401,
        body: { error: "Unauthorized" },
        headers: { "Content-Type": "application/json" },
      };
    }

    // 2. Route to appropriate command
    const command = this.routeRequest(request);

    // 3. Execute command and get response
    const response = command.execute(request);

    // 4. Apply response filters (add common headers, etc.)
    this.addCommonHeaders(response);

    console.log(`[FrontController] Response: ${response.status}`);
    return response;
  }

  private logRequest(request: HttpRequest): void {
    console.log(`  [Log] ${new Date().toISOString()} - ${request.method} ${request.path}`);
  }

  private authenticate(request: HttpRequest): boolean {
    // Check for auth header (simplified)
    const authHeader = request.headers["Authorization"];
    if (request.path.startsWith("/api/") && !authHeader) {
      console.log("  [Auth] No authorization header for protected route");
      return false;
    }
    console.log("  [Auth] Request authorized");
    return true;
  }

  private routeRequest(request: HttpRequest): Command {
    // Simple pattern matching (real routers are more sophisticated)
    for (const [pattern, command] of Array.from(this.routes)) {
      const match = this.matchRoute(pattern, request.path);
      if (match) {
        request.params = { ...request.params, ...match };
        console.log(`  [Route] Matched: ${pattern}`);
        return command;
      }
    }
    console.log("  [Route] No match found");
    return this.defaultCommand;
  }

  private matchRoute(pattern: string, path: string): Record<string, string> | null {
    // Handle exact matches
    if (pattern === path) return {};

    // Handle parameterized routes like /users/:id
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  private addCommonHeaders(response: HttpResponse): void {
    response.headers["X-Powered-By"] = "FrontController";
    response.headers["X-Request-Id"] = Math.random().toString(36).slice(2);
  }
}

// Usage
console.log("=== Front Controller Pattern ===");

// Set up front controller with routes
const controller = new FrontController();
controller.addRoute("/", new HomeCommand());
controller.addRoute("/users", new UserListCommand());
controller.addRoute("/users/:id", new UserDetailCommand());

// Simulate requests
const requests: HttpRequest[] = [
  { path: "/", method: "GET", params: {}, headers: {} },
  { path: "/users", method: "GET", params: {}, headers: { Authorization: "Bearer token" } },
  { path: "/users/42", method: "GET", params: {}, headers: { Authorization: "Bearer token" } },
  { path: "/api/secret", method: "GET", params: {}, headers: {} }, // Will fail auth
  { path: "/unknown", method: "GET", params: {}, headers: {} },
];

requests.forEach((request) => {
  const response = controller.handleRequest(request);
  console.log(`  Response body:`, response.body);
});

// Make this file a module to avoid global scope pollution
export {};
