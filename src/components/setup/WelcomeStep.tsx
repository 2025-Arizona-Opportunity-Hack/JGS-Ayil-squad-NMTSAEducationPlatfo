import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { Shield } from "lucide-react";

interface WelcomeStepProps {
  onLockAcquired: () => void;
  onAuthComplete: () => void;
}

export function WelcomeStep({
  onLockAcquired,
  onAuthComplete,
}: WelcomeStepProps) {
  const { signIn } = useAuthActions();
  const user = useQuery(api.auth.loggedInUser);
  const acquireLock = useMutation(api.setup.acquireSetupLock);
  const touchLock = useMutation(api.setup.touchSetupLock);
  const lockAcquiredRef = useRef(false);
  const touchIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When user authenticates, acquire lock and advance
  useEffect(() => {
    if (user && !lockAcquiredRef.current) {
      lockAcquiredRef.current = true;
      void (async () => {
        try {
          const result = await acquireLock();
          if (result.acquired) {
            onLockAcquired();
            touchIntervalRef.current = setInterval(() => {
              void touchLock().catch(console.error);
            }, 4 * 60 * 1000);
            onAuthComplete();
          }
        } catch (err) {
          console.error("Failed to acquire lock:", err);
          lockAcquiredRef.current = false;
        }
      })();
    }
  }, [user, acquireLock, touchLock, onLockAcquired, onAuthComplete]);

  useEffect(() => {
    return () => {
      if (touchIntervalRef.current) {
        clearInterval(touchIntervalRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create Owner Account</CardTitle>
        <CardDescription>
          Set up the admin account that will manage your platform.
          This will be the owner with full access to all settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", "signUp");

              void signIn("password", formData)
                .then(() => {
                  setSubmitting(false);
                })
                .catch((err) => {
                  console.error("Account creation error:", err);
                  const msg = err.message || "";

                  if (msg.includes("already exists")) {
                    toast.error("Account already exists", {
                      description: "An account with this email already exists.",
                    });
                    setError("exists");
                  } else if (
                    msg.includes("InvalidSecret") ||
                    msg.includes("Invalid password")
                  ) {
                    setError("password");
                  } else {
                    toast.error("Account creation failed", {
                      description: "Something went wrong. Please try again.",
                    });
                    setError("general");
                  }
                  setSubmitting(false);
                });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="setup-email">Email</Label>
              <Input
                id="setup-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                required
                autoFocus
                className={error === "exists" ? "border-amber-500" : ""}
                onChange={() => error === "exists" && setError(null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                type="password"
                name="password"
                placeholder="Create a strong password"
                required
                minLength={8}
                className={error === "password" ? "border-red-500" : ""}
                onChange={() => error === "password" && setError(null)}
              />
              {error === "password" ? (
                <p className="text-xs text-red-600">
                  Must be at least 8 characters with letters and numbers.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with letters and numbers
                </p>
              )}
            </div>

            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Creating account..." : "Create Owner Account"}
            </Button>
          </form>
        )}
        {user && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Setting up...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
