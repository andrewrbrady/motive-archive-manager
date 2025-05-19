"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime: string;
  providerData: {
    providerId: string;
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
  }[];
}

export default function UserDetailsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users/list-auth");
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users || []);
        } else {
          setError(data.error || "Failed to fetch users");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <Link href="/admin" className="text-primary hover:underline">
          Back to Admin Dashboard
        </Link>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          size="sm"
        >
          Refresh Data
        </Button>
      </div>

      <Card className="w-full mb-8">
        <CardHeader>
          <CardTitle>Firebase Authentication Users</CardTitle>
          <CardDescription>
            View all users registered in Firebase Authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found in Firebase Authentication
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">User ID</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Provider
                    </th>
                    <th className="px-4 py-2 text-left font-medium">
                      Email Verified
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Created</th>
                    <th className="px-4 py-2 text-left font-medium">
                      Last Sign In
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">
                        {user.uid}
                      </td>
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2">{user.displayName || "-"}</td>
                      <td className="px-4 py-2">
                        {user.providerData.map((p) => p.providerId).join(", ")}
                      </td>
                      <td className="px-4 py-2">
                        {user.emailVerified ? (
                          <span className="text-green-600">Verified</span>
                        ) : (
                          <span className="text-amber-600">Not Verified</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {new Date(user.creationTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {user.lastSignInTime
                          ? new Date(user.lastSignInTime).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Debugging Tools</CardTitle>
          <CardDescription>
            Tools to help debug authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Email Collision Fix</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you have issues with email collisions, use this tool to fix
                them.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  window.open("/api/auth/fix-email-collision", "_blank")
                }
              >
                Fix Email Collision
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Fix Google Providers</h3>
              <p className="text-sm text-muted-foreground mb-2">
                If users are missing Google as their provider, use this tool to
                add it.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (users.length === 0) {
                    alert("No users found to fix.");
                    return;
                  }

                  const selectedUser = prompt(
                    'Enter the email of the user to fix, or "all" to fix all users:'
                  );

                  if (!selectedUser) return;

                  let usersToFix: UserRecord[] = [];

                  if (selectedUser.toLowerCase() === "all") {
                    usersToFix = users.filter(
                      (user) =>
                        !user.providerData.some(
                          (p) => p.providerId === "google.com"
                        ) &&
                        user.email &&
                        user.email.includes("@")
                    );
                  } else {
                    const user = users.find((u) => u.email === selectedUser);
                    if (user) usersToFix = [user];
                  }

                  if (usersToFix.length === 0) {
                    alert("No matching users found to fix.");
                    return;
                  }

                  const confirmed = confirm(
                    `Are you sure you want to add Google as a provider for ${usersToFix.length} user(s)?\n\nThis will modify Firebase Authentication records.`
                  );

                  if (!confirmed) return;

                  // For each user, call the import-google-user endpoint
                  Promise.all(
                    usersToFix.map((user) =>
                      fetch("/api/auth/import-google-user", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          uid: user.uid,
                          email: user.email,
                          displayName:
                            user.displayName || user.email.split("@")[0],
                          photoURL: user.providerData[0]?.photoURL || "",
                        }),
                      })
                    )
                  )
                    .then((responses) =>
                      Promise.all(responses.map((r) => r.json()))
                    )
                    .then((results) => {
                      const success = results.filter((r) => r.success).length;
                      const failed = results.length - success;

                      alert(`Fixed ${success} user(s). Failed: ${failed}.`);
                      if (success > 0) window.location.reload();
                    })
                    .catch((err) => {
                      console.error("Error fixing users:", err);
                      alert(`Error: ${err.message || "Unknown error"}`);
                    });
                }}
              >
                Fix Google Providers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
