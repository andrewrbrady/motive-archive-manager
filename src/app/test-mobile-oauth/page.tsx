"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MobileOAuthButton } from "@/components/auth/MobileOAuthButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestMobileOAuth() {
  const { data: session, status } = useSession();
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent;
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      setDeviceInfo({
        userAgent,
        isMobile,
        isIOS,
        isAndroid,
        screenWidth,
        screenHeight,
        cookiesEnabled: navigator.cookieEnabled,
        touchSupport: "ontouchstart" in window,
        platform: navigator.platform,
      });

      addLog(`Device detected: ${isMobile ? "Mobile" : "Desktop"}`);
      addLog(`Screen: ${screenWidth}x${screenHeight}`);
      addLog(`Platform: ${navigator.platform}`);
      addLog(`Cookies enabled: ${navigator.cookieEnabled}`);
    }
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testOAuthFlow = () => {
    addLog("Testing OAuth flow...");
    addLog(`Current session status: ${status}`);
    addLog(`User agent: ${navigator.userAgent.substring(0, 50)}...`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Mobile OAuth Test</h1>
          <p className="text-muted-foreground">
            Test mobile-optimized Google OAuth authentication
          </p>
        </div>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Device Type:</span>
                <Badge
                  variant={deviceInfo.isMobile ? "default" : "secondary"}
                  className="ml-2"
                >
                  {deviceInfo.isMobile ? "Mobile" : "Desktop"}
                </Badge>
              </div>

              <div>
                <span className="font-medium">Platform:</span>
                <Badge variant="outline" className="ml-2">
                  {deviceInfo.isIOS
                    ? "iOS"
                    : deviceInfo.isAndroid
                      ? "Android"
                      : "Other"}
                </Badge>
              </div>

              <div>
                <span className="font-medium">Screen Size:</span>
                <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                  {deviceInfo.screenWidth}x{deviceInfo.screenHeight}
                </code>
              </div>

              <div>
                <span className="font-medium">Touch Support:</span>
                <Badge
                  variant={deviceInfo.touchSupport ? "default" : "destructive"}
                  className="ml-2"
                >
                  {deviceInfo.touchSupport ? "Yes" : "No"}
                </Badge>
              </div>

              <div>
                <span className="font-medium">Cookies Enabled:</span>
                <Badge
                  variant={
                    deviceInfo.cookiesEnabled ? "default" : "destructive"
                  }
                  className="ml-2"
                >
                  {deviceInfo.cookiesEnabled ? "Yes" : "No"}
                </Badge>
              </div>

              <div>
                <span className="font-medium">Platform:</span>
                <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                  {deviceInfo.platform}
                </code>
              </div>
            </div>

            {deviceInfo.userAgent && (
              <div className="mt-4">
                <span className="font-medium">User Agent:</span>
                <div className="mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                  {deviceInfo.userAgent}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">Status:</span>
                <Badge
                  variant={
                    status === "authenticated"
                      ? "default"
                      : status === "loading"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {status}
                </Badge>
              </div>

              {session ? (
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">User:</span>
                    <span className="ml-2">{session.user?.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <span className="ml-2">{session.user?.email}</span>
                  </div>
                  <div>
                    <span className="font-medium">Roles:</span>
                    <span className="ml-2">
                      {JSON.stringify(session.user?.roles)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Not authenticated</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OAuth Test */}
        <Card>
          <CardHeader>
            <CardTitle>OAuth Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!session ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the mobile-optimized OAuth flow:
                </p>
                <div className="space-y-3">
                  <MobileOAuthButton
                    callbackUrl="/test-mobile-oauth"
                    className="w-full"
                  />
                  <Button
                    onClick={testOAuthFlow}
                    variant="outline"
                    className="w-full"
                  >
                    Log Device Info
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-green-600 font-medium">
                  ✅ OAuth Authentication Successful!
                </div>
                <p className="text-sm text-muted-foreground">
                  You are successfully signed in with Google OAuth.
                </p>
                <Button
                  onClick={() => (window.location.href = "/auth/signout")}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out to Test Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Debug Logs
              <Button onClick={clearLogs} variant="outline" size="sm">
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No logs yet</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="font-medium">For Mobile Testing:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Test on actual mobile device, not browser dev tools</li>
                <li>Try both WiFi and cellular connections</li>
                <li>
                  Test with and without multiple Google accounts signed in
                </li>
                <li>Check that the OAuth flow redirects properly</li>
                <li>Verify that page doesn't just refresh on button click</li>
              </ul>
            </div>

            <div className="text-sm space-y-2">
              <p className="font-medium">Expected Behavior:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Mobile:</strong> Direct redirect to Google, then back
                  to app
                </li>
                <li>
                  <strong>Desktop:</strong> JavaScript navigation handles the
                  flow
                </li>
                <li>
                  <strong>Both:</strong> User should be signed in successfully
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
