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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, ArrowRight } from "lucide-react";

interface ProfileStepProps {
  data: SetupData;
  updateData: (partial: Partial<SetupData>) => void;
  onComplete: () => void;
}

export function ProfileStep({ data, updateData, onComplete }: ProfileStepProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(
    api.users.generateProfilePictureUploadUrl
  );

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);

      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      updateData({ profilePictureId: storageId });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const isValid = data.firstName.trim() && data.lastName.trim();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Your Profile</CardTitle>
        <CardDescription>Tell us about yourself.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar upload */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Upload profile picture"
            disabled={uploading}
          >
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback className="text-lg">
                {data.firstName?.[0]?.toUpperCase() || "?"}
                {data.lastName?.[0]?.toUpperCase() || ""}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        {/* Name fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => updateData({ firstName: e.target.value })}
              placeholder="Enter your first name"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => updateData({ lastName: e.target.value })}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <Button
          onClick={onComplete}
          disabled={!isValid || uploading}
          className="w-full"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
