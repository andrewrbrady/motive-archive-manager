import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}

// Validate AWS credentials
const requiredEnvVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_BUCKET_NAME",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("Missing required AWS environment variables:", missingVars);
  throw new Error(
    `Missing required AWS environment variables: ${missingVars.join(", ")}`
  );
}

// Initialize S3 client with credentials
export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Log S3 configuration (without sensitive data)
console.log("S3 Configuration:", {
  region: process.env.AWS_REGION,
  bucketName: BUCKET_NAME,
  hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
});

export interface S3UploadResult {
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

export async function uploadFile(
  file: File,
  carId: string,
  type: "research" | "script_files" | "documentation"
): Promise<S3UploadResult> {
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const key = `cars/${carId}/${type}/${sanitizedFilename.replace(
    /\.([^.]+)$/,
    `-${timestamp}.$1`
  )}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    Metadata: {
      originalName: file.name,
      size: file.size.toString(),
    },
  });

  await s3Client.send(command);

  // Generate a presigned URL for immediate access
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // URL expires in 1 hour

  return {
    key,
    url,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  };
}

export async function uploadResearchFile(
  file: File,
  carId: string
): Promise<S3UploadResult> {
  return uploadFile(file, carId, "research");
}

export async function deleteResearchFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export async function getResearchFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

export async function uploadDocumentationFile(
  file: File,
  carId: string
): Promise<S3UploadResult> {
  return uploadFile(file, carId, "documentation");
}

export async function deleteDocumentationFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export async function getDocumentationFileUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

export async function generatePresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    ResponseContentDisposition: "inline",
    ResponseContentType: "text/markdown",
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

export function generateS3Key(carId: string, filename: string) {
  // Create a clean filename by removing special characters
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  return `cars/${carId}/${timestamp}-${cleanFilename}`;
}

export async function getMDXFile(s3Key: string): Promise<string> {
  try {
    console.log("S3 - Fetching MDX file:", { s3Key, bucket: BUCKET_NAME });
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error("S3 response body is empty");
    }

    const content = await response.Body.transformToString();
    console.log("S3 - Successfully fetched MDX file content");
    return content;
  } catch (error) {
    console.error("S3 - Error fetching MDX file:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      s3Key,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}

export async function uploadMDXFile(
  filename: string,
  content: string
): Promise<string> {
  try {
    console.log("S3 - Uploading MDX file:", { filename });
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "-");
    const key = `mdx/${sanitizedFilename.replace(/\.([^.]+)$/, `-${timestamp}.$1`)}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: "text/markdown",
    });

    await s3Client.send(command);
    console.log("S3 - Successfully uploaded MDX file:", { key });
    return key;
  } catch (error) {
    console.error("S3 - Error uploading MDX file:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      filename,
    });
    throw error;
  }
}
