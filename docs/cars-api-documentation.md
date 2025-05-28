# Cars API Documentation

This guide provides details on how to access the Motive Archive Manager Cars API deployed on Vercel. The API offers optimized querying capabilities for car data with features for field selection, image filtering, and efficient data retrieval.

## Base URL

All API requests should be made to your Vercel instance:

```
https://https://motive-archive-manager.vercel.app/api
```

## Authentication

Most endpoints require authentication. Use one of the following methods:

1. **Bearer Token Authentication**:

   - Include an `Authorization` header with a Firebase token:

   ```
   Authorization: Bearer your-firebase-token
   ```

   - Generate a token using the `/api/auth/get-token` endpoint when authenticated via the application

2. **API Token (for programmatic access)**:
   - Admin users can generate API tokens via `/api/auth/generate-token`
   - Include the token in the `Authorization` header:
   ```
   Authorization: Bearer your-api-token
   ```

## Endpoints

### 1. List Cars

```
GET /api/cars
```

Retrieves a collection of cars with filtering, sorting, and pagination options.

#### Query Parameters

| Parameter     | Type    | Description                                |
| ------------- | ------- | ------------------------------------------ |
| page          | number  | Page number (default: 1)                   |
| pageSize      | number  | Items per page (default: 48, max: 96)      |
| search        | string  | Search term for car make, model, etc.      |
| sort          | string  | Sort order (e.g., "createdAt_desc")        |
| fields        | string  | Comma-separated list of fields to include  |
| includeImages | boolean | Whether to include images (default: false) |
| imageCategory | string  | Only include images from this category     |
| make          | string  | Filter by car make                         |
| minYear       | number  | Filter by minimum year                     |
| maxYear       | number  | Filter by maximum year                     |
| clientId      | string  | Filter by client ID                        |
| minPrice      | number  | Filter by minimum price                    |
| maxPrice      | number  | Filter by maximum price                    |

#### Examples

Get cars with only basic info:

```
GET /api/cars?fields=make,model,year,price,status
```

Get cars with only exterior images:

```
GET /api/cars?includeImages=true&imageCategory=exterior
```

### 2. Get Car by ID

```
GET /api/cars/{id}
```

Retrieves detailed information about a specific car.

#### Query Parameters

| Parameter     | Type    | Description                                |
| ------------- | ------- | ------------------------------------------ |
| fields        | string  | Comma-separated list of fields to include  |
| includeImages | boolean | Whether to include images (default: false) |
| imageCategory | string  | Only include images from this category     |

#### Examples

Get basic car info:

```
GET /api/cars/123?fields=make,model,year,price,status
```

Get car with interior images only:

```
GET /api/cars/123?includeImages=true&imageCategory=interior
```

### 3. Create Car

```
POST /api/cars
```

Creates a new car entry.

#### Request Body

JSON object with car properties. Required fields:

- make
- model
- year

#### Example Request

```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "price": {
    "listPrice": 25000
  },
  "mileage": {
    "value": 15000,
    "unit": "miles"
  },
  "status": "available"
}
```

### 4. Update Car

```
PUT /api/cars/{id}
```

Updates all fields of a car record.

#### Request Body

Complete JSON object with all car properties to be updated.

### 5. Partial Update Car

```
PATCH /api/cars/{id}
```

Updates specific fields of a car record.

#### Request Body

JSON object with only the car properties to be updated.

### 6. Delete Car

```
DELETE /api/cars/{id}
```

Deletes a car record.

### 7. Get Client's Cars

```
GET /api/clients/{clientId}/cars
```

Retrieves all cars associated with a specific client.

## Optimizing Search Requests for LLMs

When working with LLMs that have token limitations, use these strategies to minimize response size:

### 1. Limit Fields

Always use the `fields` parameter to request only essential data:

```
GET /api/cars?fields=_id,make,model,year,price.listPrice,status
```

### 2. Pagination with Small Page Sizes

Reduce page size to get smaller result sets:

```
GET /api/cars?page=1&pageSize=5
```

### 3. Specific Filtering

Use multiple filters together to narrow results:

```
GET /api/cars?make=Toyota&minYear=2018&maxYear=2022&status=available
```

### 4. Avoid Image Data

Unless absolutely necessary, set `includeImages=false` (default) to prevent large base64 image data.

### 5. Two-Step Search Pattern

For the most efficient workflow:

1. First request: Get minimal list of matching car IDs
   ```
   GET /api/cars?fields=_id,make,model&make=Toyota
   ```
2. Second request: Get detailed data only for specific cars
   ```
   GET /api/cars/123?fields=make,model,year,specifications,price
   ```

### 6. Meta-Information Requests

For analytics or summaries, use aggregations when available:

```
GET /api/cars/stats?groupBy=make
```

## Image Categories

When requesting car images, you can filter by these categories:

- `exterior`: External shots of the car
- `interior`: Inside the cabin
- `engine`: Engine bay and mechanical components
- `damage`: Any damage or issues with the car
- `documents`: Documents related to the car
- `other`: Miscellaneous images

## Response Format

All successful responses return JSON in the following format:

```json
{
  "cars": [
    {
      "_id": "car-id",
      "make": "Toyota",
      "model": "Camry",
      "year": 2020
      // other fields based on your request parameters
    }
  ]
}
```

For single car requests, the response will be a direct car object without the "cars" wrapper.

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 200: Success
- 201: Resource created successfully
- 400: Bad request (invalid parameters)
- 401: Unauthorized (missing authentication)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Internal server error

## Code Example

```javascript
// Example: Fetching cars with authentication
async function fetchCars() {
  const response = await fetch(
    "https://motive-archive-manager.vercel.app/api/cars?fields=make,model,year,price",
    {
      method: "GET",
      headers: {
        Authorization: "Bearer your-token-here",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}
```
