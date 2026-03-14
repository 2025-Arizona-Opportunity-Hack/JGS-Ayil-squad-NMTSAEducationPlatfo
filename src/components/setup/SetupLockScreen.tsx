import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";

export function SetupLockScreen() {
  // Subscribes via Convex useQuery — automatically updates when lock releases
  const lock = useQuery(api.setup.getSetupLock);

  // If lock is gone, reload to enter setup
  if (lock === null) {
    window.location.reload();
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Setup In Progress</CardTitle>
          <CardDescription>
            Someone else is currently setting up this platform. This page will
            automatically refresh when they&apos;re done.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
