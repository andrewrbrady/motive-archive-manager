# Vehicle Models API and Frontend Implementation

## Overview

This document provides a comprehensive instruction set for implementing a new **Vehicle Models API** and corresponding frontend interface. The models system will allow management of generic vehicle models (e.g., "BMW 3 Series", "Toyota Camry") separate from specific car instances that come through the facility.

## Project Context

- **Current State**: We have a `cars` API that tracks specific car instances with detailed information
- **New Requirement**: Add a `models` API for managing generic vehicle model templates
- **Purpose**: Enable creation of more generic car content and better data organization

## Implementation Plan

### Phase 1: Backend API Development

#### 1.1 Database Schema Design

Create a new MongoDB collection `models` with the following structure:

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

#### 1.2 API Endpoints

**File Location**: `src/app/api/models/route.ts`

Implement the following endpoints following the existing `makes` API pattern:

```typescript
// GET /api/models - List all models with filtering
export async function GET(request: NextRequest) {
  // Query parameters:
  // - make: Filter by make
  // - year: Filter by year (within year_range)
  // - body_style: Filter by body style
  // - market_segment: Filter by market segment
  // - active: Filter by active status (default: true)
  // - page: Pagination
  // - limit: Results per page
  // - search: Text search across make, model, description
}

// POST /api/models - Create new model
export async function POST(request: NextRequest) {
  // Validate required fields: make, model
  // Set defaults: active: true, timestamps
}

// PUT /api/models - Update existing model
export async function PUT(request: NextRequest) {
  // Require _id in body
  // Update updated_at timestamp
}

// DELETE /api/models - Soft delete model
export async function DELETE(request: NextRequest) {
  // Soft delete by setting active: false
  // Require id query parameter
}
```

**File Location**: `src/app/api/models/[id]/route.ts`

```typescript
// GET /api/models/[id] - Get specific model by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Return single model with full details
}

// PUT /api/models/[id] - Update specific model
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Update model by ID
}

// DELETE /api/models/[id] - Delete specific model
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Soft delete by ID
}
```

#### 1.3 Type Definitions

**File Location**: `src/types/model.ts`

```typescript
import { ObjectId } from "mongodb";

export interface VehicleModel {
  _id: ObjectId;
  make: string;
  model: string;
  generation?: string;
  year_range?: {
    start: number;
    end?: number;
  };
  body_styles?: string[];
  engine_options?: Array<{
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
  transmission_options?: string[];
  drivetrain_options?: string[];
  market_segment?: string;
  description?: string;
  specifications?: {
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
  tags?: string[];
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Frontend-safe version (ObjectId as string)
export interface VehicleModelClient
  extends Omit<VehicleModel, "_id" | "created_at" | "updated_at"> {
  _id: string;
  created_at: Date;
  updated_at: Date;
}
```

#### 1.4 API Client Integration

**File Location**: `src/lib/fetchModels.ts`

```typescript
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { VehicleModelClient } from "@/types/model";

export async function fetchModels(): Promise<VehicleModelClient[]> {
  // Implementation similar to fetchMakes.ts
  // Convert ObjectIds to strings for frontend consumption
}

export async function fetchModelById(
  id: string
): Promise<VehicleModelClient | null> {
  // Fetch single model by ID
}

export async function fetchModelsByMake(
  make: string
): Promise<VehicleModelClient[]> {
  // Fetch models filtered by make
}
```

**Update**: `src/lib/api-client.ts`

Add models section to the APIClient class:

```typescript
models = {
  getAll: (params?: any) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.get(`/models${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => {
    return this.get(`/models/${id}`);
  },

  create: (data: any) => {
    return this.post("/models", data);
  },

  update: (id: string, data: any) => {
    return this.put(`/models/${id}`, data);
  },

  delete: (id: string) => {
    return this.delete(`/models/${id}`);
  },
};
```

### Phase 2: Frontend Implementation

#### 2.1 Main Models Page

**File Location**: `src/app/models/page.tsx`

```typescript
import React from "react";
import { fetchModels } from "@/lib/fetchModels";
import ModelsPageClient from "./ModelsPageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicle Models - Motive Archive",
  description: "Manage vehicle models and specifications",
};

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const models = await fetchModels();
  return <ModelsPageClient models={models} />;
}
```

#### 2.2 Client-Side Models Page

**File Location**: `src/app/models/ModelsPageClient.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { VehicleModelClient } from "@/types/model";
import { DataTable } from "@/components/ui/data-table";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NewModelDialog from "@/components/models/NewModelDialog";
import EditModelDialog from "@/components/models/EditModelDialog";
import { useAPI } from "@/hooks/useAPI";

interface ModelsPageClientProps {
  models: VehicleModelClient[];
}

