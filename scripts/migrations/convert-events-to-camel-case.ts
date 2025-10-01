#!/usr/bin/env tsx

import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../src/lib/mongodb";

interface EventDocument {
  _id: ObjectId;
  car_id?: string | null;
  carId?: string | null;
  project_id?: string | null;
  projectId?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  created_at?: Date | string | null;
  createdAt?: Date | string | null;
  updated_at?: Date | string | null;
  updatedAt?: Date | string | null;
  primary_image_id?: string | ObjectId | null;
  primaryImageId?: string | ObjectId | null;
  image_ids?: Array<string | ObjectId> | null;
  imageIds?: Array<string | ObjectId> | null;
  location_id?: string | ObjectId | null;
  locationId?: string | ObjectId | null;
  is_all_day?: boolean | null;
  isAllDay?: boolean | null;
  id?: string;
  start?: Date | string | null;
  end?: Date | string | null;
  teamMemberIds?: Array<string | ObjectId> | null;
  status?: string;
  [key: string]: any;
}

const FIELD_MAPPINGS: Array<{
  snake: keyof EventDocument;
  camel: keyof EventDocument;
  transform?: (value: any) => any;
}> = [
  { snake: "car_id", camel: "carId" },
  { snake: "project_id", camel: "projectId" },
  { snake: "created_by", camel: "createdBy" },
  {
    snake: "created_at",
    camel: "createdAt",
    transform: (value: Date | string | undefined | null) => normalizeDate(value),
  },
  {
    snake: "updated_at",
    camel: "updatedAt",
    transform: (value: Date | string | undefined | null) => normalizeDate(value),
  },
  {
    snake: "primary_image_id",
    camel: "primaryImageId",
    transform: (value: string | ObjectId | undefined | null) => normalizeObjectId(value),
  },
  {
    snake: "image_ids",
    camel: "imageIds",
    transform: (values: Array<string | ObjectId> | undefined | null) =>
      Array.isArray(values) && values.length > 0
        ? values
            .map((value) => normalizeObjectId(value))
            .filter((value): value is ObjectId => Boolean(value))
        : undefined,
  },
  {
    snake: "location_id",
    camel: "locationId",
    transform: (value: string | ObjectId | undefined | null) => normalizeObjectId(value),
  },
  {
    snake: "is_all_day",
    camel: "isAllDay",
  },
  {
    snake: "team_member_ids",
    camel: "teamMemberIds",
    transform: (values: Array<string | ObjectId> | undefined | null) =>
      normalizeTeamMemberIds(values) ?? [],
  },
];

function normalizeDate(input: Date | string | undefined | null) {
  if (!input) return undefined;
  if (input instanceof Date) return input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function normalizeObjectId(input: string | ObjectId | undefined | null) {
  if (!input) return undefined;
  if (input instanceof ObjectId) return input;
  return ObjectId.isValid(input) ? new ObjectId(input) : undefined;
}

function normalizeTeamMemberIds(values: Array<string | ObjectId> | undefined | null) {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  return values.map((value) =>
    value instanceof ObjectId ? value.toString() : String(value)
  );
}

function normalizeTemporalField(value: Date | string | undefined | null) {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed;
}

async function convertEventsToCamelCase({ dryRun = false } = {}) {
  const db = await getDatabase();
  const collection = db.collection<EventDocument>("events");

  const query = {
    $or: FIELD_MAPPINGS.map(({ snake }) => ({ [snake as string]: { $exists: true } })),
  };

  const cursor = collection.find(query);

  let processed = 0;
  let updated = 0;

  for await (const doc of cursor) {
    processed += 1;

    const setUpdates: Record<string, unknown> = {};
    const unsetUpdates: Record<string, ""> = {};

    FIELD_MAPPINGS.forEach(({ snake, camel, transform }) => {
      const value = doc[snake];
      if (value === undefined) return;

      const transformed = transform ? transform(value) : value;
      if (transformed !== undefined) {
        setUpdates[camel as string] = transformed;
      }
      unsetUpdates[snake as string] = "";
    });

    if (doc.teamMemberIds) {
      const normalized = normalizeTeamMemberIds(doc.teamMemberIds);
      if (normalized) {
        setUpdates.teamMemberIds = normalized;
      }
    }

    if (doc.start !== undefined) {
      const normalizedStart = normalizeTemporalField(doc.start);
      if (normalizedStart !== undefined) {
        setUpdates.start = normalizedStart;
      }
    }

    if (doc.end !== undefined) {
      if (doc.end === null) {
        setUpdates.end = null;
      } else {
        const normalizedEnd = normalizeTemporalField(doc.end);
        if (normalizedEnd !== undefined) {
          setUpdates.end = normalizedEnd;
        }
      }
    }

    if (Object.keys(setUpdates).length === 0 && Object.keys(unsetUpdates).length === 0) {
      continue;
    }

    if (dryRun) {
      console.log(
        `Dry run: would update event ${doc._id.toHexString()}`,
        {
          set: setUpdates,
          unset: unsetUpdates,
        }
      );
    } else {
      await collection.updateOne(
        { _id: doc._id },
        {
          ...(Object.keys(setUpdates).length > 0 ? { $set: setUpdates } : {}),
          ...(Object.keys(unsetUpdates).length > 0 ? { $unset: unsetUpdates } : {}),
        }
      );
    }

    updated += 1;
  }

  console.log(`Processed ${processed} events.`);
  if (dryRun) {
    console.log(`(Dry run) ${updated} events would be updated to camelCase.`);
  } else {
    console.log(`Updated ${updated} events to camelCase.`);
  }

  await cursor.close();
}

const dryRun = process.argv.includes("--dry-run");

convertEventsToCamelCase({ dryRun })
  .then(() => {
    console.log(dryRun ? "✅ Dry run complete" : "✅ Conversion complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Conversion failed", error);
    process.exit(1);
  });
