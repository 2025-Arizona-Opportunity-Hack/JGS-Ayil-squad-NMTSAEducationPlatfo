import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInForm } from "../../SignInForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface WelcomeStepProps {
  onLockAcquired: () => void;
  onAuthComplete: () => void;
}

export function WelcomeStep({
  onLockAcquired,
  onAuthComplete,
}: WelcomeStepProps) {
  const user = useQuery(api.auth.loggedInUser);
  const acquireLock = useMutation(api.setup.acquireSetupLock);
  const touchLock = useMutation(api.setup.touchSetupLock);
  const lockAcquiredRef = useRef(false);
  const touchIntervalRef = useRef<ReturnType<typeof setInterval>>();

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
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome!</CardTitle>
        <CardDescription>
          Let&apos;s set up your platform. Sign in to create your owner account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user && <SignInForm />}
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
