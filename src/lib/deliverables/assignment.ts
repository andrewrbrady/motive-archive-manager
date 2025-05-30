/**
 * Utilities for handling deliverable assignment operations
 */

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
    const response = await fetch(`/api/cars/${carId}/deliverables/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    // Parse the response
    const responseData = await response.json();
    // [REMOVED] // [REMOVED] console.log("Assignment response:", responseData);

    // Check if the response was successful
    if (!response.ok) {
      throw new Error(
        responseData.error || "Failed to update deliverable assignment"
      );
    }

    return true;
  } catch (error) {
    console.error("Error assigning deliverable:", error);
    throw error;
  }
}

/**
 * Batch assigns users to multiple deliverables
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
  const results = [];

  // Process assignments sequentially to avoid race conditions
  for (const assignment of assignments) {
    try {
      await assignDeliverable(
        assignment.deliverableId,
        assignment.carId,
        assignment.userId,
        assignment.editorName
      );
      results.push({
        deliverableId: assignment.deliverableId,
        success: true,
      });
    } catch (error) {
      results.push({
        deliverableId: assignment.deliverableId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
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
