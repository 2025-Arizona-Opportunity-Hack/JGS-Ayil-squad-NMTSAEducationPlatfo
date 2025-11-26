import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Palette,
  FileText,
  ArrowRight,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SiteSetupProps {
  onComplete: () => void;
}

// Predefined color schemes
const colorSchemes = [
  { name: "Blue", primary: "#3b82f6", secondary: "#60a5fa", accent: "#1d4ed8" },
  { name: "Purple", primary: "#8b5cf6", secondary: "#a78bfa", accent: "#6d28d9" },
  { name: "Green", primary: "#10b981", secondary: "#34d399", accent: "#059669" },
  { name: "Orange", primary: "#f97316", secondary: "#fb923c", accent: "#ea580c" },
  { name: "Pink", primary: "#ec4899", secondary: "#f472b6", accent: "#db2777" },
  { name: "Teal", primary: "#14b8a6", secondary: "#2dd4bf", accent: "#0d9488" },
  { name: "Red", primary: "#ef4444", secondary: "#f87171", accent: "#dc2626" },
  { name: "Indigo", primary: "#6366f1", secondary: "#818cf8", accent: "#4f46e5" },
];

// Placeholder logo component
function PlaceholderLogo({ name, color, size = "lg" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-16 h-16 text-2xl",
    lg: "w-24 h-24 text-4xl",
  };
  
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}
      style={{ 
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      }}
    >
      {initials}
    </div>
  );
}

export function SiteSetup({ onComplete }: SiteSetupProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [selectedScheme, setSelectedScheme] = useState<string | null>("Blue");

  const completeSiteSetup = useMutation(api.siteSettings.completeSiteSetup);
  const generateLogoUploadUrl = useMutation(api.siteSettings.generateLogoUploadUrl);

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

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Setting up your site...");

    try {
      let logoId: string | undefined;

      // Upload logo if selected
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

      await completeSiteSetup({
        organizationName: organizationName.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        logoId: logoId as any,
        primaryColor: primaryColor || undefined,
      });

      toast.success("Site setup complete!", { id: toastId });
      onComplete();
    } catch (error) {
      console.error("Setup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to complete setup",
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !organizationName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-colors ${
                  s === step
                    ? "bg-primary"
                    : s < step
                      ? "bg-primary/60"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Step {step} of 3
          </p>
        </div>

        <Card className="shadow-xl border-0">
          {/* Step 1: Organization Name */}
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Welcome! Let's set up your site</CardTitle>
                <CardDescription className="text-base">
                  First, tell us about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-base">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="orgName"
                    placeholder="e.g., Neurological Music Therapy Services"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="text-lg h-12"
                    autoFocus
                  />
                  <p className="text-sm text-muted-foreground">
                    This will appear in the header and throughout your site
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-base">
                    Tagline (optional)
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Transforming lives through music therapy"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="h-12"
                  />
                  <p className="text-sm text-muted-foreground">
                    A short phrase that describes what you do
                  </p>
                </div>

                <Button
                  onClick={nextStep}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Step 2: Logo & Branding */}
          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Palette className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Add your branding</CardTitle>
                <CardDescription className="text-base">
                  Upload your logo and choose your color scheme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Logo Upload Section */}
                <div className="space-y-3">
                  <Label className="text-base">Logo</Label>
                  <div className="flex items-start gap-6">
                    {/* Logo Preview / Placeholder */}
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-24 h-24 object-contain rounded-xl border bg-white p-2"
                        />
                      ) : (
                        <PlaceholderLogo 
                          name={organizationName} 
                          color={primaryColor} 
                          size="lg" 
                        />
                      )}
                    </div>
                    
                    {/* Upload Area */}
                    <div className="flex-1 space-y-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium text-sm">
                              {logoPreview ? "Change logo" : "Upload your logo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, or SVG (max 5MB)
                            </p>
                          </div>
                        </div>
                      </div>
                      {!logoPreview && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          No logo? We'll use your initials with your brand color
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
                          className="text-xs text-muted-foreground"
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

                {/* Color Scheme Selector */}
                <div className="space-y-3">
                  <Label className="text-base">Color Scheme</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorSchemes.map((scheme) => (
                      <button
                        key={scheme.name}
                        onClick={() => {
                          setSelectedScheme(scheme.name);
                          setPrimaryColor(scheme.primary);
                        }}
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          selectedScheme === scheme.name
                            ? "border-gray-900 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-1">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: scheme.primary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: scheme.secondary }}
                            />
                          </div>
                          <span className="text-xs font-medium">{scheme.name}</span>
                        </div>
                        {selectedScheme === scheme.name && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Option */}
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
                      className="w-10 h-10 rounded-lg border cursor-pointer"
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1 h-12"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="flex-1 h-12"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Describe your services</CardTitle>
                <CardDescription className="text-base">
                  Tell visitors what your organization offers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="e.g., We provide evidence-based neurologic music therapy services to help individuals with neurological conditions improve their quality of life through the power of music..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be shown on your public pages
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Preview</p>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                      />
                    ) : (
                      <PlaceholderLogo 
                        name={organizationName} 
                        color={primaryColor} 
                        size="md" 
                      />
                    )}
                    <div>
                      <p className="font-semibold text-lg">{organizationName || "Your Organization"}</p>
                      {tagline && (
                        <p className="text-sm text-muted-foreground">{tagline}</p>
                      )}
                    </div>
                  </div>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                      {description}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1 h-12"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 h-12"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Complete Setup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          You can change these settings later in the admin dashboard
        </p>
      </div>
    </div>
  );
}
