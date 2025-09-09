#!/usr/bin/env node

/**
 * Projects Standardization & Data Sanitization
 *
 * - Unifies Project.type values to allowed enum:
 *   ["documentation", "media_campaign", "event_coverage", "custom"]
 *   Maps legacy "bring_a_trailer" -> "documentation" (adjust if needed).
 * - Normalizes relationship id arrays to ObjectId: carIds, modelIds, galleryIds,
 *   deliverableIds, eventIds, clientId, templateId, primaryImageId.
 * - Deduplicates arrays and removes null/invalid ids.
 * - Optional: Ensures tags is an array.
 *
 * Usage:
 *   node scripts/migrations/standardize-projects.cjs
 */

// Load environment from root .env if present
try { require("dotenv").config(); } catch (_) {}

const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "motive_archive";

if (!uri) {
  console.error("Missing MONGODB_URI in environment");
  process.exit(1);
}

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
  return null;
}

function normalizeIdArray(values) {
  const out = [];
  const seen = new Set();
  (values || []).forEach((v) => {
    const oid = toObjectId(v);
    if (!oid) return;
    const key = oid.toString();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(oid);
    }
  });
  return out;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const args = { dryRun: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "-n") args.dryRun = true;
    if (a === "--limit" && argv[i + 1]) {
      const n = parseInt(argv[i + 1], 10);
      if (!Number.isNaN(n) && n > 0) args.limit = n;
      i++;
    }
  }
  // Allow env override
  if (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true") args.dryRun = true;
  if (process.env.LIMIT && !args.limit) {
    const n = parseInt(process.env.LIMIT, 10);
    if (!Number.isNaN(n) && n > 0) args.limit = n;
  }
  return args;
}

async function run() {
  const { dryRun, limit } = parseArgs();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const projects = db.collection("projects");

  console.log(`🔧 Standardizing projects... ${dryRun ? "(dry-run)" : ""}`);

  // 1) Standardize type values
  const typeMap = {
    bring_a_trailer: "documentation",
  };

  const cursor = projects.find({});
  if (limit) cursor.limit(limit);
  let updated = 0;
  let scanned = 0;

  while (await cursor.hasNext()) {
    const p = await cursor.next();
    scanned++;

    const update = {};

    // Type mapping
    if (p.type && typeMap[p.type]) {
      update.type = typeMap[p.type];
    }

    // Relationship ids -> ObjectIds
    const carIds = normalizeIdArray(p.carIds);
    const modelIds = normalizeIdArray(p.modelIds);
    const galleryIds = normalizeIdArray(p.galleryIds);
    const deliverableIds = normalizeIdArray(p.deliverableIds);
    const eventIds = normalizeIdArray(p.eventIds);

    // Only set if changed
    if (JSON.stringify((p.carIds || []).map(String)) !== JSON.stringify(carIds.map(String))) {
      update.carIds = carIds;
    }
    if (JSON.stringify((p.modelIds || []).map(String)) !== JSON.stringify(modelIds.map(String))) {
      update.modelIds = modelIds;
    }
    if (JSON.stringify((p.galleryIds || []).map(String)) !== JSON.stringify(galleryIds.map(String))) {
      update.galleryIds = galleryIds;
    }
    if (JSON.stringify((p.deliverableIds || []).map(String)) !== JSON.stringify(deliverableIds.map(String))) {
      update.deliverableIds = deliverableIds;
    }
    if (JSON.stringify((p.eventIds || []).map(String)) !== JSON.stringify(eventIds.map(String))) {
      update.eventIds = eventIds;
    }

    // Single ids
    const clientId = toObjectId(p.clientId);
    if ((p.clientId && !clientId) || (clientId && (!p.clientId || p.clientId.toString() !== clientId.toString()))) {
      update.clientId = clientId;
    }
    const templateId = toObjectId(p.templateId);
    if ((p.templateId && !templateId) || (templateId && (!p.templateId || p.templateId.toString() !== templateId.toString()))) {
      update.templateId = templateId;
    }
    const primaryImageId = toObjectId(p.primaryImageId);
    if (
      (p.primaryImageId && !primaryImageId) ||
      (primaryImageId && (!p.primaryImageId || p.primaryImageId.toString() !== primaryImageId.toString()))
    ) {
      update.primaryImageId = primaryImageId;
    }

    // Ensure tags is an array
    if (p.tags && !Array.isArray(p.tags)) {
      update.tags = [];
    }

    if (Object.keys(update).length > 0) {
      update.updatedAt = new Date();
      if (dryRun) {
        console.log(
          `• Would update ${p._id.toString()} -> set: ${Object.keys(update)
            .filter((k) => k !== "updatedAt")
            .join(", ")}`
        );
      } else {
        await projects.updateOne({ _id: p._id }, { $set: update });
      }
      updated++;
    }
  }

  console.log(`✅ Scanned: ${scanned}, ${dryRun ? "Would update" : "Updated"}: ${updated}`);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
