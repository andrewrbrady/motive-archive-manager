import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET all studio inventory items
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Fetch all items from the database
    const items = await db.collection("studio_inventory").find({}).toArray();

    // Map items to ensure checkout fields are properly included
    const mappedItems = items.map((item) => {
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

      return item;
    });

    return NextResponse.json(mappedItems);
  } catch (error) {
    console.error("Error fetching studio inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new studio inventory item
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.category || !data.model) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Set timestamps
    const now = new Date();
    data.created_at = now;
    data.updated_at = now;

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
      quantity: data.quantity || 1,
      images: data.images || [],
      primary_image: data.primaryImage,

      // Financial fields
      purchase_price: data.purchasePrice,
      current_value: data.currentValue,
      rental_price: data.rentalPrice,
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

      // Timestamps
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    const result = await db
      .collection("studio_inventory")
      .insertOne(snakeCaseData);

    return NextResponse.json({
      id: result.insertedId,
      ...snakeCaseData,
    });
  } catch (error) {
    console.error("Error creating studio inventory item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
