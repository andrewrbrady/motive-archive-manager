"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Youtube,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAPI } from "@/hooks/useAPI";

interface YouTubeChannel {
  id: string;
  title: string;
  subscriberCount?: string;
  videoCount?: string;
  customUrl?: string;
}

interface AuthStatus {
  isAuthenticated: boolean;
  email?: string;
  name?: string;
  channels: YouTubeChannel[];
  error?: string;
}

export default function YouTubeAuthComponent() {
  const api = useAPI();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    channels: [],
  });
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  // Check current authentication status
  const checkAuthStatus = async () => {
    if (!api) {
      setLoading(false);
      return;
    }

    try {
      const data = (await api.get("youtube/auth/status")) as AuthStatus;
      setAuthStatus(data);
    } catch (error: any) {
      console.error("Error checking auth status:", error);
      setAuthStatus({
        isAuthenticated: false,
        channels: [],
        error: error.message || "Failed to check authentication status",
      });
    } finally {
      setLoading(false);
    }
  };

  // Start YouTube authentication
  const startAuthentication = async () => {
    if (!api) {
      toast.error("Authentication required");
      return;
    }

    try {
      setAuthenticating(true);
      const data = (await api.get("youtube/auth/start")) as {
        auth_url?: string;
        error?: string;
      };

      if (data.auth_url) {
        // Open OAuth URL in same window
        window.location.href = data.auth_url;
      } else {
        toast.error(data.error || "Failed to start authentication");
      }
    } catch (error: any) {
      console.error("Error starting authentication:", error);
      toast.error(error.message || "Failed to start authentication");
    } finally {
      setAuthenticating(false);
    }
  };

  // Revoke authentication
  const revokeAuthentication = async () => {
    if (!api) {
      toast.error("Authentication required");
      return;
    }

    try {
      await api.post("youtube/auth/revoke");
      toast.success("Authentication revoked successfully");
      setAuthStatus({
        isAuthenticated: false,
        channels: [],
      });
    } catch (error: any) {
      console.error("Error revoking authentication:", error);
      toast.error(error.message || "Failed to revoke authentication");
    }
  };

  // Check for OAuth callback on component mount
  useEffect(() => {
    if (!api) return; // Guard clause inside hook

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      toast.error(`Authentication failed: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      // OAuth callback successful, check status
      toast.success("Authentication successful! Checking status...");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Delay to allow callback processing
      setTimeout(checkAuthStatus, 1000);
    } else {
      checkAuthStatus();
    }
  }, [api]);

  if (!api) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Authentication required to manage YouTube integration</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Checking authentication status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            YouTube Authentication Status
          </CardTitle>
          <CardDescription>
            Current authentication status for YouTube API access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authStatus.isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Authenticated</span>
                <Badge variant="secondary">Active</Badge>
              </div>

              {authStatus.email && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Account:{" "}
                  </span>
                  <span className="font-medium">{authStatus.email}</span>
                  {authStatus.name && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({authStatus.name})
                    </span>
                  )}
                </div>
              )}

              {authStatus.channels.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    YouTube Channels ({authStatus.channels.length}):
                  </span>
                  {authStatus.channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{channel.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {channel.id}
                          {channel.customUrl && ` • @${channel.customUrl}`}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {channel.subscriberCount && (
                          <div>{channel.subscriberCount} subscribers</div>
                        )}
                        {channel.videoCount && (
                          <div>{channel.videoCount} videos</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                onClick={revokeAuthentication}
                className="w-full"
              >
                Revoke Authentication
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Not Authenticated</span>
                <Badge variant="outline">Setup Required</Badge>
              </div>

              {authStatus.error && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authStatus.error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To enable YouTube uploads, you need to authenticate with a
                  Google account that has access to your YouTube channel.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Important:</strong> Use the andrew@motivearchive.com
                  account or any account that has been added as a manager/owner
                  of your YouTube Brand Account.
                </p>
              </div>

              <Button
                onClick={startAuthentication}
                disabled={authenticating}
                className="w-full"
              >
                {authenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting Authentication...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Authenticate with YouTube
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">For Team Members:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Authenticate with YouTube" above</li>
              <li>
                Sign in with andrew@motivearchive.com (or an account with
                channel access)
              </li>
              <li>Grant the requested permissions</li>
              <li>You'll be redirected back here with confirmation</li>
              <li>
                YouTube upload functionality will now work across the
                application
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Troubleshooting:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Make sure you're using the correct Google account</li>
              <li>
                The account must have access to the target YouTube channel
              </li>
              <li>
                If you see "No channels found", the account doesn't have YouTube
                channel access
              </li>
              <li>
                Contact an admin if you need access to additional YouTube
                channels
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
