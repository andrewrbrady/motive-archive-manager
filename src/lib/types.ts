// Type definition for MongoDB ObjectId without importing mongodb
export type ObjectId = string;

// Helper function to check if a string is a valid ObjectId
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
