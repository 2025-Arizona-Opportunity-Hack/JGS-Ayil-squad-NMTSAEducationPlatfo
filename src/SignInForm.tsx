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
  const [flow, setFlow] = useState<"signIn" | "signUp" | "joinRequest">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  // Check join request status for sign-up (only if not bootstrap mode and no invite code)
  const joinRequestStatus = useQuery(
    api.joinRequests.checkJoinRequestStatus,
    !bootstrapNeeded && !inviteCode && signupEmail.includes("@")
      ? { email: signupEmail.toLowerCase() }
      : "skip"
  );
  // Check for invite code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase());
      setShowInviteCode(true);
      setFlow('signUp'); // Switch to sign up flow
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      toast.success("Invite code applied!", {
        description: `Using invite code: ${inviteParam.toUpperCase()}`,
      });
    }
  }, []);

  // Validate invite code
  const inviteCodeValidation = useQuery(
    api.inviteCodes.validateInviteCode,
    showInviteCode && inviteCode.length >= 6 ? { code: inviteCode } : "skip"
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
                      errorMessage.includes("authentication failed")
                    ) {
                      toast.error("Oops! Wrong password", {
                        description: "Double-check your password and try again.",
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
                        description: errorMessage || "Something went wrong. Please try again.",
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    📧 No account with this email
                  </p>
                  <p className="text-xs text-blue-700 mb-3">
                    If you're new, you'll need to request access first, then sign up once approved.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
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

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signUp" className="space-y-4 mt-0">
            {!bootstrapNeeded && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  👋 New here? Request access first!
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  You'll need an approved request before you can create an account.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                  onClick={() => {
                    setFlow("joinRequest");
                    setError(null);
                  }}
                >
                  Request Access
                </Button>
              </div>
            )}
            <div className="space-y-1 text-center mb-6">
              <p className="text-sm text-muted-foreground">
                {bootstrapNeeded
                  ? "Create your owner account to get started."
                  : "Already approved? Complete your sign up below."}
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);

                // Check if user has approved join request BEFORE attempting auth
                // Skip check if: bootstrap mode (first user), or has valid invite code
                if (!bootstrapNeeded && !inviteCode) {
                  if (joinRequestStatus === undefined) {
                    // Still loading - wait
                    toast.error("Please wait", {
                      description: "Checking your access status...",
                    });
                    return;
                  }

                  if (joinRequestStatus?.status !== "approved") {
                    // Not approved - show toast and don't proceed
                    if (joinRequestStatus?.status === "pending_verification") {
                      toast.error("Email verification required", {
                        description: "Please check your inbox and verify your email first.",
                      });
                    } else if (joinRequestStatus?.status === "pending") {
                      toast.error("Request pending review", {
                        description: "Your join request is still pending admin approval.",
                      });
                    } else if (joinRequestStatus?.status === "denied") {
                      toast.error("Access denied", {
                        description: "Your join request was denied. Please contact support.",
                      });
                    } else {
                      toast.error("Access required", {
                        description: "No approved join request found. Please request access first.",
                      });
                    }
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

              {/* Invite Code Section - Only for special roles */}
              {!bootstrapNeeded && (
                <div className="space-y-2">
                  {!showInviteCode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteCode(true)}
                      className="w-full"
                    >
                      Have an invite code?
                    </Button>
                  ) : (
                    <>
                      <Label htmlFor="inviteCode">Invite Code (Optional)</Label>
                      <Input
                        id="inviteCode"
                        type="text"
                        value={inviteCode}
                        onChange={(e) =>
                          setInviteCode(e.target.value.toUpperCase())
                        }
                        placeholder="Enter invite code"
                        maxLength={8}
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
                    </>
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
