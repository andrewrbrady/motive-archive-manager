import type { Car as BaseCar, CarImage } from "@/types/car";
import type { MeasurementValue } from "@/types/measurements";
import type {
  ExtendedCar,
  CarFormData,
  EditableSpecs,
  FormClientInfo,
  BaTCarDetails,
} from "@/types/car-page";

// Type guard to check if a value is a string
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Type guard to check if a value is a MeasurementValue
export function isMeasurementValue(value: unknown): value is MeasurementValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    "unit" in value &&
    (typeof (value as MeasurementValue).value === "number" ||
      (value as MeasurementValue).value === null) &&
    typeof (value as MeasurementValue).unit === "string"
  );
}

// Handle dimensions with proper type checking
export function handleDimensions(
  dimensions: Record<string, unknown>
): Record<string, MeasurementValue | undefined> {
  const result: Record<string, MeasurementValue | undefined> = {};
  for (const [key, value] of Object.entries(dimensions)) {
    if (isMeasurementValue(value)) {
      result[key] = value;
    }
  }
  return result;
}

// Handle interior features with proper type checking
export function handleInteriorFeatures(
  features: Record<string, unknown>
): CarFormData["interior_features"] {
  return {
    seats: typeof features.seats === "number" ? features.seats : undefined,
    upholstery: isString(features.upholstery) ? features.upholstery : undefined,
    features: Array.isArray(features.features)
      ? features.features.filter(isString)
      : undefined,
  };
}

// Handle transmission with proper type checking
export function handleTransmission(
  transmission: Record<string, unknown>
): CarFormData["transmission"] {
  return {
    type: isString(transmission.type) ? transmission.type : "",
    speeds:
      typeof transmission.speeds === "number" ? transmission.speeds : undefined,
  };
}

// Type guard for field type
export function isStringField(field: string | number): field is string {
  return typeof field === "string";
}

// Handle nested paths like "engine.displacement"
export function handleNestedPath(
  field: string,
  value: unknown,
  prev: EditableSpecs
): EditableSpecs {
  if (field.includes(".")) {
    const [parentField, childField] = field.split(".");
    const parentValue = (prev[parentField as keyof EditableSpecs] ||
      {}) as Record<string, unknown>;
    return {
      ...prev,
      [parentField]: {
        ...parentValue,
        [childField]: value,
      },
    };
  }
  return prev;
}

// Convert car data to form data with proper type handling
export function toCarFormData(car: ExtendedCar): CarFormData {
  const transformedClientInfo: FormClientInfo | undefined = car.clientInfo
    ? {
        name: car.clientInfo.name,
        email: car.clientInfo.email,
        phone: car.clientInfo.phone,
        address: car.clientInfo.address
          ? `${car.clientInfo.address.street || ""}, ${
              car.clientInfo.address.city || ""
            }, ${car.clientInfo.address.state || ""} ${
              car.clientInfo.address.zipCode || ""
            }, ${car.clientInfo.address.country || ""}`
          : undefined,
        company: car.clientInfo.businessType,
      }
    : undefined;

  return {
    ...car,
    year: car.year ?? 0,
    mileage: car.mileage ?? { value: 0, unit: "mi" },
    clientInfo: transformedClientInfo,
    status: car.status || "available",
  };
}

// Convert measurement to base mileage format
export function toBaseMileage(
  measurement: MeasurementValue | undefined
): { value: number; unit: string } | undefined {
  if (!measurement || measurement.value === null) {
    return { value: 0, unit: measurement?.unit || "mi" };
  }
  return {
    value: measurement.value,
    unit: measurement.unit,
  };
}

// Convert form data back to car data with proper type handling
export function fromCarFormData(
  formData: CarFormData,
  originalCar: ExtendedCar
): Partial<BaseCar> {
  const {
    dimensions,
    interior_features,
    transmission,
    mileage,
    clientInfo,
    ...rest
  } = formData;

  return {
    ...rest,
    mileage: toBaseMileage(mileage),
    dimensions: dimensions
      ? Object.entries(dimensions).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: toBaseMileage(value),
          }),
          {}
        )
      : undefined,
    interior_features,
    transmission,
    clientInfo: originalCar.clientInfo, // Preserve the original API client info
  };
}

