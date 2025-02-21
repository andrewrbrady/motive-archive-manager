import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function addBatchTemplates() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  try {
    // Connect to MongoDB Atlas
    const client = await MongoClient.connect(uri);
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Templates to add
    const templates = [
      {
        _id: new ObjectId("67b4f7b35ed3ae7fdacb4539"),
        name: "Standard Car Package",
        templates: [
          {
            title: "Available Now",
            platform: "Marketing Email",
            type: "Text",
            duration: 15,
            aspect_ratio: "9:16",
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "White Room",
            platform: "Instagram Reels",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "White Room",
            platform: "YouTube Shorts",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "Mosaics",
            platform: "YouTube",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "BaT Gallery",
            platform: "Bring a Trailer",
            type: "Photo Gallery",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: null,
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "Features",
            platform: "Bring a Trailer",
            type: "Video",
            duration: 60,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 0,
            daysUntilRelease: 2,
          },
          {
            title: "Best Of",
            platform: "Instagram Post",
            type: "Photo Gallery",
            duration: 15,
            aspect_ratio: "9:16",
            daysUntilDeadline: 2,
            daysUntilRelease: 4,
          },
          {
            title: "Cold Start",
            platform: "Instagram Reels",
            type: "Video",
            duration: 60,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 4,
            daysUntilRelease: 6,
          },
          {
            title: "Cold Start",
            platform: "YouTube Shorts",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: 2,
            daysUntilDeadline: 4,
            daysUntilRelease: 6,
          },
          {
            title: "SOLD",
            platform: "Instagram Post",
            type: "Photo Gallery",
            duration: 15,
            aspect_ratio: "9:16",
            daysUntilDeadline: 8,
            daysUntilRelease: 10,
          },
          {
            title: "ONE DAY LEFT! Countodwn",
            platform: "Instagram Story",
            type: "other",
            duration: 15,
            aspect_ratio: "9:16",
            daysFromStart: 0,
            daysUntilDeadline: 6,
            daysUntilRelease: 7,
          },
        ],
      },
      {
        _id: new ObjectId("67b4f9695ed3ae7fdacb456b"),
        name: "Mouse Motors Car Package",
        templates: [
          {
            title: "White Room",
            platform: "Instagram Reels",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
          },
          {
            title: "White Room",
            platform: "YouTube Shorts",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
          },
          {
            title: "Mosaics",
            platform: "YouTube",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
          },
          {
            title: "BaT Gallery",
            platform: "Bring a Trailer",
            type: "Photo Gallery",
            duration: 15,
            aspect_ratio: "9:16",
          },
          {
            title: "Cold Start",
            platform: "Bring a Trailer",
            type: "Video",
            duration: 60,
            aspect_ratio: "9:16",
          },
          {
            title: "Best Of",
            platform: "Instagram Post",
            type: "Photo Gallery",
            duration: 15,
            aspect_ratio: "9:16",
          },
          {
            title: "Cold Start",
            platform: "Instagram Reels",
            type: "Video",
            duration: 15,
            aspect_ratio: "9:16",
          },
        ],
      },
    ];

    // Delete any existing templates
    await db.collection("batch_templates").deleteMany({});

    // Insert the new templates
    const result = await db.collection("batch_templates").insertMany(templates);

    console.log(`Successfully added ${result.insertedCount} templates`);

    // Close connection
    await client.close();

    process.exit(0);
  } catch (error) {
    console.error("Error adding batch templates:", error);
    process.exit(1);
  }
}

addBatchTemplates();
