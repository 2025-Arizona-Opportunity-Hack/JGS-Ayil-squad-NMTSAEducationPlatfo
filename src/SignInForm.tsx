"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "./components/Logo";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteCode, setShowInviteCode] = useState(false);

  // Validate invite code
  const inviteCodeValidation = useQuery(
    api.inviteCodes.validateInviteCode,
    showInviteCode && inviteCode.length >= 6 ? { code: inviteCode } : "skip"
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <Logo size="lg" showText={false} />
        </div>
        <CardTitle className="text-center">{flow === "signIn" ? "Sign In" : "Sign Up"}</CardTitle>
        <CardDescription className="text-center">
          {flow === "signIn"
            ? "Welcome back! Please sign in to continue."
            : "Create a new account to get started."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null); // Clear any previous errors
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("flow", flow);

            // Store invite code in localStorage for use in RoleSelection
            if (flow === "signUp" && inviteCode) {
              localStorage.setItem(
                "signupInviteCode",
                inviteCode.toUpperCase()
              );
            }

            void signIn("password", formData)
              .then(() => {
                // Success - reset submitting state will be handled by navigation
                setSubmitting(false);
              })
              .catch((error) => {
                console.error("Authentication error:", error);
                console.error("Error message:", error.message);
                console.error("Error type:", typeof error);
                let toastTitle = "";
                let toastDescription = "";

                // Handle specific error cases
                const errorMessage = error.message || "";
                const errorName = error.name || "";
                const errorString = String(error);

                if (
                  errorMessage.includes("InvalidSecret") ||
                  errorName.includes("InvalidSecret") ||
                  errorString.includes("InvalidSecret") ||
                  errorMessage.includes("InvalidAccountId") ||
                  errorName.includes("InvalidAccountId") ||
                  errorString.includes("InvalidAccountId") ||
                  (errorMessage.includes("Invalid password") &&
                    flow === "signIn") ||
                  (errorMessage.includes("password") && flow === "signIn") ||
                  errorMessage.includes("credentials") ||
                  errorMessage.includes("authentication failed")
                ) {
                  toastTitle = "Incorrect password";
                  toastDescription =
                    "Please check your password and try again.";
                  setError("password");
                } else if (
                  errorMessage.includes("Invalid password") &&
                  flow === "signUp"
                ) {
                  toastTitle = "Password requirements not met";
                  toastDescription =
                    "Password must be at least 8 characters long and contain letters and numbers.";
                  setError("password");
                } else if (
                  errorMessage.includes("User not found") ||
                  errorMessage.includes("email") ||
                  errorMessage.includes("account")
                ) {
                  if (flow === "signIn") {
                    toastTitle = "Account not found";
                    toastDescription =
                      "No account found with this email. Would you like to sign up instead?";
                    setError("email");
                  } else {
                    toastTitle = "Account already exists";
                    toastDescription =
                      "An account with this email already exists. Try signing in instead.";
                    setError("email");
                  }
                } else if (
                  errorMessage.includes("network") ||
                  errorMessage.includes("connection")
                ) {
                  toastTitle = "Connection error";
                  toastDescription =
                    "Please check your internet connection and try again.";
                  setError("network");
                } else {
                  // Generic fallback error
                  toastTitle =
                    flow === "signIn" ? "Sign in failed" : "Sign up failed";
                  toastDescription = "Something went wrong. Please try again.";
                  setError("general");
                }

                toast.error(toastTitle, {
                  description: toastDescription,
                });
                setSubmitting(false);
              });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              className={
                error === "email" ? "border-red-500 focus:border-red-500" : ""
              }
              onChange={() => error === "email" && setError(null)}
            />
            {error === "email" && (
              <p className="text-sm text-red-600">
                Please check your email address
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
            {error === "password" && flow === "signIn" && (
              <p className="text-sm text-red-600">
                Incorrect password. Please try again.
              </p>
            )}
            {error === "password" && flow === "signUp" && (
              <p className="text-sm text-red-600">
                Password must be at least 8 characters long and contain letters
                and numbers.
              </p>
            )}
            {flow === "signUp" && !error && (
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long and contain at least
                one letter and one number
              </p>
            )}
          </div>

          {/* Invite Code Section for Sign Up */}
          {flow === "signUp" && (
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

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting
              ? "Please wait..."
              : flow === "signIn"
                ? "Sign in"
                : "Sign up"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={() => {
              setSubmitting(true);
              setError(null);
              void signIn("google")
                .then(() => {
                  setSubmitting(false);
                })
                .catch((error) => {
                  console.error("Google sign-in error:", error);
                  toast.error("Google sign-in failed", {
                    description: "Please try again or use email/password.",
                  });
                  setSubmitting(false);
                });
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <span>
              {flow === "signIn"
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError(null); // Clear errors when switching flows
                setInviteCode(""); // Clear invite code when switching
                setShowInviteCode(false); // Hide invite code field
              }}
            >
              {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
