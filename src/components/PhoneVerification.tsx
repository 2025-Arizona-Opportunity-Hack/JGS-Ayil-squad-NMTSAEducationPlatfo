import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

export function PhoneVerification() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);

  const phoneStatus = useQuery(api.sms.getPhoneStatus);
  const startVerification = useMutation(api.sms.startPhoneVerification);
  const verifyPhone = useMutation(api.sms.verifyPhoneNumber);
  const resendCode = useMutation(api.sms.resendVerificationCode);
  const toggleSms = useMutation(api.sms.toggleSmsNotifications);

  const handleStartVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Basic validation - should start with +
    if (!phoneNumber.startsWith("+")) {
      toast.error("Phone number must start with + and country code (e.g., +1 for US)");
      return;
    }

    setIsSubmitting(true);
    try {
      await startVerification({ phoneNumber: phoneNumber.trim() });
      toast.success("Verification code sent! Check your phone.");
      setShowVerificationInput(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send verification code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyPhone({ code: verificationCode.trim() });
      toast.success("Phone number verified successfully!");
      setShowVerificationInput(false);
      setVerificationCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid verification code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    try {
      await resendCode();
      toast.success("New verification code sent!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSms = async (enabled: boolean) => {
    try {
      await toggleSms({ enabled });
      toast.success(enabled ? "SMS notifications enabled" : "SMS notifications disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    }
  };

  if (!phoneStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          <CardTitle className="text-lg">Phone & SMS Notifications</CardTitle>
        </div>
        <CardDescription>
          Add your phone number to receive SMS notifications about content updates, approvals, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        {phoneStatus.phoneNumber && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{phoneStatus.phoneNumber}</span>
            </div>
            {phoneStatus.phoneVerified ? (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        )}

        {/* SMS Notifications Toggle */}
        {phoneStatus.phoneVerified && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive text messages for important updates
                </p>
              </div>
            </div>
            <Switch
              checked={phoneStatus.smsNotificationsEnabled}
              onCheckedChange={handleToggleSms}
            />
          </div>
        )}

        {/* Add/Change Phone Number */}
        {!showVerificationInput && !phoneStatus.hasPendingVerification && (
          <form onSubmit={handleStartVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                {phoneStatus.phoneNumber ? "Change Phone Number" : "Add Phone Number"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your phone number with country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>
          </form>
        )}

        {/* Verification Code Input */}
        {(showVerificationInput || phoneStatus.hasPendingVerification) && !phoneStatus.phoneVerified && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Enter Verification Code</Label>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to {phoneStatus.phoneNumber || phoneNumber}
              </p>
              <div className="flex gap-2">
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="flex-1 text-center text-lg tracking-widest"
                />
                <Button type="submit" disabled={isSubmitting || verificationCode.length !== 6}>
                  {isSubmitting ? "Verifying..." : "Confirm"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleResendCode}
                disabled={isSubmitting}
                className="p-0 h-auto"
              >
                Resend code
              </Button>
              <span className="text-muted-foreground">•</span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setShowVerificationInput(false);
                  setVerificationCode("");
                }}
                className="p-0 h-auto"
              >
                Use different number
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
