/**
 * Factory Method Pattern
 * Category: Creational
 *
 * Definition:
 * The Factory Method pattern defines an interface for creating an object,
 * but lets subclasses decide which class to instantiate. It lets a class
 * defer instantiation to subclasses.
 *
 * When to use:
 * - When a class can't anticipate the type of objects it needs to create
 * - When a class wants its subclasses to specify the objects it creates
 * - When you want to localize the knowledge of which class gets created
 *
 * Key Benefits:
 * - Eliminates the need to bind application-specific classes into code
 * - Provides hooks for subclasses to extend
 * - Connects parallel class hierarchies
 *
 * Structure:
 * - Product: Defines the interface of objects the factory method creates
 * - ConcreteProduct: Implements the Product interface
 * - Creator: Declares the factory method (can provide default implementation)
 * - ConcreteCreator: Overrides factory method to return ConcreteProduct
 */

// ============================================================================
// PRODUCT INTERFACE
// ============================================================================

/**
 * IDocument - Product interface that all documents must implement.
 * (Named IDocument to avoid conflict with DOM's Document type)
 * This defines the common operations that all document types support.
 */
interface IDocument {
  // Returns the type/format of the document
  getType(): string;

  // Opens the document for viewing/editing
  openDoc(): void;

  // Saves the document to storage
  save(): void;

  // Renders the document content
  render(): string;
}

// ============================================================================
// CONCRETE PRODUCTS
// ============================================================================

/**
 * PDFDoc - Concrete implementation for PDF files.
 * Handles PDF-specific operations like compression, encryption, etc.
 */
class PDFDoc implements IDocument {
  private content: string;

  constructor(content: string = "") {
    this.content = content;
  }

  getType(): string {
    return "PDF";
  }

  openDoc(): void {
    console.log("Opening PDF document in Adobe Reader...");
  }

  save(): void {
    console.log("Saving PDF with compression enabled...");
  }

  render(): string {
    return `[PDF Format]\n${this.content}\n[End of PDF]`;
  }
}

/**
 * WordDoc - Concrete implementation for Word files.
 * Handles DOCX-specific operations like rich text formatting.
 */
class WordDoc implements IDocument {
  private content: string;

  constructor(content: string = "") {
    this.content = content;
  }

  getType(): string {
    return "Word";
  }

  openDoc(): void {
    console.log("Opening Word document in Microsoft Word...");
  }

  save(): void {
    console.log("Saving Word document with auto-recovery...");
  }

  render(): string {
    return `[DOCX Format]\n${this.content}\n[End of Word Document]`;
  }
}

/**
 * HTMLDoc - Concrete implementation for HTML files.
 * Handles web-specific operations like markup rendering.
 */
class HTMLDoc implements IDocument {
  private content: string;

  constructor(content: string = "") {
    this.content = content;
  }

  getType(): string {
    return "HTML";
  }

  openDoc(): void {
    console.log("Opening HTML document in web browser...");
  }

  save(): void {
    console.log("Saving HTML with UTF-8 encoding...");
  }

  render(): string {
    return `<!DOCTYPE html>\n<html>\n<body>\n${this.content}\n</body>\n</html>`;
  }
}

// ============================================================================
// CREATOR (ABSTRACT FACTORY)
// ============================================================================

/**
 * DocumentCreator - Abstract creator class.
 *
 * The key insight of Factory Method:
 * - This class declares the factory method (createDocument)
 * - Subclasses override it to change the type of document created
 * - The creator's primary responsibility is NOT creating documents,
 *   but rather some core business logic that relies on documents
 */
abstract class DocumentCreator {
  /**
   * Factory Method - the core of this pattern.
   * Subclasses must implement this to return specific document types.
   * This is what makes the pattern flexible and extensible.
   */
  abstract createDocument(content: string): IDocument;

  /**
   * Business logic that works with documents.
   * Notice how this method uses the factory method internally.
   * The creator doesn't care which specific document type is created.
   */
  generateReport(reportContent: string): void {
    // Step 1: Create the document using factory method
    // The actual type depends on which subclass is being used
    const document = this.createDocument(reportContent);

    // Step 2: Perform operations on the document
    console.log(`\nGenerating ${document.getType()} report...`);
    document.openDoc();

    // Step 3: Render and display content
    console.log("Rendered content:");
    console.log(document.render());

    // Step 4: Save the document
    document.save();
    console.log("Report generation complete!\n");
  }
}

// ============================================================================
// CONCRETE CREATORS
// ============================================================================

/**
 * PDFCreator - Creates PDF documents.
 * Used when PDF output is required (e.g., for printing, archiving).
 */
class PDFCreator extends DocumentCreator {
  createDocument(content: string): IDocument {
    // Factory method returns a PDF-specific document
    return new PDFDoc(content);
  }
}

/**
 * WordCreator - Creates Word documents.
 * Used when editable documents are needed.
 */
class WordCreator extends DocumentCreator {
  createDocument(content: string): IDocument {
    // Factory method returns a Word-specific document
    return new WordDoc(content);
  }
}

/**
 * HTMLCreator - Creates HTML documents.
 * Used for web publishing or email content.
 */
class HTMLCreator extends DocumentCreator {
  createDocument(content: string): IDocument {
    // Factory method returns an HTML-specific document
    return new HTMLDoc(content);
  }
}

// ============================================================================
// CLIENT CODE
// ============================================================================

/**
 * Client function that works with any creator.
 * This demonstrates the key benefit: the client code is decoupled
 * from the concrete document classes.
 */
function clientCode(creator: DocumentCreator, content: string): void {
  // The client doesn't know or care which document type is created
  creator.generateReport(content);
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("FACTORY METHOD PATTERN DEMONSTRATION");
console.log("=".repeat(60));

const reportContent = "Monthly Sales Report\nTotal: $50,000\nGrowth: 15%";

// Using PDF Creator
console.log("\n--- Using PDF Creator ---");
const pdfCreator = new PDFCreator();
clientCode(pdfCreator, reportContent);

// Using Word Creator
console.log("--- Using Word Creator ---");
const wordCreator = new WordCreator();
clientCode(wordCreator, reportContent);

// Using HTML Creator
console.log("--- Using HTML Creator ---");
const htmlCreator = new HTMLCreator();
clientCode(htmlCreator, reportContent);

// ============================================================================
// EXTENDING THE PATTERN
// ============================================================================

/**
 * Adding a new document type is easy!
 * Just create a new Product and Creator class.
 * No changes needed to existing code (Open/Closed Principle).
 */
class MarkdownDoc implements IDocument {
  private content: string;

  constructor(content: string = "") {
    this.content = content;
  }

  getType(): string {
    return "Markdown";
  }

  openDoc(): void {
    console.log("Opening Markdown in VS Code...");
  }

  save(): void {
    console.log("Saving Markdown file...");
  }

  render(): string {
    return `# Document\n\n${this.content}\n`;
  }
}

class MarkdownCreator extends DocumentCreator {
  createDocument(content: string): IDocument {
    return new MarkdownDoc(content);
  }
}

// New type works seamlessly with existing client code
console.log("--- Using Markdown Creator (Extended) ---");
const markdownCreator = new MarkdownCreator();
clientCode(markdownCreator, reportContent);

console.log("=".repeat(60));
console.log("Factory Method Pattern Demo Complete!");
console.log("=".repeat(60));
