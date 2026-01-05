"use client";
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "../../convex/_generated/api";
import { Logo } from "./Logo";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const verifyEmail = useMutation(api.joinRequests.verifyJoinRequestEmail);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided. Please check your email and use the link provided.");
      return;
    }

    const handleVerification = async () => {
      try {
        const result = await verifyEmail({ token });
        setStatus("success");
        if (result.email) {
          setEmail(result.email);
        }
        toast.success("Email verified!", {
          description: "Your join request is now pending admin review.",
        });
      } catch (error) {
        setStatus("error");
        
        // Extract user-friendly error message
        let errorMessage = "Failed to verify email. Please try again.";
        if (error instanceof Error) {
          const message = error.message;
          
          if (message.includes("Invalid verification token") || message.includes("No verification token")) {
            errorMessage = "Invalid verification link. Please check your email and use the link provided, or request a new verification email.";
          } else if (message.includes("expired")) {
            errorMessage = "This verification link has expired. Please request a new verification email.";
          } else if (message.includes("already verified")) {
            errorMessage = "This email has already been verified. Your request is pending admin review.";
          } else if (message.includes("was denied")) {
            errorMessage = "This join request was denied. Please contact support if you believe this is an error.";
          } else {
            errorMessage = "Unable to verify your email. Please try again or contact support.";
          }
        }
        
        setErrorMessage(errorMessage);
        toast.error("Verification failed", {
          description: errorMessage,
        });
      }
    };

    void handleVerification();
  }, [token, verifyEmail]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <div className="text-center space-y-1">
              <CardTitle>Verifying Email</CardTitle>
              <CardDescription>Please wait while we verify your email address...</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <CardTitle>Email Verified!</CardTitle>
                <CardDescription>
                  Your email address has been successfully verified.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-green-900 mb-1">
                ✅ Verification Complete
              </p>
              {email && (
                <p className="text-xs text-green-700">
                  Verified: <strong>{email}</strong>
                </p>
              )}
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Your join request is now pending admin review. We'll notify you at{" "}
              {email && <strong>{email}</strong>} once it's been reviewed.
            </p>
            <Button
              onClick={() => navigate("/")}
              className="w-full"
              size="lg"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>
                {errorMessage || "Unable to verify your email address."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Possible reasons:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>The verification link has expired (links expire after 24 hours)</li>
              <li>The link has already been used</li>
              <li>The link is invalid or corrupted</li>
            </ul>
          </div>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full"
          >
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

