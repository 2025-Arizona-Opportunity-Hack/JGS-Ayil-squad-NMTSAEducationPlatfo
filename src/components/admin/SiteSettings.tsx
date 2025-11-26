import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Palette,
  FileText,
  Save,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Predefined color schemes
const colorSchemes = [
  { name: "Blue", primary: "#3b82f6", secondary: "#60a5fa" },
  { name: "Purple", primary: "#8b5cf6", secondary: "#a78bfa" },
  { name: "Green", primary: "#10b981", secondary: "#34d399" },
  { name: "Orange", primary: "#f97316", secondary: "#fb923c" },
  { name: "Pink", primary: "#ec4899", secondary: "#f472b6" },
  { name: "Teal", primary: "#14b8a6", secondary: "#2dd4bf" },
  { name: "Red", primary: "#ef4444", secondary: "#f87171" },
  { name: "Indigo", primary: "#6366f1", secondary: "#818cf8" },
];

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function SiteSettings() {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const updateSiteSettings = useMutation(api.siteSettings.updateSiteSettings);
  const generateLogoUploadUrl = useMutation(api.siteSettings.generateLogoUploadUrl);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  // Initialize form with current settings
  useEffect(() => {
    if (siteSettings) {
      setOrganizationName(siteSettings.organizationName || "");
      setTagline(siteSettings.tagline || "");
      setDescription(siteSettings.description || "");
      setPrimaryColor(siteSettings.primaryColor || "#3b82f6");
      setLogoPreview(siteSettings.logoUrl || null);
    }
  }, [siteSettings]);

  // Track changes
  useEffect(() => {
    if (siteSettings) {
      const changed =
        organizationName !== (siteSettings.organizationName || "") ||
        tagline !== (siteSettings.tagline || "") ||
        description !== (siteSettings.description || "") ||
        primaryColor !== (siteSettings.primaryColor || "#3b82f6") ||
        logoFile !== null;
      setHasChanges(changed);
    }
  }, [organizationName, tagline, description, primaryColor, logoFile, siteSettings]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    if (siteSettings) {
      setOrganizationName(siteSettings.organizationName || "");
      setTagline(siteSettings.tagline || "");
      setDescription(siteSettings.description || "");
      setPrimaryColor(siteSettings.primaryColor || "#3b82f6");
      setLogoPreview(siteSettings.logoUrl || null);
      setLogoFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving settings...");

    try {
      let logoId: string | undefined;

      // Upload new logo if selected
      if (logoFile) {
        const uploadUrl = await generateLogoUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });
        const { storageId } = await response.json();
        logoId = storageId;
      }

      await updateSiteSettings({
        organizationName: organizationName.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        logoId: logoId as any,
        primaryColor: primaryColor || undefined,
      });

      setLogoFile(null);
      toast.success("Settings saved successfully!", { id: toastId });
    } catch (error) {
      console.error("Save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!siteSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Site Settings</h2>
        <p className="text-muted-foreground mt-2">
          Customize your site's branding and appearance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Info
            </CardTitle>
            <CardDescription>
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orgName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your organization name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A short phrase describing your services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your organization and services..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Logo and visual identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                {/* Logo Preview / Placeholder */}
                <div className="flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 object-contain rounded-lg border bg-white p-1"
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ 
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                      }}
                    >
                      {getInitials(organizationName)}
                    </div>
                  )}
                </div>
                
                {/* Upload Area */}
                <div className="flex-1 space-y-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {logoPreview ? "Change logo" : "Upload logo"}
                      </span>
                    </div>
                  </div>
                  {!logoPreview && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      No logo? We'll use initials with your brand color
                    </p>
                  )}
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLogoPreview(null);
                        setLogoFile(null);
                      }}
                      className="text-xs text-muted-foreground h-auto p-0"
                    >
                      Remove logo
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </div>

            {/* Color Scheme */}
            <div className="space-y-3">
              <Label>Color Scheme</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.name}
                    onClick={() => {
                      setSelectedScheme(scheme.name);
                      setPrimaryColor(scheme.primary);
                    }}
                    className={`relative p-2 rounded-lg border-2 transition-all ${
                      selectedScheme === scheme.name || (selectedScheme === null && primaryColor === scheme.primary)
                        ? "border-gray-900 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex gap-0.5">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: scheme.primary }}
                        />
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: scheme.secondary }}
                        />
                      </div>
                      <span className="text-[10px] font-medium">{scheme.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-sm text-muted-foreground">
                Or use a custom color
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setSelectedScheme(null);
                  }}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setSelectedScheme(null);
                  }}
                  placeholder="#3b82f6"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Preview
          </CardTitle>
          <CardDescription>
            See how your branding will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-6">
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  }}
                >
                  {getInitials(organizationName)}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">
                  {organizationName || "Your Organization"}
                </h3>
                {tagline && (
                  <p className="text-muted-foreground">{tagline}</p>
                )}
              </div>
            </div>
            {description && (
              <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
                {description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSubmitting}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
