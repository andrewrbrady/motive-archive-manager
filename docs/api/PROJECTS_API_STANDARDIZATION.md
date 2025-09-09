# Projects API Standardization and Handoff

This document defines the canonical Projects schema, the standardized API surface, required code fixes, and a migration plan to sanitize existing data. It is intended as the handoff for building the Python API.

## Canonical Project Schema (API)

- `_id`: string
- `title`: string
- `description`: string
- `type`: "documentation" | "media_campaign" | "event_coverage" | "custom"
- `status`: "draft" | "active" | "in_review" | "completed" | "archived"
- `clientId`: string (optional)
- `carIds`: string[]
- `modelIds`: string[]
- `galleryIds`: string[]
- `deliverableIds`: string[]
- `eventIds`: string[]
- `members`: [{ userId: string, role: "owner"|"manager"|"photographer"|"editor"|"writer"|"viewer", permissions: string[], joinedAt: ISO string, hourlyRate?: number, hoursLogged?: number }]
- `ownerId`: string (Firebase UID)
- `timeline`: { startDate: ISO string, endDate?: ISO string, estimatedDuration?: number, milestones: [{ id: string, title: string, description?: string, dueDate: ISO string, completed: boolean, completedAt?: ISO string, dependencies?: string[], assignedTo?: string[] }] }
- `budget`: { total: number, spent: number, remaining: number, currency: "USD"|"EUR"|"GBP"|"CAD", expenses: [{ id: string, description: string, amount: number, category: string, date: ISO string, receipt?: string, approvedBy?: string }] } (optional)
- `assets`: [{ id: string, type: "gallery"|"image"|"deliverable"|"document", referenceId: string, name: string, url?: string, addedAt: ISO string, addedBy: string }]
- `deliverables`: Project-scoped embed (rare; not primary path)
- `progress`: { percentage: number, completedTasks: number, totalTasks: number, lastUpdated: ISO string }
- `tags`: string[]
- `notes`: string (optional)
- `primaryImageId`: string (optional)
- `primaryImageUrl`: string (optional; derived)
- `templateId`: string (optional)
- `createdAt`: ISO string; `updatedAt`: ISO string; `completedAt`/`archivedAt`: ISO string (optional)

DB storage rule: all relationship ids are stored as ObjectId; API responses serialize all ids to strings. See `src/utils/objectId.ts`.

## Endpoints and Behavior (current Next.js backend)

- List projects: `GET /api/projects?search&status&type&clientId&ownerId&includeImages=true|false&sort=createdAt_desc&page&limit`
  - When `includeImages=true`, response includes `primaryImageUrl` (Cloudflare URL normalized to `/public`).
- Create: `POST /api/projects` (requires: title, description, type, timeline.startDate; optional `templateId`, `carIds`, `modelIds`, `budget`, `members`, `tags`)
  - If `templateId` provided, milestones are generated from template.
- Get/Update/Delete: `GET|PUT|DELETE /api/projects/{id}` (owner or member; owner-only delete). PUT validates and converts ids to ObjectId.
- Cars: `GET|POST|DELETE /api/projects/{id}/cars` (ids stored as ObjectId)
- Models: `GET|POST|DELETE /api/projects/{id}/models` (ids stored as ObjectId)
- Images: `GET|POST|DELETE /api/projects/{id}/images` (images collection stores `projectId`; `project.imageIds` is auxiliary)
- Deliverables: `GET|POST|DELETE /api/projects/{id}/deliverables` (now standardized to store ObjectId in `deliverableIds`)
- Captions: `GET|POST|PATCH|DELETE /api/projects/{id}/captions`
- Events: `GET|POST /api/projects/{id}/events` (also supports attached events via `project_events`)
- Preload: `GET /api/projects/{id}/preload?tabs=events,cars,captions,timeline&limit`

Auth: Firebase Bearer token. Read access for owner/members; write access requires role permissions (owner/manager have elevated permissions).

## Fixes Applied

1) Unify `ProjectType` across model/template and UI
- Updated enums to `documentation | media_campaign | event_coverage | custom` in:
  - `src/models/Project.ts`
  - `src/models/ProjectTemplate.ts`

2) Standardize `deliverableIds` as ObjectId in DB
- Adjusted linking/unlinking logic and GET in:
  - `src/app/api/projects/[id]/deliverables/route.ts`
  - Link/POST now pushes ObjectId; duplicate check handles string/ObjectId; DELETE matches by id as string.
  - GET now handles both string/ObjectId arrays safely.

No other functional behavior changed.

## Data Migration Script

Script: `scripts/migrations/standardize-projects.cjs`

Actions:
- Map legacy type `bring_a_trailer` -> `documentation` (adjust if you need a different mapping).
- Convert relationship id arrays (`carIds`, `modelIds`, `galleryIds`, `deliverableIds`, `eventIds`) to ObjectId, dedupe, and drop invalid values.
- Normalize single-id fields (`clientId`, `templateId`, `primaryImageId`) to ObjectId.
- Ensure `tags` is an array if present.

Run (dry run first):
```
# Uses .env automatically; add --limit to sample
node scripts/migrations/standardize-projects.cjs --dry-run --limit 25
```

Apply changes:
```
node scripts/migrations/standardize-projects.cjs
```

## Python API Handoff Notes

- Use the canonical schema above and serialize all ids as strings.
- Accept string ids in request bodies and convert to ObjectId for DB writes.
- Match endpoint structure and auth expectations; reuse query parameters for list/filtering.
- When returning images for projects, normalize Cloudflare URLs to include `/public` variant when needed, mirroring current behavior.
- Treat embedded `project.deliverables` as legacy; prefer `deliverableIds` into the `deliverables` collection.

## Open Questions / Decisions

- If `bring_a_trailer` is required as a distinct type, add it back to the enum and UI; otherwise the migration maps it to `documentation`.
- `project.imageIds` exists in DB but is not modeled in Mongoose. Leave as auxiliary (preferred) or add to schema if you want to expose it in API.

## References

- Types: `src/types/project.ts`
- Model: `src/models/Project.ts`
- Template Model: `src/models/ProjectTemplate.ts`
- Id conversion: `src/utils/objectId.ts`
- Routes: `src/app/api/projects/**`
