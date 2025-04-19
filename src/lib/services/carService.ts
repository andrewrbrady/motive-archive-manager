// Function to fetch car by ID with detailed information
export async function getCarById(carId: string) {
  console.log(`Fetching car details for ID: ${carId}`);

  try {
    // Request car data without images to reduce payload size
    const apiUrl = `/api/cars/${carId}`;
    console.log(`Making API request to: ${apiUrl}`);

    const response = await fetch(apiUrl);

    console.log(`API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to fetch car details: ${response.statusText}. Response body:`,
        errorText
      );
      throw new Error(`Failed to fetch car details: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Response data structure:`, Object.keys(data));

    // Handle different response formats - sometimes car data might be in data.car
    // and sometimes directly in the data object
    let car;
    if (data.car) {
      console.log(`Car data is in data.car property`);
      car = data.car;
    } else if (data._id) {
      console.log(`Car data is directly in response data object`);
      car = data;
    } else {
      console.error(`Unexpected API response format:`, data);
      throw new Error(`No car data found in API response`);
    }

    console.log(
      `Successfully retrieved car data. Car fields:`,
      Object.keys(car || {})
    );
    return car;
  } catch (error) {
    console.error("Error in getCarById:", error);
    throw error;
  }
}

// Function to fetch car specifications by ID
export async function getCarSpecifications(carId: string) {
  console.log(`Getting car specifications for ID: ${carId}`);

  try {
    // Add includeImages parameter to get all car data including images
    const car = await getCarById(carId);
    console.log(`Processing car data for specifications`);

    if (!car) {
      console.error("No car data returned from API");
      throw new Error("No car data returned");
    }

    // Format the car details in a structured way - include ALL relevant fields from the car object
    const carDetails = {
      // Basic information
      year: car.year,
      make: car.make,
      model: car.model,
      trim: car.trim,
      vin: car.vin,

      // Technical specifications
      engine: car.engine,
      transmission: car.transmission,
      drivetrain: car.drivetrain,
      power: car.power,
      torque: car.torque,
      acceleration: car.acceleration,
      topSpeed: car.topSpeed,
      fuelType: car.fuelType,

      // Physical attributes
      color: car.color,
      interior: car.interior,
      exteriorColor: car.exteriorColor,
      interiorColor: car.interiorColor,
      bodyStyle: car.bodyStyle,
      doors: car.doors,
      weight: car.weight,

      // Condition and history
      mileage: car.mileage,
      history: car.history,
      serviceHistory: car.serviceHistory,
      ownership: car.ownership,
      accidents: car.accidents,
      title: car.title,

      // Features and options
      features: car.features,
      options: car.options,
      equipment: car.equipment,
      rarity: car.rarity,
      packages: car.packages,

      // Other important details
      highlights: car.highlights,
      modifications: car.modifications,
      knownIssues: car.knownIssues,
      description: car.description,
      condition: car.condition,
      status: car.status,
      originalMSRP: car.originalMSRP,
      price: car.price,

      // Additional notes
      notes: car.notes,
      additionalInfo: car.additionalInfo,
    };

    console.log(
      `Formatted car specifications successfully:`,
      Object.keys(carDetails)
    );
    // Log non-empty values
    const nonEmptyFields = Object.entries(carDetails)
      .filter(
        ([_, value]) => value !== undefined && value !== null && value !== ""
      )
      .map(([key]) => key);
    console.log(`Car has data for these fields:`, nonEmptyFields);

    return carDetails;
  } catch (error) {
    console.error("Error fetching car specifications:", error);
    throw error;
  }
}
