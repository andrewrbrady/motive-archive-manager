# Event System Analysis and Recommendations

## Current Event System Overview

Your application uses a unified event system that supports both cars and projects. Here's how it currently works:

### Architecture

**Database Structure:**

- Events are stored in a single `events` collection
- Events can be associated with cars via `car_id` field
- Events can be associated with projects via `project_id` field
- Cars have an `eventIds` array storing references to event ObjectIds
- Projects have an `eventIds` array storing references to event ObjectIds

**Event Types:**

- `AUCTION_SUBMISSION`, `AUCTION_LISTING`, `AUCTION_END`
- `INSPECTION`, `DETAIL`, `PRODUCTION`, `POST_PRODUCTION`
- `MARKETING`, `PICKUP`, `DELIVERY`, `OTHER`

### Current Implementation

**Cars (`/cars/[id]` pages):**

- Events displayed in `EventsTab` component
- API endpoints: `/api/cars/[id]/events` and `/api/cars/[id]/events/[eventId]`
- Events can track: inspections, details, washes, sales, etc.

**Projects (`/projects/[id]` pages):**

- Events displayed in `ProjectEventsTab` component
- API endpoints: `/api/projects/[id]/events` and `/api/projects/[id]/events/[eventId]`
- Events can track: production milestones, marketing activities, etc.

## Issues Identified and Fixed

### 1. Orphaned Event References ✅ FIXED

**Problem:** When deleting events, the system only removed the event from the `events` collection but didn't clean up the `eventIds` references in cars or projects.

**Solution:** Updated DELETE endpoints to properly clean up references:

```typescript
// Cars: /api/cars/[id]/events/[eventId]/route.ts
await db
  .collection("cars")
  .updateOne(
    { _id: new ObjectId(carId) },
    { $pull: { eventIds: eventObjectId } as any }
  );

// Projects: /api/projects/[id]/events/[eventId]/route.ts
await db
  .collection("projects")
  .updateOne(
    { _id: new ObjectId(projectId) },
    { $pull: { eventIds: eventId } as any }
  );
```

### 2. Inconsistent Event Management ✅ ADDRESSED

**Problem:** Cars and projects used similar but slightly different approaches for event management.

**Current State:** Both systems now follow the same pattern:

- Events stored in unified `events` collection
- Parent entities maintain `eventIds` arrays
- Proper cleanup on deletion
- Similar API structure

### 3. Inconsistent Event Creation Forms ✅ FIXED

**Problem:** Cars and projects had completely different event creation forms:

- **Cars**: Simple form missing title field, wrong API field names
- **Projects**: Comprehensive form with proper structure and validation

**Issues Found:**

- Car form was missing required `title` field
- Car form was sending wrong field names (`scheduled_date` vs `start`, `assignees` vs `teamMemberIds`)
- Car form had inconsistent UI compared to projects
- Car form lacked visual hierarchy and sections

**Solution:** Updated the car EventsTab component to match project form:

- Added `title` field to NewEvent interface and form
- Corrected API field names to match backend expectations
- Implemented identical UI structure with sections:
  - **Basic Information**: Title, Description
  - **Schedule**: Start/End dates, All Day checkbox
  - **Type and Status**: Event type and status dropdowns
  - **Team**: Assignees selection
- Added proper styling, spacing, and visual hierarchy
- Implemented consistent dialog layout and button placement
- Fixed users API response handling to prevent `data.filter is not a function` error

**Result:** Both car and project event creation forms now have identical structure, styling, and functionality.

### 4. TypeError in EventsTab ✅ FIXED

**Problem:** `TypeError: data.filter is not a function` when loading users in car EventsTab.

**Root Cause:** The `/api/users` endpoint returns different response formats, sometimes an object with `users` property instead of a direct array.

**Solution:** Added proper response handling:

```typescript
// Handle different response formats from the users API
const usersArray = Array.isArray(data) ? data : data.users || [];
setUsers(usersArray.filter((user: User) => user.status === "active"));
```

### 5. Enhanced Date/Time Selection ✅ NEW

**Problem:** Both car and project event forms used native `datetime-local` inputs which don't have visible calendar icons to click on.

**Solution:** Created a new `DateTimePicker` component that provides:

- **Clickable calendar icon** - Users can click the calendar icon to open date picker
- **Visual calendar interface** - Full calendar view for date selection
- **Integrated time picker** - Time selection within the same component
- **All-day event support** - Automatically hides time picker for all-day events
- **Consistent styling** - Matches the rest of the UI design

**Implementation:**

