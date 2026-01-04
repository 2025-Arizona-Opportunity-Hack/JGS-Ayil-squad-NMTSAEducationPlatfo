"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
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
import { api } from "../../convex/_generated/api";
import { Logo } from "./Logo";
import { Mail, User, CheckCircle2, ArrowLeft } from "lucide-react";

export function JoinRequestForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createJoinRequest = useMutation(api.joinRequests.createJoinRequest);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createJoinRequest({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setSubmitted(true);
      toast.success("Verification email sent!", {
        description: `Please check your email (${email}) and click the verification link.`,
      });
    } catch (error) {
      console.error("Error submitting join request:", error);
      
      // Extract user-friendly error message
      let errorMessage = "Please try again.";
      if (error instanceof Error) {
        const message = error.message;
        
        // Map technical errors to user-friendly messages
        if (message.includes("already exists") || message.includes("already been approved")) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (message.includes("verification email has already been sent")) {
          errorMessage = "A verification email has already been sent to this address. Please check your email and click the verification link.";
        } else if (message.includes("already pending review")) {
          errorMessage = "A join request with this email is already pending review.";
        } else if (message.includes("was denied")) {
          errorMessage = "Your previous join request was denied. Please contact support if you believe this is an error.";
        } else if (message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address.";
        } else if (message.includes("Failed to send") || message.includes("Email service is in testing mode")) {
          errorMessage = "We couldn't send the verification email right now. Your request was created - please contact support to complete verification.";
        } else if (message.includes("TESTING_MODE") || message.includes("verify your email domain")) {
          errorMessage = "Email service is being configured. Your request was created - please contact support to complete verification.";
        } else {
          // For other errors, use a generic message but log the actual error
          errorMessage = "Something went wrong. Please try again.";
        }
      }
      
      toast.error("Failed to submit request", {
        description: errorMessage,
      });
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardHeader className="space-y-4 pb-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle>Check Your Email!</CardTitle>
              <CardDescription>
                We've sent a verification email to your address.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Verify your email address
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  We sent a verification link to <strong>{email}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Click the link in the email to verify your address and complete your join request.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> The verification link expires in 24 hours. After verification, your request will be pending admin review.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-4 pb-6">
        <div className="text-center space-y-1">
          <CardTitle>Request Access</CardTitle>
          <CardDescription>
            Fill out the form below to request access to the platform.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            You'll receive an email notification once your request has been reviewed.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

