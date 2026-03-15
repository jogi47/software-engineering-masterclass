/**
 * Decorator Pattern
 * Category: Structural
 *
 * Definition:
 * The Decorator pattern attaches additional responsibilities to an object
 * dynamically. Decorators provide a flexible alternative to subclassing
 * for extending functionality.
 *
 * When to use:
 * - When you need to add responsibilities to objects dynamically and transparently
 * - When extension by subclassing is impractical or impossible
 * - When you want to add responsibilities that can be withdrawn
 * - When you need to combine multiple behaviors
 *
 * Key Benefits:
 * - More flexibility than static inheritance
 * - Avoids feature-laden classes high up in hierarchy
 * - Responsibilities can be added and removed at runtime
 * - Supports Single Responsibility Principle
 *
 * Structure:
 * - Component: Interface for objects that can have responsibilities added
 * - ConcreteComponent: The object being decorated
 * - Decorator: Abstract class that wraps a Component
 * - ConcreteDecorator: Adds responsibilities to the component
 */

// ============================================================================
// COMPONENT INTERFACE
// ============================================================================

/**
 * Coffee - The component interface.
 * Both concrete components and decorators implement this.
 */
interface Coffee {
  getDescription(): string;
  getCost(): number;
}

// ============================================================================
// CONCRETE COMPONENTS - The base objects we decorate
// ============================================================================

/**
 * Espresso - A basic coffee type.
 * This is the concrete component that will be decorated.
 */
class Espresso implements Coffee {
  getDescription(): string {
    return "Espresso";
  }

  getCost(): number {
    return 1.99;
  }
}

/**
 * HouseBlend - Another basic coffee type.
 */
class HouseBlend implements Coffee {
  getDescription(): string {
    return "House Blend Coffee";
  }

  getCost(): number {
    return 0.89;
  }
}

/**
 * DarkRoast - Premium coffee option.
 */
class DarkRoast implements Coffee {
  getDescription(): string {
    return "Dark Roast Coffee";
  }

  getCost(): number {
    return 1.49;
  }
}

// ============================================================================
// DECORATOR BASE CLASS
// ============================================================================

/**
 * CoffeeDecorator - Abstract decorator base class.
 *
 * Key aspects:
 * 1. Implements the same interface as the component
 * 2. Holds a reference to a component (composition)
 * 3. Delegates all work to the wrapped component
 * 4. Subclasses add new behavior before/after delegation
 */
abstract class CoffeeDecorator implements Coffee {
  // The wrapped component (could be base coffee or another decorator)
  protected coffee: Coffee;

  constructor(coffee: Coffee) {
    this.coffee = coffee;
  }

  // By default, delegate to wrapped component
  // Subclasses override to add behavior
  getDescription(): string {
    return this.coffee.getDescription();
  }

  getCost(): number {
    return this.coffee.getCost();
  }
}

// ============================================================================
// CONCRETE DECORATORS - Add specific behaviors
// ============================================================================

/**
 * MilkDecorator - Adds milk to any coffee.
 */
class MilkDecorator extends CoffeeDecorator {
  getDescription(): string {
    // Add our description to the wrapped component's description
    return `${this.coffee.getDescription()}, Milk`;
  }

  getCost(): number {
    // Add our cost to the wrapped component's cost
    return this.coffee.getCost() + 0.30;
  }
}

/**
 * SugarDecorator - Adds sugar to any coffee.
 */
class SugarDecorator extends CoffeeDecorator {
  getDescription(): string {
    return `${this.coffee.getDescription()}, Sugar`;
  }

  getCost(): number {
    return this.coffee.getCost() + 0.10;
  }
}

/**
 * WhipDecorator - Adds whipped cream.
 */
class WhipDecorator extends CoffeeDecorator {
  getDescription(): string {
    return `${this.coffee.getDescription()}, Whip`;
  }

  getCost(): number {
    return this.coffee.getCost() + 0.50;
  }
}

/**
 * CaramelDecorator - Adds caramel syrup.
 */
class CaramelDecorator extends CoffeeDecorator {
  getDescription(): string {
    return `${this.coffee.getDescription()}, Caramel`;
  }

  getCost(): number {
    return this.coffee.getCost() + 0.60;
  }
}

/**
 * VanillaDecorator - Adds vanilla syrup.
 */
class VanillaDecorator extends CoffeeDecorator {
  getDescription(): string {
    return `${this.coffee.getDescription()}, Vanilla`;
  }

  getCost(): number {
    return this.coffee.getCost() + 0.55;
  }
}

/**
 * SoyMilkDecorator - Alternative to regular milk.
 */
class SoyMilkDecorator extends CoffeeDecorator {
  getDescription(): string {
    return `${this.coffee.getDescription()}, Soy Milk`;
  }

  getCost(): number {
    return this.coffee.getCost() + 0.45;
  }
}

// ============================================================================
// ANOTHER EXAMPLE: TEXT PROCESSING
// ============================================================================

/**
 * TextComponent - Interface for text processors.
 */
interface TextComponent {
  process(text: string): string;
}

/**
 * PlainText - Base text component (no processing).
 */
class PlainText implements TextComponent {
  process(text: string): string {
    return text;
  }
}

/**
 * TextDecorator - Base decorator for text processing.
 */
abstract class TextDecorator implements TextComponent {
  protected component: TextComponent;

