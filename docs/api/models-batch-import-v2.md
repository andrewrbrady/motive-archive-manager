# Models Batch Import API (Enhanced Structure)

This document describes the enhanced batch import functionality for vehicle models in the Motive Archive Manager, supporting comprehensive model data with generations, trims, and detailed specifications.

## Overview

The enhanced batch import feature allows you to create detailed vehicle models with comprehensive information including:

- Generation-specific data with trim levels
- Detailed engine specifications
- Performance data, pricing, and features
- Emissions and fuel economy information

This is ideal for:

- Importing comprehensive model databases
- Setting up detailed vehicle templates for content generation
- Creating rich model data for automotive applications

## API Endpoint

### POST /api/models/batch

Creates multiple comprehensive vehicle models from a JSON array.

**Request Body:**

- Content-Type: `application/json`
- Body: Array of enhanced model objects

**Response:**

- Status: 200 (Success) or 400 (Validation Error)
- Body: JSON object with creation results

## Enhanced JSON Structure

### Required Fields

- `make` (string): Vehicle manufacturer (e.g., "BMW", "Toyota")
- `model` (string): Vehicle model name (e.g., "3 Series", "Camry")
- `generation` (object): Generation information
  - `code` (string): Generation code (e.g., "F30", "XV70")
  - `year_range` (object): Production years
    - `start` (number): Start year
    - `end` (number|null): End year (null for current production)
  - `body_styles` (array): Available body styles (e.g., ["Sedan", "Wagon"])
  - `trims` (array): Array of trim/variant objects
- `engine_options` (array): Array of detailed engine specification objects

### Optional Fields

- `market_segment` (string): Market category ("Luxury", "Economy", etc.)
- `description` (string): Model description
- `tags` (array): Categorization tags

### Trim Object Structure

Each trim in the `generation.trims` array should include:

- `name` (string): Trim name (e.g., "328i", "LE", "Premium")
- `year_range` (object): Trim-specific production years
- `engine` (string): Engine ID reference (must match an engine in `engine_options`)
- `transmission` (array): Available transmissions
- `drivetrain` (array): Available drivetrain options
- `performance` (object): Performance specifications
  - `hp` (number): Horsepower
  - `torque` (object): Torque specifications
- `standard_features` (array): Standard equipment list
- `optional_packages` (array): Optional packages (optional)
- `price_range` (object): Pricing information (optional)
- `fuel_economy` (object): Fuel economy ratings (optional)
- `emissions_rating` (object): Emissions information (optional)

### Engine Object Structure

Each engine in the `engine_options` array should include:

- `id` (string): Engine code/identifier (referenced by trims)
- `type` (string): Engine type (e.g., "I4", "V6", "V8")
- `displacement` (object): Engine displacement with value and unit
- `power` (object): Power output in HP and kW
- `torque` (object): Torque output with value and unit
- `fuel_type` (string): Fuel type ("Gasoline", "Diesel", "Electric", etc.)
- `aspiration` (string): Aspiration type ("Turbocharged", "Naturally Aspirated", etc.)

## Example Request

```json
[
  {
    "make": "BMW",
    "model": "3 Series",
    "generation": {
      "code": "F30",
      "year_range": {
        "start": 2012,
        "end": 2019
      },
      "body_styles": ["Sedan", "Wagon"],
      "trims": [
        {
          "name": "328i",
          "year_range": { "start": 2012, "end": 2015 },
          "engine": "N20B20",
          "transmission": ["Manual", "Automatic"],
          "drivetrain": ["RWD", "AWD"],
          "performance": {
            "hp": 240,
            "torque": { "value": 258, "unit": "lb-ft" },
            "acceleration": {
              "0_to_60": { "value": 5.7, "unit": "seconds" }
            }
          },
          "price_range": {
            "msrp": {
              "min": 34000,
              "max": 41000,
              "currency": "USD"
            }
          },
          "fuel_economy": {
            "city_mpg": 23,
            "highway_mpg": 35,
            "combined_mpg": 27
          },
          "emissions_rating": {
            "standard": "ULEV-II",
            "co2_grams_per_km": 160
          },
          "standard_features": [
            "Bluetooth",
            "Dual-zone climate control",
            "iDrive infotainment"
          ],
          "optional_packages": [
            {
              "name": "M Sport Package",
              "features": ["Sport suspension", "M steering wheel", "Aero kit"]
            }
          ]
        }
      ]
    },
    "engine_options": [
      {
        "id": "N20B20",
        "type": "I4",
        "displacement": { "value": 2.0, "unit": "L" },
        "power": { "hp": 240, "kW": 179 },
        "torque": { "value": 258, "unit": "lb-ft" },
        "fuel_type": "Gasoline",
        "aspiration": "Turbocharged"
      }
    ],
    "market_segment": "Luxury",
    "description": "Compact executive car with multiple trim levels",
    "tags": ["luxury", "performance", "sedan"]
  }
]
```