```typescript
// New DateTimePicker component
<DateTimePicker
  value={formData.start}
  onChange={(value) => setFormData({ ...formData, start: value })}
  placeholder="Select start date and time"
  isAllDay={formData.isAllDay}
/>
```

**Result:** Both car and project forms now have user-friendly date/time selection with clickable calendar icons.

### 6. Calendar Day Header Alignment ✅ FIXED

**Problem:** In the DateTimePicker component, the day names (Su, Mo, Tu, We, Th, Fr, Sa) were misaligned with the calendar dates below them.

**Root Cause:** The Calendar UI component had conflicting CSS classes in the `head_cell` definition:

- `flex-1` (flexible width) conflicted with `w-9` (fixed 36px width)
- `m-auto` was causing additional spacing issues

**Solution:** Updated the Calendar component's `head_cell` class and added CSS overrides:

```typescript
// Calendar component fix
head_cell: "text-muted-foreground flex-1 font-normal text-[0.8rem] text-center h-9 flex items-center justify-center"

// Additional CSS overrides in globals.css
.rdp-weekday {
  width: 36px !important;
  height: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  font-size: 0.8rem !important;
  font-weight: normal !important;
  color: hsl(var(--muted-foreground)) !important;
}
```

**Changes Made:**

- Removed `w-9` (fixed width) to allow `flex-1` to work properly
- Removed `m-auto` to eliminate spacing conflicts
- Added `h-9` for consistent height with calendar cells
- Added `flex items-center justify-center` for proper centering

**Result:** Day headers now align perfectly with the calendar grid in both car and project event creation forms.

### 7. Dynamic Event Type Management System ✅ NEW

**Implementation:** Created a comprehensive event type management system similar to the copywriter template portal's adjustable lengths and platforms.

**Components Created:**

1. **Event Type Settings Interface** (`src/types/eventType.ts`):

   ```typescript
   interface EventTypeSetting {
     key: string;
     name: string;
     description: string;
     icon: string; // Lucide icon name
     color: string; // CSS color class
     marketingRelevant: boolean;
     category: "auction" | "service" | "logistics" | "production" | "other";
   }
   ```

2. **API Endpoint** (`src/app/api/event-type-settings/route.ts`):

   - GET: Fetch current event type settings
   - POST: Save updated event type settings
   - Fallback to default settings if none exist

3. **Admin Management Component** (`src/app/admin/EventTypeSettingsContent.tsx`):

   - Add/edit/delete custom event types
   - Configure icons, colors, and marketing relevance
   - Organize by categories (auction, service, logistics, production, other)
   - Prevent deletion of core event types

4. **Custom Hook** (`src/hooks/useEventTypeSettings.ts`):

   - Fetch and cache event type settings
   - Utility functions for filtering and categorization
   - Error handling with fallback to defaults

5. **Dynamic Selector Component** (`src/components/events/EventTypeSelector.tsx`):
   - Grouped by categories with visual separators
   - Shows icons, descriptions, and marketing badges
   - Supports filtering by category or marketing relevance
   - Loading and error states

**Integration:**

- Updated both car and project event creation forms to use `EventTypeSelector`
- Replaced hardcoded `EventType` enum with dynamic settings
- Maintains backward compatibility with existing events

**Features:**

- **Visual Organization**: Event types grouped by categories with color coding
- **Marketing Relevance**: Flag event types for inclusion in marketing materials
- **Custom Icons**: Choose from 30+ Lucide icons for each event type
- **Flexible Categories**: Organize events by auction, service, logistics, production, or other
- **Admin Control**: Full CRUD operations for event types via admin panel
- **Fallback Safety**: Defaults to core event types if settings fail to load

**Benefits:**

- **Customizable**: Users can add custom event types for specific workflows
- **Marketing-Aware**: Clear distinction between operational and marketing-relevant events
- **Consistent UI**: Same visual treatment across car and project event creation
- **Scalable**: Easy to add new categories and event types as business grows

**Usage Example:**

```typescript
// In event creation forms
<EventTypeSelector
  value={eventType}
  onValueChange={setEventType}
  filterMarketingRelevant={true} // Only show marketing-relevant types
  showMarketingBadge={true}
/>

// Filter events for marketing
const marketingEvents = useEventTypeSettings().getMarketingRelevantEventTypes();
```

## Event Usage Scenarios

Based on your requirements, here's how events should be used:

### Car Events

**Include in Marketing:**

- Sale price and final sale details
- Major services/restorations performed
- Auction results and achievements

**Exclude from Marketing:**

