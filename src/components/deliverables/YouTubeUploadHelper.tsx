import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Youtube,
  Loader2,
  AlertCircle,
  ExternalLink,
  Play,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Deliverable } from "@/types/deliverable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useAPI } from "@/hooks/useAPI";

interface YouTubeUploadHelperProps {
  deliverable: Deliverable;
}

interface YouTubeAuthStatus {
  isAuthenticated: boolean;
  channels: Array<{
    id: string;
    title: string;
    subscriberCount?: string;
    videoCount?: string;
    customUrl?: string;
    description?: string;
  }>;
}

interface CarCaption {
  _id: string;
  carId: string;
  platform: string;
  context: string;
  caption: string;
  createdAt: string;
}

interface CaptionsResponse {
  captions: CarCaption[];
}

interface YouTubeAuthResponse {
  auth_url?: string;
  error?: string;
}

interface YouTubeUploadData {
  deliverable_id: string;
  title: string;
  description: string;
  tags: string[];
  privacy_status: string;
}

interface YouTubeUploadResponse {
  success?: boolean;
  youtube_url?: string;
  video_id?: string;
  requires_auth?: boolean;
  auth_url?: string;
  setup_required?: boolean;
  details?: string;
  error?: string;
}

interface LogoutResponse {
  success?: boolean;
  error?: string;
}

