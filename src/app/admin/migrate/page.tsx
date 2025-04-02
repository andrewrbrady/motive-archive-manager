"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MigratePage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | {
    message?: string;
    error?: string;
    stats?: {
      total: number;
      success: number;
      failed: number;
      failedUsers: string[];
    };
  }>(null);

  const handleMigrate = async () => {
    if (!session?.user?.roles?.includes("admin")) {
      setResult({ error: "You must be an admin to perform this action" });
      return;
    }

    if (
      !confirm(
        "Are you sure you want to migrate users from MongoDB to Firebase? This operation cannot be undone."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/auth/migrate-to-firebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setResult({ error: data.error || "Failed to migrate users" });
      }
    } catch (error: any) {
      setResult({ error: error.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is authorized - simplified check
  if (!session || !session.user?.roles?.includes("admin")) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Unauthorized</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. Please contact an
            administrator.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/admin" className="text-primary hover:underline">
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/admin" className="text-primary hover:underline">
          Back to Admin Dashboard
        </Link>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>User Migration Tool</CardTitle>
          <CardDescription>
            Migrate users from MongoDB to Firebase Authentication and Firestore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
              <h3 className="font-semibold text-amber-800">
                Important Information
              </h3>
              <ul className="list-disc pl-5 mt-2 text-amber-700 space-y-1">
                <li>
                  This tool will migrate all users from your MongoDB database to
                  Firebase
                </li>
                <li>
                  Users will be created in Firebase Authentication and Firestore
                </li>
                <li>Existing users will be updated with data from MongoDB</li>
                <li>
                  Passwords may not be transferable - users might need to reset
                  their passwords
                </li>
                <li>This process cannot be reversed</li>
              </ul>
            </div>

            {result && (
              <div
                className={`border p-4 rounded-md ${
                  result.error
                    ? "bg-red-50 border-red-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                {result.error ? (
                  <div className="text-red-700">
                    <h3 className="font-semibold">Error</h3>
                    <p>{result.error}</p>
                  </div>
                ) : (
                  <div className="text-green-700">
                    <h3 className="font-semibold">{result.message}</h3>
                    {result.stats && (
                      <div className="mt-2">
                        <p>Total users: {result.stats.total}</p>
                        <p>Successfully migrated: {result.stats.success}</p>
                        <p>Failed: {result.stats.failed}</p>
                        {result.stats.failedUsers.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Failed users:</p>
                            <ul className="list-disc pl-5">
                              {result.stats.failedUsers.map((email, index) => (
                                <li key={index}>{email}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="default"
            onClick={handleMigrate}
            disabled={isLoading}
          >
            {isLoading ? "Migrating Users..." : "Start Migration"}
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-6 w-full max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground text-center">
          For advanced migration options, use the command-line script:
          <br />
          <code className="bg-muted p-1 rounded text-xs">
            node scripts/migrate-users.js --analyze <br />
            node scripts/migrate-users.js --dry-run <br />
            node scripts/migrate-users.js --migrate
          </code>
        </p>
      </div>
    </div>
  );
}