## Enhanced Validation Rules

1. **Required Fields**: Each model must have `make`, `model`, and complete `generation` object
2. **Generation Code**: `generation.code` is required
3. **Engine Options**: At least one engine must be provided in `engine_options`
4. **Engine References**: Trim `engine` field must reference a valid engine `id`
5. **Duplicate Prevention**: Models with the same make, model, and generation code cannot be created
6. **Array Validation**: Request body must be a non-empty array

## Success Response

```json
{
  "success": true,
  "message": "Successfully created 2 models",
  "models": [
    {
      "_id": "64f8b2c3d1e4f5a6b7c8d9e0",
      "make": "BMW",
      "model": "3 Series",
      "generation": {
        "code": "F30",
        "year_range": { "start": 2012, "end": 2019 },
        "body_styles": ["Sedan", "Wagon"],
        "trims": [
          {
            "name": "328i",
            "year_range": { "start": 2012, "end": 2015 },
            "engine": "N20B20",
            "performance": {
              "hp": 240,
              "torque": { "value": 258, "unit": "lb-ft" }
            }
          }
        ]
      },
      "engine_options": [
        {
          "id": "N20B20",
          "type": "I4",
          "displacement": { "value": 2.0, "unit": "L" },
          "power": { "hp": 240, "kW": 179 }
        }
      ],
      "market_segment": "Luxury",
      "active": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 2
}
```

## Enhanced Error Handling

The API performs comprehensive validation including:

- **Generation Structure**: Validates complete generation object with required fields
- **Engine References**: Ensures trim engine references exist in engine_options
- **Data Consistency**: Validates relationships between trims and engines
- **Comprehensive Field Validation**: Checks all nested object structures

## Frontend Integration

### Using the Enhanced UI

1. Navigate to the Models page (`/models`)
2. Click the "Batch Import" button
3. Use the enhanced JSON format with generations and trims
4. Review validation results for complex data structures
5. Import comprehensive model data

### Using the API Client

```typescript
import { api } from "@/lib/api-client";

const enhancedModels = [
  {
    make: "BMW",
    model: "3 Series",
    generation: {
      code: "F30",
      year_range: { start: 2012, end: 2019 },
      body_styles: ["Sedan", "Wagon"],
      trims: [
        {
          name: "328i",
          engine: "N20B20",
          performance: { hp: 240, torque: { value: 258, unit: "lb-ft" } },
          standard_features: ["Bluetooth", "Climate control"],
        },
      ],
    },
    engine_options: [
      {
        id: "N20B20",
        type: "I4",
        displacement: { value: 2.0, unit: "L" },
        power: { hp: 240, kW: 179 },
        fuel_type: "Gasoline",
        aspiration: "Turbocharged",
      },
    ],
  },
];

try {
  const result = await api.models.batchCreate(enhancedModels);
  console.log(`Created ${result.count} enhanced models`);
} catch (error) {
  console.error("Import failed:", error.message);
}
```

## Best Practices for Enhanced Models

1. **Complete Engine Data**: Include comprehensive engine specifications
2. **Trim Consistency**: Ensure trim engine references match engine IDs
3. **Performance Data**: Include detailed performance metrics for better content generation
4. **Feature Lists**: Provide comprehensive standard and optional features
5. **Pricing Information**: Include MSRP ranges for market context
6. **Emissions Data**: Add emissions and fuel economy for environmental context

## Enhanced Limitations

- Maximum recommended batch size: 50 models per request (due to increased data complexity)
- Engine references must be valid within the same model object
- All trim-level data is optional but recommended for rich content generation
- Complex nested validation may result in detailed error messages

## Migration from Legacy Format

For backward compatibility, the system supports both legacy and enhanced formats. To migrate:

1. Convert `generation` string to `generation.code`
2. Move `year_range` to `generation.year_range`
3. Move `body_styles` to `generation.body_styles`
4. Create `generation.trims` array with detailed trim information
5. Enhance `engine_options` with detailed specifications

## Related Documentation

- [Enhanced Models API Documentation](./models-api-documentation-v2.md)
- [Vehicle Model Type Definitions (Enhanced)](../../src/types/model.ts)
- [Enhanced Example JSON File](../../examples/models-batch-import-example.json)
- [Test Script for Enhanced Structure](../../scripts/test-models-batch-import-v2.js)
