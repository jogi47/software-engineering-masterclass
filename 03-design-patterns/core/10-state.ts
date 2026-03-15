/**
 * State Pattern
 * Category: Behavioral
 *
 * Definition:
 * The State pattern allows an object to alter its behavior when its internal
 * state changes. The object will appear to change its class.
 *
 * When to use:
 * - When an object's behavior depends on its state, and it must change
 *   behavior at runtime depending on that state
 * - When operations have large, multipart conditional statements that depend
 *   on the object's state
 * - When you want to avoid excessive if-else or switch statements
 *
 * Key Benefits:
 * - Localizes state-specific behavior and partitions behavior for different states
 * - Makes state transitions explicit
 * - State objects can be shared (if they have no instance variables)
 * - Organizes code related to particular states into separate classes (SRP)
 *
 * Structure:
 * - State: Interface defining state-specific behavior
 * - ConcreteState: Implements behavior associated with a state
 * - Context: Maintains instance of ConcreteState; delegates state-specific requests
 */

// ============================================================================
// STATE INTERFACE
// ============================================================================

/**
 * VendingMachineState - Interface for all vending machine states.
 * Each state handles the same operations differently.
 */
interface VendingMachineState {
  // Insert money into the machine
  insertMoney(amount: number): void;

  // Select a product
  selectProduct(product: string): void;

  // Dispense the product
  dispense(): void;

  // Request a refund
  refund(): void;

  // Get current state name for display
  getStateName(): string;
}

// ============================================================================
// CONTEXT - The object whose behavior changes based on state
// ============================================================================

/**
 * VendingMachine - The context that changes behavior based on state.
 *
 * Instead of using conditionals to check state and change behavior,
 * the vending machine delegates to state objects.
 */
class VendingMachine {
  // Possible states
  private idleState: VendingMachineState;
  private hasMoneyState: VendingMachineState;
  private productSelectedState: VendingMachineState;
  private dispensingState: VendingMachineState;
  private outOfStockState: VendingMachineState;

  // Current state
  private currentState: VendingMachineState;

  // Machine data
  private balance: number = 0;
  private selectedProduct: string = "";
  private inventory: Map<string, { price: number; quantity: number }>;

  constructor() {
    // Initialize states (passing reference to this machine)
    this.idleState = new IdleState(this);
    this.hasMoneyState = new HasMoneyState(this);
    this.productSelectedState = new ProductSelectedState(this);
    this.dispensingState = new DispensingState(this);
    this.outOfStockState = new OutOfStockState(this);

    // Start in idle state
    this.currentState = this.idleState;

    // Initialize inventory
    this.inventory = new Map([
      ["Cola", { price: 1.5, quantity: 5 }],
      ["Chips", { price: 2.0, quantity: 3 }],
      ["Candy", { price: 1.0, quantity: 10 }],
      ["Water", { price: 1.25, quantity: 0 }], // Out of stock
    ]);
  }

  // State transition methods
  setState(state: VendingMachineState): void {
    console.log(`  [State Change] ${this.currentState.getStateName()} -> ${state.getStateName()}`);
    this.currentState = state;
  }

  // Getters for states
  getIdleState(): VendingMachineState {
    return this.idleState;
  }
  getHasMoneyState(): VendingMachineState {
    return this.hasMoneyState;
  }
  getProductSelectedState(): VendingMachineState {
    return this.productSelectedState;
  }
  getDispensingState(): VendingMachineState {
    return this.dispensingState;
  }
  getOutOfStockState(): VendingMachineState {
    return this.outOfStockState;
  }

  // Balance management
  addBalance(amount: number): void {
    this.balance += amount;
  }

  getBalance(): number {
    return this.balance;
  }

  resetBalance(): number {
    const refund = this.balance;
    this.balance = 0;
    return refund;
  }

  // Product management
  setSelectedProduct(product: string): void {
    this.selectedProduct = product;
  }

  getSelectedProduct(): string {
    return this.selectedProduct;
  }

