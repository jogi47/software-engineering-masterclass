/**
 * REPLACE QUERY WITH PARAMETER
 *
 * Add a parameter for something the function currently queries internally.
 *
 * The inverse of Replace Parameter with Query.
 *
 * Motivation:
 * - Remove the function's dependency on global state
 * - Make the function more testable
 * - Allow different callers to provide different values
 *
 * Mechanics:
 * 1. Extract the query expression into a variable
 * 2. Add a parameter for that value
 * 3. Replace the query with the parameter
 */

// ============================================================================
// BEFORE: Function queries global state
// ============================================================================

const thermostatGlobal = {
  selectedTemperature: 72,
  currentTemperature: 68,
};

class HeatingControllerBefore {
  get targetTemperature(): number {
    return thermostatGlobal.selectedTemperature > 68
      ? thermostatGlobal.selectedTemperature
      : 68;
  }
}

// ============================================================================
// AFTER: State passed as parameters
// ============================================================================

interface ThermostatReading {
  selectedTemperature: number;
  currentTemperature: number;
}

class HeatingController {
  targetTemperature(reading: ThermostatReading): number {
    return reading.selectedTemperature > 68 ? reading.selectedTemperature : 68;
  }

  heatingNeeded(reading: ThermostatReading): boolean {
    return reading.currentTemperature < this.targetTemperature(reading);
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Replace Query with Parameter ===\n");

const controller = new HeatingController();
const reading: ThermostatReading = { selectedTemperature: 72, currentTemperature: 68 };

console.log(`Target temp: ${controller.targetTemperature(reading)}`);
console.log(`Heating needed: ${controller.heatingNeeded(reading)}`);

// Easy to test with different readings
const coldReading: ThermostatReading = { selectedTemperature: 72, currentTemperature: 60 };
console.log(`Cold room needs heating: ${controller.heatingNeeded(coldReading)}`);

void HeatingControllerBefore;

export {};
