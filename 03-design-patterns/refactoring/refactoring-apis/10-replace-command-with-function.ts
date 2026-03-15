/**
 * REPLACE COMMAND WITH FUNCTION
 *
 * Replace a command object with a simple function when the command is too simple.
 *
 * The inverse of Replace Function with Command.
 *
 * Motivation:
 * - Commands add complexity; use only when needed
 * - Simple operations don't need command structure
 * - Functions are easier to understand and maintain
 *
 * Mechanics:
 * 1. Create a function that does what the command's execute method does
 * 2. Replace command usage with the function
 * 3. Remove the command class
 */

// ============================================================================
// BEFORE: Overly complex command
// ============================================================================

class ChargeCalculatorCommand {
  private _customer: { baseRate: number };
  private _usage: number;
  private _provider: { connectionCharge: number };

  constructor(
    customer: { baseRate: number },
    usage: number,
    provider: { connectionCharge: number }
  ) {
    this._customer = customer;
    this._usage = usage;
    this._provider = provider;
  }

  execute(): number {
    return this._customer.baseRate * this._usage + this._provider.connectionCharge;
  }
}

// ============================================================================
// AFTER: Simple function
// ============================================================================

interface Customer {
  baseRate: number;
}

interface Provider {
  connectionCharge: number;
}

function calculateCharge(customer: Customer, usage: number, provider: Provider): number {
  return customer.baseRate * usage + provider.connectionCharge;
}

// ============================================================================
// WHEN TO KEEP COMMAND
// ============================================================================

// Keep command when you need undo, queuing, or complex state
interface UndoableCommand {
  execute(): void;
  undo(): void;
}

class TextEditor {
  private _text: string = "";
  private _history: UndoableCommand[] = [];

  get text(): string {
    return this._text;
  }

  execute(command: UndoableCommand): void {
    command.execute();
    this._history.push(command);
  }

  undo(): void {
    const command = this._history.pop();
    command?.undo();
  }
}

class InsertTextCommand implements UndoableCommand {
  constructor(
    private _editor: { text: string },
    private _position: number,
    private _textToInsert: string
  ) {}

  execute(): void {
    const before = this._editor.text.slice(0, this._position);
    const after = this._editor.text.slice(this._position);
    this._editor.text = before + this._textToInsert + after;
  }

  undo(): void {
    const before = this._editor.text.slice(0, this._position);
    const after = this._editor.text.slice(this._position + this._textToInsert.length);
    this._editor.text = before + after;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Command with Function ===\n");

const customer: Customer = { baseRate: 0.1 };
const provider: Provider = { connectionCharge: 5 };

// Simple function instead of command
const charge = calculateCharge(customer, 100, provider);
console.log(`Charge: $${charge}`);

console.log("\n--- Keep command when needed ---");
const editorState = { text: "Hello World" };
const insertCmd = new InsertTextCommand(editorState, 5, " Beautiful");
insertCmd.execute();
console.log(`After insert: "${editorState.text}"`);
insertCmd.undo();
console.log(`After undo: "${editorState.text}"`);

void ChargeCalculatorCommand;

export {};
