# Models Batch Import API

This document describes the batch import functionality for vehicle models in the Motive Archive Manager.

## Overview

The batch import feature allows you to create multiple vehicle models at once by uploading a JSON file or pasting JSON data. This is useful for:

- Importing model data from external sources
- Setting up initial model templates
- Bulk creation of related models (e.g., all variants of a specific car line)

## API Endpoint

### POST /api/models/batch

Creates multiple vehicle models from a JSON array.

**Request Body:**

- Content-Type: `application/json`
- Body: Array of model objects

**Response:**

- Status: 200 (Success) or 400 (Validation Error)
- Body: JSON object with creation results

## JSON Format

The JSON should be an array of model objects. Each model object should follow this structure:

### Required Fields

- `make` (string): Vehicle manufacturer (e.g., "BMW", "Toyota")
- `model` (string): Vehicle model name (e.g., "3 Series", "Camry")

### Optional Fields

- `generation` (string): Model generation code (e.g., "F30", "XV70")
- `year_range` (object): Production years
  - `start` (number): Start year
  - `end` (number|null): End year (null for current production)
- `body_styles` (array): Available body styles (e.g., ["Sedan", "Wagon"])
- `engine_options` (array): Engine specifications
- `transmission_options` (array): Transmission types
- `drivetrain_options` (array): Drivetrain types
- `market_segment` (string): Market category
- `description` (string): Model description
- `specifications` (object): Detailed specifications
- `tags` (array): Categorization tags

## Example Request

```json
[
  {
    "make": "BMW",
    "model": "3 Series",
    "generation": "F30",
    "year_range": {
      "start": 2012,
      "end": 2019
    },
    "body_styles": ["Sedan", "Wagon"],
    "engine_options": [
      {
        "type": "4-cylinder",
        "displacement": {
          "value": 2.0,
          "unit": "L"
        },
        "power": {
          "hp": 248,
          "kW": 185
        },
        "fuel_type": "Gasoline"
      }
    ],
    "transmission_options": ["Manual", "Automatic"],
    "drivetrain_options": ["RWD", "AWD"],
    "market_segment": "Luxury",
    "description": "Compact executive car",
    "specifications": {
      "dimensions": {
        "length": { "value": 4633, "unit": "mm" },
        "width": { "value": 1811, "unit": "mm" },
        "height": { "value": 1429, "unit": "mm" }
      },
      "seating_capacity": {
        "min": 5,
        "max": 5
      }
    },
    "tags": ["luxury", "performance", "sedan"]
  }
]
```

## Success Response

```json
{
  "success": true,
  "message": "Successfully created 3 models",
  "models": [
    {
      "_id": "64f8b2c3d1e4f5a6b7c8d9e0",
      "make": "BMW",
      "model": "3 Series",
      "generation": "F30",
      "year_range": {
        "start": 2012,
        "end": 2019
      },
      "body_styles": ["Sedan", "Wagon"],
      "transmission_options": ["Manual", "Automatic"],
      "drivetrain_options": ["RWD", "AWD"],
      "market_segment": "Luxury",
      "description": "Compact executive car",
      "active": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 3
}
```

## Error Response

```json
{
  "error": "Validation failed",
  "details": [
    "Model at index 0: Missing required fields (make, model)",
    "Model at index 2: Duplicate model found (BMW 3 Series F30)"
  ],
  "validCount": 1,
  "totalCount": 3
}
```

## Validation Rules

1. **Required Fields**: Each model must have `make` and `model` fields
2. **Duplicate Prevention**: Models with the same make, model, and generation cannot be created
3. **Array Validation**: Request body must be a non-empty array
4. **Field Types**: All fields must match the expected data types

## Error Handling

The API performs comprehensive validation:

- **Missing Required Fields**: Returns specific error messages for each invalid model
- **Duplicate Detection**: Checks against existing models in the database
- **Data Type Validation**: Ensures arrays and objects are properly formatted
- **Partial Success**: If some models fail validation, no models are created (atomic operation)

## Frontend Integration

### Using the UI

1. Navigate to the Models page (`/models`)
2. Click the "Batch Import" button
3. Choose to upload a JSON file or paste JSON data
4. Review the validation results
5. Click "Import" to create the models

### Using the API Client

```typescript
import { api } from "@/lib/api-client";

const models = [
  {
    make: "BMW",
    model: "3 Series",
    generation: "F30",
    // ... other fields
  },
];

try {
  const result = await api.models.batchCreate(models);
  console.log(`Created ${result.count} models`);
} catch (error) {
  console.error("Import failed:", error.message);
}
```

## Best Practices

1. **Validate Data**: Use the example format as a template
2. **Test Small Batches**: Start with a few models to verify the format
3. **Handle Errors**: Check for validation errors and duplicate models
4. **Use Consistent Naming**: Follow consistent naming conventions for makes and models
5. **Include Descriptions**: Add meaningful descriptions for better searchability

## Limitations

- Maximum recommended batch size: 100 models per request
- Duplicate models (same make + model + generation) will be rejected
- All models in a batch must be valid for any to be created (atomic operation)
- File uploads are limited to 10MB JSON files

## Related Documentation

- [Models API Documentation](./models-api-documentation.md)
- [Vehicle Model Type Definitions](../../src/types/model.ts)
- [Example JSON File](../../examples/models-batch-import-example.json)
