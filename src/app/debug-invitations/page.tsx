"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DebugInvitations() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkInvitations = async () => {
    setIsLoading(true);
    addLog("Checking invited users collection...");

    try {
      const response = await fetch("/api/debug-invitations");
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
        addLog(`Found ${data.invitations?.length || 0} invitations`);
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUserCreation = async () => {
    addLog("Testing user creation...");

    try {
      const testEmail = `test-${Date.now()}@example.com`;
      addLog(`Creating invitation for ${testEmail}`);

      const response = await fetch("/api/users/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          name: "Test User",
          roles: ["admin", "user"],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addLog(`✅ Invitation created: ${JSON.stringify(data, null, 2)}`);
      } else {
        addLog(`❌ Error creating invitation: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">
          Debug Invitations & User Creation
        </h1>

        <div className="flex gap-4">
          <Button onClick={checkInvitations} disabled={isLoading}>
            Check Invitations
          </Button>
          <Button onClick={testUserCreation} disabled={isLoading}>
            Test User Creation
          </Button>
          <Button onClick={() => setLogs([])} variant="outline">
            Clear Logs
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Current Invitations</h2>
            <div className="p-4 bg-card rounded-lg border max-h-96 overflow-y-auto">
              {invitations.length === 0 ? (
                <p className="text-muted-foreground">No invitations found</p>
              ) : (
                <pre className="text-sm">
                  {JSON.stringify(invitations, null, 2)}
                </pre>
              )}
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
        </div>
      </div>
    </div>
  );
}
