const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function analyzeAndFixObjectIdConsistency() {
  let client;

  try {
    console.log(
      "🔍 Starting comprehensive ObjectId consistency analysis and fix..."
    );
    console.log("🔗 Connecting to MongoDB...");

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("✅ Connected to MongoDB");

    // Collections
    const carsCollection = db.collection("cars");
    const projectsCollection = db.collection("projects");
    const imagesCollection = db.collection("images");
    const galleriesCollection = db.collection("galleries");

    const stats = {
      cars: {
        total: 0,
        withImageIds: 0,
        withStringIds: 0,
        fixed: 0,
        errors: 0,
      },
      projects: {
        total: 0,
        withImageIds: 0,
        withStringIds: 0,
        fixed: 0,
        errors: 0,
      },
      galleries: {
        total: 0,
        withImageIds: 0,
        withStringIds: 0,
        fixed: 0,
        errors: 0,
      },
      orphanedImageIds: {
        total: 0,
        removed: 0,
      },
    };

    // === PHASE 1: ANALYZE AND FIX CARS ===
    console.log("\n🚗 === PHASE 1: ANALYZING CARS ===");

    const cars = await carsCollection.find({}).toArray();
    stats.cars.total = cars.length;
    console.log(`📊 Found ${cars.length} cars total`);

    for (const car of cars) {
      if (
        car.imageIds &&
        Array.isArray(car.imageIds) &&
        car.imageIds.length > 0
      ) {
        stats.cars.withImageIds++;

        let hasStringIds = false;
        let hasObjectIds = false;
        const convertedIds = [];
        const validIds = [];

        console.log(
          `\n🚗 Processing car: ${car._id} (${car.year || "?"} ${car.make || "?"} ${car.model || "?"})`
        );
        console.log(`   📸 ImageIds count: ${car.imageIds.length}`);

        for (const id of car.imageIds) {
          if (typeof id === "string") {
            hasStringIds = true;
            if (ObjectId.isValid(id)) {
              // Check if image exists
              const imageExists = await imagesCollection.findOne({
                _id: new ObjectId(id),
              });
              if (imageExists) {
                convertedIds.push(new ObjectId(id));
                validIds.push(id);
                console.log(
                  `   ✅ Converting valid string "${id}" to ObjectId`
                );
              } else {
                console.log(
                  `   ❌ Orphaned string imageId "${id}" - image doesn't exist`
                );
                stats.orphanedImageIds.total++;
              }
            } else {
              console.log(`   ❌ Invalid ObjectId format "${id}"`);
              stats.orphanedImageIds.total++;
            }
          } else if (id instanceof ObjectId) {
            hasObjectIds = true;
            // Check if image exists
            const imageExists = await imagesCollection.findOne({ _id: id });
            if (imageExists) {
              convertedIds.push(id);
              validIds.push(id.toString());
              console.log(`   ✅ Valid ObjectId ${id}`);
            } else {
              console.log(
                `   ❌ Orphaned ObjectId "${id}" - image doesn't exist`
              );
              stats.orphanedImageIds.total++;
            }
          } else {
            console.log(`   ❌ Invalid imageId type: ${typeof id}`);
            stats.orphanedImageIds.total++;
          }
        }

        if (hasStringIds) {
          stats.cars.withStringIds++;
        }

        // Update if we had string IDs or orphaned references
        if (hasStringIds || convertedIds.length !== car.imageIds.length) {
          try {
            await carsCollection.updateOne(
              { _id: car._id },
              {
                $set: {
                  imageIds: convertedIds,
                  updatedAt: new Date().toISOString(),
                },
              }
            );
            stats.cars.fixed++;
            stats.orphanedImageIds.removed +=
              car.imageIds.length - convertedIds.length;
            console.log(
              `   🔧 Updated car ${car._id}: ${car.imageIds.length} → ${convertedIds.length} imageIds`
            );
          } catch (error) {
            console.error(
              `   ❌ Error updating car ${car._id}:`,
              error.message
            );
            stats.cars.errors++;
          }
        } else {
          console.log(`   ✅ Car ${car._id} already has correct ObjectIds`);
        }

        // Also fix processedImageIds if present
        if (
          car.processedImageIds &&
          Array.isArray(car.processedImageIds) &&
          car.processedImageIds.length > 0
        ) {
          const convertedProcessedIds = [];
          let hasProcessedStringIds = false;

          for (const id of car.processedImageIds) {
            if (typeof id === "string") {
              hasProcessedStringIds = true;
              if (ObjectId.isValid(id)) {
                const imageExists = await imagesCollection.findOne({
                  _id: new ObjectId(id),
                });
                if (imageExists) {
                  convertedProcessedIds.push(new ObjectId(id));
                }
              }
            } else if (id instanceof ObjectId) {
              const imageExists = await imagesCollection.findOne({ _id: id });
              if (imageExists) {
                convertedProcessedIds.push(id);
              }
            }
          }

          if (
            hasProcessedStringIds ||
            convertedProcessedIds.length !== car.processedImageIds.length
          ) {
            await carsCollection.updateOne(
              { _id: car._id },
              {
                $set: {
                  processedImageIds: convertedProcessedIds,
                  updatedAt: new Date().toISOString(),
                },
              }
            );
            console.log(
              `   🔧 Updated processedImageIds: ${car.processedImageIds.length} → ${convertedProcessedIds.length}`
            );
          }
        }
      }
    }

    // === PHASE 2: ANALYZE AND FIX PROJECTS ===
    console.log("\n📁 === PHASE 2: ANALYZING PROJECTS ===");

    const projects = await projectsCollection.find({}).toArray();
    stats.projects.total = projects.length;
    console.log(`📊 Found ${projects.length} projects total`);

    for (const project of projects) {
      if (
        project.imageIds &&
        Array.isArray(project.imageIds) &&
        project.imageIds.length > 0
      ) {
        stats.projects.withImageIds++;

        let hasStringIds = false;
        let hasObjectIds = false;
        const convertedIds = [];

        console.log(
          `\n📁 Processing project: ${project._id} (${project.name || "Unnamed"})`
        );
        console.log(`   📸 ImageIds count: ${project.imageIds.length}`);

        for (const id of project.imageIds) {
          if (typeof id === "string") {
            hasStringIds = true;
            if (ObjectId.isValid(id)) {
              // Check if image exists
              const imageExists = await imagesCollection.findOne({
                _id: new ObjectId(id),
              });
              if (imageExists) {
                convertedIds.push(new ObjectId(id));
                console.log(
                  `   ✅ Converting valid string "${id}" to ObjectId`
                );
              } else {
                console.log(
                  `   ❌ Orphaned string imageId "${id}" - image doesn't exist`
                );
                stats.orphanedImageIds.total++;
              }
            } else {
              console.log(`   ❌ Invalid ObjectId format "${id}"`);
              stats.orphanedImageIds.total++;
            }
          } else if (id instanceof ObjectId) {
            hasObjectIds = true;
            // Check if image exists
            const imageExists = await imagesCollection.findOne({ _id: id });
            if (imageExists) {
              convertedIds.push(id);
              console.log(`   ✅ Valid ObjectId ${id}`);
            } else {
              console.log(
                `   ❌ Orphaned ObjectId "${id}" - image doesn't exist`
              );
              stats.orphanedImageIds.total++;
            }
          } else {
            console.log(`   ❌ Invalid imageId type: ${typeof id}`);
            stats.orphanedImageIds.total++;
          }
        }

        if (hasStringIds) {
          stats.projects.withStringIds++;
        }

        // Update if we had string IDs or orphaned references
        if (hasStringIds || convertedIds.length !== project.imageIds.length) {
          try {
            await projectsCollection.updateOne(
              { _id: project._id },
              {
                $set: {
                  imageIds: convertedIds,
                  updatedAt: new Date().toISOString(),
                },
              }
            );
            stats.projects.fixed++;
            stats.orphanedImageIds.removed +=
              project.imageIds.length - convertedIds.length;
            console.log(
              `   🔧 Updated project ${project._id}: ${project.imageIds.length} → ${convertedIds.length} imageIds`
            );
          } catch (error) {
            console.error(
              `   ❌ Error updating project ${project._id}:`,
              error.message
            );
            stats.projects.errors++;
          }
        } else {
          console.log(
            `   ✅ Project ${project._id} already has correct ObjectIds`
          );
        }
      }
    }

    // === PHASE 3: ANALYZE AND FIX GALLERIES ===
    console.log("\n🖼️  === PHASE 3: ANALYZING GALLERIES ===");

    const galleries = await galleriesCollection.find({}).toArray();
    stats.galleries.total = galleries.length;
    console.log(`📊 Found ${galleries.length} galleries total`);

    for (const gallery of galleries) {
      if (
        gallery.imageIds &&
        Array.isArray(gallery.imageIds) &&
        gallery.imageIds.length > 0
      ) {
        stats.galleries.withImageIds++;

        let hasStringIds = false;
        let hasObjectIds = false;
        const convertedIds = [];

        console.log(
          `\n🖼️  Processing gallery: ${gallery._id} (${gallery.name || "Unnamed"})`
        );
        console.log(`   📸 ImageIds count: ${gallery.imageIds.length}`);

        for (const id of gallery.imageIds) {
          if (typeof id === "string") {
            hasStringIds = true;
            if (ObjectId.isValid(id)) {
              // Check if image exists
              const imageExists = await imagesCollection.findOne({
                _id: new ObjectId(id),
              });
              if (imageExists) {
                convertedIds.push(new ObjectId(id));
                console.log(
                  `   ✅ Converting valid string "${id}" to ObjectId`
                );
              } else {
                console.log(
                  `   ❌ Orphaned string imageId "${id}" - image doesn't exist`
                );
                stats.orphanedImageIds.total++;
              }
            } else {
              console.log(`   ❌ Invalid ObjectId format "${id}"`);
              stats.orphanedImageIds.total++;
            }
          } else if (id instanceof ObjectId) {
            hasObjectIds = true;
            // Check if image exists
            const imageExists = await imagesCollection.findOne({ _id: id });
            if (imageExists) {
              convertedIds.push(id);
              console.log(`   ✅ Valid ObjectId ${id}`);
            } else {
              console.log(
                `   ❌ Orphaned ObjectId "${id}" - image doesn't exist`
              );
              stats.orphanedImageIds.total++;
            }
          } else {
            console.log(`   ❌ Invalid imageId type: ${typeof id}`);
            stats.orphanedImageIds.total++;
          }
        }

        if (hasStringIds) {
          stats.galleries.withStringIds++;
        }

        // Update if we had string IDs or orphaned references
        if (hasStringIds || convertedIds.length !== gallery.imageIds.length) {
          try {
            const updateData = {
              imageIds: convertedIds,
              updatedAt: new Date().toISOString(),
            };

            // Also fix orderedImages if present
            if (gallery.orderedImages && Array.isArray(gallery.orderedImages)) {
              const fixedOrderedImages = gallery.orderedImages
                .filter((item) => {
                  const imageId =
                    typeof item.id === "string" ? item.id : item.id.toString();
                  return convertedIds.some((id) => id.toString() === imageId);
                })
                .map((item) => ({
                  id:
                    typeof item.id === "string"
                      ? new ObjectId(item.id)
                      : item.id,
                  order: item.order,
                }));
              updateData.orderedImages = fixedOrderedImages;
            }

            await galleriesCollection.updateOne(
              { _id: gallery._id },
              { $set: updateData }
            );
            stats.galleries.fixed++;
            stats.orphanedImageIds.removed +=
              gallery.imageIds.length - convertedIds.length;
            console.log(
              `   🔧 Updated gallery ${gallery._id}: ${gallery.imageIds.length} → ${convertedIds.length} imageIds`
            );
          } catch (error) {
            console.error(
              `   ❌ Error updating gallery ${gallery._id}:`,
              error.message
            );
            stats.galleries.errors++;
          }
        } else {
          console.log(
            `   ✅ Gallery ${gallery._id} already has correct ObjectIds`
          );
        }
      }
    }

    // === PHASE 4: SUMMARY ===
    console.log("\n📊 === FINAL SUMMARY ===");
    console.log(`
🚗 CARS:
   Total cars: ${stats.cars.total}
   Cars with imageIds: ${stats.cars.withImageIds}
   Cars with string IDs: ${stats.cars.withStringIds}
   Cars fixed: ${stats.cars.fixed}
   Errors: ${stats.cars.errors}

📁 PROJECTS:
   Total projects: ${stats.projects.total}
   Projects with imageIds: ${stats.projects.withImageIds}
   Projects with string IDs: ${stats.projects.withStringIds}
   Projects fixed: ${stats.projects.fixed}
   Errors: ${stats.projects.errors}

🖼️  GALLERIES:
   Total galleries: ${stats.galleries.total}
   Galleries with imageIds: ${stats.galleries.withImageIds}
   Galleries with string IDs: ${stats.galleries.withStringIds}
   Galleries fixed: ${stats.galleries.fixed}
   Errors: ${stats.galleries.errors}

🗑️  ORPHANED IMAGE IDS:
   Total orphaned: ${stats.orphanedImageIds.total}
   Removed: ${stats.orphanedImageIds.removed}
`);

    console.log("✅ ObjectId consistency fix completed!");
  } catch (error) {
    console.error("❌ Error during ObjectId consistency fix:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
}

// Run the script
if (require.main === module) {
  analyzeAndFixObjectIdConsistency();
}

module.exports = { analyzeAndFixObjectIdConsistency };
