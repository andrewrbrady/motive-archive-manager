# Calendar Components

This directory contains reusable calendar components for the Motive Archive Manager application.

## Components

### BaseCalendar

`BaseCalendar` is a flexible, reusable calendar component that wraps the `react-big-calendar` library with additional features and styling consistent with our application design.

#### Props

The `BaseCalendar` component accepts the following props:

- `events`: Array of calendar events
- `onEventDrop`: Callback for when an event is dragged and dropped
- `onEventResize`: Callback for when an event is resized
- `onSelectEvent`: Callback for when an event is selected
- `onSelectSlot`: Callback for when a time slot is selected
- `eventPropGetter`: Function to get props for an event
- `dayPropGetter`: Function to get props for a day
- `components`: Custom components for the calendar
- `defaultView`: Default view for the calendar (month, week, day, agenda)
- `views`: Views to show in the calendar
- `formats`: Custom formats for the calendar
- `messages`: Custom messages for the calendar
- `toolbar`: Whether to show the toolbar
- `customToolbar`: Custom toolbar component
- `fullscreenButton`: Whether to show the fullscreen button
- `className`: Additional class name
- `style`: Additional style
- `min`: Minimum time to show
- `max`: Maximum time to show
- `step`: Step size in minutes
- `timeslots`: Number of timeslots per step
- `scrollToTime`: Time to scroll to
- `popup`: Whether to show a popup on event click
- `selectable`: Whether time slots are selectable
- `resizable`: Whether events are resizable
- `draggable`: Whether events are draggable
- `longPressThreshold`: Threshold for long press in milliseconds
- `dayLayoutAlgorithm`: Algorithm for laying out events in a day

### MotiveCalendar

`MotiveCalendar` is a specialized calendar component that builds on `BaseCalendar` to display events and deliverables with styling consistent with our application design. It includes filtering and visibility controls.

#### Props

The `MotiveCalendar` component accepts the following props:

- `carId`: ID of the car to show events for
- `events`: Array of events to display
- `deliverables`: Array of deliverables to display
- `onEventDrop`: Callback for when an event is dragged and dropped
- `onEventResize`: Callback for when an event is resized
- `onSelectEvent`: Callback for when an event is selected
- `className`: Additional class name
- `style`: Additional style
- `showFilterControls`: Whether to show filter controls
- `showVisibilityControls`: Whether to show visibility controls

## Usage

### Basic Usage

```tsx
import { BaseCalendar } from "@/components/calendar/BaseCalendar";

const events = [
  {
    id: "1",
    title: "Meeting",
    start: new Date(2023, 0, 1, 10, 0),
    end: new Date(2023, 0, 1, 11, 0),
  },
  {
    id: "2",
    title: "Lunch",
    start: new Date(2023, 0, 1, 12, 0),
    end: new Date(2023, 0, 1, 13, 0),
  },
];

export default function MyCalendar() {
  return <BaseCalendar events={events} />;
}
```

### Using MotiveCalendar

```tsx
import { MotiveCalendar } from "@/components/calendar/MotiveCalendar";
import { Event } from "@/types/event";
import { Deliverable } from "@/types/deliverable";

const events: Event[] = [...]; // Your events
const deliverables: Deliverable[] = [...]; // Your deliverables

export default function CarCalendar({ carId }: { carId: string }) {
  return (
    <MotiveCalendar
      carId={carId}
      events={events}
      deliverables={deliverables}
      onSelectEvent={(event) => {
        console.log("Selected event:", event);
      }}
    />
  );
}
```

## Styling

The calendar components use CSS variables defined in `globals.css` for consistent styling. See the [styling guide](../../../docs/STYLING.md) for more information on the available variables.

### Event Types

Events are styled based on their type using the `--event-*` CSS variables.

### Deliverable Types

Deliverables are styled based on their type using the `--deliverable-*` CSS variables.

### Status Colors

Status indicators use the `--status-*` CSS variables.

## Customization

Both components are highly customizable. You can provide custom components, event styling, and more through props.

### Custom Event Component

```tsx
import { BaseCalendar } from "@/components/calendar/BaseCalendar";

const events = [...]; // Your events

const components = {
  event: ({ event }) => (
    <div className="custom-event">
      <div className="event-title">{event.title}</div>
      <div className="event-time">{format(event.start, "h:mm a")}</div>
    </div>
  ),
};

export default function CustomCalendar() {
  return <BaseCalendar events={events} components={components} />;
}
```

## Accessibility

The calendar components are designed with accessibility in mind:

- All interactive elements are keyboard accessible
- Color contrast meets WCAG 2.1 AA standards
- Screen reader support through appropriate ARIA attributes
- Focus management for modal dialogs and popups