- Routine maintenance (washes, basic detailing)
- Internal logistics (pickup, delivery)
- Administrative tasks

### Project Events

**For Copywriting:**

- Production milestones
- Marketing campaign launches
- Client deliverables completed
- Key project achievements

**Event Filtering for Marketing:**

```typescript
// Example: Filter events suitable for marketing
const marketingRelevantEvents = events.filter((event) =>
  [
    "AUCTION_SUBMISSION",
    "AUCTION_LISTING",
    "AUCTION_END",
    "MARKETING",
  ].includes(event.type)
);

const serviceEvents = events.filter((event) =>
  ["DETAIL", "INSPECTION", "PRODUCTION"].includes(event.type)
);
```

## Recommendations for Improvement

### 1. Event Categories for Marketing

Add a `marketingRelevant` boolean field to events:

```typescript
interface Event {
  // ... existing fields
  marketingRelevant?: boolean; // Whether this event should be included in marketing materials
  marketingDescription?: string; // Marketing-friendly description
}
```

### 2. Event Templates

Create predefined event templates for common scenarios:

```typescript
// Car event templates
const carEventTemplates = {
  sale: { type: "AUCTION_END", marketingRelevant: true },
  detail: { type: "DETAIL", marketingRelevant: false },
  inspection: { type: "INSPECTION", marketingRelevant: false },
  restoration: { type: "PRODUCTION", marketingRelevant: true },
};

// Project event templates
const projectEventTemplates = {
  photoshoot: { type: "PRODUCTION", marketingRelevant: true },
  delivery: { type: "DELIVERY", marketingRelevant: false },
  campaign_launch: { type: "MARKETING", marketingRelevant: true },
};
```

### 3. Enhanced Event Filtering

Add filtering capabilities to the event components:

```typescript
// In EventsTab and ProjectEventsTab
const [eventFilter, setEventFilter] = useState({
  showMarketingRelevant: false,
  eventTypes: [],
  dateRange: null,
});
```

### 4. Event Relationships

Consider linking car events to projects when a car is part of a project:

```typescript
interface Event {
  // ... existing fields
  relatedProjectId?: string; // Link car events to projects
  relatedCarId?: string; // Link project events to specific cars
}
```

### 5. Unified Event Creation Component

Create a shared event creation component to ensure consistency:

```typescript
// components/events/UnifiedEventDialog.tsx
interface UnifiedEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: Partial<Event>) => void;
  context: "car" | "project";
  contextId: string;
}
```

This would provide:

- Consistent UI/UX across cars and projects
- Shared validation logic
- Easier maintenance and updates
- Better user experience

## Implementation Status

✅ **Completed:**

- Fixed orphaned event references on deletion
- Standardized cleanup logic across car and project APIs
- Both systems use consistent event management patterns
- Fixed car event creation form (added title field, corrected API field names)
- Fixed TypeError in EventsTab users loading
- Improved error handling and validation
- **Enhanced date/time selection with clickable calendar icons**
- **Created unified DateTimePicker component for both car and project forms**
- **Fixed calendar day header alignment**
- **Implemented dynamic event type management system**
- **Created admin interface for managing event types**
- **Added marketing relevance flags and category organization**
- **Integrated EventTypeSelector into both car and project event creation forms**

🔄 **Recommended Next Steps:**

1. ~~Add `marketingRelevant` field to Event interface~~ ✅ **COMPLETED**
2. Implement event filtering in UI components based on marketing relevance
3. Create event templates for common scenarios
4. Add event relationship linking between cars and projects
5. ~~Create unified event creation component for consistency~~ ✅ **COMPLETED via EventTypeSelector**

## API Endpoints Summary

**Car Events:**

- `GET /api/cars/[id]/events` - List car events
- `POST /api/cars/[id]/events` - Create car event
- `PUT /api/cars/[id]/events/[eventId]` - Update car event
- `DELETE /api/cars/[id]/events/[eventId]` - Delete car event (with cleanup)

**Project Events:**

- `GET /api/projects/[id]/events` - List project events
- `POST /api/projects/[id]/events` - Create project event
- `PUT /api/projects/[id]/events/[eventId]` - Update project event
- `DELETE /api/projects/[id]/events/[eventId]` - Delete project event (with cleanup)

**Global Events:**

- `GET /api/events` - List all events with filtering

**Event Type Management:**

- `GET /api/event-type-settings` - Get current event type settings
- `POST /api/event-type-settings` - Save event type settings

The event system is now properly configured to prevent orphaned references and provides a solid foundation for your marketing and copywriting workflows.
