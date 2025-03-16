import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { StudioInventoryItem } from "@/types/inventory";

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Missing items array or empty array." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const collection = db.collection("studio_inventory");

    // Convert items to database format
    const dbItems = items.map((item) => {
      // Add timestamps
      const now = new Date();

      return {
        // Basic information
        name: item.name,
        category: item.category,
        sub_category: item.subCategory,
        manufacturer: item.manufacturer || "",
        model: item.model,
        serial_number: item.serialNumber,

        // Original fields
        purchase_date: item.purchaseDate,
        last_maintenance_date: item.lastMaintenanceDate,
        condition: item.condition,
        notes: item.notes,
        location: item.location,
        is_available: item.isAvailable,
        quantity: item.quantity || 1,
        current_kit_id: item.currentKitId,
        images: item.images || [],
        primary_image: item.primaryImage,

        // Financial fields
        purchase_price: item.purchasePrice,
        current_value: item.currentValue,
        rental_price: item.rentalPrice,
        depreciation_rate: item.depreciationRate,
        insurance_value: item.insuranceValue,

        // Maintenance fields
        maintenance_schedule: item.maintenanceSchedule,
        maintenance_history: item.maintenanceHistory,
        warranty_expiration_date: item.warrantyExpirationDate,
        service_provider: item.serviceProvider,
        service_contact_info: item.serviceContactInfo,

        // Usage tracking fields
        usage_counter: item.usageCounter,
        usage_unit: item.usageUnit,
        checkout_history: item.checkoutHistory,
        last_checked_out_by: item.lastCheckedOutBy,
        expected_return_date: item.expectedReturnDate,
        usage_restrictions: item.usageRestrictions,

        // Technical specification fields
        technical_specs: item.technicalSpecs,
        power_requirements: item.powerRequirements,
        dimensions: item.dimensions,
        compatible_accessories: item.compatibleAccessories,
        software_version: item.softwareVersion,

        // Documentation fields
        manual_url: item.manualUrl,
        receipts: item.receipts,
        certifications: item.certifications,

        // Categorization fields
        tags: item.tags || [],
        custom_attributes: item.customAttributes,

        // Checkout fields
        checked_out_to: item.checkedOutTo,
        checkout_date: item.checkoutDate,

        // Timestamps
        created_at: now,
        updated_at: now,
      };
    });

    // Insert all items
    const result = await collection.insertMany(dbItems);

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      message: `Successfully imported ${result.insertedCount} inventory items`,
    });
  } catch (error) {
    console.error("Error importing inventory items:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import inventory items",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
