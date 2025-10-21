import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Starting runtime MongoDB connection smoke test...\n");
  // Import after env is loaded to ensure MONGODB_URI is available
  const { getDatabase, getMongoClient } = await import("../src/lib/mongodb");
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "motive_archive");

  // Print pool-related options
  // @ts-ignore - options shape from driver
  const opts = (client as any).options || {};
  console.log("Client pool options:", {
    maxPoolSize: opts.maxPoolSize,
    minPoolSize: opts.minPoolSize,
    maxIdleTimeMS: opts.maxIdleTimeMS,
  });

  // Single ping
  const t0 = Date.now();
  await db.command({ ping: 1 });
  console.log(`Single ping latency: ${Date.now() - t0}ms`);

  // Parallel pings to exercise pool reuse
  const parallel = 20;
  const t1 = Date.now();
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      const innerDb = (await getDatabase());
      await innerDb.command({ ping: 1 });
    })
  );
  console.log(`${parallel} parallel pings latency: ${Date.now() - t1}ms`);

  // Try to fetch connectionStatus if permitted
  try {
    const cs = await db.command({ connectionStatus: 1 });
    console.log("connectionStatus summary:", {
      authenticatedUsers: cs.authInfo?.authenticatedUsers?.length,
      // Not all fields are available; just show that command works
    });
  } catch (err) {
    console.log("connectionStatus not permitted (expected on limited roles). Skipping.");
  }

  // A few quick collection operations to ensure read paths are fine
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  console.log(`Collections discovered: ${collections.length}`);

  // Close explicitly to keep test tidy
  await client.close();
  console.log("\nSmoke test complete.");
}

main().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exit(1);
});
