"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PromoteAdmin() {
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePromoteToAdmin = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/users/promote-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Successfully promoted to admin! Redirecting...");

        // Update the session to reflect new roles
        await update({ refreshClaims: true });

        // Redirect to admin after a short delay
        setTimeout(() => {
          router.push("/admin");
        }, 2000);
      } else {
        setError(data.error || "Failed to promote to admin");
      }
    } catch (error: any) {
      setError("Network error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Not Authenticated</h1>
          <p>Please sign in first.</p>
          <a href="/auth/signin" className="text-primary hover:underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = session.user?.roles?.includes("admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg border p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Admin Promotion</h1>
          <p className="text-muted-foreground mt-2">
            Promote your account to admin access
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Current User Info:</h3>
            <p className="text-sm text-muted-foreground">
              Email: {session.user.email}
            </p>
            <p className="text-sm text-muted-foreground">
              Name: {session.user.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Current Roles: {JSON.stringify(session.user.roles)}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {session.user.status}
            </p>
          </div>

          {isAdmin ? (
            <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-3 rounded-md text-center">
              ✅ You already have admin access!
              <div className="mt-2">
                <Button
                  onClick={() => router.push("/admin")}
                  className="w-full"
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-3 rounded-md text-center">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-3 rounded-md text-center">
                  {error}
                </div>
              )}

              <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-3 rounded-md text-sm">
                ⚠️ This will give you admin access to the system. Only use this
                if you're authorized to have admin privileges.
              </div>

              <Button
                onClick={handlePromoteToAdmin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    Promoting...
                  </>
                ) : (
                  "Promote to Admin"
                )}
              </Button>
            </>
          )}
        </div>

        <div className="text-center">
          <a
            href="/auth/signout"
            className="text-sm text-muted-foreground hover:underline"
          >
            Sign Out
          </a>
        </div>
      </div>
    </div>
  );
}
