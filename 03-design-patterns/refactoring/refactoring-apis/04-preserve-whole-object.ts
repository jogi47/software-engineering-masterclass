/**
 * PRESERVE WHOLE OBJECT
 *
 * Pass the whole object instead of extracting several values from it.
 *
 * Motivation:
 * - Reduces the number of parameters
 * - If the called function needs more data later, just access it from the object
 * - Makes the function signature more stable
 *
 * Mechanics:
 * 1. Create a new parameter for the whole object
 * 2. Replace field accesses with object.field
 * 3. Update callers to pass the whole object
 * 4. Remove the old parameters
 */

// ============================================================================
// BEFORE: Extracting values from object
// ============================================================================

interface TemperatureRange {
  low: number;
  high: number;
}

interface HeatingPlan {
  temperatureFloor: number;
  temperatureCeiling: number;
}

// ============================================================================
// AFTER: Passing the whole object
// ============================================================================

function withinRange(plan: HeatingPlan, range: TemperatureRange): boolean {
  return range.low >= plan.temperatureFloor && range.high <= plan.temperatureCeiling;
}

interface Room {
  daysTempRange: TemperatureRange;
  plan: HeatingPlan;
}

function alertForTemp(room: Room): void {
  if (!withinRange(room.plan, room.daysTempRange)) {
    console.log(
      `Temperature out of range: ${room.daysTempRange.low}-${room.daysTempRange.high}`
    );
  } else {
    console.log("Temperature OK");
  }
}

// ============================================================================
// USAGE DEMONSTRATION
// ============================================================================

console.log("=== Preserve Whole Object ===\n");

const room: Room = {
  daysTempRange: { low: 65, high: 75 },
  plan: { temperatureFloor: 60, temperatureCeiling: 80 },
};
alertForTemp(room);

const coldRoom: Room = {
  daysTempRange: { low: 55, high: 65 },
  plan: { temperatureFloor: 60, temperatureCeiling: 80 },
};
alertForTemp(coldRoom);

export {};
