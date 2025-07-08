"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAPI } from "@/hooks/useAPI";

/**
 * Debug component to test avatar loading and diagnose issues
 * Add this to any page temporarily to test avatar functionality
 */
export function AvatarTest() {
  const { data: session } = useSession();
  const api = useAPI();
  const [testResults, setTestResults] = useState<{
    sessionUser?: any;
    firestoreUser?: any;
    imageTests?: { url: string; status: string; error?: string }[];
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Test avatar URLs
  const testAvatarUrls = async () => {
    if (!session?.user?.image) return;

    setIsLoading(true);
    const results: { url: string; status: string; error?: string }[] = [];
    const userImage = session.user.image;

    // Test the current session image URL
    try {
      const response = await fetch(userImage, { mode: "no-cors" });
      results.push({
        url: userImage,
        status: "CORS prevented - cannot determine status",
        error: "CORS restriction",
      });
    } catch (error) {
      results.push({
        url: userImage,
        status: "Failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Test if we can access it as an image
    const img = new Image();
    img.crossOrigin = "anonymous";

    const imageTest = new Promise<{
      url: string;
      status: string;
      error?: string;
    }>((resolve) => {
      img.onload = () => resolve({ url: userImage, status: "Success" });
      img.onerror = () =>
        resolve({
          url: userImage,
          status: "Failed",
          error: "Image failed to load (likely CORS)",
        });
      img.src = userImage;
    });

    const imageResult = await imageTest;
    results.push(imageResult);

    setTestResults((prev) => ({ ...prev, imageTests: results }));
    setIsLoading(false);
  };

  // Fetch Firestore user data
  const fetchFirestoreUser = async () => {
    if (!api || !session?.user?.id) return;

    try {
      const userData = await api.get(`users/${session.user.id}`);
      setTestResults((prev) => ({ ...prev, firestoreUser: userData }));
    } catch (error) {
      console.error("Error fetching Firestore user:", error);
      setTestResults((prev) => ({
        ...prev,
        firestoreUser: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  };

  // Sync avatar for current user
  const syncAvatar = async () => {
    if (!api || !session?.user?.id) return;

    try {
      setIsLoading(true);
      await api.post("users/sync-avatar", { userId: session.user.id });

      // Refresh Firestore user data
      setTimeout(() => {
        fetchFirestoreUser();
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error syncing avatar:", error);
      setIsLoading(false);
    }
  };

  // Update test results with session data
  useEffect(() => {
    if (session?.user) {
      setTestResults((prev) => ({ ...prev, sessionUser: session.user }));
    }
  }, [session?.user]);

  if (!session?.user) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Avatar Debug Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please sign in to test avatar functionality.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Avatar Debug Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Testing avatar loading for current user
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Avatar Test */}
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <p className="font-medium">Current Avatar:</p>
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={session.user.image || ""}
                alt={session.user.name || "User"}
              />
              <AvatarFallback className="text-lg">
                {session.user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <p className="font-medium">Controls:</p>
            <div className="flex gap-2">
              <Button onClick={testAvatarUrls} disabled={isLoading} size="sm">
                Test URL
              </Button>
              <Button
                onClick={fetchFirestoreUser}
                disabled={isLoading}
                size="sm"
              >
                Check Firestore
              </Button>
              <Button onClick={syncAvatar} disabled={isLoading} size="sm">
                Sync Avatar
              </Button>
            </div>
          </div>
        </div>

        {/* Session Data */}
        <div className="space-y-2">
          <p className="font-medium">Session User Data:</p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
            {JSON.stringify(testResults.sessionUser, null, 2)}
          </pre>
        </div>

        {/* Firestore Data */}
        {testResults.firestoreUser && (
          <div className="space-y-2">
            <p className="font-medium">Firestore User Data:</p>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">
              {JSON.stringify(testResults.firestoreUser, null, 2)}
            </pre>
          </div>
        )}

        {/* Image Test Results */}
        {testResults.imageTests && (
          <div className="space-y-2">
            <p className="font-medium">Image URL Test Results:</p>
            <div className="space-y-2">
              {testResults.imageTests.map((test, index) => (
                <div key={index} className="p-2 border rounded">
                  <p className="text-sm font-medium">URL: {test.url}</p>
                  <p className="text-sm">
                    Status:{" "}
                    <span
                      className={
                        test.status === "Success"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {test.status}
                    </span>
                  </p>
                  {test.error && (
                    <p className="text-xs text-muted-foreground">
                      Error: {test.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Instructions */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <p className="font-medium text-blue-800">Browser Console Check:</p>
          <p className="text-sm text-blue-700">
            Open browser DevTools → Console and look for red avatar error
            messages. Also check Network tab for failed image requests.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
