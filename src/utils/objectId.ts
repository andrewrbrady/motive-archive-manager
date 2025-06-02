import { ObjectId } from "mongodb";

/**
 * Converts ObjectId to string, handling null/undefined cases and various formats
 */
export function objectIdToString(
  id: ObjectId | string | { $oid: string } | null | undefined
): string | undefined {
  if (!id) return undefined;

  // Handle ObjectId instances (most common case)
  if (id instanceof ObjectId) return id.toString();

  // Handle string format
  if (typeof id === "string") return id;

  // Handle $oid format (legacy/backup)
  if (typeof id === "object") {
    if ("$oid" in id && id.$oid) return id.$oid;
  }

  return undefined;
}

/**
 * Converts string to ObjectId, handling validation
 */
export function stringToObjectId(
  id: string | null | undefined
): ObjectId | null {
  if (!id || typeof id !== "string") return null;
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

/**
 * Converts an array of ObjectIds to strings
 */
export function objectIdArrayToStringArray(
  ids: (ObjectId | string)[]
): string[] {
  return ids.map((id) => {
    if (typeof id === "string") return id;
    return id.toString();
  });
}

/**
 * Converts an array of strings to ObjectIds, filtering out invalid ones
 */
export function stringArrayToObjectIdArray(ids: string[]): ObjectId[] {
  return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

/**
 * Converts a project document from database format to frontend format
 */
export function convertProjectForFrontend(project: any): any {
  if (!project) return project;

  const converted = { ...project };

  // Convert ObjectId fields to strings
  if (converted._id) converted._id = objectIdToString(converted._id);
  if (converted.clientId)
    converted.clientId = objectIdToString(converted.clientId);
  if (converted.templateId)
    converted.templateId = objectIdToString(converted.templateId);
  if (converted.primaryImageId)
    converted.primaryImageId = objectIdToString(converted.primaryImageId);

  // Convert ObjectId arrays to string arrays
  if (converted.carIds)
    converted.carIds = objectIdArrayToStringArray(converted.carIds);
  if (converted.galleryIds)
    converted.galleryIds = objectIdArrayToStringArray(converted.galleryIds);
  if (converted.deliverableIds)
    converted.deliverableIds = objectIdArrayToStringArray(
      converted.deliverableIds
    );
  if (converted.eventIds)
    converted.eventIds = objectIdArrayToStringArray(converted.eventIds);

  return converted;
}
