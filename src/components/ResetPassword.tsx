import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
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
import { Logo } from "./Logo";

export function ResetPassword() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    const emailParam = params.get("email");
    if (codeParam) setCode(codeParam);
    if (emailParam) setEmail(decodeURIComponent(emailParam));
  }, []);

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="xl" showText={false} />
            </div>
            <CardTitle className="text-xl">Password Updated</CardTitle>
            <CardDescription>
              Your password has been reset. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={() => { window.location.href = "/"; }}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="xl" showText={false} />
          </div>
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
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", "reset-verification");
              formData.set("email", email);

              void signIn("password", formData)
                .then(() => {
                  toast.success("Password updated!");
                  setSuccess(true);
                  setSubmitting(false);
                })
                .catch((err) => {
                  console.error("Reset verification error:", err);
                  const msg = err.message || "";
                  if (msg.includes("InvalidSecret") || msg.includes("code") || msg.includes("Server Error")) {
                    toast.error("Invalid or expired code", {
                      description: "Please check the code and try again, or request a new one.",
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
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset Code</Label>
              <Input
                id="reset-code"
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code from your email"
                required
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
              onClick={() => { window.location.href = "/"; }}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
