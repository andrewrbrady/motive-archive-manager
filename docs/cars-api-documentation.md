# Cars API Documentation

## Overview

The Cars API provides endpoints for creating, reading, updating, and deleting car records in the Motive Archive Manager system. This documentation focuses on the car creation endpoint and JSON upload functionality.

## POST `/api/cars` - Create New Car

### Endpoint Details

- **URL**: `/api/cars`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: Required (handled by middleware)

### Request Body Structure

The API accepts a JSON object with the following structure. Only `make` and `model` are required fields.

#### Required Fields

```json
{
  "make": "string",
  "model": "string"
}
```

#### Complete Optional Fields Structure

```json
{
  "year": "number",
  "price": {
    "listPrice": "number | null",
    "soldPrice": "number | null",
    "priceHistory": [
      {
        "type": "list | sold",
        "price": "number | null",
        "date": "string (ISO date)",
        "notes": "string (optional)"
      }
    ]
  },
  "mileage": {
    "value": "number | null",
    "unit": "string (default: 'mi')"
  },
  "color": "string",
  "interior_color": "string",
  "vin": "string",
  "type": "string",
  "location": "string",
  "description": "string",
  "status": "available | sold | pending (default: 'available')",
  "client": "string (ObjectId reference)",
  "horsepower": "number",
  "engine": {
    "type": "string",
    "displacement": {
      "value": "number | null",
      "unit": "string (default: 'L')"
    },
    "power": {
      "hp": "number",
      "kW": "number",
      "ps": "number"
    },
    "torque": {
      "lb-ft": "number",
      "Nm": "number"
    },
    "features": ["string"]
  },
  "dimensions": {
    "wheelbase": {
      "value": "number | null",
      "unit": "string (default: 'in')"
    },
    "weight": {
      "value": "number | null",
      "unit": "string (default: 'lbs')"
    },
    "gvwr": {
      "value": "number | null",
      "unit": "string (default: 'lbs')"
    },
    "trackWidth": {
      "value": "number | null",
      "unit": "string (default: 'in')"
    },
    "length": {
      "value": "number | null",
      "unit": "string"
    },
    "width": {
      "value": "number | null",
      "unit": "string"
    },
    "height": {
      "value": "number | null",
      "unit": "string"
    }
  },
  "manufacturing": {
    "series": "string",
    "trim": "string",
    "bodyClass": "string",
    "plant": {
      "city": "string",
      "country": "string",
      "company": "string"
    }
  },
  "safety": {
    "tpms": "boolean"
  },
  "doors": "number",
  "imageIds": ["string"],
  "eventIds": ["string (ObjectId references)"]
}
```

### Field Descriptions

#### Basic Information

- **make**: Vehicle manufacturer (e.g., "Toyota", "Ford", "BMW")
- **model**: Vehicle model name (e.g., "Camry", "F-150", "X3")
- **year**: Model year as a number
- **color**: Exterior color
- **interior_color**: Interior color/material
- **vin**: Vehicle Identification Number (17 characters)
- **type**: Vehicle type (e.g., "Sedan", "SUV", "Truck")
- **location**: Current location of the vehicle
- **description**: Detailed description of the vehicle
- **status**: Current status - "available", "sold", or "pending"
- **doors**: Number of doors

#### Pricing Information

- **price.listPrice**: Current listing price
- **price.soldPrice**: Final sold price (if applicable)
- **price.priceHistory**: Array of price changes over time

#### Measurements

All measurement objects follow the pattern:

```json
{
  "value": "number | null",
  "unit": "string"
}
```

Common units:

- **Distance**: "mi" (miles), "km" (kilometers)
- **Weight**: "lbs" (pounds), "kg" (kilograms)
- **Length**: "in" (inches), "cm" (centimeters), "ft" (feet), "m" (meters)
- **Engine Displacement**: "L" (liters), "cc" (cubic centimeters)

#### Engine Information

- **engine.type**: Engine configuration (e.g., "V6", "4-Cylinder", "V8")
- **engine.displacement**: Engine size
- **engine.power**: Power output in multiple units (hp, kW, ps)
- **engine.torque**: Torque output in multiple units (lb-ft, Nm)
- **engine.features**: Array of engine features/technologies

#### Manufacturing Information

- **manufacturing.series**: Vehicle series/generation
- **manufacturing.trim**: Trim level (e.g., "LE", "Sport", "Limited")
- **manufacturing.bodyClass**: Body style classification
- **manufacturing.plant**: Manufacturing facility information

### Example Requests

#### Minimal Request (Required Fields Only)

