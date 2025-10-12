import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<
    "client" | "professional" | "parent"
  >("client");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createProfile = useMutation(api.users.createUserProfile);
  const { signOut } = useAuthActions();

  // Get current user to check if they have a name from Google
  const user = useQuery(api.auth.loggedInUser);
  const hasNameFromAuth = user?.name && user.name.trim().length > 0;

  // Check if there's an invite code from sign up
  const inviteCode = localStorage.getItem("signupInviteCode");
  const inviteCodeValidation = useQuery(
    api.inviteCodes.validateInviteCode,
    inviteCode ? { code: inviteCode } : "skip"
  );

  // Auto-create profile if there's a valid invite code
  useEffect(() => {
    if (inviteCode && inviteCodeValidation?.valid && !submitting) {
      setSubmitting(true);
      createProfile({
        inviteCode,
        firstName: hasNameFromAuth ? undefined : firstName || undefined,
        lastName: hasNameFromAuth ? undefined : lastName || undefined,
      })
        .then(() => {
          // Clear invite code from localStorage
          localStorage.removeItem("signupInviteCode");
          toast.success(
            `Profile created with ${inviteCodeValidation.role} role!`
          );
        })
        .catch((error) => {
          console.error("Error creating profile with invite code:", error);
          // Clear invalid invite code
          localStorage.removeItem("signupInviteCode");
          setError("invite_code_error");
          setSubmitting(false);
        });
    }
  }, [
    inviteCode,
    inviteCodeValidation,
    createProfile,
    submitting,
    hasNameFromAuth,
    firstName,
    lastName,
  ]);

  const handleRoleSelection = async () => {
    // Validate name fields for non-Google users
    if (!hasNameFromAuth && (!firstName.trim() || !lastName.trim())) {
      toast.error("Please enter your first and last name");
      return;
    }

    setSubmitting(true);
    try {
      await createProfile({
        role: selectedRole,
        firstName: hasNameFromAuth ? undefined : firstName.trim(),
        lastName: hasNameFromAuth ? undefined : lastName.trim(),
        inviteCode: undefined, // No invite code in normal role selection
      });
    } catch (error) {
      console.error("Error creating profile:", error);

      // Handle duplicate email error
      if (error instanceof Error && error.message.includes("already exists")) {
        setError("duplicate");
        toast.error("Account Already Exists", {
          description:
            "An account with this email already exists. Please sign in instead.",
        });
      } else {
        setError("general");
        toast.error("Profile Creation Failed", {
          description: "Please try again or contact support.",
        });
      }
      setSubmitting(false);
    }
  };

  // Show loading state while processing invite code
  if (inviteCode && inviteCodeValidation === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">
                Validating your invite code...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while creating profile with invite code
  if (inviteCode && inviteCodeValidation?.valid && submitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">
                Setting up your {inviteCodeValidation.role} profile...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome to NMTSA!</CardTitle>
          <CardDescription>
            {hasNameFromAuth
              ? "Please select your role to personalize your experience."
              : "Please provide your information to set up your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">I am a...</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: "client" | "professional" | "parent") =>
                setSelectedRole(value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground mt-2">
              {selectedRole === "client" && (
                <p>
                  ✨ Access therapy resources, activities, and track your
                  progress
                </p>
              )}
              {selectedRole === "professional" && (
                <p>
                  🎵 Provide therapy services, manage content, and support
                  clients
                </p>
              )}
              {selectedRole === "parent" && (
                <p>
                  👨‍👩‍👧‍👦 Support your child's therapy journey and track their
                  progress
                </p>
              )}
            </div>
          </div>

          {/* Name fields for non-Google users */}
          {!hasNameFromAuth && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
          )}

          {error === "duplicate" ? (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  An account with this email already exists. You'll need to sign
                  in with your existing account instead.
                </p>
              </div>
              <Button
                onClick={() => {
                  signOut();
                }}
                variant="outline"
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleRoleSelection}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Setting up your profile..." : "Continue"}
              </Button>

              {error === "general" && (
                <Button
                  onClick={() => setError(null)}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              )}

              <Button
                onClick={() => {
                  signOut();
                }}
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