// Convert to BaT car details
export function toBaTCarDetails(car: ExtendedCar): BaTCarDetails {
  return {
    _id: car._id,
    year: car.year ?? 0,
    make: car.make,
    model: car.model,
    color: car.color,
    mileage:
      car.mileage && car.mileage.value !== null
        ? {
            value: car.mileage.value,
            unit: car.mileage.unit,
          }
        : undefined,
    engine: car.engine
      ? {
          type: car.engine.type,
          displacement:
            car.engine.displacement && car.engine.displacement.value !== null
              ? {
                  value: car.engine.displacement.value,
                  unit: car.engine.displacement.unit,
                }
              : undefined,
          power: car.engine.power
            ? {
                hp: car.engine.power.hp,
              }
            : undefined,
        }
      : undefined,
    transmission: car.transmission ?? { type: "" },
    vin: car.vin,
    condition: car.condition,
    interior_color: car.interior_color,
    interior_features: car.interior_features
      ? {
          seats: car.interior_features.seats ?? 0,
          upholstery: car.interior_features.upholstery,
        }
      : undefined,
    description: car.description,
  };
}

// Format measurement values
export function formatMeasurement(
  measurement: MeasurementValue | string | undefined
): string {
  if (!measurement) return "N/A";
  if (typeof measurement === "string") return measurement;
  if (measurement.value === null) return "N/A";
  return `${measurement.value} ${measurement.unit}`;
}

// Format mileage display
export function formatMileage(mileage: MeasurementValue | undefined): string {
  if (!mileage || mileage.value === null || mileage.value === undefined)
    return "0";
  return (
    mileage.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    " " +
    (mileage.unit || "")
  );
}

// Format power values
export function formatPower(power?: {
  hp: number;
  kW: number;
  ps: number;
}): string {
  if (!power) return "N/A";
  return `${power.hp} hp / ${power.kW} kW / ${power.ps} ps`;
}

// Format torque values
export function formatTorque(torque?: { "lb-ft": number; Nm: number }): string {
  if (!torque) return "N/A";
  return `${torque["lb-ft"]} lb-ft / ${torque.Nm} Nm`;
}

// Format address object to string
export function formatAddress(address: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
}

// Generate car title
export function generateCarTitle(car: ExtendedCar | null): string {
  if (!car) return "";
  return [
    car.year ? car.year : null,
    car.make ? car.make : null,
    car.model ? car.model : null,
  ]
    .filter(Boolean)
    .join(" ");
}

// Removes redundant fields from aiAnalysis and deletes it if empty
export function cleanAiAnalysis(car: any) {
  if (!car.aiAnalysis) return car;

  // Remove redundant fields that we already have structured data for
  const cleanedAnalysis = Object.fromEntries(
    Object.entries(car.aiAnalysis).filter(([key]) => {
      return (
        !key.toLowerCase().includes("gvwr") &&
        !key.toLowerCase().includes("weight") &&
        !key.toLowerCase().includes("engine") &&
        !key.toLowerCase().includes("doors") &&
        !key.toLowerCase().includes("displacement") &&
        !key.toLowerCase().includes("horsepower") &&
        !key.toLowerCase().includes("tire")
      );
    })
  );

  // If there are no fields left, remove the aiAnalysis object entirely
  if (Object.keys(cleanedAnalysis).length === 0) {
    delete car.aiAnalysis;
  } else {
    car.aiAnalysis = cleanedAnalysis;
  }

  return car;
}

// Recursively converts MongoDB ObjectIds and arrays to plain objects/strings
export function convertToPlainObject(doc: any): any {
  if (doc === null || typeof doc !== "object") {
    return doc;
  }

  // Handle MongoDB ObjectId
  if (
    typeof doc === "object" &&
    doc &&
    typeof doc.toString === "function" &&
    doc.constructor &&
    doc.constructor.name === "ObjectId"
  ) {
    return doc.toString();
  }

  if (Array.isArray(doc)) {
    return doc.map(convertToPlainObject);
  }

  const plainObj: any = {};
  for (const key in doc) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      plainObj[key] = convertToPlainObject(doc[key]);
    }
  }
  return plainObj;
}