```json
{
  "make": "Honda",
  "model": "Civic"
}
```

#### Complete Request Example

```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2023,
  "price": {
    "listPrice": 25000,
    "soldPrice": null,
    "priceHistory": [
      {
        "type": "list",
        "price": 25000,
        "date": "2024-01-01T00:00:00.000Z",
        "notes": "Initial listing price"
      }
    ]
  },
  "mileage": {
    "value": 15000,
    "unit": "mi"
  },
  "color": "Silver",
  "interior_color": "Black",
  "vin": "1HGBH41JXMN109186",
  "type": "Sedan",
  "location": "Los Angeles, CA",
  "description": "Well-maintained vehicle with excellent condition",
  "status": "available",
  "horsepower": 203,
  "engine": {
    "type": "4-Cylinder",
    "displacement": {
      "value": 2.5,
      "unit": "L"
    },
    "power": {
      "hp": 203,
      "kW": 151,
      "ps": 206
    },
    "torque": {
      "lb-ft": 184,
      "Nm": 249
    },
    "features": ["Direct Injection", "Variable Valve Timing"]
  },
  "dimensions": {
    "weight": {
      "value": 3340,
      "unit": "lbs"
    },
    "gvwr": {
      "value": 4200,
      "unit": "lbs"
    }
  },
  "doors": 4
}
```

### Response Format

#### Success Response (201 Created)

```json
{
  "_id": "ObjectId",
  "make": "Toyota",
  "model": "Camry",
  // ... all submitted fields
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Error Response (500 Internal Server Error)

```json
{
  "error": "Failed to create car"
}
```

## JSON Upload Feature

### Overview

The car creation page includes an "Upload JSON" button that allows users to upload a JSON file to automatically populate the form fields with car data, rather than manually filling out the form.

### Usage Instructions

1. **Prepare JSON File**: Create a JSON file with the car data following the structure above
2. **Navigate to New Car Page**: Go to `/cars/new`
3. **Click Upload Button**: Click the "Upload JSON" button in the top-right corner
4. **Select File**: Choose your JSON file (must have .json extension)
5. **Review and Edit**: The form fields will be automatically populated with the JSON data
6. **Submit**: Review the populated data, make any necessary edits, and submit the form

### Key Features

- **Form Population**: JSON data automatically fills the corresponding form fields
- **Data Validation**: Validates JSON structure and required fields before populating
- **Editable Results**: Users can review and modify the populated data before submission
- **Merge Logic**: Intelligently merges JSON data with existing form structure
- **Error Handling**: Provides clear feedback for invalid files or data

### Validation Rules

- File must have `.json` extension or `application/json` MIME type
- JSON must be valid (proper syntax)
- Must contain at least `make` and `model` fields
- All other fields are optional and will use defaults if not provided
- Complex nested objects (engine, dimensions, manufacturing) are merged intelligently

### Error Handling

The system provides specific error messages for:

- Invalid file type
- Malformed JSON syntax
- Missing required fields (make and model)
- Form not ready errors

### Workflow Benefits

1. **Speed**: Quickly populate complex forms with pre-prepared data
2. **Accuracy**: Reduce manual entry errors by using structured data
3. **Flexibility**: Review and edit populated data before submission
4. **Reusability**: Save and reuse JSON templates for similar vehicles
5. **Integration**: Perfect for bulk data entry or API integrations

### Example Files

See `docs/car-json-example.json` for a complete example file that demonstrates all available fields and proper formatting.

## Special Handling

- **Timestamps**: The API automatically adds `createdAt` and `updatedAt` timestamps
- **Dimensions Validation**: GVWR and weight objects are validated and structured properly
- **Default Values**: Missing optional fields use sensible defaults
- **MongoDB Integration**: Returns the complete created document with MongoDB `_id`

## Best Practices

1. **Always include make and model**: These are the only required fields
2. **Use proper units**: Specify appropriate units for all measurements
3. **Validate VIN**: Ensure VIN is exactly 17 characters if provided
4. **Structure nested objects**: Follow the exact structure for complex objects like engine and dimensions
5. **Use ISO dates**: Format dates as ISO strings for price history
6. **Test with minimal data first**: Start with just make/model, then add additional fields

## Common Issues

1. **Invalid JSON syntax**: Use a JSON validator to check your file
2. **Missing quotes**: All string values must be quoted
3. **Trailing commas**: Remove trailing commas in objects and arrays
4. **Incorrect nesting**: Ensure nested objects follow the exact structure
5. **Wrong data types**: Numbers should not be quoted, strings should be quoted
