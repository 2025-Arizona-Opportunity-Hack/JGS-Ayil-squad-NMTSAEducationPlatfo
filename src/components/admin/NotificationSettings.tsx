import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Save, Mail, MessageSquare } from "lucide-react";

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  contentAccessGranted: {
    label: "Content Access Granted",
    description: "When a user is given access to content",
  },
  joinRequestApproved: {
    label: "Join Request Approved",
    description: "When a join request is approved by an admin",
  },
  purchaseRequestApproved: {
    label: "Purchase Approved",
    description: "When a purchase request is approved",
  },
  purchaseRequestDenied: {
    label: "Purchase Denied",
    description: "When a purchase request is denied",
  },
  recommendationSent: {
    label: "Recommendation Sent",
    description: "When a professional recommends content to a user",
  },
  verificationEmail: {
    label: "Email Verification",
    description: "Verification emails for new join requests",
  },
};

export function NotificationSettings() {
  const settings = useQuery(api.notificationSettings.getNotificationSettings);
  const updateSettings = useMutation(
    api.notificationSettings.updateNotificationSettings
  );
  const refreshChannels = useMutation(
    api.notificationSettings.triggerChannelStatusRefresh
  );

  const [localEvents, setLocalEvents] = useState<Record<
    string,
    { email: boolean; sms: boolean }
  > | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync local state with server
  useEffect(() => {
    if (settings?.events && !localEvents) {
      setLocalEvents(
        settings.events as Record<string, { email: boolean; sms: boolean }>
      );
    }
  }, [settings, localEvents]);

  const handleToggle = (
    eventName: string,
    channel: "email" | "sms",
    value: boolean
  ) => {
    setLocalEvents((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [eventName]: { ...prev[eventName], [channel]: value },
      };
    });
  };

  const handleSave = async () => {
    if (!localEvents) return;
    setSaving(true);
    try {
      await updateSettings({
        events: localEvents as {
          contentAccessGranted: { email: boolean; sms: boolean };
          joinRequestApproved: { email: boolean; sms: boolean };
          purchaseRequestApproved: { email: boolean; sms: boolean };
          purchaseRequestDenied: { email: boolean; sms: boolean };
          recommendationSent: { email: boolean; sms: boolean };
          verificationEmail: { email: boolean; sms: boolean };
        },
      });
      toast.success("Notification settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshChannels = async () => {
    setRefreshing(true);
    try {
      await refreshChannels();
      toast.success("Channel status refresh scheduled");
    } catch {
      toast.error("Failed to refresh channel status");
    } finally {
      setRefreshing(false);
    }
  };

  if (!settings || !localEvents) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how notifications are sent for each event.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshChannels}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Status
          </Button>
        </div>

        {/* Channel status badges */}
        <div className="flex gap-2 mt-2">
          <Badge variant={settings.emailConfigured ? "default" : "secondary"}>
            <Mail className="h-3 w-3 mr-1" />
            Email {settings.emailConfigured ? "Configured" : "Not Configured"}
          </Badge>
          <Badge variant={settings.smsConfigured ? "default" : "secondary"}>
            <MessageSquare className="h-3 w-3 mr-1" />
            SMS {settings.smsConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Table header */}
          <div className="grid grid-cols-[1fr,auto,auto] gap-4 text-sm font-medium text-muted-foreground px-2">
            <span>Event</span>
            <span className="w-16 text-center">Email</span>
            <span className="w-16 text-center">SMS</span>
          </div>

          {/* Event rows */}
          {Object.entries(EVENT_LABELS).map(
            ([eventName, { label, description }]) => {
              const event = localEvents[eventName];
              if (!event) return null;

              return (
                <div
                  key={eventName}
                  className="grid grid-cols-[1fr,auto,auto] gap-4 items-center px-2 py-2 rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <div className="w-16 flex justify-center">
                    <Switch
                      checked={event.email}
                      onCheckedChange={(v) =>
                        handleToggle(eventName, "email", v)
                      }
                      disabled={!settings.emailConfigured}
                      aria-label={`${label} email notifications`}
                    />
                  </div>
                  <div className="w-16 flex justify-center">
                    <Switch
                      checked={event.sms}
                      onCheckedChange={(v) =>
                        handleToggle(eventName, "sms", v)
                      }
                      disabled={!settings.smsConfigured}
                      aria-label={`${label} SMS notifications`}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
