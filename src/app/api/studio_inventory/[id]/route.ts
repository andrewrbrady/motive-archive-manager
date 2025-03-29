import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET a single studio inventory item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");

    // Handle special cases
    if (params.id === "categories") {
      const categories = await db
        .collection("studio_inventory")
        .distinct("category");
      return NextResponse.json(categories);
    }

    // Continue with normal ID-based lookup for regular item requests
    try {
      const item = await db.collection("studio_inventory").findOne({
        _id: new ObjectId(params.id),
      });

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      // Ensure is_available is correctly set based on checked_out_to
      if (item.checked_out_to) {
        item.is_available = false;
      }

      // Ensure checkout_date and expected_return_date are properly formatted
      if (item.checkout_date) {
        item.checkout_date = new Date(item.checkout_date);
      }

      if (item.expected_return_date) {
        item.expected_return_date = new Date(item.expected_return_date);
      }

      return NextResponse.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ObjectId")) {
        return NextResponse.json(
          { error: "Invalid ID format" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT/UPDATE a studio inventory item
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");
    const data = await request.json();

    // Convert dates from string to Date objects
    if (data.purchaseDate) {
      data.purchaseDate = new Date(data.purchaseDate);
    }
    if (data.lastMaintenanceDate) {
      data.lastMaintenanceDate = new Date(data.lastMaintenanceDate);
    }
    if (data.warrantyExpirationDate) {
      data.warrantyExpirationDate = new Date(data.warrantyExpirationDate);
    }
    if (data.expectedReturnDate) {
      data.expectedReturnDate = new Date(data.expectedReturnDate);
    }
    if (data.maintenanceSchedule?.nextDate) {
      data.maintenanceSchedule.nextDate = new Date(
        data.maintenanceSchedule.nextDate
      );
    }

    // Process arrays of objects with dates
    if (data.maintenanceHistory && Array.isArray(data.maintenanceHistory)) {
      data.maintenanceHistory = data.maintenanceHistory.map((record: any) => ({
        ...record,
        date: record.date ? new Date(record.date) : undefined,
      }));
    }

    if (data.checkoutHistory && Array.isArray(data.checkoutHistory)) {
      data.checkoutHistory = data.checkoutHistory.map((record: any) => ({
        ...record,
        checkedOutDate: record.checkedOutDate
          ? new Date(record.checkedOutDate)
          : undefined,
        expectedReturnDate: record.expectedReturnDate
          ? new Date(record.expectedReturnDate)
          : undefined,
        actualReturnDate: record.actualReturnDate
          ? new Date(record.actualReturnDate)
          : undefined,
      }));
    }

    if (data.receipts && Array.isArray(data.receipts)) {
      data.receipts = data.receipts.map((receipt: any) => ({
        ...receipt,
        date: receipt.date ? new Date(receipt.date) : undefined,
      }));
    }

    // Update timestamp
    data.updated_at = new Date();

    // Convert camelCase to snake_case
    const snakeCaseData = {
      // Basic information
      name: data.name,
      category: data.category,
      sub_category: data.subCategory,
      manufacturer: data.manufacturer,
      model: data.model,
      serial_number: data.serialNumber,

      // Original fields
      purchase_date: data.purchaseDate,
      last_maintenance_date: data.lastMaintenanceDate,
      condition: data.condition,
      notes: data.notes,
      location: data.location,
      container_id: data.containerId,
      is_available: data.isAvailable,
      current_kit_id: data.currentKitId,
      images: data.images || [],
      primary_image: data.primaryImage,

      // Financial fields
      purchase_price: data.purchasePrice,
      current_value: data.currentValue,
      depreciation_rate: data.depreciationRate,
      insurance_value: data.insuranceValue,

      // Maintenance fields
      maintenance_schedule: data.maintenanceSchedule,
      maintenance_history: data.maintenanceHistory,
      warranty_expiration_date: data.warrantyExpirationDate,
      service_provider: data.serviceProvider,
      service_contact_info: data.serviceContactInfo,

      // Usage tracking fields
      usage_counter: data.usageCounter,
      usage_unit: data.usageUnit,
      checkout_history: data.checkoutHistory,
      last_checked_out_by: data.lastCheckedOutBy,
      expected_return_date: data.expectedReturnDate,
      usage_restrictions: data.usageRestrictions,

      // Technical specification fields
      technical_specs: data.technicalSpecs,
      power_requirements: data.powerRequirements,
      dimensions: data.dimensions,
      compatible_accessories: data.compatibleAccessories,
      software_version: data.softwareVersion,

      // Documentation fields
      manual_url: data.manualUrl,
      receipts: data.receipts,
      certifications: data.certifications,

      // Categorization fields
      tags: data.tags,
      custom_attributes: data.customAttributes,

      // Location tracking fields
      storage_details: data.storageDetails,
      qr_code: data.qrCode,
      rfid_tag: data.rfidTag,

      // Timestamp
      updated_at: data.updated_at,
    };

    const result = await db
      .collection("studio_inventory")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: snakeCaseData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: params.id,
      ...snakeCaseData,
    });
  } catch (error) {
    console.error("Error updating studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE a studio inventory item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");

    const result = await db.collection("studio_inventory").deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ id: params.id });
  } catch (error) {
    console.error("Error deleting studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
