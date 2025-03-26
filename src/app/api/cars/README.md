# Cars API Documentation

This API provides access to car data with optimized querying capabilities to improve performance and reduce data transfer.

## Efficiency Improvements

The Cars API has been optimized to:

1. Allow field selection to retrieve only the necessary data
2. Support selective image retrieval by category
3. Minimize data transfer for listing pages

## API Endpoints

### GET /api/cars

Get a list of cars with filtering, sorting, and pagination.

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

#### Example Requests

Get a list of cars with only basic info:

```
GET /api/cars?fields=make,model,year,price,status
```

Get a list of cars with only exterior images:

```
GET /api/cars?includeImages=true&imageCategory=exterior
```

### GET /api/cars/[id]

Get a specific car by ID with options for field selection.

#### Query Parameters

| Parameter     | Type    | Description                                |
| ------------- | ------- | ------------------------------------------ |
| fields        | string  | Comma-separated list of fields to include  |
| includeImages | boolean | Whether to include images (default: false) |
| imageCategory | string  | Only include images from this category     |

#### Example Requests

Get a car with only basic info:

```
GET /api/cars/123?fields=make,model,year,price,status
```

Get a car with only interior images:

```
GET /api/cars/123?includeImages=true&imageCategory=interior
```

## Image Categories

Images are now organized into the following categories:

- `exterior`: External shots of the car
- `interior`: Inside the cabin
- `engine`: Engine bay and mechanical components
- `damage`: Any damage or issues with the car
- `documents`: Documents related to the car
- `other`: Miscellaneous images

## Migration

A migration script is provided to move existing image data to the new categorized structure:

```
npm run migrate-car-images
```

This script will:

1. Process all cars in the database
2. Categorize existing images based on their metadata and filenames
3. Organize them into the new structure while maintaining backward compatibility
