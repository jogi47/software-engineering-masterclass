/**
 * Builder Pattern
 * Category: Creational
 *
 * Definition:
 * The Builder pattern separates the construction of a complex object from its
 * representation, allowing the same construction process to create different
 * representations.
 *
 * When to use:
 * - When the algorithm for creating a complex object should be independent
 *   of the parts that make up the object
 * - When the construction process must allow different representations
 * - When you need to build objects step-by-step
 * - When constructors have too many parameters (telescoping constructor anti-pattern)
 *
 * Key Benefits:
 * - Allows fine control over construction process
 * - Isolates code for construction and representation
 * - Gives better control over resulting object
 * - Can create different representations using same construction code
 *
 * Structure:
 * - Builder: Specifies abstract interface for creating product parts
 * - ConcreteBuilder: Constructs and assembles parts of the product
 * - Director: Constructs an object using the Builder interface
 * - Product: The complex object being built
 */

// ============================================================================
// PRODUCT - The complex object we're building
// ============================================================================

/**
 * House - A complex product with many parts.
 * Using a constructor with all these parameters would be messy!
 */
class House {
  // Foundation
  public foundation: string = "";

  // Structure
  public walls: number = 0;
  public wallMaterial: string = "";

  // Roof
  public roofType: string = "";

  // Interior
  public rooms: number = 0;
  public hasGarage: boolean = false;
  public hasSwimmingPool: boolean = false;
  public hasGarden: boolean = false;

  // Amenities
  public hasStatues: boolean = false;
  public hasFancyLighting: boolean = false;

  /**
   * Display all house features
   */
  public describe(): void {
    console.log("\n--- House Specifications ---");
    console.log(`Foundation: ${this.foundation}`);
    console.log(`Walls: ${this.walls} walls made of ${this.wallMaterial}`);
    console.log(`Roof: ${this.roofType}`);
    console.log(`Rooms: ${this.rooms}`);
    console.log(`Features:`);
    console.log(`  - Garage: ${this.hasGarage ? "Yes" : "No"}`);
    console.log(`  - Swimming Pool: ${this.hasSwimmingPool ? "Yes" : "No"}`);
    console.log(`  - Garden: ${this.hasGarden ? "Yes" : "No"}`);
    console.log(`  - Statues: ${this.hasStatues ? "Yes" : "No"}`);
    console.log(`  - Fancy Lighting: ${this.hasFancyLighting ? "Yes" : "No"}`);
  }
}

// ============================================================================
// BUILDER INTERFACE
// ============================================================================

/**
 * HouseBuilder - Interface for building house parts.
 * Each step returns 'this' to allow method chaining (fluent interface).
 */
interface HouseBuilder {
  // Reset the builder to start a new house
  reset(): void;

  // Construction steps
  buildFoundation(type: string): HouseBuilder;
  buildWalls(count: number, material: string): HouseBuilder;
  buildRoof(type: string): HouseBuilder;
  buildRooms(count: number): HouseBuilder;

  // Optional features
  addGarage(): HouseBuilder;
  addSwimmingPool(): HouseBuilder;
  addGarden(): HouseBuilder;
  addStatues(): HouseBuilder;
  addFancyLighting(): HouseBuilder;

  // Get the final product
  getResult(): House;
}

// ============================================================================
// CONCRETE BUILDERS
// ============================================================================

/**
 * StandardHouseBuilder - Builds regular houses.
 * Implements all the builder methods for standard construction.
 */
class StandardHouseBuilder implements HouseBuilder {
  private house: House;

  constructor() {
    this.house = new House();
  }

  /**
   * Reset to build a new house.
   * Important: Always call reset() or create new builder between builds!
   */
  public reset(): void {
    this.house = new House();
  }

  public buildFoundation(type: string): HouseBuilder {
    console.log(`Building ${type} foundation...`);
    this.house.foundation = type;
    return this; // Return this for method chaining
  }

  public buildWalls(count: number, material: string): HouseBuilder {
    console.log(`Building ${count} ${material} walls...`);
    this.house.walls = count;
    this.house.wallMaterial = material;
    return this;
  }

  public buildRoof(type: string): HouseBuilder {
    console.log(`Adding ${type} roof...`);
    this.house.roofType = type;
    return this;
  }

  public buildRooms(count: number): HouseBuilder {
    console.log(`Creating ${count} rooms...`);
    this.house.rooms = count;
    return this;
  }

  public addGarage(): HouseBuilder {
    console.log("Adding garage...");
    this.house.hasGarage = true;
    return this;
  }

  public addSwimmingPool(): HouseBuilder {
    console.log("Adding swimming pool...");
    this.house.hasSwimmingPool = true;
    return this;
  }

  public addGarden(): HouseBuilder {
    console.log("Adding garden...");
    this.house.hasGarden = true;
    return this;
  }

  public addStatues(): HouseBuilder {
    console.log("Adding decorative statues...");
    this.house.hasStatues = true;
    return this;
  }

  public addFancyLighting(): HouseBuilder {
    console.log("Installing fancy lighting...");
    this.house.hasFancyLighting = true;
    return this;
  }

  /**
   * Get the constructed house.
   * Note: This also resets the builder to prevent returning the same house twice.
   */
  public getResult(): House {
    const result = this.house;
    this.reset(); // Prepare for next build
    return result;
  }
}

// ============================================================================
// DIRECTOR - Orchestrates the building process
// ============================================================================

