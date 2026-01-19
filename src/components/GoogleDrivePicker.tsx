import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Google API configuration
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID;

// Scopes needed for Google Drive access
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

interface GoogleDrivePickerProps {
  onFileSelected: (file: File) => void;
  accept?: string; // e.g., "video/*", "audio/*", "image/*"
  disabled?: boolean;
  onPickerOpen?: () => void;
  onPickerClose?: () => void;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export function GoogleDrivePicker({
  onFileSelected,
  accept = "video/*",
  disabled = false,
  onPickerOpen,
  onPickerClose,
}: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load Google API scripts
  useEffect(() => {
    const loadGoogleApis = async () => {
      // Load the Google API client library
      if (!document.getElementById("google-api-script")) {
        const gapiScript = document.createElement("script");
        gapiScript.id = "google-api-script";
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.async = true;
        gapiScript.defer = true;
        document.body.appendChild(gapiScript);
      }

      // Load the Google Identity Services library
      if (!document.getElementById("google-gsi-script")) {
        const gsiScript = document.createElement("script");
        gsiScript.id = "google-gsi-script";
        gsiScript.src = "https://accounts.google.com/gsi/client";
        gsiScript.async = true;
        gsiScript.defer = true;
        document.body.appendChild(gsiScript);
      }

      // Wait for scripts to load
      const waitForScripts = () => {
        return new Promise<void>((resolve) => {
          const checkLoaded = () => {
            if (window.gapi && window.google) {
              resolve();
            } else {
              setTimeout(checkLoaded, 100);
            }
          };
          checkLoaded();
        });
      };

      await waitForScripts();

      // Load the picker API
      await new Promise<void>((resolve) => {
        window.gapi.load("picker", { callback: resolve });
      });

      setIsApiLoaded(true);
    };

    loadGoogleApis();
  }, []);

  // Get access token using Google Identity Services
  const getAccessToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            setAccessToken(response.access_token);
            resolve(response.access_token);
          }
        },
      });

      // Request access token - will prompt user if not already authorized
      if (accessToken) {
        resolve(accessToken);
      } else {
        tokenClient.requestAccessToken({ prompt: "" });
      }
    });
  }, [accessToken]);

  // Download file from Google Drive
  const downloadFile = async (
    fileId: string,
    fileName: string,
    mimeType: string,
    token: string
  ): Promise<File> => {
    toast.loading("Downloading file from Google Drive...", { id: "drive-download" });

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log("[GoogleDrive] Downloaded blob:", {
      blobSize: blob.size,
      blobType: blob.type,
      expectedMimeType: mimeType,
      fileName,
    });

    // Use blob.type if available and mimeType seems generic, otherwise use provided mimeType
    const effectiveMimeType = blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : mimeType;

    const file = new File([blob], fileName, { type: effectiveMimeType });
    console.log("[GoogleDrive] Created file:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    toast.success("File downloaded successfully!", { id: "drive-download" });
    return file;
  };

  // Build and show the picker
  const openPicker = async () => {
    if (!isApiLoaded) {
      toast.error("Google API is still loading. Please try again.");
      return;
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
      toast.error("Google Drive integration is not configured.");
      console.error("Missing VITE_GOOGLE_API_KEY or VITE_GOOGLE_CLIENT_ID");
      return;
    }

    setIsLoading(true);

    try {
      const token = await getAccessToken();

      // Determine MIME types based on accept prop
      let mimeTypes: string[] = [];
      if (accept.includes("video")) {
        mimeTypes = [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/quicktime",
          "video/x-msvideo",
          "video/x-matroska",
        ];
      } else if (accept.includes("audio")) {
        mimeTypes = [
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
          "audio/mp4",
          "audio/webm",
        ];
      } else if (accept.includes("image")) {
        mimeTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/svg+xml",
        ];
      } else if (accept.includes("pdf")) {
        mimeTypes = ["application/pdf"];
      }

      // Build the picker view
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      if (mimeTypes.length > 0) {
        view.setMimeTypes(mimeTypes.join(","));
      }

      // Create and show the picker
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(GOOGLE_APP_ID)
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .addView(view)
        .addView(new window.google.picker.DocsUploadView())
        .setCallback(async (data: any) => {
          // Picker was closed (either by picking a file or canceling)
          if (data.action === window.google.picker.Action.PICKED) {
            const document = data.docs[0];
            try {
              const file = await downloadFile(
                document.id,
                document.name,
                document.mimeType,
                token
              );
              onFileSelected(file);
            } catch (error) {
              console.error("Error downloading file:", error);
              toast.error("Failed to download file from Google Drive");
            }
          }

          // Call onPickerClose when picker is dismissed (CANCEL or PICKED)
          if (data.action === window.google.picker.Action.CANCEL ||
              data.action === window.google.picker.Action.PICKED) {
            onPickerClose?.();
          }

          setIsLoading(false);
        })
        .build();

      // Notify that picker is opening
      onPickerOpen?.();
      picker.setVisible(true);
    } catch (error) {
      console.error("Error opening Google Drive picker:", error);
      toast.error("Failed to open Google Drive. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={openPicker}
      disabled={disabled || isLoading || !isApiLoaded}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Cloud className="w-4 h-4" />
      )}
      {isLoading ? "Loading..." : "Import from Google Drive"}
    </Button>
  );
}
