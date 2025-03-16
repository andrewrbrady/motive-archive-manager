import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Disable the default body parser to handle form data
export const config = {
  api: {
    bodyParser: false,
  },
};

type ProcessedFiles = {
  fields: formidable.Fields;
  files: formidable.Files;
};

const parseForm = async (req: NextApiRequest): Promise<ProcessedFiles> => {
  return new Promise((resolve, reject) => {
    const form = formidable({});

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

// Create uploads directory if it doesn't exist
const saveFile = async (file: formidable.File): Promise<string> => {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Generate a unique filename
  const uniqueFilename = `${uuidv4()}-${file.originalFilename}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  // Copy the file to the uploads directory
  const data = fs.readFileSync(file.filepath);
  fs.writeFileSync(filePath, data);

  // Return the URL path to the file
  return `/uploads/${uniqueFilename}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse the form data
    const { fields, files } = await parseForm(req);

    // Check if a file was uploaded
    const fileArray = files.file;
    if (!fileArray || !fileArray[0]) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = fileArray[0];

    // Check if itemId was provided
    const itemId = fields.itemId?.[0];
    if (!itemId) {
      return res.status(400).json({ error: "No itemId provided" });
    }

    // Save the file and get its URL
    const fileUrl = await saveFile(file);

    // Success! Return the image URL
    return res.status(200).json({
      id: path.basename(fileUrl),
      filename: file.originalFilename,
      uploaded: new Date().toISOString(),
      variants: ["public", "thumbnail"],
      imageUrl: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
}
