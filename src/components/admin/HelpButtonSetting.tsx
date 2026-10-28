import { useId, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpButton } from "../guides/HelpButton";

/**
 * Site setting for the header's Help button. Saves on toggle, like the
 * notification switches beside it, rather than waiting for the branding form's
 * Save button above — a switch that silently did nothing until a distant
 * button was pressed would be easy to miss.
 */
export function HelpButtonSetting() {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const updateSiteSettings = useMutation(api.siteSettings.updateSiteSettings);
  // Holds the requested value while saving, so the switch doesn't flick back
  // to the old one until the server confirms.
  const [pending, setPending] = useState<boolean | null>(null);
  const switchId = useId();
  const descriptionId = useId();

  const saved = siteSettings?.prominentHelpButton === true;
  const shown = pending ?? saved;

  const handleChange = async (checked: boolean) => {
    setPending(checked);
    try {
      await updateSiteSettings({ prominentHelpButton: checked });
      toast.success(checked ? "The larger Help button is on" : "The larger Help button is off");
    } catch {
      toast.error("Couldn't save the Help button setting. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" aria-hidden="true" />
          Help button
        </CardTitle>
        <CardDescription>
          How the way into Help & Guides looks in the top bar, for clients and staff alike.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor={switchId}>Larger, labelled Help button</Label>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              Replaces the small question-mark icon with a button that says “Help”, so
              it's easier to spot. Changes save straight away.
            </p>
          </div>
          <Switch
            id={switchId}
            checked={shown}
            onCheckedChange={(checked) => void handleChange(checked)}
            disabled={pending !== null || siteSettings === undefined}
            aria-describedby={descriptionId}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-4">
          <span className="text-sm text-muted-foreground">Preview:</span>
          {/* A picture of the button, not a working one: inert keeps it out
              of the tab order and away from screen readers. */}
          <div inert>
            <HelpButton tone="admin" prominent={shown} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
