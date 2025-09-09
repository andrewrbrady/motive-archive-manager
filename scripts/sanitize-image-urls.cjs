#!/usr/bin/env node
/*
  Sanitizes Cloudflare image URLs across collections by removing variant segments
  and storing only the base form:
  https://imagedelivery.net/<account>/<imageId>

  Usage:
    node scripts/sanitize-image-urls.cjs           # dry run (no writes)
    node scripts/sanitize-image-urls.cjs --apply   # perform updates
    node scripts/sanitize-image-urls.cjs --limit 500 --apply
*/

const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1], 10) : 0;

function toBaseCloudflareUrl(url) {
  if (!url || typeof url !== "string") return url;
  const clean = url.trim();
  if (!clean.includes("imagedelivery.net")) return clean;
  const m = clean.match(/^(https:\/\/imagedelivery\.net\/[^\/]+\/[^\/]+)/);
  return m ? m[1] : clean;
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const summary = [];

  async function sanitizeCollection({
    name,
    findQuery,
    projectFields,
    paths, // array of accessor functions to get/set fields to sanitize
  }) {
    const coll = db.collection(name);
    const cursor = coll.find(findQuery || {}, {
      projection: projectFields || undefined,
    });
    if (LIMIT) cursor.limit(LIMIT);

    let scanned = 0;
    let changed = 0;
    const bulk = coll.initializeUnorderedBulkOp();

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      scanned++;
      let mutated = false;

      for (const path of paths) {
        const { get, set } = path;
        const current = get(doc);
        if (current == null) continue;

        if (Array.isArray(current)) {
          const updatedArr = current.map((val) => toBaseCloudflareUrl(val));
          // shallow compare
          if (JSON.stringify(updatedArr) !== JSON.stringify(current)) {
            set(doc, updatedArr);
            mutated = true;
          }
        } else if (typeof current === "string") {
          const updated = toBaseCloudflareUrl(current);
          if (updated !== current) {
            set(doc, updated);
            mutated = true;
          }
        } else if (typeof current === "object") {
          // handle arrays of objects with url fields (e.g., assets)
          if (Array.isArray(current)) {
            // already handled
          } else {
            // walk shallow object keys for url
            let objChanged = false;
            for (const k of Object.keys(current)) {
              if (typeof current[k] === "string") {
                const updated = toBaseCloudflareUrl(current[k]);
                if (updated !== current[k]) {
                  current[k] = updated;
                  objChanged = true;
                }
              }
            }
            if (objChanged) {
              set(doc, current);
              mutated = true;
            }
          }
        }
      }

      if (mutated) {
        changed++;
        if (APPLY) {
          bulk.find({ _id: doc._id }).updateOne({ $set: doc });
        }
      }
    }

    if (APPLY && changed > 0) {
      await bulk.execute();
    }

    summary.push({ collection: name, scanned, changed });
  }

  // images collection: url
  await sanitizeCollection({
    name: "images",
    paths: [
      {
        get: (d) => d.url,
        set: (d, v) => (d.url = v),
      },
    ],
  });

  // deliverables collection: thumbnailUrl and thumbnail_url
  await sanitizeCollection({
    name: "deliverables",
    paths: [
      { get: (d) => d.thumbnailUrl, set: (d, v) => (d.thumbnailUrl = v) },
      { get: (d) => d.thumbnail_url, set: (d, v) => (d.thumbnail_url = v) },
    ],
  });

  // projects collection: assets[].url
  await sanitizeCollection({
    name: "projects",
    paths: [
      {
        get: (d) => d.assets,
        set: (d, v) => (d.assets = Array.isArray(v) ? v : d.assets),
      },
    ],
  });

  console.log("\nURL sanitization summary:");
  for (const s of summary) {
    console.log(
      ` - ${s.collection}: scanned ${s.scanned}, changed ${s.changed}`
    );
  }
  console.log(`\nMode: ${APPLY ? "APPLY (writes performed)" : "DRY-RUN"}`);

  await client.close();
}

run().catch((err) => {
  console.error("Sanitization failed:", err);
  process.exit(1);
});

