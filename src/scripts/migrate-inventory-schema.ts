import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * Migration script to update the studio inventory schema
 *
 * This script adds new fields to existing inventory items
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/migrate-inventory-schema.ts
 */
async function migrateInventorySchema() {
  try {
    console.log("Starting inventory schema migration...");

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const collection = db.collection("studio_inventory");

    // Get all existing inventory items
    const items = await collection.find({}).toArray();
    console.log(`Found ${items.length} inventory items to migrate`);

    // Update each item with the new schema fields
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        // Prepare the update with default values for new fields
        const update = {
          $set: {
            // Only set fields that don't already exist
            sub_category: item.sub_category || null,

            // Financial fields
            purchase_price: item.purchase_price || null,
            current_value: item.current_value || null,
            depreciation_rate: item.depreciation_rate || null,
            insurance_value: item.insurance_value || null,

            // Maintenance fields
            maintenance_schedule: item.maintenance_schedule || null,
            maintenance_history: item.maintenance_history || [],
            warranty_expiration_date: item.warranty_expiration_date || null,
            service_provider: item.service_provider || null,
            service_contact_info: item.service_contact_info || null,

            // Usage tracking fields
            usage_counter: item.usage_counter || 0,
            usage_unit: item.usage_unit || null,
            checkout_history: item.checkout_history || [],
            last_checked_out_by: item.last_checked_out_by || null,
            expected_return_date: item.expected_return_date || null,
            usage_restrictions: item.usage_restrictions || null,

            // Technical specification fields
            technical_specs: item.technical_specs || {},
            power_requirements: item.power_requirements || null,
            dimensions: item.dimensions || null,
            compatible_accessories: item.compatible_accessories || [],
            software_version: item.software_version || null,

            // Documentation fields
            manual_url: item.manual_url || null,
            receipts: item.receipts || [],
            certifications: item.certifications || [],

            // Categorization fields
            tags: item.tags || [],
            custom_attributes: item.custom_attributes || {},

            // Location tracking fields
            storage_details: item.storage_details || null,
            qr_code: item.qr_code || null,
            rfid_tag: item.rfid_tag || null,

            // Update the updated_at timestamp
            updated_at: new Date(),
          },
        };

        // Update the item
        await collection.updateOne({ _id: item._id }, update);
        successCount++;

        if (successCount % 10 === 0 || successCount === items.length) {
          console.log(`Migrated ${successCount}/${items.length} items`);
        }
      } catch (error) {
        console.error(`Error migrating item ${item._id}:`, error);
        errorCount++;
      }
    }

    console.log("Migration completed!");
    console.log(`Successfully migrated: ${successCount} items`);
    console.log(`Failed to migrate: ${errorCount} items`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit();
  }
}

// Run the migration
migrateInventorySchema();
