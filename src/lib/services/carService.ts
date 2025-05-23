import type { Car } from "@/types/car";

// Define a simple CarSpecifications interface
interface CarSpecifications {
  basic: {
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    vin?: string;
    mileage?: any;
    color?: string;
    interiorColor?: string;
    condition?: string;
    location?: string;
  };
  engine?: any;
  transmission?: any;
  performance?: any;
  dimensions?: any;
  manufacturing?: any;
  interior_features?: any;
  safety_features?: any;
}

// Function to fetch car by ID with detailed information
export async function getCarById(carId: string): Promise<Car | null> {
  if (process.env.NODE_ENV !== "production") {
    // [REMOVED] // [REMOVED] console.log(`Fetching car details for ID: ${carId.substring(0, 8)}***`);
  }

  try {
    // Request car data without images to reduce payload size
    const apiUrl = `/api/cars/${carId}`;

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Making API request to: ${apiUrl}`);
    }

    const response = await fetch(apiUrl);

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`API response status: ${response.status}`);
    }

    if (!response.ok) {
      console.error(
        `Failed to fetch car: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Response data structure:`, Object.keys(data));
    }

    // Handle different response formats - sometimes car data might be in data.car
    // and sometimes directly in the data object
    let car: Car;
    if (data.car) {
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log(`Car data is in data.car property`);
      }
      car = data.car;
    } else if (data._id) {
      if (process.env.NODE_ENV !== "production") {
        // [REMOVED] // [REMOVED] console.log(`Car data is directly in response data object`);
      }
      car = data;
    } else {
      console.error(`Unexpected API response format:`, data);
      return null;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Successfully fetched car: ${car.year || "Unknown"} ${
          car.make || "Unknown"
        } ${car.model || "Unknown"} (ID: ${car._id?.substring(0, 8)}***)`
      );
    }
    return car;
  } catch (error) {
    console.error("Error in getCarById:", error);
    return null;
  }
}

// Function to fetch car specifications by ID
export async function getCarSpecifications(
  carId: string
): Promise<CarSpecifications | null> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `Getting car specifications for ID: ${carId.substring(0, 8)}***`
    );
  }

  try {
    // Add includeImages parameter to get all car data including images
    const car = await getCarById(carId);

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Processing car data for specifications`);
    }

    if (!car) {
      console.error("No car data returned from API");
      return null;
    }

    // Extract specifications from car data
    const specifications: CarSpecifications = {
      basic: {
        year: car.year ?? undefined,
        make: car.make,
        model: car.model,
        vin: car.vin
          ? car.vin.substring(0, 4) +
            "***" +
            car.vin.substring(car.vin.length - 4)
          : undefined, // Mask VIN
        mileage: car.mileage,
        color: car.color,
        interiorColor: car.interior_color,
        condition: car.condition,
        location: car.location,
      },
      engine: car.engine,
      transmission: car.transmission,
      performance: car.performance,
      dimensions: car.dimensions,
      manufacturing: car.manufacturing,
      interior_features: car.interior_features,
      // Note: exterior_features, safety_features, technology_features don't exist in Car type
      // So we'll use safety instead
      safety_features: car.safety,
    };

    // Count non-empty fields for logging
    const nonEmptyFields = Object.entries(specifications)
      .filter(
        ([_, value]) =>
          value &&
          typeof value === "object" &&
          Object.keys(value).some(
            (key) =>
              value[key as keyof typeof value] !== undefined &&
              value[key as keyof typeof value] !== null &&
              value[key as keyof typeof value] !== ""
          )
      )
      .map(([key, _]) => key);

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Car specifications extracted. Categories with data: ${nonEmptyFields.length}/9`
      );

      // [REMOVED] // [REMOVED] console.log(`Car has data for these fields:`, nonEmptyFields);
    }

    return specifications;
  } catch (error) {
    console.error("Error fetching car specifications:", error);
    return null;
  }
}
