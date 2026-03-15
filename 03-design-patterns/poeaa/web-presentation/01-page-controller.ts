/**
 * PAGE CONTROLLER
 *
 * An object that handles a request for a specific page or action.
 * One controller per page/action.
 *
 * Characteristics:
 * - Simpler than Front Controller
 * - One handler per logical page
 * - Common in simpler web applications
 * - Each controller handles its own view selection
 */

// Simulated database
const database = {
  products: new Map([
    ["p1", { id: "p1", name: "Laptop", price: 999, description: "Powerful laptop" }],
    ["p2", { id: "p2", name: "Mouse", price: 25, description: "Wireless mouse" }],
    ["p3", { id: "p3", name: "Keyboard", price: 75, description: "Mechanical keyboard" }],
  ]),
};

// Request/Response types
interface PageRequest {
  params: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

interface PageResponse {
  template: string;
  data: Record<string, unknown>;
}

// Base Page Controller
abstract class PageController {
  abstract handle(request: PageRequest): PageResponse;

  protected render(template: string, data: Record<string, unknown>): PageResponse {
    return { template, data };
  }

  protected redirect(url: string): PageResponse {
    return { template: "redirect", data: { url } };
  }
}

// PAGE CONTROLLERS - one per page/action

class ProductListController extends PageController {
  handle(_request: PageRequest): PageResponse {
    console.log("[ProductListController] Handling request");

    const products = Array.from(database.products.values());

    return this.render("product/list", {
      title: "All Products",
      products,
      count: products.length,
    });
  }
}

class ProductDetailController extends PageController {
  handle(request: PageRequest): PageResponse {
    const productId = request.params.id;
    console.log(`[ProductDetailController] Handling request for product: ${productId}`);

    const product = database.products.get(productId);

    if (!product) {
      return this.render("error/404", {
        message: `Product ${productId} not found`,
      });
    }

    return this.render("product/detail", {
      title: product.name,
      product,
    });
  }
}

class ProductSearchController extends PageController {
  handle(request: PageRequest): PageResponse {
    const query = request.query.q?.toLowerCase() || "";
    console.log(`[ProductSearchController] Searching for: "${query}"`);

    if (!query) {
      return this.render("product/search", {
        title: "Search Products",
        products: [],
        query: "",
        message: "Enter a search term",
      });
    }

    const products = Array.from(database.products.values()).filter(
      (p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)
    );

    return this.render("product/search", {
      title: `Search: ${query}`,
      products,
      query,
      message: products.length === 0 ? "No products found" : null,
    });
  }
}

class ProductCreateController extends PageController {
  handle(request: PageRequest): PageResponse {
    console.log("[ProductCreateController] Handling create request");

    // Show form if no body
    if (!request.body) {
      return this.render("product/create", {
        title: "Add New Product",
        errors: [],
      });
    }

    // Process form submission
    const body = request.body as { name: string; price: number; description: string };

    // Validation
    const errors: string[] = [];
    if (!body.name) errors.push("Name is required");
    if (!body.price || body.price <= 0) errors.push("Price must be positive");

    if (errors.length > 0) {
      return this.render("product/create", {
        title: "Add New Product",
        errors,
        formData: body,
      });
    }

    // Create product
    const id = `p-${Date.now()}`;
    database.products.set(id, { id, ...body });

    console.log(`[ProductCreateController] Created product: ${id}`);
    return this.redirect(`/products/${id}`);
  }
}

// Simple view renderer (simulates template rendering)
function renderView(response: PageResponse): void {
  console.log(`\n--- Rendering: ${response.template} ---`);
  console.log("Data:", JSON.stringify(response.data, null, 2));
  console.log("-----------------------------------\n");
}

// Usage
console.log("=== Page Controller Pattern ===\n");

// Each page has its own controller
const listController = new ProductListController();
const detailController = new ProductDetailController();
const searchController = new ProductSearchController();
const createController = new ProductCreateController();

// Simulate requests to different pages

// List page
console.log("Request: GET /products");
renderView(listController.handle({ params: {}, query: {} }));

// Detail page
console.log("Request: GET /products/p1");
renderView(detailController.handle({ params: { id: "p1" }, query: {} }));

// Search page
console.log("Request: GET /products/search?q=key");
renderView(searchController.handle({ params: {}, query: { q: "key" } }));

// Create page - show form
console.log("Request: GET /products/new");
renderView(createController.handle({ params: {}, query: {} }));

// Create page - submit form
console.log("Request: POST /products/new");
renderView(
  createController.handle({
    params: {},
    query: {},
    body: { name: "Monitor", price: 300, description: "4K display" },
  })
);

// Make this file a module to avoid global scope pollution
export {};
