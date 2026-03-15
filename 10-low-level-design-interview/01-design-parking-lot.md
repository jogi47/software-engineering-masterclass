# Design Parking Lot

#### What is a Parking Lot?

A **parking lot** is a designated area where vehicles can be parked temporarily, either in public or private spaces. It may consist of multiple floors, and each floor contains a fixed number of parking spots. These spots are often categorized by vehicle size such as **small**, **compact**, or **large**.

When a vehicle enters the parking lot, a parking ticket is issued to record the entry time. Upon exiting, the vehicle owner pays the parking fee based on the duration of stay.

In this chapter, we will explore the **low-level design of a parking lot system** in detail.

## On this page

- [1. Clarifying Requirements](#1-clarifying-requirements)
  - [1.1 Functional Requirements](#11-functional-requirements)
  - [1.2 Non-Functional Requirements](#12-non-functional-requirements)
- [2. Identifying Core Entities](#2-identifying-core-entities)
- [3. Class Design](#3-class-design)
  - [3.1 Class Definitions](#31-class-definitions)
  - [3.2 Class Relationships](#32-class-relationships)
  - [3.3 Key Design Patterns](#33-key-design-patterns)
  - [3.4 Full Class Diagram](#34-full-class-diagram)
- [4. Code Implementation](#4-code-implementation)
- [5. Run and Test](#5-run-and-test)
- [6. Summary](#6-summary)

---

Let's start by clarifying the requirements:

# 1. Clarifying Requirements

Before starting the design, it's important to ask thoughtful questions to uncover hidden assumptions, clarify ambiguities, and define the system's scope more precisely.

Here is an example of how a discussion between the candidate and the interviewer might unfold:

Discussion

**Candidate:** Is the parking lot a single-level or multi-level structure?

**Interviewer:** Let's assume it is a multi-level parking lot. Each level can have a different number of parking spots.

**Candidate:** Do we need to support different types of vehicles, such as bikes, cars, and trucks?

**Interviewer:** Yes, we'll support at least these three types: bikes, cars, and trucks.

**Candidate:** Should the system enforce compatibility between vehicle types and parking spot sizes?

**Interviewer:** Yes, each vehicle must be assigned to a compatible spot type based on its size.

**Candidate:** Should parking spot assignment be automatic, or should users be able to choose a spot manually?

**Interviewer:** To keep things simple, let's use automatic allocation based on availability.

**Candidate:** Should the system support querying and displaying open slots?

**Interviewer:** Yes, users should be able to view open spots based on their vehicle size.

**Candidate:** Do we need to track entry and exit times for each vehicle to calculate parking fees, or will it be a flat-rate system?

**Interviewer:** We should track both entry and exit times. Parking fees will be calculated based on the duration of stay.

**Candidate:** Should we support different pricing strategies, like hourly rates vs flat rates?

**Interviewer:** Yes, the system should be flexible enough to swap pricing strategies without changing the core logic.

**Candidate:** Do we need to take input from the user, or can we hardcode a sequence of parking requests for this design?

**Interviewer:** You can hardcode the sequence for this design. No need for user input handling.

### Parking Rules

Since the system must enforce compatibility between vehicle types and parking spot sizes, it's important to clearly define the parking rules.

In real-world scenarios, the following constraints typically apply:

* **Bikes** can be parked **only in small** parking spots
* **Cars** can be parked in **compact or large** spots
* **Trucks** can be parked **only in large** spots

These rules ensure optimal utilization of space and prevent oversized vehicles from occupying undersized spots.

After gathering the details, we can summarize the key system requirements.

## 1.1 Functional Requirements

* Support **multiple parking floors**, each with a configurable number of **parking spots**
* Support **multiple vehicle types**, including bikes, cars, and trucks
* **Classify parking spots by size** (e.g., Small, Compact, Large) and match them with appropriate vehicle types
* **Automatically assign** parking spots based on availability
* Issue a **parking ticket** upon vehicle entry and track entry and exit times
* Calculate **parking fees** based on duration of stay and support **different pricing strategies**, such as hourly or flat-rate pricing
* Support **querying and displaying** available spots in real-time
* Parking requests can be **hardcoded in a driver/demo class** for simulation purposes

## 1.2 Non-Functional Requirements

* **Modularity:** The design should follow object-oriented principles with clear separation of concerns
* **Extensibility:** The system should be modular and extensible to support future enhancements (new vehicle types, pricing models)
* **Maintainability:** The codebase should be clean, readable, and easy to extend
* **Testability:** Components should be testable in isolation

Now that we understand what we're building, let's identify the building blocks of our system.

# 2. Identifying Core Entities

How do you go from a list of requirements to actual classes? The key is to look for **nouns** in the requirements that have distinct attributes or behaviors. Not every noun becomes a class, but this approach gives you a starting point.

Let's walk through our requirements and identify what needs to exist in our system.

#### 1. Support multiple vehicle types, including bikes, cars, and trucks

We need to represent different types of vehicles. An enum `**VehicleType**` with values `BIKE`, `CAR`, and `TRUCK` captures this cleanly. We also need a `**Vehicle**` class to hold the vehicle's type and license plate.

#### 2. Classify parking spots by size (Small, Compact, Large)

Similar to vehicle types, we need an enum `**SpotSize**` with values `SMALL`, `COMPACT`, and `LARGE`. We also need a `**ParkingSpot**` class to represent individual spots with their size, ID, and occupancy status.

#### 3. Support multiple parking floors

We need a `**ParkingFloor**` entity that contains a collection of parking spots. Each floor has a floor number and manages its own spots.

#### 4. Issue a parking ticket upon vehicle entry

We need a `**ParkingTicket**` entity to track the vehicle, assigned spot, entry time, and exit time. The ticket also needs a status to indicate whether it's active or paid.

An enum `**TicketStatus**` with values `ACTIVE` and `PAID` handles this.

#### 5. Calculate parking fees based on duration with different pricing strategies

This suggests the **Strategy Pattern**. We need a `**PricingStrategy**` interface with a method to calculate fees, and concrete implementations like `**HourlyPricingStrategy**` and `**FlatRatePricingStrategy**`.

Why use an interface here? Because pricing rules vary across parking lots. Some charge per hour, others charge flat rates, and some have complex tiered pricing. The Strategy pattern lets us swap algorithms without changing the core parking logic.

#### 6. Orchestrate the entire system

Something needs to coordinate everything: manage floors, assign spots, issue tickets, and process payments. This is our `**ParkingLot**` entity.

Since there's typically only one parking lot instance managing all resources, the **Singleton Pattern** is appropriate here.

Note

Notice how we derived each entity from a specific requirement. Don't just list classes. Explain why each one exists. If you can't justify an entity's existence, you probably don't need it.

### Entity Overview

We've identified three types of entities:

**Enums** define fixed sets of values: VehicleType, SpotSize, and TicketStatus.

**Data Classes** primarily hold data with minimal behavior: Vehicle, ParkingSpot, ParkingFloor, ParkingTicket.

**Core Classes** contain the main logic: PricingStrategy (and implementations) handles fee calculation, and ParkingLot orchestrates the entire system.

With our entities identified, let's define their attributes, behaviors, and relationships.

# 3. Class Design

Now that we know what entities we need, let's flesh out their details. For each class, we'll define what data it holds (attributes) and what it can do (methods). Then we'll look at how these classes connect to each other.

## 3.1 Class Definitions

We'll work bottom-up: simple types first, then data containers, then the classes with real logic. This order makes sense because complex classes depend on simpler ones.

### Enums

Enums define fixed sets of values that provide type safety and make code self-documenting.

#### `VehicleType`

Represents the type of vehicle that can be parked.

```
enum VehicleType {
    BIKE,
    CAR,
    TRUCK
}
```

Three vehicle types cover common parking scenarios. Each type has specific rules about which spot sizes it can use.

#### `SpotSize`

Represents the size category of a parking spot.

```
enum SpotSize {
    SMALL,    // For bikes only
    COMPACT,  // For cars
    LARGE     // For cars and trucks
}
```

The size determines which vehicles can park in the spot. This creates the compatibility matrix we discussed earlier.

#### `TicketStatus`

Tracks the lifecycle of a parking ticket.

```
enum TicketStatus {
    ACTIVE,   // Vehicle is currently parked
    PAID      // Vehicle has exited and fee was paid
}
```

Design Decision

We use a simple two-state enum. The ticket is either active (vehicle parked) or paid (vehicle exited). Additional states like `EXPIRED` or `CANCELLED` could be added for more complex systems.

### Data Classes

Data classes are containers that hold data with some associated behavior.

#### `Vehicle`

Encapsulates information about a vehicle.

```
Vehicle {
    - type: VehicleType
    - licensePlate: string

    + constructor(type, licensePlate)
    + getType(): VehicleType
    + getLicensePlate(): string
}
```

The vehicle knows its type and license plate. The type determines which parking spots are compatible.

#### `ParkingSpot`

Represents a single parking spot on a floor.

```
ParkingSpot {
    - id: string
    - size: SpotSize
    - isOccupied: boolean
    - vehicle: Vehicle | null

    + constructor(id, size)
    + canFitVehicle(vehicleType): boolean
    + park(vehicle): void
    + unpark(): Vehicle
    + isAvailable(): boolean
}
```

The `canFitVehicle()` method encapsulates the parking rules:
- BIKE can only fit in SMALL
- CAR can fit in COMPACT or LARGE
- TRUCK can only fit in LARGE

Design Decision

We put the compatibility logic in ParkingSpot rather than in a separate service. The spot knows best what it can hold. This keeps related logic together.

#### `ParkingFloor`

Represents one floor of the parking lot.

```
ParkingFloor {
    - floorNumber: number
    - spots: ParkingSpot[]

    + constructor(floorNumber, spots)
    + findAvailableSpot(vehicleType): ParkingSpot | null
    + getAvailableSpotCount(vehicleType): number
}
```

The floor manages a collection of spots. The `findAvailableSpot()` method searches for a compatible, available spot for a given vehicle type.

#### `ParkingTicket`

Records a parking session.

```
ParkingTicket {
    - ticketId: string
    - vehicle: Vehicle
    - spot: ParkingSpot
    - entryTime: Date
    - exitTime: Date | null
    - status: TicketStatus

    + constructor(vehicle, spot)
    + markExit(): void
    + getDurationInHours(): number
}
```

The ticket captures everything needed for fee calculation: which vehicle, which spot, and how long they parked.

### Core Classes

Core classes contain the main business logic.

#### `PricingStrategy` (Interface)

Defines the contract for fee calculation.

```
interface PricingStrategy {
    + calculateFee(ticket: ParkingTicket): number
}
```

This interface enables the Strategy Pattern. Different implementations can calculate fees differently without changing the parking lot logic.

#### `HourlyPricingStrategy`

Charges based on hours parked.

```
HourlyPricingStrategy implements PricingStrategy {
    - hourlyRate: number

    + constructor(hourlyRate)
    + calculateFee(ticket): number  // hours * rate
}
```

#### `FlatRatePricingStrategy`

Charges a fixed amount regardless of duration.

```
FlatRatePricingStrategy implements PricingStrategy {
    - flatRate: number

    + constructor(flatRate)
    + calculateFee(ticket): number  // returns flatRate
}
```

Design Decision

The Strategy Pattern is perfect here. Different parking lots have different pricing models. Some charge hourly, some daily, some have complex tiered rates. By making pricing a pluggable strategy, we can change or add pricing models without touching the core parking logic.

#### `ParkingLot` (Singleton)

The main orchestrator that ties everything together.

```
ParkingLot {
    - static instance: ParkingLot
    - floors: ParkingFloor[]
    - activeTickets: Map<string, ParkingTicket>
    - pricingStrategy: PricingStrategy

    - constructor()  // private
    + static getInstance(): ParkingLot
    + initialize(floors, pricingStrategy): void
    + parkVehicle(vehicle): ParkingTicket | null
    + unparkVehicle(ticketId): number  // returns fee
    + getAvailableSpots(vehicleType): number
    + displayAvailability(): void
}
```

**Key Design Principles:**

1. **Singleton:** Only one parking lot instance exists. It manages all floors and tickets centrally.
2. **Orchestration:** The parking lot coordinates all operations - finding spots, issuing tickets, processing exits.
3. **Strategy:** The pricing strategy is injected, allowing easy swapping of fee calculation logic.

## 3.2 Class Relationships

How do these classes connect? Let's examine the relationship types we use.

#### Composition (Strong Ownership)

Composition means one object owns another. When the owner is destroyed, the owned object is destroyed too.

* **ParkingLot owns ParkingFloors:** The floors exist only within the context of this parking lot.
* **ParkingFloor owns ParkingSpots:** Spots belong to their floor and don't exist independently.

#### Aggregation (Weak Ownership)

Aggregation means one object contains others, but the contained objects can exist independently.

* **ParkingSpot contains Vehicle:** A vehicle is temporarily associated with a spot. The vehicle exists before parking and after leaving.
* **ParkingTicket references Vehicle and Spot:** The ticket records these associations but doesn't own them.

#### Association

* **ParkingLot uses PricingStrategy:** The parking lot delegates fee calculation to its pricing strategy.

#### Interface Implementation

* **HourlyPricingStrategy implements PricingStrategy**
* **FlatRatePricingStrategy implements PricingStrategy**

## 3.3 Key Design Patterns

Let's make the structural patterns explicit and justify why each is appropriate here.

### Singleton Pattern (ParkingLot)

**The Problem:** We need exactly one parking lot instance to manage all floors, spots, and tickets. Multiple instances would lead to inconsistent state - one instance might think a spot is free while another thinks it's occupied.

**The Solution:** The Singleton pattern ensures only one ParkingLot instance exists. Private constructor prevents direct instantiation. A static `getInstance()` method provides global access to the single instance.

**Why This Pattern:** In a real parking lot system:
- There's one physical parking lot
- All entry/exit points share the same spot availability
- Tickets must be tracked centrally

The Singleton ensures this single point of truth.

```typescript
// Without Singleton - chaos
const lot1 = new ParkingLot(); // Tracks some spots
const lot2 = new ParkingLot(); // Tracks same spots differently!

// With Singleton - controlled
const lot = ParkingLot.getInstance(); // Always the same instance
```

Design Decision

We use a lazy initialization singleton. The instance is created on first access. For a multi-threaded environment, you'd need to add synchronization, but for this design we keep it simple.

### Strategy Pattern (PricingStrategy)

**The Problem:** Different parking lots have different pricing models. Some charge hourly, some charge flat rates, some have complex tiered pricing. If we hardcode the pricing logic, adding new models requires changing the ParkingLot class.

**The Solution:** The Strategy pattern defines a family of algorithms (pricing strategies), encapsulates each one, and makes them interchangeable. The ParkingLot delegates fee calculation to a PricingStrategy object.

**Why This Pattern:** Consider how messy things get without it:

```typescript
// Without Strategy - messy conditionals
calculateFee(ticket: ParkingTicket): number {
    if (this.pricingType === 'hourly') {
        return ticket.getDurationInHours() * this.hourlyRate;
    } else if (this.pricingType === 'flat') {
        return this.flatRate;
    } else if (this.pricingType === 'tiered') {
        // Complex tiered logic...
    }
    // Adding new types means modifying this method
}

// With Strategy - clean and extensible
calculateFee(ticket: ParkingTicket): number {
    return this.pricingStrategy.calculateFee(ticket);
}
```

Design Decision

The strategy is injected during initialization rather than at construction time. This allows the parking lot to change pricing strategies dynamically (e.g., weekend rates vs weekday rates).

## 3.4 Full Class Diagram

```
+------------------+       +------------------+       +------------------+
|   <<enum>>       |       |   <<enum>>       |       |   <<enum>>       |
|   VehicleType    |       |   SpotSize       |       |   TicketStatus   |
+------------------+       +------------------+       +------------------+
| BIKE             |       | SMALL            |       | ACTIVE           |
| CAR              |       | COMPACT          |       | PAID             |
| TRUCK            |       | LARGE            |       +------------------+
+------------------+       +------------------+

+------------------+       +------------------+
|     Vehicle      |       |   ParkingSpot    |
+------------------+       +------------------+
| - type           |       | - id             |
| - licensePlate   |       | - size           |
+------------------+       | - isOccupied     |
| + getType()      |       | - vehicle        |
| + getLicensePlate|       +------------------+
+------------------+       | + canFitVehicle()|
        |                  | + park()         |
        |                  | + unpark()       |
        v                  +------------------+
+------------------+               |
|  ParkingTicket   |               |
+------------------+               |
| - ticketId       |               v
| - vehicle        |       +------------------+
| - spot           |       |  ParkingFloor    |
| - entryTime      |       +------------------+
| - exitTime       |       | - floorNumber    |
| - status         |       | - spots[]        |
+------------------+       +------------------+
| + markExit()     |       | + findSpot()     |
| + getDuration()  |       | + getAvailable() |
+------------------+       +------------------+
                                   |
                                   v
+------------------+       +------------------+
|<<interface>>     |<------|   ParkingLot     |
| PricingStrategy  |       |   <<singleton>>  |
+------------------+       +------------------+
| + calculateFee() |       | - instance       |
+------------------+       | - floors[]       |
        ^                  | - activeTickets  |
        |                  | - pricingStrategy|
+-------+-------+          +------------------+
|               |          | + getInstance()  |
v               v          | + parkVehicle()  |
+----------+ +----------+  | + unparkVehicle()|
| Hourly   | | FlatRate |  +------------------+
| Strategy | | Strategy |
+----------+ +----------+
```

# 4. Code Implementation

Now let's translate our design into working TypeScript code. We'll build bottom-up: foundational types first, then data classes, then the classes with real logic.

## 4.1 Enums

We start with the enums that define our type system.

```typescript
enum VehicleType {
    BIKE = 'BIKE',
    CAR = 'CAR',
    TRUCK = 'TRUCK'
}

enum SpotSize {
    SMALL = 'SMALL',
    COMPACT = 'COMPACT',
    LARGE = 'LARGE'
}

enum TicketStatus {
    ACTIVE = 'ACTIVE',
    PAID = 'PAID'
}
```

Using string enums provides better debugging output and JSON serialization compared to numeric enums.

## 4.2 Data Classes

These classes primarily hold data with some associated behavior.

```typescript
class Vehicle {
    private readonly type: VehicleType;
    private readonly licensePlate: string;

    constructor(type: VehicleType, licensePlate: string) {
        this.type = type;
        this.licensePlate = licensePlate;
    }

    getType(): VehicleType {
        return this.type;
    }

    getLicensePlate(): string {
        return this.licensePlate;
    }
}
```

The Vehicle class is immutable - once created, its properties don't change.

```typescript
class ParkingSpot {
    private readonly id: string;
    private readonly size: SpotSize;
    private isOccupied: boolean;
    private vehicle: Vehicle | null;

    constructor(id: string, size: SpotSize) {
        this.id = id;
        this.size = size;
        this.isOccupied = false;
        this.vehicle = null;
    }

    getId(): string {
        return this.id;
    }

    getSize(): SpotSize {
        return this.size;
    }

    isAvailable(): boolean {
        return !this.isOccupied;
    }

    getVehicle(): Vehicle | null {
        return this.vehicle;
    }

    /**
     * Checks if this spot can accommodate the given vehicle type.
     * Encapsulates the parking rules:
     * - BIKE -> SMALL only
     * - CAR -> COMPACT or LARGE
     * - TRUCK -> LARGE only
     */
    canFitVehicle(vehicleType: VehicleType): boolean {
        switch (vehicleType) {
            case VehicleType.BIKE:
                return this.size === SpotSize.SMALL;
            case VehicleType.CAR:
                return this.size === SpotSize.COMPACT || this.size === SpotSize.LARGE;
            case VehicleType.TRUCK:
                return this.size === SpotSize.LARGE;
            default:
                return false;
        }
    }

    park(vehicle: Vehicle): void {
        if (this.isOccupied) {
            throw new Error(`Spot ${this.id} is already occupied`);
        }
        if (!this.canFitVehicle(vehicle.getType())) {
            throw new Error(
                `Vehicle type ${vehicle.getType()} cannot fit in spot size ${this.size}`
            );
        }
        this.vehicle = vehicle;
        this.isOccupied = true;
    }

    unpark(): Vehicle {
        if (!this.isOccupied || !this.vehicle) {
            throw new Error(`Spot ${this.id} is not occupied`);
        }
        const parkedVehicle = this.vehicle;
        this.vehicle = null;
        this.isOccupied = false;
        return parkedVehicle;
    }
}
```

The ParkingSpot class encapsulates the parking rules in `canFitVehicle()`. This keeps the compatibility logic in one place.

```typescript
class ParkingFloor {
    private readonly floorNumber: number;
    private readonly spots: ParkingSpot[];

    constructor(floorNumber: number, spots: ParkingSpot[]) {
        this.floorNumber = floorNumber;
        this.spots = spots;
    }

    getFloorNumber(): number {
        return this.floorNumber;
    }

    /**
     * Finds the first available spot that can fit the given vehicle type.
     */
    findAvailableSpot(vehicleType: VehicleType): ParkingSpot | null {
        for (const spot of this.spots) {
            if (spot.isAvailable() && spot.canFitVehicle(vehicleType)) {
                return spot;
            }
        }
        return null;
    }

    /**
     * Returns count of available spots for a given vehicle type.
     */
    getAvailableSpotCount(vehicleType: VehicleType): number {
        return this.spots.filter(
            spot => spot.isAvailable() && spot.canFitVehicle(vehicleType)
        ).length;
    }

    /**
     * Returns total spots on this floor.
     */
    getTotalSpots(): number {
        return this.spots.length;
    }
}
```

The ParkingFloor iterates through its spots to find available ones. A more optimized implementation might maintain separate lists by spot size.

```typescript
class ParkingTicket {
    private readonly ticketId: string;
    private readonly vehicle: Vehicle;
    private readonly spot: ParkingSpot;
    private readonly entryTime: Date;
    private exitTime: Date | null;
    private status: TicketStatus;

    constructor(vehicle: Vehicle, spot: ParkingSpot) {
        this.ticketId = this.generateTicketId();
        this.vehicle = vehicle;
        this.spot = spot;
        this.entryTime = new Date();
        this.exitTime = null;
        this.status = TicketStatus.ACTIVE;
    }

    private generateTicketId(): string {
        return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getTicketId(): string {
        return this.ticketId;
    }

    getVehicle(): Vehicle {
        return this.vehicle;
    }

    getSpot(): ParkingSpot {
        return this.spot;
    }

    getEntryTime(): Date {
        return this.entryTime;
    }

    getExitTime(): Date | null {
        return this.exitTime;
    }

    getStatus(): TicketStatus {
        return this.status;
    }

    markExit(): void {
        if (this.status === TicketStatus.PAID) {
            throw new Error('Ticket has already been paid');
        }
        this.exitTime = new Date();
        this.status = TicketStatus.PAID;
    }

    /**
     * Calculates duration in hours (rounded up to nearest hour).
     */
    getDurationInHours(): number {
        const endTime = this.exitTime || new Date();
        const durationMs = endTime.getTime() - this.entryTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        return Math.ceil(durationHours); // Round up to nearest hour
    }
}
```

The ticket generates a unique ID and tracks the parking session. Duration is calculated when needed.

## 4.3 Pricing Strategy Classes

The Strategy pattern in action.

```typescript
interface PricingStrategy {
    calculateFee(ticket: ParkingTicket): number;
}

class HourlyPricingStrategy implements PricingStrategy {
    private readonly hourlyRate: number;

    constructor(hourlyRate: number) {
        this.hourlyRate = hourlyRate;
    }

    calculateFee(ticket: ParkingTicket): number {
        const hours = ticket.getDurationInHours();
        return hours * this.hourlyRate;
    }
}

class FlatRatePricingStrategy implements PricingStrategy {
    private readonly flatRate: number;

    constructor(flatRate: number) {
        this.flatRate = flatRate;
    }

    calculateFee(_ticket: ParkingTicket): number {
        return this.flatRate;
    }
}
```

Each strategy encapsulates its calculation logic. Adding a new pricing model (e.g., tiered, time-of-day based) requires only a new class implementing the interface.

## 4.4 ParkingLot Class (Singleton)

The main orchestrator that ties everything together.

```typescript
class ParkingLot {
    private static instance: ParkingLot | null = null;
    private floors: ParkingFloor[];
    private activeTickets: Map<string, ParkingTicket>;
    private pricingStrategy: PricingStrategy;
    private isInitialized: boolean;

    private constructor() {
        this.floors = [];
        this.activeTickets = new Map();
        this.pricingStrategy = new HourlyPricingStrategy(10); // Default
        this.isInitialized = false;
    }

    static getInstance(): ParkingLot {
        if (!ParkingLot.instance) {
            ParkingLot.instance = new ParkingLot();
        }
        return ParkingLot.instance;
    }

    /**
     * Reset the singleton instance (useful for testing).
     */
    static resetInstance(): void {
        ParkingLot.instance = null;
    }

    initialize(floors: ParkingFloor[], pricingStrategy: PricingStrategy): void {
        this.floors = floors;
        this.pricingStrategy = pricingStrategy;
        this.activeTickets = new Map();
        this.isInitialized = true;
        console.log(`Parking lot initialized with ${floors.length} floors.`);
    }

    /**
     * Parks a vehicle and returns a ticket.
     * Returns null if no suitable spot is available.
     */
    parkVehicle(vehicle: Vehicle): ParkingTicket | null {
        if (!this.isInitialized) {
            throw new Error('Parking lot not initialized');
        }

        // Find an available spot across all floors
        for (const floor of this.floors) {
            const spot = floor.findAvailableSpot(vehicle.getType());
            if (spot) {
                spot.park(vehicle);
                const ticket = new ParkingTicket(vehicle, spot);
                this.activeTickets.set(ticket.getTicketId(), ticket);

                console.log(
                    `Vehicle ${vehicle.getLicensePlate()} (${vehicle.getType()}) ` +
                    `parked at spot ${spot.getId()} on floor ${floor.getFloorNumber()}. ` +
                    `Ticket: ${ticket.getTicketId()}`
                );

                return ticket;
            }
        }

        console.log(
            `No available spot for vehicle ${vehicle.getLicensePlate()} ` +
            `(${vehicle.getType()})`
        );
        return null;
    }

    /**
     * Unparks a vehicle, calculates fee, and returns the amount.
     */
    unparkVehicle(ticketId: string): number {
        const ticket = this.activeTickets.get(ticketId);
        if (!ticket) {
            throw new Error(`Ticket ${ticketId} not found or already processed`);
        }

        // Mark exit and calculate fee
        ticket.markExit();
        const fee = this.pricingStrategy.calculateFee(ticket);

        // Free up the spot
        const spot = ticket.getSpot();
        spot.unpark();

        // Remove from active tickets
        this.activeTickets.delete(ticketId);

        const vehicle = ticket.getVehicle();
        console.log(
            `Vehicle ${vehicle.getLicensePlate()} exited. ` +
            `Duration: ${ticket.getDurationInHours()} hour(s). ` +
            `Fee: $${fee.toFixed(2)}`
        );

        return fee;
    }

    /**
     * Gets count of available spots for a vehicle type.
     */
    getAvailableSpots(vehicleType: VehicleType): number {
        return this.floors.reduce(
            (total, floor) => total + floor.getAvailableSpotCount(vehicleType),
            0
        );
    }

    /**
     * Displays current availability across all floors.
     */
    displayAvailability(): void {
        console.log('\n=== Parking Lot Availability ===');
        for (const floor of this.floors) {
            console.log(`Floor ${floor.getFloorNumber()}:`);
            console.log(`  Bikes (SMALL spots): ${floor.getAvailableSpotCount(VehicleType.BIKE)}`);
            console.log(`  Cars (COMPACT/LARGE): ${floor.getAvailableSpotCount(VehicleType.CAR)}`);
            console.log(`  Trucks (LARGE only): ${floor.getAvailableSpotCount(VehicleType.TRUCK)}`);
        }
        console.log('================================\n');
    }
}
```

The ParkingLot class:
1. Uses the Singleton pattern to ensure one instance
2. Delegates fee calculation to the pricing strategy
3. Manages active tickets in a Map for O(1) lookup
4. Provides clear console output for each operation

## 4.5 Demo Class

Let's see the system in action with a demo that sets up a parking lot and simulates vehicle operations.

```typescript
function createParkingFloors(): ParkingFloor[] {
    // Floor 1: 2 small, 3 compact, 2 large spots
    const floor1Spots = [
        new ParkingSpot('F1-S1', SpotSize.SMALL),
        new ParkingSpot('F1-S2', SpotSize.SMALL),
        new ParkingSpot('F1-C1', SpotSize.COMPACT),
        new ParkingSpot('F1-C2', SpotSize.COMPACT),
        new ParkingSpot('F1-C3', SpotSize.COMPACT),
        new ParkingSpot('F1-L1', SpotSize.LARGE),
        new ParkingSpot('F1-L2', SpotSize.LARGE),
    ];

    // Floor 2: 1 small, 2 compact, 3 large spots
    const floor2Spots = [
        new ParkingSpot('F2-S1', SpotSize.SMALL),
        new ParkingSpot('F2-C1', SpotSize.COMPACT),
        new ParkingSpot('F2-C2', SpotSize.COMPACT),
        new ParkingSpot('F2-L1', SpotSize.LARGE),
        new ParkingSpot('F2-L2', SpotSize.LARGE),
        new ParkingSpot('F2-L3', SpotSize.LARGE),
    ];

    return [
        new ParkingFloor(1, floor1Spots),
        new ParkingFloor(2, floor2Spots),
    ];
}

function runDemo(): void {
    console.log('=== Parking Lot System Demo ===\n');

    // Get the singleton instance
    const parkingLot = ParkingLot.getInstance();

    // Initialize with floors and hourly pricing ($5/hour)
    const floors = createParkingFloors();
    const pricingStrategy = new HourlyPricingStrategy(5);
    parkingLot.initialize(floors, pricingStrategy);

    // Display initial availability
    parkingLot.displayAvailability();

    // Create vehicles
    const bike1 = new Vehicle(VehicleType.BIKE, 'BIKE-001');
    const car1 = new Vehicle(VehicleType.CAR, 'CAR-001');
    const car2 = new Vehicle(VehicleType.CAR, 'CAR-002');
    const truck1 = new Vehicle(VehicleType.TRUCK, 'TRUCK-001');

    // Park vehicles
    console.log('--- Parking Vehicles ---');
    const bikeTicket = parkingLot.parkVehicle(bike1);
    const carTicket1 = parkingLot.parkVehicle(car1);
    const carTicket2 = parkingLot.parkVehicle(car2);
    const truckTicket = parkingLot.parkVehicle(truck1);

    // Display availability after parking
    parkingLot.displayAvailability();

    // Try to park another truck (should find a spot)
    const truck2 = new Vehicle(VehicleType.TRUCK, 'TRUCK-002');
    const truckTicket2 = parkingLot.parkVehicle(truck2);

    // Show updated availability
    console.log(`\nAvailable spots for trucks: ${parkingLot.getAvailableSpots(VehicleType.TRUCK)}`);

    // Simulate some time passing and unpark vehicles
    console.log('\n--- Unparking Vehicles ---');

    if (bikeTicket) {
        const bikeFee = parkingLot.unparkVehicle(bikeTicket.getTicketId());
    }

    if (carTicket1) {
        const carFee = parkingLot.unparkVehicle(carTicket1.getTicketId());
    }

    // Display final availability
    parkingLot.displayAvailability();

    console.log('=== Demo Complete ===');
}

// Run the demo
runDemo();
```

The demo creates:
- 2 parking floors with different spot configurations
- Hourly pricing at $5 per hour
- Several vehicles of different types
- Demonstrates parking, availability checking, and unparking with fee calculation

# 5. Run and Test

To run this implementation:

```bash
# Save all the code to a single file: parking-lot.ts
npx ts-node 10-low-level-design-interview/01-design-parking-lot.ts
```

### Expected Output

```
=== Parking Lot System Demo ===

Parking lot initialized with 2 floors.

=== Parking Lot Availability ===
Floor 1:
  Bikes (SMALL spots): 2
  Cars (COMPACT/LARGE): 5
  Trucks (LARGE only): 2
Floor 2:
  Bikes (SMALL spots): 1
  Cars (COMPACT/LARGE): 5
  Trucks (LARGE only): 3
================================

--- Parking Vehicles ---
Vehicle BIKE-001 (BIKE) parked at spot F1-S1 on floor 1. Ticket: TKT-...
Vehicle CAR-001 (CAR) parked at spot F1-C1 on floor 1. Ticket: TKT-...
Vehicle CAR-002 (CAR) parked at spot F1-C2 on floor 1. Ticket: TKT-...
Vehicle TRUCK-001 (TRUCK) parked at spot F1-L1 on floor 1. Ticket: TKT-...

=== Parking Lot Availability ===
Floor 1:
  Bikes (SMALL spots): 1
  Cars (COMPACT/LARGE): 2
  Trucks (LARGE only): 1
...

--- Unparking Vehicles ---
Vehicle BIKE-001 exited. Duration: 1 hour(s). Fee: $5.00
Vehicle CAR-001 exited. Duration: 1 hour(s). Fee: $5.00

=== Demo Complete ===
```

# 6. Summary

In this design, we built a parking lot system that demonstrates key object-oriented principles:

| Pattern | Where Used | Why |
|---------|------------|-----|
| **Singleton** | ParkingLot | Single point of truth for all parking operations |
| **Strategy** | PricingStrategy | Flexible, swappable fee calculation algorithms |
| **Composition** | ParkingLot → Floors → Spots | Clear ownership hierarchy |

### Key Takeaways

1. **Derive entities from requirements** - Each class exists because a requirement demanded it
2. **Encapsulate rules where they belong** - Parking compatibility rules live in ParkingSpot
3. **Use patterns when they solve real problems** - Singleton for shared state, Strategy for varying algorithms
4. **Keep it simple** - Don't over-engineer; add complexity only when needed