  getProductPrice(product: string): number {
    return this.inventory.get(product)?.price || 0;
  }

  getProductQuantity(product: string): number {
    return this.inventory.get(product)?.quantity || 0;
  }

  hasProduct(product: string): boolean {
    const item = this.inventory.get(product);
    return item !== undefined && item.quantity > 0;
  }

  decrementProduct(product: string): void {
    const item = this.inventory.get(product);
    if (item && item.quantity > 0) {
      item.quantity--;
    }
  }

  // Delegate operations to current state
  insertMoney(amount: number): void {
    console.log(`\n[Action] Insert $${amount.toFixed(2)}`);
    this.currentState.insertMoney(amount);
  }

  selectProduct(product: string): void {
    console.log(`\n[Action] Select "${product}"`);
    this.currentState.selectProduct(product);
  }

  dispense(): void {
    console.log("\n[Action] Dispense");
    this.currentState.dispense();
  }

  refund(): void {
    console.log("\n[Action] Request Refund");
    this.currentState.refund();
  }

  // Display current status
  showStatus(): void {
    console.log("\n--- Vending Machine Status ---");
    console.log(`State: ${this.currentState.getStateName()}`);
    console.log(`Balance: $${this.balance.toFixed(2)}`);
    console.log("Inventory:");
    this.inventory.forEach((item, name) => {
      const status = item.quantity > 0 ? `${item.quantity} available` : "OUT OF STOCK";
      console.log(`  ${name}: $${item.price.toFixed(2)} (${status})`);
    });
    console.log("-----------------------------\n");
  }
}

// ============================================================================
// CONCRETE STATES
// ============================================================================

/**
 * IdleState - Machine is waiting for user interaction.
 */
class IdleState implements VendingMachineState {
  private machine: VendingMachine;

  constructor(machine: VendingMachine) {
    this.machine = machine;
  }

  getStateName(): string {
    return "Idle";
  }

  insertMoney(amount: number): void {
    this.machine.addBalance(amount);
    console.log(`  Accepted $${amount.toFixed(2)}. Balance: $${this.machine.getBalance().toFixed(2)}`);
    this.machine.setState(this.machine.getHasMoneyState());
  }

  selectProduct(product: string): void {
    console.log("  Please insert money first.");
  }

  dispense(): void {
    console.log("  Please insert money and select a product first.");
  }

  refund(): void {
    console.log("  No money to refund.");
  }
}

/**
 * HasMoneyState - Machine has received money, waiting for selection.
 */
class HasMoneyState implements VendingMachineState {
  private machine: VendingMachine;

  constructor(machine: VendingMachine) {
    this.machine = machine;
  }

  getStateName(): string {
    return "Has Money";
  }

  insertMoney(amount: number): void {
    this.machine.addBalance(amount);
    console.log(`  Added $${amount.toFixed(2)}. Balance: $${this.machine.getBalance().toFixed(2)}`);
  }

  selectProduct(product: string): void {
    // Check if product exists and is in stock
    if (!this.machine.hasProduct(product)) {
      console.log(`  Sorry, "${product}" is out of stock or doesn't exist.`);
      return;
    }

    const price = this.machine.getProductPrice(product);
    const balance = this.machine.getBalance();

    if (balance < price) {
      console.log(`  Insufficient funds. "${product}" costs $${price.toFixed(2)}, you have $${balance.toFixed(2)}`);
      return;
    }

    // Sufficient funds, proceed
    this.machine.setSelectedProduct(product);
    console.log(`  "${product}" selected. Price: $${price.toFixed(2)}`);
    this.machine.setState(this.machine.getProductSelectedState());
  }

  dispense(): void {
    console.log("  Please select a product first.");
  }

  refund(): void {
    const refund = this.machine.resetBalance();
    console.log(`  Refunding $${refund.toFixed(2)}. Thank you!`);
    this.machine.setState(this.machine.getIdleState());
  }
}

