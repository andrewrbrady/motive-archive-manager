/**
 * Utilities for handling deliverable assignment operations
 */
import { api } from "@/lib/api-client";

/**
 * Assigns a user to a deliverable or unassigns if userId is null
 * @param deliverableId - The ID of the deliverable to update
 * @param carId - The ID of the car associated with the deliverable
 * @param userId - The ID of the user to assign, or null to unassign
 * @param editorName - The name of the editor (optional, will be fetched if not provided)
 * @returns A promise resolving to true if successful
 */
export async function assignDeliverable(
  deliverableId: string,
  carId: string,
  userId: string | null,
  editorName?: string | null
): Promise<boolean> {
  try {
    console.log("Assigning deliverable:", {
      deliverableId,
      carId,
      userId: userId || "unassigned",
      editorName,
    });

    // Build the request body
    const request = {
      deliverableId,
      userId,
      editorName,
    };

    // Call the API endpoint
    await api.post(`/cars/${carId}/deliverables/assign`, request);

    return true;
  } catch (error) {
    console.error("Error assigning deliverable:", error);
    throw error;
  }
}

/**
 * Batch assigns users to multiple deliverables - OPTIMIZED for parallel processing
 * @param assignments - Array of assignment operations
 * @returns A promise resolving to an array of results
 */
export async function batchAssignDeliverables(
  assignments: Array<{
    deliverableId: string;
    carId: string;
    userId: string | null;
    editorName?: string | null;
  }>
): Promise<Array<{ deliverableId: string; success: boolean; error?: string }>> {
  // OPTIMIZATION: Process assignments in parallel instead of sequentially
  const assignmentPromises = assignments.map(async (assignment) => {
    try {
      await assignDeliverable(
        assignment.deliverableId,
        assignment.carId,
        assignment.userId,
        assignment.editorName
      );
      return {
        deliverableId: assignment.deliverableId,
        success: true,
      };
    } catch (error) {
      return {
        deliverableId: assignment.deliverableId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Use Promise.allSettled to handle both success and failure cases
  const results = await Promise.allSettled(assignmentPromises);

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        deliverableId: assignments[index].deliverableId,
        success: false,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error",
      };
    }
  });
}

/**
 * Finds a user ID by name from a list of users
 * @param users - Array of user objects
 * @param name - Name to search for
 * @returns The user ID if found, otherwise null
 */
export function findUserIdByName(
  users: Array<{ uid: string; name: string }>,
  name: string
): string | null {
  const user = users.find((u) => u.name === name);
  return user ? user.uid : null;
}

/**
 * Finds a user name by ID from a list of users
 * @param users - Array of user objects
 * @param uid - User ID to search for
 * @returns The user name if found, otherwise null
 */
export function findUserNameById(
  users: Array<{ uid: string; name: string }>,
  uid: string
): string | null {
  const user = users.find((u) => u.uid === uid);
  return user ? user.name : null;
}
