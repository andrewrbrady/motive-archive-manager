# Vehicle Models API Documentation

## Overview

The Vehicle Models API provides endpoints for managing generic vehicle model templates in the Motive Archive Manager system. This API allows you to create, read, update, and delete vehicle models that can be used as templates for creating specific car instances.

## Base URL

All API endpoints are prefixed with `/api/models`

## Authentication

All endpoints require authentication via Firebase Auth token in the Authorization header:

```
Authorization: Bearer <your-firebase-token>
```

## Data Model

### VehicleModel Schema

```typescript
interface VehicleModel {
  _id: ObjectId;
  make: string; // Required: "BMW", "Toyota", etc.
  model: string; // Required: "3 Series", "Camry", etc.
  generation?: string; // Optional: "F30", "XV70", etc.
  year_range?: {
    // Optional: Production years
    start: number;
    end?: number; // null for current production
  };
  body_styles?: string[]; // Optional: ["Sedan", "Wagon", "Coupe"]
  engine_options?: Array<{
    // Optional: Available engines
    type: string;
    displacement: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
    };
    fuel_type?: string;
  }>;
  transmission_options?: string[]; // Optional: ["Manual", "Automatic", "CVT"]
  drivetrain_options?: string[]; // Optional: ["FWD", "RWD", "AWD"]
  market_segment?: string; // Optional: "Luxury", "Economy", "Sports", etc.
  description?: string; // Optional: General description
  specifications?: {
    // Optional: Common specs
    dimensions?: {
      length?: { value: number; unit: string };
      width?: { value: number; unit: string };
      height?: { value: number; unit: string };
      wheelbase?: { value: number; unit: string };
    };
    weight_range?: {
      min: { value: number; unit: string };
      max: { value: number; unit: string };
    };
    seating_capacity?: {
      min: number;
      max: number;
    };
  };
  tags?: string[]; // Optional: For categorization
  active: boolean; // Required: For soft delete
  created_at: Date; // Required: Timestamp
  updated_at: Date; // Required: Timestamp
}
```

## API Endpoints

### GET /api/models

Get a list of vehicle models with optional filtering and pagination.

#### Query Parameters

| Parameter        | Type   | Description                                             |
| ---------------- | ------ | ------------------------------------------------------- |
| `page`           | number | Page number (default: 1)                                |
| `limit`          | number | Items per page (default: 50, max: 100)                  |
| `make`           | string | Filter by make (case-insensitive)                       |
| `year`           | number | Filter by year (within year_range)                      |
| `body_style`     | string | Filter by body style                                    |
| `market_segment` | string | Filter by market segment                                |
| `search`         | string | Text search across make, model, description, generation |

#### Example Request

```bash
GET /api/models?make=BMW&market_segment=Luxury&page=1&limit=10
```

#### Example Response

```json
{
  "models": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "make": "BMW",
      "model": "3 Series",
      "generation": "F30",
      "year_range": {
        "start": 2012,
        "end": 2018
      },
      "body_styles": ["Sedan", "Wagon"],
      "transmission_options": ["Manual", "Automatic"],
      "drivetrain_options": ["RWD", "AWD"],
      "market_segment": "Luxury",
      "description": "The F30 generation BMW 3 Series...",
      "active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 47,
    "pageSize": 10,
    "hasMore": true
  }
}
```

### POST /api/models

Create a new vehicle model.

#### Request Body

```json
{
  "make": "BMW",
  "model": "3 Series",
  "generation": "F30",
  "year_range": {
    "start": 2012,
    "end": 2018
  },
  "body_styles": ["Sedan", "Wagon"],
  "transmission_options": ["Manual", "Automatic"],
  "drivetrain_options": ["RWD", "AWD"],
  "market_segment": "Luxury",
  "description": "The F30 generation BMW 3 Series represents a significant evolution in BMW's compact executive car lineup."
}
```

#### Required Fields

- `make`: Vehicle manufacturer
- `model`: Vehicle model name

#### Example Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "make": "BMW",
  "model": "3 Series",
  "generation": "F30",
  "year_range": {
    "start": 2012,
    "end": 2018
  },
  "body_styles": ["Sedan", "Wagon"],
  "transmission_options": ["Manual", "Automatic"],
  "drivetrain_options": ["RWD", "AWD"],
  "market_segment": "Luxury",
  "description": "The F30 generation BMW 3 Series represents a significant evolution in BMW's compact executive car lineup.",
  "active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### Error Responses

- `400 Bad Request`: Missing required fields
- `409 Conflict`: Model with same make/model/generation already exists

### GET /api/models/[id]

Get a specific vehicle model by ID.

#### Path Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `id`      | string | Model ID (ObjectId) |

#### Example Request

```bash
GET /api/models/507f1f77bcf86cd799439011
```

#### Example Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "make": "BMW",
  "model": "3 Series",
  "generation": "F30",
  "year_range": {
    "start": 2012,
    "end": 2018
  },
  "body_styles": ["Sedan", "Wagon"],
  "transmission_options": ["Manual", "Automatic"],
  "drivetrain_options": ["RWD", "AWD"],
  "market_segment": "Luxury",
  "description": "The F30 generation BMW 3 Series represents a significant evolution in BMW's compact executive car lineup.",
  "active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

