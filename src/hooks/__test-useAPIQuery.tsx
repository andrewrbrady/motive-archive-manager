import React from "react";
import { useAPIQuery, useAPIMutation } from "./useAPIQuery";

/**
 * Test component to validate useAPIQuery functionality
 * This file can be deleted after Step 3 validation
 */
function TestUseAPIQuery() {
  // Test basic query
  const {
    data: users,
    isLoading,
    error,
  } = useAPIQuery<any[]>("/users", {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Test mutation
  const createUserMutation = useAPIMutation("/users", {
    onSuccess: (data) => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("User created successfully:", data);
    },
    onError: (error) => {
      console.error("Failed to create user:", error);
    },
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error loading users: {error.message}</div>;
  }

  const handleCreateUser = () => {
    createUserMutation.mutate({
      name: "Test User",
      email: "test@example.com",
    });
  };

  return (
    <div>
      <h2>useAPIQuery Test Component</h2>
      <p>Users loaded: {users?.length || 0}</p>
      <button
        onClick={handleCreateUser}
        disabled={createUserMutation.isPending}
      >
        {createUserMutation.isPending ? "Creating..." : "Create Test User"}
      </button>
      {createUserMutation.isError && (
        <p>Error: {createUserMutation.error?.message}</p>
      )}
      {createUserMutation.isSuccess && <p>User created successfully!</p>}
    </div>
  );
}

export default TestUseAPIQuery;
