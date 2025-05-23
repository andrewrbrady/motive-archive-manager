"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function TestOAuth() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleGoogleSignIn = async () => {
    addLog("Starting Google OAuth flow...");
    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/test-oauth",
      });

      addLog(`SignIn result: ${JSON.stringify(result, null, 2)}`);

      if (result?.error) {
        addLog(`Error: ${result.error}`);
      } else if (result?.ok) {
        addLog("Sign-in successful!");
      }
    } catch (error: any) {
      addLog(`Exception: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    addLog("Signing out...");
    await signOut({ redirect: false });
    addLog("Signed out");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">OAuth Debug Test</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Session Status</h2>
          <div className="p-4 bg-card rounded-lg border">
            <p>
              <strong>Status:</strong> {status}
            </p>
            {session ? (
              <div className="space-y-2 mt-2">
                <p>
                  <strong>User ID:</strong> {session.user.id}
                </p>
                <p>
                  <strong>Email:</strong> {session.user.email}
                </p>
                <p>
                  <strong>Name:</strong> {session.user.name}
                </p>
                <p>
                  <strong>Roles:</strong> {JSON.stringify(session.user.roles)}
                </p>
                <p>
                  <strong>Status:</strong> {session.user.status}
                </p>
              </div>
            ) : (
              <p>No session</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Actions</h2>
          <div className="flex gap-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={status === "loading"}
            >
              Sign In with Google
            </Button>
            {session && (
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            )}
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Debug Logs</h2>
          <div className="p-4 bg-card rounded-lg border max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">No logs yet</p>
            ) : (
              <pre className="text-sm whitespace-pre-wrap">
                {logs.join("\n")}
              </pre>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Environment Info</h2>
          <div className="p-4 bg-card rounded-lg border">
            <p>
              <strong>Base URL:</strong>{" "}
              {typeof window !== "undefined" ? window.location.origin : "N/A"}
            </p>
            <p>
              <strong>OAuth Callback:</strong>{" "}
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/auth/callback/google`
                : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
