"use client";

import { useState } from "react";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import UserManagement from "@/components/users/UserManagement";
import LocationsClient from "../locations/LocationsClient";
import ClientsContent from "@/app/admin/ClientsContent";
import ContactsContent from "@/app/admin/ContactsContent";
import MakesContent from "@/app/admin/MakesContent";
import MediaTypesContent from "@/app/admin/media-types/MediaTypesContent";
import CreativeRolesManagement from "@/components/users/CreativeRolesManagement";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import CaptionPromptsContent from "./CaptionPromptsContent";
import SystemPromptsContent from "./SystemPromptsContent";
import LengthSettingsContent from "./LengthSettingsContent";
import PlatformSettingsContent from "./PlatformSettingsContent";
import EventTypeSettingsContent from "./EventTypeSettingsContent";
import ImageAnalysisPromptsContent from "./ImageAnalysisPromptsContent";
import { ModelsConfigurator } from "@/components/admin/ModelsConfigurator";
import { useAPI } from "@/hooks/useAPI";
import MigrateMediaTypesButton from "@/components/admin/deliverables/MigrateMediaTypesButton";

// TypeScript interfaces for API responses
interface OAuthDebugResponse {
  oauthConfig: {
    environment: {
      NODE_ENV: string;
      VERCEL_ENV?: string;
      baseUrl: string;
      oauthCallbackUrl: string;
    };
    google: {
      clientIdSet: boolean;
      clientSecretSet: boolean;
      expectedCallbackUrl: string;
    };
  };
  troubleshooting: {
    redirectUriIssue: {
      description: string;
    };
  };
}

interface UserDebugResponse {
  userDebugInfo: any;
}

