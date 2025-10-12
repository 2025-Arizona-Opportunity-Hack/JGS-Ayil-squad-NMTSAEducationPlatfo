import React, { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
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
import { Mail, ArrowLeft } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerification({
  email,
  onVerified,
  onBack,
}: EmailVerificationProps) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const sendVerificationCode = useMutation(
    api.emailVerification.sendVerificationCode
  );
  const sendEmailAction = useAction(api.emailVerification.sendEmailAction);
  const verifyCode = useMutation(api.emailVerification.verifyCode);

  // Send initial verification code when component mounts
  useEffect(() => {
    const sendInitialCode = async () => {
      setIsSending(true);
      try {
        // First create the verification code in the database
        const result = await sendVerificationCode({ email });

        // Then send the email with the code
        if (result.code) {
          await sendEmailAction({ email, code: result.code });
        }

        toast.success("Verification code sent to your email");
        setTimeLeft(60); // 1 minute cooldown for resend
      } catch (error) {
        console.error("Error sending verification code:", error);
        toast.error("Failed to send verification code");
      } finally {
        setIsSending(false);
      }
    };

    sendInitialCode();
  }, [email, sendVerificationCode]);

  // Countdown timer for resend button
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim() || code.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyCode({ email, code: code.trim() });
      toast.success("Email verified successfully!");
      onVerified();
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error(
        error instanceof Error ? error.message : "Invalid verification code"
      );
      setCode(""); // Clear the code on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setIsSending(true);
    setCanResend(false);
    try {
      const result = await sendVerificationCode({ email });

      // Send the email with the new code
      if (result.code) {
        await sendEmailAction({ email, code: result.code });
      }

      toast.success("New verification code sent");
      setTimeLeft(60); // Reset cooldown
      setCode(""); // Clear current code
    } catch (error) {
      console.error("Error resending code:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to resend code"
      );
      setCanResend(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6); // Only digits, max 6
    setCode(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to{" "}
            <span className="font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="Enter 6-digit code"
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 10 minutes
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || code.length !== 6}
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={!canResend || isSending}
              className="text-blue-600 hover:text-blue-700"
            >
              {isSending
                ? "Sending..."
                : canResend
                  ? "Resend Code"
                  : `Resend in ${timeLeft}s`}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="w-full flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