/**
 * ProductSelectedState - Product is selected, ready to dispense.
 */
class ProductSelectedState implements VendingMachineState {
  private machine: VendingMachine;

  constructor(machine: VendingMachine) {
    this.machine = machine;
  }

  getStateName(): string {
    return "Product Selected";
  }

  insertMoney(amount: number): void {
    console.log(`  Product already selected. Dispensing...`);
    this.dispense();
  }

  selectProduct(_product: string): void {
    console.log("  Product already selected. Please take your item or request refund.");
  }

  dispense(): void {
    this.machine.setState(this.machine.getDispensingState());
    this.machine.dispense();
  }

  refund(): void {
    const refund = this.machine.resetBalance();
    this.machine.setSelectedProduct("");
    console.log(`  Selection cancelled. Refunding $${refund.toFixed(2)}`);
    this.machine.setState(this.machine.getIdleState());
  }
}

/**
 * DispensingState - Machine is dispensing the product.
 */
class DispensingState implements VendingMachineState {
  private machine: VendingMachine;

  constructor(machine: VendingMachine) {
    this.machine = machine;
  }

  getStateName(): string {
    return "Dispensing";
  }

  insertMoney(_amount: number): void {
    console.log("  Please wait, dispensing in progress...");
  }

  selectProduct(_product: string): void {
    console.log("  Please wait, dispensing in progress...");
  }

  dispense(): void {
    const product = this.machine.getSelectedProduct();
    const price = this.machine.getProductPrice(product);
    const balance = this.machine.getBalance();

    // Deduct price and give change
    const change = balance - price;
    this.machine.decrementProduct(product);

    console.log(`  Dispensing "${product}"...`);
    console.log(`  *CLUNK* - Please take your ${product}!`);

    if (change > 0) {
      console.log(`  Returning change: $${change.toFixed(2)}`);
    }

    // Reset machine
    this.machine.resetBalance();
    this.machine.setSelectedProduct("");
    this.machine.setState(this.machine.getIdleState());
  }

  refund(): void {
    console.log("  Cannot refund during dispensing.");
  }
}

/**
 * OutOfStockState - All products are out of stock.
 */
class OutOfStockState implements VendingMachineState {
  private machine: VendingMachine;

  constructor(machine: VendingMachine) {
    this.machine = machine;
  }

  getStateName(): string {
    return "Out of Stock";
  }

  insertMoney(_amount: number): void {
    console.log("  Sorry, machine is out of stock. Cannot accept money.");
  }

  selectProduct(_product: string): void {
    console.log("  Sorry, all products are out of stock.");
  }

  dispense(): void {
    console.log("  Nothing to dispense. Machine is out of stock.");
  }

  refund(): void {
    const balance = this.machine.getBalance();
    if (balance > 0) {
      this.machine.resetBalance();
      console.log(`  Refunding $${balance.toFixed(2)}`);
    } else {
      console.log("  No money to refund.");
    }
  }
}

// ============================================================================
// ANOTHER EXAMPLE: Traffic Light
// ============================================================================

/**
 * TrafficLightState - Interface for traffic light states.
 */
interface TrafficLightState {
  display(): void;
  next(): void;
  getColor(): string;
}

/**
 * TrafficLight - Context for traffic light states.
 */
class TrafficLight {
  private currentState: TrafficLightState;

  private redState: TrafficLightState;
  private yellowState: TrafficLightState;
  private greenState: TrafficLightState;

  constructor() {
    this.redState = new RedLightState(this);
    this.yellowState = new YellowLightState(this);
    this.greenState = new GreenLightState(this);

    // Start with red
    this.currentState = this.redState;
  }

  setState(state: TrafficLightState): void {
    this.currentState = state;
  }

  getRedState(): TrafficLightState {
    return this.redState;
  }
  getYellowState(): TrafficLightState {
    return this.yellowState;
  }
  getGreenState(): TrafficLightState {
    return this.greenState;
  }

