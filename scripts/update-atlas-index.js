import * as dotenv from "dotenv";
dotenv.config();

async function updateAtlasIndex() {
  if (
    !process.env.MONGODB_URI ||
    !process.env.MONGODB_ATLAS_PUBLIC_KEY ||
    !process.env.MONGODB_ATLAS_PRIVATE_KEY
  ) {
    console.error(
      "Required environment variables are not set (MONGODB_URI, MONGODB_ATLAS_PUBLIC_KEY, MONGODB_ATLAS_PRIVATE_KEY)"
    );
    process.exit(1);
  }

  // Extract Atlas details from URI
  const uri = process.env.MONGODB_URI;
  const match = uri.match(/mongodb\+srv:\/\/[^@]+@([^/]+)\/([^?]+)/);
  if (!match) {
    console.error("Invalid MongoDB URI format");
    process.exit(1);
  }

  const [, cluster, database] = match;
  const [groupId, ...rest] = cluster.split(".");

  // Atlas Data API endpoint
  const apiUrl = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${groupId}/clusters/${rest.join(
    "."
  )}/fts/indexes/${database}/research_vectors`;

  const indexDefinition = {
    name: "default",
    mappings: {
      dynamic: false,
      fields: {
        embedding: {
          dimensions: 1536,
          similarity: "cosine",
          type: "knnVector",
        },
        pageContent: {
          type: "string",
        },
        "metadata.carId": {
          type: "token",
        },
        "metadata.fileId": {
          type: "token",
        },
        "metadata.fileName": {
          type: "string",
        },
        "metadata.chunk": {
          type: "number",
        },
      },
    },
  };

  const auth = Buffer.from(
    `${process.env.MONGODB_ATLAS_PUBLIC_KEY}:${process.env.MONGODB_ATLAS_PRIVATE_KEY}`
  ).toString("base64");

  try {
    // First try to delete existing index
    try {
      const deleteResponse = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
      });
      console.log("Delete response:", await deleteResponse.text());
    } catch (deleteError) {
      console.warn("Error deleting index:", deleteError.message);
    }

    // Create new index
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(indexDefinition),
    });

    const result = await response.text();
    console.log("Create index response:", result);
  } catch (error) {
    console.error("Error updating index:", error);
    process.exit(1);
  }
}

updateAtlasIndex();