/**
 * HouseDirector - Defines construction sequences.
 *
 * The Director knows HOW to build houses using a builder.
 * It doesn't know WHAT type of house is being built - that's the builder's job.
 * This separation allows the same director to work with different builders.
 */
class HouseDirector {
  private builder: HouseBuilder;

  constructor(builder: HouseBuilder) {
    this.builder = builder;
  }

  /**
   * Change the builder (useful for creating different house types)
   */
  public setBuilder(builder: HouseBuilder): void {
    this.builder = builder;
  }

  /**
   * Build a minimal, affordable house.
   * Only essential features, no extras.
   */
  public buildMinimalHouse(): House {
    console.log("\n=== Building Minimal House ===");
    this.builder.reset();

    return this.builder
      .buildFoundation("Concrete Slab")
      .buildWalls(4, "Wood")
      .buildRoof("Flat")
      .buildRooms(3)
      .getResult();
  }

  /**
   * Build a standard family house.
   * Basic amenities included.
   */
  public buildStandardHouse(): House {
    console.log("\n=== Building Standard House ===");
    this.builder.reset();

    return this.builder
      .buildFoundation("Reinforced Concrete")
      .buildWalls(4, "Brick")
      .buildRoof("Sloped Tiles")
      .buildRooms(5)
      .addGarage()
      .addGarden()
      .getResult();
  }

  /**
   * Build a luxury mansion.
   * All premium features included.
   */
  public buildLuxuryMansion(): House {
    console.log("\n=== Building Luxury Mansion ===");
    this.builder.reset();

    return this.builder
      .buildFoundation("Deep Reinforced Foundation")
      .buildWalls(8, "Stone")
      .buildRoof("Premium Slate")
      .buildRooms(12)
      .addGarage()
      .addSwimmingPool()
      .addGarden()
      .addStatues()
      .addFancyLighting()
      .getResult();
  }
}

// ============================================================================
// ALTERNATIVE: BUILDER WITHOUT DIRECTOR (More flexible)
// ============================================================================

/**
 * Computer - Another product to demonstrate builder flexibility.
 */
class Computer {
  public cpu: string = "";
  public ram: string = "";
  public storage: string = "";
  public gpu: string = "";
  public os: string = "";

  public describe(): void {
    console.log("\n--- Computer Specifications ---");
    console.log(`CPU: ${this.cpu}`);
    console.log(`RAM: ${this.ram}`);
    console.log(`Storage: ${this.storage}`);
    console.log(`GPU: ${this.gpu || "Integrated"}`);
    console.log(`OS: ${this.os}`);
  }
}

/**
 * ComputerBuilder - Fluent builder without requiring a Director.
 * Client code can directly use the builder for maximum flexibility.
 */
class ComputerBuilder {
  private computer: Computer;

  constructor() {
    this.computer = new Computer();
  }

  public reset(): ComputerBuilder {
    this.computer = new Computer();
    return this;
  }

  public setCPU(cpu: string): ComputerBuilder {
    this.computer.cpu = cpu;
    return this;
  }

  public setRAM(ram: string): ComputerBuilder {
    this.computer.ram = ram;
    return this;
  }

  public setStorage(storage: string): ComputerBuilder {
    this.computer.storage = storage;
    return this;
  }

  public setGPU(gpu: string): ComputerBuilder {
    this.computer.gpu = gpu;
    return this;
  }

  public setOS(os: string): ComputerBuilder {
    this.computer.os = os;
    return this;
  }

  public build(): Computer {
    const result = this.computer;
    this.reset();
    return result;
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=".repeat(60));
console.log("BUILDER PATTERN DEMONSTRATION");
console.log("=".repeat(60));

// --- Using Director for predefined house types ---
console.log("\n>>> Using Director with HouseBuilder <<<");

const builder = new StandardHouseBuilder();
const director = new HouseDirector(builder);

// Build different house types using the director
const minimalHouse = director.buildMinimalHouse();
minimalHouse.describe();

const standardHouse = director.buildStandardHouse();
standardHouse.describe();

const mansion = director.buildLuxuryMansion();
mansion.describe();

// --- Using Builder directly (without Director) ---
console.log("\n>>> Using Builder Directly (Custom House) <<<\n");

// Client can also use builder directly for custom builds
const customBuilder = new StandardHouseBuilder();
const customHouse = customBuilder
  .buildFoundation("Basement Foundation")
  .buildWalls(6, "Glass and Steel")
  .buildRoof("Green Roof")
  .buildRooms(4)
  .addSwimmingPool()
  .addFancyLighting()
  .getResult();

customHouse.describe();

// --- Computer Builder Demo (Fluent API without Director) ---
console.log("\n>>> Computer Builder Demo <<<\n");

const gamingPC = new ComputerBuilder()
  .setCPU("Intel i9-13900K")
  .setRAM("64GB DDR5")
  .setStorage("2TB NVMe SSD")
  .setGPU("NVIDIA RTX 4090")
  .setOS("Windows 11")
  .build();

gamingPC.describe();

const officePC = new ComputerBuilder()
  .setCPU("Intel i5-13400")
  .setRAM("16GB DDR4")
  .setStorage("512GB SSD")
  .setOS("Windows 11 Pro")
  .build();

officePC.describe();

const devMac = new ComputerBuilder()
  .setCPU("Apple M2 Pro")
  .setRAM("32GB Unified")
  .setStorage("1TB SSD")
  .setOS("macOS Sonoma")
  .build();

devMac.describe();

console.log("\n" + "=".repeat(60));
console.log("Builder Pattern Demo Complete!");
console.log("=".repeat(60));
