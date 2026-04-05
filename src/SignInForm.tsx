"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "./components/Logo";
import { JoinRequestForm } from "./components/JoinRequestForm";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const bootstrapNeeded = useQuery(api.users.bootstrapNeeded, {});
  const [flow, setFlow] = useState<"signIn" | "signUp" | "joinRequest" | "forgotPassword" | "resetPassword">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  // Check join request status for sign-up (only if not bootstrap mode and no invite code)
  const joinRequestStatus = useQuery(
    api.joinRequests.checkJoinRequestStatus,
    !bootstrapNeeded && !inviteCode && signupEmail.includes("@")
      ? { email: signupEmail.toLowerCase() }
      : "skip"
  );
  // Check for invite code or password reset params in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Accept both ?invite= and ?clientInvite= for invite codes
    const inviteParam = params.get('invite') || params.get('clientInvite');
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase());
      setShowInviteCode(true);
      setFlow('signUp');
      window.history.replaceState({}, '', window.location.pathname);
      toast.success("Invite code applied!", {
        description: `Using invite code: ${inviteParam.toUpperCase()}`,
      });
    }
    // Handle password reset URL (from email link)
    const resetCodeParam = params.get('code');
    const resetEmailParam = params.get('email');
    if (resetCodeParam) {
      setResetCode(resetCodeParam);
      if (resetEmailParam) setResetEmail(decodeURIComponent(resetEmailParam));
      setFlow('resetPassword');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Validate invite code
  const inviteCodeValidation = useQuery(
    api.inviteCodes.validateInviteCode,
    inviteCode.length >= 6 ? { code: inviteCode } : "skip"
  );

  // If no profiles exist, guide user to create the owner account
  useEffect(() => {
    if (bootstrapNeeded) {
      setFlow("signIn"); // Owner can sign up directly
      setShowInviteCode(false);
    }
  }, [bootstrapNeeded]);


  // Join Request Flow
  if (flow === "joinRequest") {
    return (
      <JoinRequestForm
        onBack={() => {
          setFlow("signIn");
        }}
        onSuccess={() => {
          setFlow("signIn");
        }}
      />
    );
  }

  // Forgot Password Flow
  if (flow === "forgotPassword") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", "reset");

              void signIn("password", formData)
                .then(() => {
                  toast.success("Reset code sent!", {
                    description: "Check your email for the reset code.",
                  });
                  setResetEmail(formData.get("email") as string);
                  setFlow("resetPassword");
                  setSubmitting(false);
                })
                .catch((err) => {
                  console.error("Reset error:", err);
                  toast.error("Could not send reset email", {
                    description: "Please check your email address and try again.",
                  });
                  setSubmitting(false);
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Sending..." : "Send Reset Code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setFlow("signIn"); setError(null); }}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Reset Password (enter code + new password)
  if (flow === "resetPassword") {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Set New Password</CardTitle>
          <CardDescription>
            Enter the code from your email and choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", "reset-verification");
              formData.set("email", resetEmail);

              void signIn("password", formData)
                .then(() => {
                  toast.success("Password updated!", {
                    description: "You can now sign in with your new password.",
                  });
                  setFlow("signIn");
                  setSubmitting(false);
                })
                .catch((err) => {
                  console.error("Reset verification error:", err);
                  const msg = err.message || "";
                  if (msg.includes("InvalidSecret") || msg.includes("code")) {
                    toast.error("Invalid or expired code", {
                      description: "Please check the code and try again.",
                    });
                  } else {
                    toast.error("Password reset failed", {
                      description: "Something went wrong. Please try again.",
                    });
                  }
                  setSubmitting(false);
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset Code</Label>
              <Input
                id="reset-code"
                type="text"
                name="code"
                placeholder="Enter the code from your email"
                required
                autoFocus
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                name="newPassword"
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters with letters and numbers
              </p>
            </div>
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Updating..." : "Update Password"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setFlow("forgotPassword"); setError(null); }}
            >
              Resend code
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Normal Sign In / Sign Up Flow
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-4 pb-6">
        {bootstrapNeeded && (
          <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg">
            <p className="font-medium">First Time Setup</p>
            <p className="text-xs mt-1">Create your owner account to get started.</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs 
          value={flow} 
          onValueChange={(value) => {
            if (value === "signIn" || value === "signUp") {
              setFlow(value);
              setError(null);
              setInviteCode("");
              setShowInviteCode(false);
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signIn">Sign In</TabsTrigger>
            <TabsTrigger value="signUp">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signIn" className="space-y-4 mt-0">
            <div className="space-y-1 text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Welcome back! Sign in to continue.
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitting(true);
                setError(null);
                const formData = new FormData(e.target as HTMLFormElement);
                formData.set("flow", "signIn");

                void signIn("password", formData)
                  .then(() => {
                    setSubmitting(false);
                  })
                  .catch((error) => {
                    console.error("Authentication error:", error);
                    const errorMessage = error.message || "";

                    if (
                      errorMessage.includes("InvalidSecret") ||
                      errorMessage.includes("Invalid password") ||
                      errorMessage.includes("credentials") ||
                      errorMessage.includes("authentication failed") ||
                      errorMessage.includes("Server Error")
                    ) {
                      toast.error("Incorrect email or password", {
                        description: "Double-check your credentials and try again.",
                      });
                      setError("password");
                    } else if (
                      errorMessage.includes("User not found") ||
                      errorMessage.includes("InvalidAccountId")
                    ) {
                      toast.error("No account found", {
                        description: "We couldn't find an account with this email. Have you signed up yet?",
                      });
                      setError("noAccount");
                    } else if (
                      errorMessage.includes("network") ||
                      errorMessage.includes("connection")
                    ) {
                      toast.error("Connection issue", {
                        description: "Please check your internet and try again.",
                      });
                      setError("network");
                    } else {
                      toast.error("Sign in failed", {
                        description: "Something went wrong. Please try again.",
                      });
                      setError("general");
                    }

                    setSubmitting(false);
                  });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className={
                    error === "noAccount" ? "border-amber-500 focus:border-amber-500" : ""
                  }
                  onChange={() => (error === "noAccount" || error === "email") && setError(null)}
                />
              </div>

              {/* No Account Found - Friendly Info Box */}
              {error === "noAccount" && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground mb-1">
                    📧 No account with this email
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    If you're new, you'll need to request access first, then sign up once approved.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFlow("joinRequest");
                      setError(null);
                    }}
                  >
                    Request Access
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  className={
                    error === "password"
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }
                  onChange={() => error === "password" && setError(null)}
                />
                {error === "password" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">
                      🔐 That password didn't work
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Double-check your password and try again.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setFlow("forgotPassword");
                    setError(null);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signUp" className="space-y-4 mt-0">
            {!bootstrapNeeded && (
              <div className="space-y-1 text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  Enter your invite code and create your account.
                </p>
                <p className="text-xs text-muted-foreground">
                  Don't have an invite code?{" "}
                  <button
                    type="button"
                    className="text-primary underline hover:text-primary/80"
                    onClick={() => {
                      setFlow("joinRequest");
                      setError(null);
                    }}
                  >
                    Request access
                  </button>
                </p>
              </div>
            )}
            {bootstrapNeeded && (
              <div className="space-y-1 text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  Create your owner account to get started.
                </p>
              </div>
            )}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);

                // Require a valid invite code (unless bootstrap mode)
                if (!bootstrapNeeded) {
                  if (!inviteCode) {
                    toast.error("Invite code required", {
                      description: "Please enter an invite code to create an account.",
                    });
                    setError("notApproved");
                    return;
                  }

                  // Validate invite code before proceeding
                  if (!inviteCodeValidation?.valid) {
                    toast.error("Invalid invite code", {
                      description: inviteCodeValidation?.message || "Please check your invite code and try again.",
                    });
                    setError("notApproved");
                    return;
                  }
                }

                setSubmitting(true);
                const formData = new FormData(e.target as HTMLFormElement);
                formData.set("flow", "signUp");

                // Store invite code in localStorage for use in RoleSelection
                if (inviteCode) {
                  localStorage.setItem(
                    "signupInviteCode",
                    inviteCode.toUpperCase()
                  );
                }

                void signIn("password", formData)
                  .then(() => {
                    setSubmitting(false);
                  })
                  .catch((error) => {
                    console.error("Authentication error:", error);
                    const errorMessage = error.message || "";

                    // Check for "already exists" FIRST (most specific)
                    if (errorMessage.includes("already exists")) {
                      toast.error("Account already exists", {
                        description: "An account with this email already exists. Try signing in instead.",
                      });
                      setError("accountExists");
                    } else if (
                      errorMessage.includes("InvalidSecret") ||
                      errorMessage.includes("Invalid password")
                    ) {
                      toast.error("Password requirements not met", {
                        description: "Password must be at least 8 characters with letters and numbers.",
                      });
                      setError("password");
                    } else if (
                      errorMessage.includes("approved join request") ||
                      errorMessage.includes("request access") ||
                      errorMessage.includes("not approved")
                    ) {
                      toast.error("Access not approved yet", {
                        description: "You need an approved join request before creating an account.",
                      });
                      setError("notApproved");
                    } else if (
                      errorMessage.includes("network") ||
                      errorMessage.includes("connection") ||
                      errorMessage.includes("fetch failed")
                    ) {
                      toast.error("Connection issue", {
                        description: "Please check your internet and try again.",
                      });
                      setError("network");
                    } else {
                      // Generic fallback - NEVER show raw error to user
                      toast.error("Sign up failed", {
                        description: "Something went wrong. Please try again or contact support.",
                      });
                      setError("general");
                    }

                    setSubmitting(false);
                  });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    if (error === "notApproved") setError(null);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  required
                  className={
                    error === "password"
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }
                  onChange={() => error === "password" && setError(null)}
                />
                {error === "password" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">
                      🔐 Password doesn't meet requirements
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Must be at least 8 characters with letters and numbers.
                    </p>
                  </div>
                )}
                {!error && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters with letters and numbers
                  </p>
                )}
              </div>

              {/* Invite Code - Required for sign up */}
              {!bootstrapNeeded && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code *</Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter your invite code"
                    maxLength={8}
                    required
                    className="font-mono"
                  />
                  {inviteCode.length >= 6 && inviteCodeValidation && (
                    <div className="flex items-center gap-2">
                      {inviteCodeValidation.valid ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">
                            Valid code for{" "}
                            <Badge variant="outline" className="ml-1">
                              {inviteCodeValidation.role}
                            </Badge>
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">
                          {inviteCodeValidation.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
