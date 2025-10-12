import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Trash2 } from "lucide-react";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
  currentProfile: {
    firstName: string;
    lastName: string;
    profilePictureId?: string;
    profilePictureUrl?: string;
  };
}

export function ProfileEditModal({
  isOpen,
  onClose,
  onProfileUpdated,
  currentProfile,
}: ProfileEditModalProps) {
  const [firstName, setFirstName] = useState(currentProfile.firstName);
  const [lastName, setLastName] = useState(currentProfile.lastName);
  const [profilePictureId, setProfilePictureId] = useState(
    currentProfile.profilePictureId
  );
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    currentProfile.profilePictureUrl
  );

  // Reset form when modal opens or currentProfile changes
  React.useEffect(() => {
    if (isOpen) {
      setFirstName(currentProfile.firstName);
      setLastName(currentProfile.lastName);
      setProfilePictureId(currentProfile.profilePictureId);
      setProfilePictureUrl(currentProfile.profilePictureUrl);
    }
  }, [isOpen, currentProfile]);

  // Cleanup temporary URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (profilePictureUrl && profilePictureUrl.startsWith("blob:")) {
        URL.revokeObjectURL(profilePictureUrl);
      }
    };
  }, [profilePictureUrl]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(
    api.users.generateProfilePictureUploadUrl
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Upload failed: ${result.status} ${errorText}`);
      }

      const responseData = await result.json();
      const { storageId } = responseData;
      setProfilePictureId(storageId);

      // Create a temporary URL for immediate preview
      const tempUrl = URL.createObjectURL(file);
      setProfilePictureUrl(tempUrl);

      toast.success("Profile picture uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload profile picture: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = () => {
    // Clean up any temporary URL
    if (profilePictureUrl && profilePictureUrl.startsWith("blob:")) {
      URL.revokeObjectURL(profilePictureUrl);
    }

    setProfilePictureId(undefined);
    setProfilePictureUrl(undefined);
    toast.success("Profile picture removed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter both first and last name");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        profilePictureId: profilePictureId as any,
      });
      toast.success("Profile updated successfully");
      onProfileUpdated?.();
      onClose();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the current profile picture URL, or show uploaded image preview
  const displayImageUrl = profilePictureUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and picture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={displayImageUrl} alt="Profile picture" />
                <AvatarFallback className="text-lg">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Change Picture"}
              </Button>
              {(profilePictureId || profilePictureUrl) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePicture}
                  disabled={isUploading}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFirstName">First Name</Label>
              <Input
                id="editFirstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLastName">Last Name</Label>
              <Input
                id="editLastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