const YouTubeUploadHelper: React.FC<YouTubeUploadHelperProps> = ({
  deliverable,
}) => {
  const api = useAPI();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<YouTubeAuthStatus>({
    isAuthenticated: false,
    channels: [],
  });
  const [title, setTitle] = useState(
    deliverable.title || `${deliverable.title} - ${deliverable.type}`
  );
  const [description, setDescription] = useState(
    deliverable.description || `Video deliverable for ${deliverable.title}`
  );
  const [tags, setTags] = useState(
    deliverable.tags?.join(", ") || "automotive"
  );
  const [showUploadInfo, setShowUploadInfo] = useState(false);
  const [captions, setCaptions] = useState<CarCaption[]>([]);
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string>("");
  const [useCustomDescription, setUseCustomDescription] = useState(true);
  const [editableCaption, setEditableCaption] = useState<string>("");

  // Resume upload after authentication (if coming back from auth)
  useEffect(() => {
    if (!api) return;

    // Listen for popup messages
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "youtube-auth-success") {
        // Authentication successful via popup
        checkAuthStatus();
        toast.success("YouTube authentication successful!");
      } else if (event.data.type === "youtube-auth-error") {
        // Authentication failed via popup
        toast.error(`Authentication failed: ${event.data.error}`);
      }
    };

    window.addEventListener("message", handleMessage);

    // Handle redirect-based authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("youtube_auth_success") === "true") {
      const storedDeliverableId = sessionStorage.getItem(
        "youtube_upload_deliverable_id"
      );
      if (storedDeliverableId === deliverable._id?.toString()) {
        // Restore form data
        const storedTitle = sessionStorage.getItem("youtube_upload_title");
        const storedDescription = sessionStorage.getItem(
          "youtube_upload_description"
        );
        const storedTags = sessionStorage.getItem("youtube_upload_tags");

        if (storedTitle) setTitle(storedTitle);
        if (storedDescription) setDescription(storedDescription);
        if (storedTags) setTags(storedTags);

        // Clear session storage
        sessionStorage.removeItem("youtube_upload_deliverable_id");
        sessionStorage.removeItem("youtube_upload_title");
        sessionStorage.removeItem("youtube_upload_description");
        sessionStorage.removeItem("youtube_upload_tags");

        // Check if modal should be reopened
        const shouldOpenModal = urlParams.get("youtube_modal_open") === "true";
        if (shouldOpenModal) {
          setIsOpen(true);
        }

        // Clear the URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        toast.success("YouTube authentication successful!");
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [deliverable._id, api]);

  // Authentication check - don't render if not authenticated
  if (!api) {
    return null;
  }

  // Check YouTube authentication status
  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      const data = await api.get<YouTubeAuthStatus>("youtube/auth/status");
      setAuthStatus(data);
    } catch (error: any) {
      console.error("Error checking auth status:", error);
      toast.error("Failed to check YouTube authentication status");
      setAuthStatus({ isAuthenticated: false, channels: [] });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Fetch captions for the car
  const fetchCaptions = async () => {
    if (!deliverable.car_id) {
      console.log("No car_id available for fetching captions");
      return;
    }

    setLoadingCaptions(true);
    try {
      const data = await api.get<CaptionsResponse>(
        `cars/${deliverable.car_id}/captions`
      );
      setCaptions(data.captions || []);
    } catch (error: any) {
      console.error("Error fetching captions:", error);
      toast.error("Failed to fetch captions");
      setCaptions([]);
    } finally {
      setLoadingCaptions(false);
    }
  };

  // Handle YouTube authentication
  const handleAuthenticate = async () => {
    try {
      // Store the current upload intent so we can resume after auth
      sessionStorage.setItem(
        "youtube_upload_deliverable_id",
        deliverable._id?.toString() || ""
      );
      sessionStorage.setItem("youtube_upload_title", title);
      sessionStorage.setItem("youtube_upload_description", description);
      sessionStorage.setItem("youtube_upload_tags", tags);

      // Get auth URL from API
      const data = await api.get<YouTubeAuthResponse>("youtube/auth/start");

      if (data.auth_url) {
        // Try popup authentication first
        try {
          toast("Opening authentication popup...", { icon: "ℹ️" });
          const authResult = await authenticateWithPopup(data.auth_url);
          if (authResult.success) {
            // Re-check auth status and continue with upload
            await checkAuthStatus();
            toast.success("YouTube authentication successful!");
            return;
          }
        } catch (popupError: any) {
          console.warn(
            "Popup authentication failed, falling back to redirect:",
            popupError
          );
          if (popupError?.message?.includes("blocked")) {
            toast.error(
              "Popup was blocked by browser. Falling back to redirect method..."
            );
          } else {
            toast.error(
              "Popup authentication failed. Trying redirect method..."
            );
          }
        }

        // Fallback to redirect method if popup fails
        toast(
          "🎯 IMPORTANT: To upload to the MotiveArchiveMedia channel:\n\n" +
            "1. On the next screen, you'll see 'Choose an account'\n" +
            "2. Look for the MotiveArchiveMedia Google account (NOT your personal account)\n" +
            "3. If you don't see it, click 'Use another account' and sign in with the brand account credentials\n" +
            "4. Make sure you're authenticating AS the brand account, not your personal account",
          {
            duration: 12000,
            style: {
              backgroundColor: "#dc2626",
              color: "white",
              fontSize: "14px",
              lineHeight: "1.4",
              whiteSpace: "pre-line",
              maxWidth: "500px",
            },
          }
        );

        // Store current page state for better redirect using cookies
        document.cookie = `youtube_auth_return_url=${encodeURIComponent(window.location.href)}; path=/; max-age=3600`;
        document.cookie = `youtube_auth_modal_open=true; path=/; max-age=3600`;

        setTimeout(() => {
          window.location.href = data.auth_url!;
        }, 3000);
      } else {
        toast.error("Failed to start authentication");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error("Failed to start authentication");
    }
  };

  // Popup authentication method
  const authenticateWithPopup = (
    authUrl: string
  ): Promise<{ success: boolean }> => {
    return new Promise((resolve, reject) => {
      // Add popup parameter to auth URL for better detection
      const popupAuthUrl = authUrl.includes("?")
        ? `${authUrl}&popup=true`
        : `${authUrl}?popup=true`;

      // Open popup window
      const popup = window.open(
        popupAuthUrl,
        "youtube-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no"
      );

      if (!popup) {
        reject(new Error("Popup blocked by browser"));
        return;
      }

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "youtube-auth-success") {
          window.removeEventListener("message", handleMessage);
          resolve({ success: true });
        } else if (event.data.type === "youtube-auth-error") {
          window.removeEventListener("message", handleMessage);
          reject(new Error(`Authentication failed: ${event.data.error}`));
        }
      };

      window.addEventListener("message", handleMessage);

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener("message", handleMessage);
          reject(new Error("Authentication cancelled - popup was closed"));
          return;
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener("message", handleMessage);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error("Authentication timeout"));
      }, 300000);
    });
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Please provide a title");
      return;
    }

    if (!deliverable._id) {
      toast.error("Deliverable ID is missing. Cannot upload to YouTube.");
      return;
    }

    setIsUploading(true);
    try {
      console.log("Starting YouTube upload for deliverable:", deliverable._id);
      console.log("Dropbox link:", deliverable.dropbox_link);

      const deliverableId = String(deliverable._id!);

      const uploadData: YouTubeUploadData = {
        deliverable_id: deliverableId,
        title: title,
        description: getDescriptionForUpload(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        privacy_status: "private", // Default to private for user uploads
      };

      const response = await api.post<YouTubeUploadResponse>(
        "youtube/upload",
        uploadData
      );

      if (!response.success) {
        // Handle authentication errors
        if (response.requires_auth || response.auth_url) {
          toast.error("YouTube authentication required");
          return;
        } else if (response.setup_required) {
          toast.error("YouTube setup required");
          return;
        }

        // Handle other errors
        const errorMessage =
          response.details || response.error || "Upload failed";
        console.error("YouTube upload error:", errorMessage);

        // Handle specific "no YouTube channels" error
        if (errorMessage.includes("No YouTube channels found")) {
          toast.error(
            "You need to create a YouTube channel first. Visit youtube.com, sign in, and create a channel.",
            { duration: 6000 }
          );
          return;
        }

        throw new Error(errorMessage);
      }

      console.log("YouTube upload successful:", response);
      toast.success(
        `Video uploaded to YouTube successfully! ${response.youtube_url ? `\nVideo ID: ${response.video_id}` : ""}`
      );
      setIsOpen(false);

      // Refresh the page to show updated social media link
      window.location.reload();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload video"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleAuthorize = () => {
    // This method is no longer used in the new authentication flow
  };

  const handleClick = async () => {
    await checkAuthStatus();
    await fetchCaptions(); // Fetch captions when dialog opens

    if (!authStatus.isAuthenticated) {
      // Show auth prompt
      setIsOpen(true);
    } else {
      // Proceed with upload
      setIsOpen(true);
    }
  };

  // Get the description to use for upload
  const getDescriptionForUpload = (): string => {
    if (useCustomDescription) {
      return description;
    }

    return editableCaption || description;
  };

  // Format caption preview for dropdown
  const formatCaptionPreview = (caption: CarCaption): string => {
    const preview =
      caption.caption.length > 100
        ? caption.caption.substring(0, 100) + "..."
        : caption.caption;
    return `${caption.platform} - ${preview}`;
  };

  // Don't show button if no Dropbox link or not a video
  const isVideoType = [
    "Video",
    "Video Gallery",
    "feature",
    "promo",
    "review",
    "walkthrough",
    "highlights",
  ].includes(deliverable.type);

  if (!deliverable.dropbox_link || !isVideoType) {
    return null;
  }

  // Handle logout/clear authentication
  const handleLogout = async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem("youtube_upload_deliverable_id");
      sessionStorage.removeItem("youtube_upload_title");
      sessionStorage.removeItem("youtube_upload_description");
      sessionStorage.removeItem("youtube_upload_tags");

      // Clear cookies by making a request to clear them server-side
      await api.post("/youtube/auth/logout", {});

      // Reset auth status
      setAuthStatus({ isAuthenticated: false, channels: [] });

      toast.success(
        "YouTube authentication cleared. You can now re-authenticate with the correct account."
      );
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to clear authentication");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isCheckingAuth}
        className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-800 flex-1"
        title="Upload to YouTube"
      >
        <Play className="h-4 w-4 mr-2" />
        Upload to YouTube
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">
              Upload to YouTube
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {!authStatus.isAuthenticated ? (
              <div className="space-y-4 p-1">
                <div className="flex items-center space-x-2 text-amber-600">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">
                    YouTube authentication required
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  You need to authenticate with your YouTube account to upload
                  videos. This will allow you to upload to your own YouTube
                  channel.
                </p>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAuthenticate}>
                    Authenticate with YouTube
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-1">
                {/* Collapsible upload destination info */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    onClick={() => setShowUploadInfo(!showUploadInfo)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        Upload Destination Info
                      </span>
                    </div>
                    {showUploadInfo ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  {showUploadInfo && (
                    <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
                      <div className="space-y-2">
                        <div className="break-words">
                          Videos will be uploaded to the{" "}
                          <strong>first channel</strong> associated with your
                          authenticated Google account. If you're authenticated
                          with your personal account, uploads will go to your
                          personal channel even if you have access to brand
                          accounts.
                        </div>
                        <div className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border-l-2 border-blue-400 break-words">
                          <strong>To upload to MotiveArchiveMedia:</strong>{" "}
                          Clear your authentication below and re-authenticate
                          directly with the MotiveArchiveMedia Google account.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Check if we have the personal channel in the list - this indicates potential upload issues */}
                {authStatus.channels.length > 0 &&
                  authStatus.channels.some(
                    (c) => c.id === "UCAy_HWd9o_G3PT_CBL0tV-Q"
                  ) && (
                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <div className="space-y-2">
                          <div className="font-medium">
                            ⚠️ Authentication Issue Detected
                          </div>
                          <div className="break-words">
                            You're authenticated with your personal Google
                            account which includes access to your personal
                            Andrew Brady channel. While the system can detect
                            the MotiveArchiveMedia brand account, uploads may
                            still go to your personal channel due to YouTube's
                            default behavior. For best results, re-authenticate
                            and explicitly select only the MotiveArchiveMedia
                            account during sign-in.
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAuthenticate}
                            className="mt-2"
                          >
                            Re-authenticate with Brand Account Only
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Always show logout option when authenticated */}
                {authStatus.isAuthenticated && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                    <div className="text-sm min-w-0 flex-1 mr-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Current Authentication Status
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {authStatus.channels.length} channel(s) accessible
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 flex-shrink-0"
                    >
                      <span className="hidden sm:inline">
                        Clear & Re-authenticate
                      </span>
                      <span className="sm:hidden">Clear Auth</span>
                    </Button>
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-base font-medium">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter video title"
                    className="text-base"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Description</Label>

                  {/* Description mode selection */}
                  <RadioGroup
                    value={useCustomDescription ? "custom" : "caption"}
                    onValueChange={(value) => {
                      const useCustom = value === "custom";
                      setUseCustomDescription(useCustom);
                      if (useCustom) {
                        setSelectedCaptionId("");
                        setEditableCaption("");
                      }
                    }}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="cursor-pointer">
                        Custom Description
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="caption" id="caption" />
                      <Label htmlFor="caption" className="cursor-pointer">
                        Use Saved Caption
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Content based on selection */}
                  {useCustomDescription ? (
                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className="text-sm text-muted-foreground"
                      >
                        Enter your custom video description
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Video description"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Select from existing captions for this car
                        </Label>
                        <Select
                          value={selectedCaptionId}
                          onValueChange={(value) => {
                            setSelectedCaptionId(value);
                            const selectedCaption = captions.find(
                              (c) => c._id === value
                            );
                            if (selectedCaption) {
                              setEditableCaption(selectedCaption.caption);
                            }
                          }}
                          disabled={loadingCaptions}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                loadingCaptions
                                  ? "Loading captions..."
                                  : captions.length === 0
                                    ? "No captions available for this car"
                                    : "Select a caption to use as description"
                              }
                            >
                              {selectedCaptionId && (
                                <span className="truncate block max-w-full">
                                  {(() => {
                                    const selectedCaption = captions.find(
                                      (c) => c._id === selectedCaptionId
                                    );
                                    if (selectedCaption) {
                                      return selectedCaption.caption.length > 50
                                        ? selectedCaption.caption.substring(
                                            0,
                                            50
                                          ) + "..."
                                        : selectedCaption.caption;
                                    }
                                    return "";
                                  })()}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60 w-full">
                            {captions.map((caption) => (
                              <SelectItem
                                key={caption._id}
                                value={caption._id}
                                className="py-3 max-w-full"
                              >
                                <div className="text-sm leading-relaxed break-words w-full max-w-full overflow-hidden">
                                  <div className="font-medium text-xs text-muted-foreground mb-1 truncate">
                                    {caption.platform} • {caption.context}
                                  </div>
                                  <div className="line-clamp-3">
                                    {caption.caption.length > 100
                                      ? caption.caption.substring(0, 100) +
                                        "..."
                                      : caption.caption}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Selected caption editor */}
                      {selectedCaptionId && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="editableCaption"
                            className="text-sm text-muted-foreground"
                          >
                            Edit selected caption (you can modify text, copy
                            title, etc.)
                          </Label>
                          <Textarea
                            id="editableCaption"
                            value={editableCaption}
                            onChange={(e) => setEditableCaption(e.target.value)}
                            rows={6}
                            className="resize-none bg-muted/50 border-muted"
                            placeholder="Caption content will appear here..."
                          />
                        </div>
                      )}

                      {captions.length === 0 && !loadingCaptions && (
                        <div className="p-4 text-center border-2 border-dashed border-muted rounded-lg">
                          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-1">
                            No captions available
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Create captions for this car to use them as video
                            descriptions
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">Tags</Label>
                  <div className="space-y-2">
                    <Label
                      htmlFor="tags"
                      className="text-sm text-muted-foreground"
                    >
                      Enter comma-separated tags for better video
                      discoverability
                    </Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="automotive, car, review, luxury"
                      className="text-base"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed footer with action buttons */}
          <div className="flex-shrink-0 border-t pt-4">
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              {authStatus.isAuthenticated && (
                <Button
                  onClick={handleUpload}
                  disabled={
                    isUploading ||
                    authStatus.channels.length === 0 ||
                    (!useCustomDescription && !editableCaption.trim())
                  }
                  className="min-w-[140px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Uploading...</span>
                      <span className="sm:hidden">Upload...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">
                        Upload to YouTube
                      </span>
                      <span className="sm:hidden">Upload</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YouTubeUploadHelper;
