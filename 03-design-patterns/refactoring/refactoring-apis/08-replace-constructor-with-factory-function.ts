/**
 * REPLACE CONSTRUCTOR WITH FACTORY FUNCTION
 *
 * Replace a constructor call with a factory function.
 *
 * Motivation:
 * - Factory functions can have descriptive names
 * - Can return subclasses or cached instances
 * - Can return different types based on parameters
 * - More flexible than constructors
 *
 * Mechanics:
 * 1. Create a factory function that calls the constructor
 * 2. Replace constructor calls with factory function calls
 * 3. Consider making the constructor private
 */

// ============================================================================
// BEFORE: Using constructor directly
// ============================================================================

class EmployeeBefore {
  private _name: string;
  private _type: string;

  constructor(name: string, type: string) {
    this._name = name;
    this._type = type;
  }

  get name(): string {
    return this._name;
  }

  get type(): string {
    return this._type;
  }
}

// Type codes as magic strings
const engineer = new EmployeeBefore("John", "engineer");
const manager = new EmployeeBefore("Jane", "manager");

// ============================================================================
// AFTER: Factory functions
// ============================================================================

class Employee {
  protected constructor(
    private readonly _name: string,
    private readonly _type: string
  ) {}

  get name(): string {
    return this._name;
  }

  get type(): string {
    return this._type;
  }

  // Factory functions with descriptive names
  static createEngineer(name: string): Employee {
    return new Employee(name, "engineer");
  }

  static createManager(name: string): Employee {
    return new Employee(name, "manager");
  }

  static createSalesperson(name: string): Employee {
    return new Employee(name, "salesperson");
  }

  // Factory from data
  static fromData(data: { name: string; type: string }): Employee {
    return new Employee(data.name, data.type);
  }
}

// With subclasses
abstract class Document {
  protected constructor(protected readonly _title: string) {}

  abstract get type(): string;

  get title(): string {
    return this._title;
  }

  static createMarkdown(title: string): MarkdownDocument {
    return new MarkdownDocument(title);
  }

  static createPdf(title: string): PdfDocument {
    return new PdfDocument(title);
  }

  static createFromExtension(title: string, extension: string): Document {
    switch (extension.toLowerCase()) {
      case "md":
        return Document.createMarkdown(title);
      case "pdf":
        return Document.createPdf(title);
      default:
        throw new Error(`Unknown extension: ${extension}`);
    }
  }
}

class MarkdownDocument extends Document {
  constructor(title: string) {
    super(title);
  }

  get type(): string {
    return "markdown";
  }
}

class PdfDocument extends Document {
  constructor(title: string) {
    super(title);
  }

  get type(): string {
    return "pdf";
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Constructor with Factory Function ===\n");

console.log("--- Employee Factory ---");
const eng = Employee.createEngineer("Alice");
const mgr = Employee.createManager("Bob");
console.log(`${eng.name}: ${eng.type}`);
console.log(`${mgr.name}: ${mgr.type}`);

const fromData = Employee.fromData({ name: "Charlie", type: "engineer" });
console.log(`From data: ${fromData.name}: ${fromData.type}`);

console.log("\n--- Document Factory ---");
const mdDoc = Document.createMarkdown("README");
const pdfDoc = Document.createPdf("Report");
console.log(`${mdDoc.title}: ${mdDoc.type}`);
console.log(`${pdfDoc.title}: ${pdfDoc.type}`);

const autoDoc = Document.createFromExtension("Guide", "md");
console.log(`Auto-detected: ${autoDoc.title}: ${autoDoc.type}`);

void engineer;
void manager;

export {};
