import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { SetupData } from "./SetupWizard";
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
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowRight, Check } from "lucide-react";

const COLOR_PRESETS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#10b981" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Red", value: "#ef4444" },
  { name: "Indigo", value: "#6366f1" },
];

interface OrganizationStepProps {
  data: SetupData;
  updateData: (partial: Partial<SetupData>) => void;
  onComplete: () => void;
}

export function OrganizationStep({
  data,
  updateData,
  onComplete,
}: OrganizationStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.siteSettings.generateLogoUploadUrl);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      updateData({ logoId: storageId });
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const isValid = data.organizationName.trim();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Your Organization</CardTitle>
        <CardDescription>
          Set up your platform&apos;s identity and notification preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo upload */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
            aria-label="Upload organization logo"
            disabled={uploading}
          >
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-contain rounded-xl"
              />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Org name */}
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name *</Label>
          <Input
            id="orgName"
            value={data.organizationName}
            onChange={(e) => updateData({ organizationName: e.target.value })}
            placeholder="e.g., NMTSA Education"
            autoFocus
          />
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={data.tagline}
            onChange={(e) => updateData({ tagline: e.target.value })}
            placeholder="e.g., Empowering learners everywhere"
          />
        </div>

        {/* Color scheme */}
        <div className="space-y-2">
          <Label>Brand Color</Label>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => updateData({ primaryColor: color.value })}
                className={`h-10 rounded-lg border-2 transition-all ${
                  data.primaryColor === color.value
                    ? "border-foreground scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={`Select ${color.name}`}
                aria-pressed={data.primaryColor === color.value}
              >
                {data.primaryColor === color.value && (
                  <Check className="h-4 w-4 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notification defaults */}
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Default Notification Channels</h3>
          <p className="text-xs text-muted-foreground">
            Choose how users receive notifications. You can customize per-event
            later in settings.
          </p>
          <div className="flex items-center justify-between">
            <Label htmlFor="defaultEmail" className="cursor-pointer">
              Email notifications
            </Label>
            <Switch
              id="defaultEmail"
              checked={data.defaultEmail}
              onCheckedChange={(checked) =>
                updateData({ defaultEmail: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="defaultSms" className="cursor-pointer">
              SMS notifications
            </Label>
            <Switch
              id="defaultSms"
              checked={data.defaultSms}
              onCheckedChange={(checked) => updateData({ defaultSms: checked })}
            />
          </div>
        </div>

        <Button
          onClick={onComplete}
          disabled={!isValid || uploading}
          className="w-full"
        >
          Complete Setup
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
