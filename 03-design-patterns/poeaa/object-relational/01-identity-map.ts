/**
 * IDENTITY MAP
 *
 * Ensures that each object gets loaded only once by keeping every loaded
 * object in a map. Looks up objects using the map when referring to them.
 *
 * Characteristics:
 * - Prevents duplicate objects in memory
 * - Ensures identity consistency (same row = same object)
 * - Improves performance by avoiding redundant loads
 * - Essential for maintaining object relationships
 */

// Domain Entity
class Employee {
  constructor(
    public readonly id: string,
    public name: string,
    public departmentId: string,
    public salary: number
  ) {}

  giveRaise(percent: number): void {
    this.salary = this.salary * (1 + percent / 100);
  }
}

// Simulated database
const database = {
  employees: new Map([
    ["e1", { id: "e1", name: "Alice", departmentId: "d1", salary: 75000 }],
    ["e2", { id: "e2", name: "Bob", departmentId: "d1", salary: 65000 }],
    ["e3", { id: "e3", name: "Charlie", departmentId: "d2", salary: 80000 }],
  ]),
  loadCount: 0, // Track database loads for demonstration
};

// IDENTITY MAP
class IdentityMap<T> {
  private map = new Map<string, T>();

  get(id: string): T | undefined {
    return this.map.get(id);
  }

  set(id: string, entity: T): void {
    this.map.set(id, entity);
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  remove(id: string): void {
    this.map.delete(id);
  }

  clear(): void {
    this.map.clear();
  }
}

// Repository using Identity Map
class EmployeeRepository {
  private identityMap = new IdentityMap<Employee>();

  findById(id: string): Employee | undefined {
    // First check identity map
    if (this.identityMap.has(id)) {
      console.log(`  [Identity Map HIT] ${id}`);
      return this.identityMap.get(id);
    }

    // Load from database
    console.log(`  [Database LOAD] ${id}`);
    database.loadCount++;
    const row = database.employees.get(id);
    if (!row) return undefined;

    // Create entity and add to identity map
    const employee = new Employee(row.id, row.name, row.departmentId, row.salary);
    this.identityMap.set(id, employee);

    return employee;
  }

  findByDepartment(departmentId: string): Employee[] {
    const employees: Employee[] = [];

    for (const row of Array.from(database.employees.values())) {
      if (row.departmentId === departmentId) {
        // Use identity map to avoid duplicates
        let employee = this.identityMap.get(row.id);
        if (!employee) {
          console.log(`  [Database LOAD] ${row.id}`);
          database.loadCount++;
          employee = new Employee(row.id, row.name, row.departmentId, row.salary);
          this.identityMap.set(row.id, employee);
        } else {
          console.log(`  [Identity Map HIT] ${row.id}`);
        }
        employees.push(employee);
      }
    }

    return employees;
  }

  clearIdentityMap(): void {
    this.identityMap.clear();
    console.log("Identity map cleared");
  }
}

// Usage
console.log("=== Identity Map Pattern ===\n");

const repository = new EmployeeRepository();

console.log("First load of Alice:");
const alice1 = repository.findById("e1");

console.log("\nSecond load of Alice (should use identity map):");
const alice2 = repository.findById("e1");

console.log(`\nSame object? ${alice1 === alice2}`); // true - same instance

// Modify through one reference
console.log("\nGiving Alice a raise through first reference...");
alice1?.giveRaise(10);

// Change is visible through the other reference (same object)
console.log(`Alice's salary (via second reference): $${alice2?.salary}`);

// Load department - some already in identity map
console.log("\nLoading department d1 (Bob needs DB load, Alice from map):");
const dept1Employees = repository.findByDepartment("d1");
console.log(`Department has ${dept1Employees.length} employees`);

// Alice in department list is the same object
const aliceFromDept = dept1Employees.find((e) => e.id === "e1");
console.log(`Same Alice object? ${alice1 === aliceFromDept}`);

console.log(`\nTotal database loads: ${database.loadCount}`);

// Make this file a module to avoid global scope pollution
export {};
