/**
 * MODEL VIEW CONTROLLER (MVC)
 *
 * Splits user interface interaction into three distinct roles:
 * - Model: Domain data and business logic
 * - View: Display of information
 * - Controller: Handles user input and updates model
 *
 * Characteristics:
 * - Separation of concerns
 * - Model is independent of UI
 * - Multiple views can share the same model
 * - Foundation for most web frameworks
 */

// MODEL - domain data and business logic
class TodoModel {
  private items: Array<{ id: string; text: string; completed: boolean }> = [];
  private listeners: Array<() => void> = [];

  addItem(text: string): void {
    this.items.push({
      id: `todo-${Date.now()}`,
      text,
      completed: false,
    });
    this.notifyListeners();
  }

  toggleItem(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.completed = !item.completed;
      this.notifyListeners();
    }
  }

  removeItem(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
    this.notifyListeners();
  }

  getItems() {
    return [...this.items];
  }

  getCompletedCount(): number {
    return this.items.filter((i) => i.completed).length;
  }

  // Observer pattern for view updates
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// VIEW - display logic (simulated for console)
class TodoView {
  constructor(private model: TodoModel) {
    // Listen to model changes
    model.addListener(() => this.render());
  }

  render(): void {
    console.log("\n--- Todo List ---");
    const items = this.model.getItems();

    if (items.length === 0) {
      console.log("  (No items)");
    } else {
      items.forEach((item) => {
        const status = item.completed ? "[x]" : "[ ]";
        console.log(`  ${status} ${item.text} (id: ${item.id})`);
      });
    }

    console.log(`\nCompleted: ${this.model.getCompletedCount()}/${items.length}`);
    console.log("-----------------\n");
  }

  // View also provides methods to get user input
  displayMessage(message: string): void {
    console.log(`>> ${message}`);
  }
}

// CONTROLLER - handles input and coordinates model/view
class TodoController {
  constructor(
    private model: TodoModel,
    private view: TodoView
  ) {}

  // Action handlers
  addTodo(text: string): void {
    if (text.trim() === "") {
      this.view.displayMessage("Cannot add empty todo");
      return;
    }
    this.model.addItem(text);
    this.view.displayMessage(`Added: "${text}"`);
  }

  toggleTodo(id: string): void {
    this.model.toggleItem(id);
    this.view.displayMessage(`Toggled: ${id}`);
  }

  removeTodo(id: string): void {
    this.model.removeItem(id);
    this.view.displayMessage(`Removed: ${id}`);
  }
}

// Usage - simulating user interactions
console.log("=== MVC Pattern ===\n");

// Create MVC components
const model = new TodoModel();
const view = new TodoView(model);
const controller = new TodoController(model, view);

// Initial render
view.render();

// User actions go through controller
controller.addTodo("Learn MVC pattern");
controller.addTodo("Build a web app");
controller.addTodo("Deploy to production");

// Toggle completion
const items = model.getItems();
controller.toggleTodo(items[0].id);

// Remove an item
controller.removeTodo(items[1].id);

// Make this file a module to avoid global scope pollution
export {};