  constructor(component: TextComponent) {
    this.component = component;
  }

  process(text: string): string {
    return this.component.process(text);
  }
}

/**
 * UppercaseDecorator - Converts text to uppercase.
 */
class UppercaseDecorator extends TextDecorator {
  process(text: string): string {
    // First let wrapped component process, then transform
    return this.component.process(text).toUpperCase();
  }
}

/**
 * TrimDecorator - Trims whitespace from text.
 */
class TrimDecorator extends TextDecorator {
  process(text: string): string {
    return this.component.process(text).trim();
  }
}

/**
 * HTMLEncodeDecorator - Encodes HTML entities.
 */
class HTMLEncodeDecorator extends TextDecorator {
  process(text: string): string {
    const processed = this.component.process(text);
    return processed
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

/**
 * BorderDecorator - Adds a border around text.
 */
class BorderDecorator extends TextDecorator {
  private char: string;

  constructor(component: TextComponent, borderChar: string = "*") {
    super(component);
    this.char = borderChar;
  }

  process(text: string): string {
    const processed = this.component.process(text);
    const border = this.char.repeat(processed.length + 4);
    return `${border}\n${this.char} ${processed} ${this.char}\n${border}`;
  }
}

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Helper to print coffee order details.
 */
function printOrder(coffee: Coffee): void {
  console.log(`Order: ${coffee.getDescription()}`);
  console.log(`Cost: $${coffee.getCost().toFixed(2)}`);
  console.log("");
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("DECORATOR PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Basic Coffee Orders ---
console.log("\n--- Basic Coffee Orders ---\n");

// Order 1: Plain Espresso
const espresso = new Espresso();
printOrder(espresso);

// Order 2: House Blend with Milk and Sugar
let houseBlend: Coffee = new HouseBlend();
houseBlend = new MilkDecorator(houseBlend);
houseBlend = new SugarDecorator(houseBlend);
printOrder(houseBlend);

// Order 3: Dark Roast with Whip and Caramel
let darkRoast: Coffee = new DarkRoast();
darkRoast = new WhipDecorator(darkRoast);
darkRoast = new CaramelDecorator(darkRoast);
printOrder(darkRoast);

// --- Complex Orders (Multiple Decorators) ---
console.log("--- Complex Orders ---\n");

// Order 4: Espresso with double milk, vanilla, and whip
let fancyEspresso: Coffee = new Espresso();
fancyEspresso = new MilkDecorator(fancyEspresso);
fancyEspresso = new MilkDecorator(fancyEspresso); // Double milk!
fancyEspresso = new VanillaDecorator(fancyEspresso);
fancyEspresso = new WhipDecorator(fancyEspresso);
printOrder(fancyEspresso);

// Order 5: Vegan-friendly with soy milk
let veganCoffee: Coffee = new HouseBlend();
veganCoffee = new SoyMilkDecorator(veganCoffee);
veganCoffee = new CaramelDecorator(veganCoffee);
printOrder(veganCoffee);

// --- Fluent Decorator Pattern (One-liner) ---
console.log("--- Fluent Style ---\n");

// All decorators in one line
const ultimateCoffee = new WhipDecorator(
  new CaramelDecorator(
    new VanillaDecorator(new MilkDecorator(new DarkRoast()))
  )
);
printOrder(ultimateCoffee);

// --- Text Processing Demo ---
console.log("--- Text Processing with Decorators ---\n");

const inputText = "  Hello, <World>!  ";
console.log(`Original text: "${inputText}"`);
console.log("");

// Just trim
let processor: TextComponent = new PlainText();
processor = new TrimDecorator(processor);
console.log(`After Trim: "${processor.process(inputText)}"`);

// Trim + Uppercase
processor = new PlainText();
processor = new TrimDecorator(processor);
processor = new UppercaseDecorator(processor);
console.log(`After Trim + Uppercase: "${processor.process(inputText)}"`);

// Trim + HTML Encode
processor = new PlainText();
processor = new TrimDecorator(processor);
processor = new HTMLEncodeDecorator(processor);
console.log(`After Trim + HTML Encode: "${processor.process(inputText)}"`);

// Full processing pipeline
processor = new PlainText();
processor = new TrimDecorator(processor);
processor = new UppercaseDecorator(processor);
processor = new BorderDecorator(processor, "#");
console.log("\nFull Processing Pipeline:");
console.log(processor.process(inputText));

// --- Order of Decorators Matters ---
console.log("\n--- Order Matters Demo ---\n");

// HTML encode then uppercase
let pipeline1: TextComponent = new PlainText();
pipeline1 = new HTMLEncodeDecorator(pipeline1);
pipeline1 = new UppercaseDecorator(pipeline1);
console.log("HTML Encode -> Uppercase:");
console.log(`  "${pipeline1.process("<hello>")}"`);

// Uppercase then HTML encode (different result!)
let pipeline2: TextComponent = new PlainText();
pipeline2 = new UppercaseDecorator(pipeline2);
pipeline2 = new HTMLEncodeDecorator(pipeline2);
console.log("Uppercase -> HTML Encode:");
console.log(`  "${pipeline2.process("<hello>")}"`);

console.log("\n" + "=".repeat(60));
console.log("Decorator Pattern Demo Complete!");
console.log("=".repeat(60));