export default function ModelsPageClient({
  models: initialModels,
}: ModelsPageClientProps) {
  // State management for models, filtering, dialogs
  // CRUD operations similar to MakesPageClient
  // Enhanced filtering by make, year range, body style, etc.
}
```

#### 2.3 Model Components

**File Location**: `src/components/models/NewModelDialog.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { VehicleModelClient } from "@/types/model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";

// Form for creating new vehicle models
// Include all fields from VehicleModel interface
// Proper validation and error handling
```

**File Location**: `src/components/models/EditModelDialog.tsx`

```typescript
// Similar to NewModelDialog but for editing existing models
// Pre-populate form with existing model data
```

**File Location**: `src/components/models/ModelCard.tsx`

```typescript
// Card component for displaying model information
// Similar to CarCard but for models
// Show key model information in a clean layout
```

#### 2.4 Model Details Page

**File Location**: `src/app/models/[id]/page.tsx`

```typescript
// Individual model detail page
// Show comprehensive model information
// Allow editing and management of model data
// Display related cars that use this model
```

### Phase 3: Integration with Existing Systems

#### 3.1 Car-Model Relationship

Add model reference to car schema:

```typescript
// Update src/types/car.ts
export interface Car {
  // ... existing fields
  modelId?: string; // Reference to VehicleModel
  modelInfo?: {
    // Populated model data
    _id: string;
    make: string;
    model: string;
    generation?: string;
    // ... other model fields
  };
}
```

#### 3.2 Enhanced Car Creation

Update car creation forms to optionally select from existing models:

```typescript
// Update src/components/cars/CarEntryForm.tsx
// Add model selection dropdown
// Auto-populate car fields when model is selected
// Allow override of model defaults
```

#### 3.3 Content Generation Integration

Update copywriting and content generation systems:

```typescript
// Update caption generation to use model templates
// Enhanced prompts with model-specific information
// Better content categorization by model type
```

### Phase 4: Testing and Validation

#### 4.1 API Testing

Create test scripts:

```bash
# File: scripts/test-models-api.js
# Test all CRUD operations
# Validate data integrity
# Test filtering and search functionality
```

#### 4.2 Frontend Testing

- Test all UI components
- Validate form submissions
- Test filtering and search
- Verify responsive design

#### 4.3 Integration Testing

- Test car-model relationships
- Verify content generation improvements
- Test data migration scenarios

### Phase 5: Documentation and Deployment

#### 5.1 API Documentation

**File Location**: `docs/api/models-api-documentation.md`

- Complete API reference
- Example requests and responses
- Error handling documentation
- Integration examples

#### 5.2 User Documentation

**File Location**: `docs/features/VEHICLE_MODELS_USER_GUIDE.md`

- How to create and manage models
- Best practices for model organization
- Integration with car management workflows

#### 5.3 Migration Guide

**File Location**: `docs/development/MODELS_MIGRATION_GUIDE.md`

- Steps for migrating existing data
- Backup procedures
- Rollback strategies

## Implementation Order

1. **Backend Foundation** (1-2 days)

   - Database schema design
   - Basic API endpoints
   - Type definitions

2. **API Development** (2-3 days)

   - Complete CRUD operations
   - Filtering and search
   - Error handling and validation

3. **Frontend Core** (2-3 days)

   - Main models page
   - Basic CRUD interface
   - Model creation/editing forms

4. **Enhanced Features** (2-3 days)

   - Advanced filtering
   - Model details page
   - Integration with existing systems

5. **Testing and Polish** (1-2 days)
   - Comprehensive testing
   - Bug fixes and optimizations
   - Documentation completion

## Success Criteria

- ✅ Full CRUD operations for vehicle models
- ✅ Clean, intuitive user interface
- ✅ Proper integration with existing car system
- ✅ Enhanced content generation capabilities
- ✅ Comprehensive documentation
- ✅ Proper error handling and validation
- ✅ Responsive design across devices

## Technical Considerations

### Performance

- Implement proper caching for frequently accessed models
- Use pagination for large model lists
- Optimize database queries with appropriate indexes

### Security

- Implement proper authentication for all endpoints
- Validate all input data
- Use proper error handling to avoid information leakage

### Scalability

- Design schema to handle thousands of models
- Implement efficient search and filtering
- Consider future expansion needs

### Maintainability

- Follow existing code patterns and conventions
- Provide comprehensive documentation
- Use TypeScript for type safety
- Implement proper logging and monitoring

## Next Steps

1. **Review and Approve**: Review this implementation plan with the team
2. **Environment Setup**: Ensure development environment is ready
3. **Database Planning**: Plan the models collection structure
4. **Begin Implementation**: Start with Phase 1 - Backend API Development

## File Location Summary

This instruction set is located at: `docs/features/VEHICLE_MODELS_API_IMPLEMENTATION.md`

To continue with the implementation:

1. Review this document thoroughly
2. Set up the development environment
3. Begin with Phase 1: Backend API Development
4. Follow the implementation order outlined above
5. Test each phase before moving to the next

The implementation should take approximately 8-12 days for a complete, production-ready solution.