export default function AdminTabs() {
  const api = useAPI();
  const [oauthDebugData, setOauthDebugData] = useState<any>(null);
  const [userDebugData, setUserDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const fetchOAuthDebug = async () => {
    if (!api) return;

    setDebugLoading(true);
    try {
      const data = (await api.get("auth/debug-oauth")) as OAuthDebugResponse;
      setOauthDebugData(data);
    } catch (error) {
      console.error("Error fetching OAuth debug:", error);
    } finally {
      setDebugLoading(false);
    }
  };

  const debugUser = async () => {
    if (!userEmail || !api) return;

    setDebugLoading(true);
    try {
      const data = (await api.get(
        `auth/debug-oauth?user=${encodeURIComponent(userEmail)}`
      )) as UserDebugResponse;
      setUserDebugData(data.userDebugInfo);
    } catch (error) {
      console.error("Error debugging user:", error);
    } finally {
      setDebugLoading(false);
    }
  };

  const oauthDebugContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OAuth Configuration Debug</CardTitle>
          <CardDescription>
            Debug OAuth configuration and troubleshoot authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <Button onClick={fetchOAuthDebug} disabled={debugLoading}>
            {debugLoading ? "Loading..." : "Check OAuth Configuration"}
          </Button>

          {oauthDebugData && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Environment Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>NODE_ENV</Label>
                    <Badge variant="outline">
                      {oauthDebugData.oauthConfig.environment.NODE_ENV}
                    </Badge>
                  </div>
                  <div>
                    <Label>VERCEL_ENV</Label>
                    <Badge variant="outline">
                      {oauthDebugData.oauthConfig.environment.VERCEL_ENV ||
                        "Not set"}
                    </Badge>
                  </div>
                  <div>
                    <Label>Base URL</Label>
                    <code className="text-xs bg-gray-100 p-1 rounded">
                      {oauthDebugData.oauthConfig.environment.baseUrl}
                    </code>
                  </div>
                  <div>
                    <Label>OAuth Callback URL</Label>
                    <code className="text-xs bg-gray-100 p-1 rounded">
                      {oauthDebugData.oauthConfig.environment.oauthCallbackUrl}
                    </code>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Google OAuth Status
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Client ID Set</Label>
                    <Badge
                      variant={
                        oauthDebugData.oauthConfig.google.clientIdSet
                          ? "default"
                          : "destructive"
                      }
                    >
                      {oauthDebugData.oauthConfig.google.clientIdSet
                        ? "✓ Yes"
                        : "✗ No"}
                    </Badge>
                  </div>
                  <div>
                    <Label>Client Secret Set</Label>
                    <Badge
                      variant={
                        oauthDebugData.oauthConfig.google.clientSecretSet
                          ? "default"
                          : "destructive"
                      }
                    >
                      {oauthDebugData.oauthConfig.google.clientSecretSet
                        ? "✓ Yes"
                        : "✗ No"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2">Troubleshooting</h3>
                <Alert>
                  <AlertDescription>
                    <strong>Redirect URI Issue:</strong>{" "}
                    {
                      oauthDebugData.troubleshooting.redirectUriIssue
                        .description
                    }
                    <br />
                    <strong>Expected Callback URL:</strong>{" "}
                    <code>
                      {oauthDebugData.oauthConfig.google.expectedCallbackUrl}
                    </code>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Debug</CardTitle>
          <CardDescription>
            Debug specific user authentication and data
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter user email or UID"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
            <Button onClick={debugUser} disabled={debugLoading || !userEmail}>
              Debug User
            </Button>
          </div>

          {userDebugData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Firebase Auth</Label>
                  <Badge
                    variant={
                      userDebugData.authUserExists ? "default" : "destructive"
                    }
                  >
                    {userDebugData.authUserExists ? "✓ Exists" : "✗ Not Found"}
                  </Badge>
                </div>
                <div>
                  <Label>Firestore</Label>
                  <Badge
                    variant={
                      userDebugData.firestoreUserExists
                        ? "default"
                        : "destructive"
                    }
                  >
                    {userDebugData.firestoreUserExists
                      ? "✓ Exists"
                      : "✗ Not Found"}
                  </Badge>
                </div>
              </div>

              {userDebugData.authUser && (
                <div>
                  <h4 className="font-semibold">Firebase Auth Data</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(userDebugData.authUser, null, 2)}
                  </pre>
                </div>
              )}

              {userDebugData.firestoreUser && (
                <div>
                  <h4 className="font-semibold">Firestore Data</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(userDebugData.firestoreUser, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const tabItems: TabItem[] = [
    {
      value: "oauth-debug",
      label: "OAuth Debug",
      content: oauthDebugContent,
    },
    {
      value: "users",
      label: "Users",
      content: <UserManagement />,
    },
    {
      value: "roles",
      label: "Creative Roles",
      content: <CreativeRolesManagement />,
    },
    {
      value: "clients",
      label: "Clients",
      content: <ClientsContent />,
    },
    {
      value: "contacts",
      label: "Contacts",
      content: <ContactsContent />,
    },
    {
      value: "locations",
      label: "Locations",
      content: <LocationsClient />,
    },
    {
      value: "makes",
      label: "Makes",
      content: <MakesContent />,
    },
    {
      value: "media-types",
      label: "Media Types",
      content: <MediaTypesContent />,
    },
    {
      value: "caption-prompts",
      label: "Caption Prompts",
      content: <CaptionPromptsContent />,
    },
    {
      value: "system-prompts",
      label: "System Prompts",
      content: <SystemPromptsContent />,
    },
    {
      value: "ai-models",
      label: "AI Models",
      content: <ModelsConfigurator />,
    },
    {
      value: "platform-settings",
      label: "Platform Settings",
      content: <PlatformSettingsContent />,
    },
    {
      value: "length-settings",
      label: "Length Settings",
      content: <LengthSettingsContent />,
    },
    {
      value: "event-type-settings",
      label: "Event Type Settings",
      content: <EventTypeSettingsContent />,
    },
    {
      value: "image-analysis-prompts",
      label: "Image Analysis Prompts",
      content: <ImageAnalysisPromptsContent />,
    },
    {
      value: "migrate-media-types",
      label: "Migrate Media Types",
      content: <MigrateMediaTypesButton />,
    },
  ];

  return (
    <CustomTabs
      items={tabItems}
      defaultValue="oauth-debug"
      basePath="/admin"
      className="w-full"
    />
  );
}
