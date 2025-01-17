export const UNITS = {
  LENGTH: ["inches", "mm"],
  WEIGHT: ["lbs", "kg"],
  VOLUME: ["gallons", "L"],
  SPEED: ["mph", "km/h"],
  TIME: ["seconds"],
  MILEAGE: ["mi", "km"],
  POWER: {
    HORSEPOWER: ["hp", "kW", "ps"],
    TORQUE: ["lb-ft", "Nm"],
  },
};

export type UnitType = keyof Omit<typeof UNITS, "POWER">;
export type PowerUnitType = keyof typeof UNITS.POWER;

// Helper function to get available units for a measurement type
export function getUnitsForType(type: UnitType | PowerUnitType): string[] {
  if (type === "HORSEPOWER" || type === "TORQUE") {
    return [...UNITS.POWER[type]];
  }
  return [...UNITS[type as UnitType]];
}
