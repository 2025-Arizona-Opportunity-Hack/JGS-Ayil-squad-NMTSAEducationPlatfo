import { useEffect, useState, useRef } from "react";
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
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompleteStepProps {
  data: SetupData;
}

export function CompleteStep({ data }: CompleteStepProps) {
  const completeSetup = useMutation(api.setup.completeSetupWizard);
  const [status, setStatus] = useState<"saving" | "success" | "error">(
    "saving"
  );
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    void (async () => {
      try {
        await completeSetup({
          firstName: data.firstName,
          lastName: data.lastName,
          profilePictureId: data.profilePictureId,
          organizationName: data.organizationName,
          tagline: data.tagline || undefined,
          logoId: data.logoId,
          primaryColor: data.primaryColor,
          defaultEmail: data.defaultEmail,
          defaultSms: data.defaultSms,
        });
        setStatus("success");
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Setup failed");
      }
    })();
  }, [completeSetup, data]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {status === "saving" && (
          <>
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <CardTitle className="text-2xl mt-4">
              Setting things up...
            </CardTitle>
            <CardDescription>
              Creating your account and configuring the platform.
            </CardDescription>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <CardTitle className="text-2xl mt-4">
              You&apos;re all set!
            </CardTitle>
            <CardDescription>
              Welcome to {data.organizationName}. Redirecting to your
              dashboard...
            </CardDescription>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle className="text-2xl mt-4">
              Something went wrong
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </>
        )}
      </CardHeader>
      {status === "error" && (
        <CardContent>
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