#### Error Responses

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: Model not found

### PUT /api/models/[id]

Update a specific vehicle model.

#### Path Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `id`      | string | Model ID (ObjectId) |

#### Request Body

```json
{
  "description": "Updated description for the BMW 3 Series F30 generation.",
  "market_segment": "Performance"
}
```

#### Example Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "make": "BMW",
  "model": "3 Series",
  "generation": "F30",
  "year_range": {
    "start": 2012,
    "end": 2018
  },
  "body_styles": ["Sedan", "Wagon"],
  "transmission_options": ["Manual", "Automatic"],
  "drivetrain_options": ["RWD", "AWD"],
  "market_segment": "Performance",
  "description": "Updated description for the BMW 3 Series F30 generation.",
  "active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T12:00:00.000Z"
}
```

#### Error Responses

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: Model not found

### DELETE /api/models/[id]

Soft delete a specific vehicle model.

#### Path Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `id`      | string | Model ID (ObjectId) |

#### Example Request

```bash
DELETE /api/models/507f1f77bcf86cd799439011
```

#### Example Response

```json
{
  "success": true
}
```

#### Error Responses

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: Model not found

### DELETE /api/models

Soft delete a vehicle model by ID (query parameter).

#### Query Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `id`      | string | Model ID (ObjectId) |

#### Example Request

```bash
DELETE /api/models?id=507f1f77bcf86cd799439011
```

#### Example Response

```json
{
  "success": true
}
```

## Constants and Enums

### Body Styles

```typescript
const BODY_STYLES = [
  "Sedan",
  "Hatchback",
  "Wagon",
  "Coupe",
  "Convertible",
  "SUV",
  "Crossover",
  "Pickup Truck",
  "Van",
  "Minivan",
  "Roadster",
  "Targa",
] as const;
```

### Transmission Options

```typescript
const TRANSMISSION_OPTIONS = [
  "Manual",
  "Automatic",
  "CVT",
  "Dual-Clutch",
  "Semi-Automatic",
] as const;
```

### Drivetrain Options

```typescript
const DRIVETRAIN_OPTIONS = ["FWD", "RWD", "AWD", "4WD"] as const;
```

### Market Segments

```typescript
const MARKET_SEGMENTS = [
  "Economy",
  "Compact",
  "Mid-Size",
  "Full-Size",
  "Luxury",
  "Sports",
  "Performance",
  "Electric",
  "Hybrid",
  "Commercial",
] as const;
```

### Fuel Types

```typescript
const FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "Electric",
  "Hybrid",
  "Plug-in Hybrid",
  "Hydrogen",
  "E85",
  "CNG",
] as const;
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

## Rate Limiting

The API implements standard rate limiting. If you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

## Caching

- GET requests are cached for 1 hour (`s-maxage=3600`)
- Cache headers include `stale-while-revalidate=7200` for better performance

## Integration with Cars API

Vehicle models can be linked to specific car instances through the `modelId` field in the car schema:

```json
{
  "_id": "car-id",
  "make": "BMW",
  "model": "3 Series",
  "modelId": "507f1f77bcf86cd799439011",
  "modelInfo": {
    "_id": "507f1f77bcf86cd799439011",
    "make": "BMW",
    "model": "3 Series",
    "generation": "F30",
    "market_segment": "Luxury",
    "body_styles": ["Sedan", "Wagon"]
  }
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
import { api } from "@/lib/api-client";

// Get all models
const models = await api.models.getAll();

// Filter models
const bmwModels = await api.models.getAll({ make: "BMW" });

// Create a new model
const newModel = await api.models.create({
  make: "Toyota",
  model: "Camry",
  year_range: { start: 2018 },
  body_styles: ["Sedan"],
  market_segment: "Mid-Size",
});

// Update a model
const updatedModel = await api.models.update(modelId, {
  description: "Updated description",
});

// Delete a model
await api.models.delete(modelId);
```

### cURL Examples

```bash
# Get all models
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/models"

# Create a new model
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "year_range": { "start": 2018 },
    "body_styles": ["Sedan"],
    "market_segment": "Mid-Size"
  }' \
  "https://your-domain.com/api/models"

# Update a model
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}' \
  "https://your-domain.com/api/models/507f1f77bcf86cd799439011"

# Delete a model
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/models/507f1f77bcf86cd799439011"
```

## Testing

Use the provided test script to validate API functionality:

```bash
AUTH_TOKEN=your_token node scripts/test-models-api.js
```

The test script validates:

- CRUD operations
- Filtering and search
- Duplicate prevention
- Soft delete functionality
- Data integrity

## Best Practices

1. **Unique Models**: Each combination of make/model/generation should be unique
2. **Consistent Naming**: Use consistent naming conventions for makes and models
3. **Complete Data**: Fill in as much information as possible for better content generation
4. **Year Ranges**: Use year ranges for models that span multiple years
5. **Tags**: Use tags for better categorization and filtering
6. **Descriptions**: Write clear, detailed descriptions for content generation

## Support

For API support or questions, please refer to the main documentation or contact the development team.
