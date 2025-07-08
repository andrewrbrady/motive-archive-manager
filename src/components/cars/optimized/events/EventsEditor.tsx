"use client";

import { lazy, Suspense } from "react";
import { Event, EventType } from "@/types/event";
import { EventsSkeleton } from "./EventsSkeleton";

// Lazy load heavy editing components
const EventBatchTemplates = lazy(
  () => import("@/components/events/EventBatchTemplates")
);
const EventBatchManager = lazy(
  () => import("@/components/events/EventBatchManager")
);
const JsonUploadPasteModal = lazy(
  () => import("@/components/common/JsonUploadPasteModal")
);

// Lazy load the ListView for advanced editing
const ListView = lazy(() => import("@/components/events/ListView"));

interface EventsEditorProps {
  carId: string;
  events: Event[];
  isEditMode: boolean;
  showBatchManager: boolean;
  showBatchTemplates: boolean;
  showJsonUpload: boolean;
  isSubmittingJson: boolean;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onEventUpdated: () => void;
  onCloseBatchManager: () => void;
  onCloseBatchTemplates: () => void;
  onCloseJsonUpload: () => void;
  onJsonSubmit: (jsonData: any[]) => Promise<void>;
}

export function EventsEditor({
  carId,
  events,
  isEditMode,
  showBatchManager,
  showBatchTemplates,
  showJsonUpload,
  isSubmittingJson,
  onUpdateEvent,
  onDeleteEvent,
  onEventUpdated,
  onCloseBatchManager,
  onCloseBatchTemplates,
  onCloseJsonUpload,
  onJsonSubmit,
}: EventsEditorProps) {
  return (
    <div className="space-y-4">
      {/* Advanced ListView for editing */}
      <Suspense fallback={<EventsSkeleton variant="list" />}>
        <ListView
          events={events}
          onUpdateEvent={onUpdateEvent}
          onDeleteEvent={onDeleteEvent}
          onEventUpdated={onEventUpdated}
          isEditMode={isEditMode}
        />
      </Suspense>

      {/* Batch Manager Modal */}
      {showBatchManager && (
        <Suspense fallback={<div>Loading batch manager...</div>}>
          <EventBatchManager />
        </Suspense>
      )}

      {/* Batch Templates Modal */}
      {showBatchTemplates && (
        <Suspense fallback={<div>Loading templates...</div>}>
          <EventBatchTemplates carId={carId} onEventsCreated={onEventUpdated} />
        </Suspense>
      )}

      {/* JSON Upload Modal */}
      {showJsonUpload && (
        <Suspense fallback={<div>Loading JSON uploader...</div>}>
          <JsonUploadPasteModal
            isOpen={showJsonUpload}
            onClose={onCloseJsonUpload}
            onSubmit={onJsonSubmit}
            title="Batch Create Events from JSON"
            description="Upload a JSON file or paste JSON data to create multiple events at once. The JSON should be an array of event objects."
            expectedType="events"
            isSubmitting={isSubmittingJson}
          />
        </Suspense>
      )}
    </div>
  );
}

export default EventsEditor;