  display(): void {
    this.currentState.display();
  }

  next(): void {
    this.currentState.next();
  }

  getCurrentColor(): string {
    return this.currentState.getColor();
  }
}

/**
 * RedLightState - Stop!
 */
class RedLightState implements TrafficLightState {
  private light: TrafficLight;

  constructor(light: TrafficLight) {
    this.light = light;
  }

  display(): void {
    console.log("  [RED] STOP! Wait for green.");
  }

  next(): void {
    console.log("  Changing from RED to GREEN...");
    this.light.setState(this.light.getGreenState());
  }

  getColor(): string {
    return "RED";
  }
}

/**
 * YellowLightState - Caution!
 */
class YellowLightState implements TrafficLightState {
  private light: TrafficLight;

  constructor(light: TrafficLight) {
    this.light = light;
  }

  display(): void {
    console.log("  [YELLOW] CAUTION! Prepare to stop.");
  }

  next(): void {
    console.log("  Changing from YELLOW to RED...");
    this.light.setState(this.light.getRedState());
  }

  getColor(): string {
    return "YELLOW";
  }
}

/**
 * GreenLightState - Go!
 */
class GreenLightState implements TrafficLightState {
  private light: TrafficLight;

  constructor(light: TrafficLight) {
    this.light = light;
  }

  display(): void {
    console.log("  [GREEN] GO! You may proceed.");
  }

  next(): void {
    console.log("  Changing from GREEN to YELLOW...");
    this.light.setState(this.light.getYellowState());
  }

  getColor(): string {
    return "GREEN";
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("STATE PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Vending Machine Demo ---
console.log("\n--- Vending Machine Demo ---");

const vendingMachine = new VendingMachine();
vendingMachine.showStatus();

// Try to select without money
vendingMachine.selectProduct("Cola");

// Insert money
vendingMachine.insertMoney(1.0);
vendingMachine.insertMoney(0.5);

// Try to select out of stock item
vendingMachine.selectProduct("Water");

// Select available item
vendingMachine.selectProduct("Cola");

// Dispense (automatically happens after selection)
vendingMachine.dispense();

vendingMachine.showStatus();

// Another purchase with change
console.log(">>> Second purchase with change <<<");
vendingMachine.insertMoney(5.0);
vendingMachine.selectProduct("Chips");
vendingMachine.dispense();

// Try to get refund with no balance
vendingMachine.refund();

// Demonstrate refund with balance
console.log(">>> Demonstrate refund <<<");
vendingMachine.insertMoney(3.0);
vendingMachine.refund();

vendingMachine.showStatus();

// --- Traffic Light Demo ---
console.log("\n--- Traffic Light Demo ---\n");

const trafficLight = new TrafficLight();

console.log("Simulating traffic light cycle:\n");

// Simulate several cycles
for (let i = 0; i < 6; i++) {
  trafficLight.display();
  trafficLight.next();
  console.log("");
}

// --- Compare: With vs Without State Pattern ---
console.log("--- Benefits of State Pattern ---\n");
console.log(`
WITHOUT State Pattern (using conditionals):
-------------------------------------------
class VendingMachine {
  state: string = 'idle';

  insertMoney(amount) {
    if (this.state === 'idle') {
      this.balance += amount;
      this.state = 'hassMoney';
    } else if (this.state === 'hasMoney') {
      this.balance += amount;
    } else if (this.state === 'dispensing') {
      console.log('Wait...');
    } else if (this.state === 'outOfStock') {
      console.log('Cannot accept');
    }
    // ... and this pattern repeats for EVERY method!
  }
}

WITH State Pattern:
-------------------------------------------
- Each state is a separate class (Single Responsibility)
- Adding new states doesn't modify existing code (Open/Closed)
- State transitions are explicit and clear
- Easier to test each state independently
- No complex nested conditionals
`);

console.log("=".repeat(60));
console.log("State Pattern Demo Complete!");
console.log("=".repeat(60));
