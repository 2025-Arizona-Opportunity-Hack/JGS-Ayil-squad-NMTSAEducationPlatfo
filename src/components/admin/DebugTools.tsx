import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
// Debug actions are in debugActions.ts (Node.js runtime)
import { toast } from "sonner";
import {
  Bug,
  Mail,
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DebugConfig {
  environment: string;
  email: {
    provider: string;
    hasApiKey: boolean;
    testEmail: string | null;
    fromDomain: string;
  };
  sms: {
    provider: string;
    hasPhoneNumber: boolean;
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    configured: boolean;
  };
}

interface TestResult {
  success: boolean;
  error?: string;
  messageId?: string;
  details?: Record<string, unknown>;
}

export function DebugTools() {
  const sendTestEmail = useAction(api.debugActions.sendTestEmail);
  const sendTestSms = useAction(api.debugActions.sendTestSms);
  const getDebugConfig = useAction(api.debugActions.getDebugConfig);

  const [config, setConfig] = useState<DebugConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Email form state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("Test Email from Debug Tools");
  const [emailBody, setEmailBody] = useState("This is a test email sent from the admin debug tools.");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<TestResult | null>(null);

  // SMS form state
  const [smsTo, setSmsTo] = useState("");
  const [smsMessage, setSmsMessage] = useState("This is a test SMS from the admin debug tools.");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<TestResult | null>(null);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const result = await getDebugConfig();
      setConfig(result);
    } catch (error) {
      toast.error("Failed to load configuration");
      console.error(error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setSendingEmail(true);
    setEmailResult(null);

    try {
      const result = await sendTestEmail({
        toEmail: emailTo.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setEmailResult(result);
      if (result.success) {
        toast.success("Test email sent successfully!");
      } else {
        toast.error(result.error || "Failed to send email");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setEmailResult({ success: false, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendSms = async () => {
    if (!smsTo.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setSendingSms(true);
    setSmsResult(null);

    try {
      const result = await sendTestSms({
        toPhone: smsTo.trim(),
        message: smsMessage.trim(),
      });
      setSmsResult(result);
      if (result.success) {
        toast.success("Test SMS sent successfully!");
      } else {
        toast.error(result.error || "Failed to send SMS");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setSmsResult({ success: false, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Debug Tools</h2>
        <p className="text-muted-foreground mt-2">
          Test email and SMS integrations
        </p>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Configuration Status
          </CardTitle>
          <CardDescription>
            Current environment and service configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!config ? (
            <Button onClick={loadConfig} disabled={loadingConfig}>
              {loadingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Configuration
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={config.environment === "production" ? "default" : "secondary"}>
                  {config.environment.toUpperCase()}
                </Badge>
                <Button variant="ghost" size="sm" onClick={loadConfig} disabled={loadingConfig}>
                  <RefreshCw className={`w-4 h-4 ${loadingConfig ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Email Config */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">Email ({config.email.provider})</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      {config.email.hasApiKey ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>API Key: {config.email.hasApiKey ? "Configured" : "Missing"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      From domain: {config.email.fromDomain}
                    </div>
                    {config.email.testEmail && (
                      <div className="text-muted-foreground">
                        Test email: {config.email.testEmail}
                      </div>
                    )}
                  </div>
                </div>

                {/* SMS Config */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-medium">SMS ({config.sms.provider})</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      {config.sms.configured ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>Status: {config.sms.configured ? "Configured" : "Not configured"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.sms.hasPhoneNumber ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>Phone Number</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.sms.hasAccountSid ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>Account SID</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.sms.hasAuthToken ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>Auth Token</span>
                    </div>
                  </div>
                </div>
              </div>

              {config.environment !== "production" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Testing Mode</AlertTitle>
                  <AlertDescription>
                    Emails will be sent to the test address ({config.email.testEmail}) regardless of the recipient you specify.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Test Email (Resend)
            </CardTitle>
            <CardDescription>
              Send a test email to verify Resend configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailTo">Recipient Email</Label>
              <Input
                id="emailTo"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Test Email Subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailBody">Body</Label>
              <Textarea
                id="emailBody"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Email body content..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="w-full"
            >
              {sendingEmail ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>

            {emailResult && (
              <Alert variant={emailResult.success ? "default" : "destructive"}>
                {emailResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{emailResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {emailResult.success ? (
                    <div className="space-y-1">
                      <p>Email sent successfully!</p>
                      {emailResult.messageId && (
                        <p className="text-xs font-mono">ID: {emailResult.messageId}</p>
                      )}
                      {emailResult.details && (
                        <div className="text-xs mt-2">
                          <p>Environment: {String(emailResult.details.environment)}</p>
                          <p>Sent to: {String(emailResult.details.actualRecipient)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{emailResult.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test SMS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Test SMS (Twilio)
            </CardTitle>
            <CardDescription>
              Send a test SMS to verify Twilio configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smsTo">Phone Number</Label>
              <Input
                id="smsTo"
                type="tel"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="+14155551234"
              />
              <p className="text-xs text-muted-foreground">
                Use E.164 format (e.g., +14155551234)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smsMessage">Message</Label>
              <Textarea
                id="smsMessage"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="SMS message content..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendSms}
              disabled={sendingSms}
              className="w-full"
            >
              {sendingSms ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test SMS
                </>
              )}
            </Button>

            {smsResult && (
              <Alert variant={smsResult.success ? "default" : "destructive"}>
                {smsResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{smsResult.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>
                  {smsResult.success ? (
                    <div className="space-y-1">
                      <p>SMS sent successfully!</p>
                      {smsResult.details && (
                        <div className="text-xs mt-2">
                          <p>Sent to: {String(smsResult.details.to)}</p>
                          <p>At: {String(smsResult.details.sentAt)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{smsResult.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About Debug Tools</AlertTitle>
        <AlertDescription>
          These tools are for testing and debugging email and SMS integrations. 
          In testing mode, emails are redirected to a verified test address. 
          SMS messages are prefixed with [DEBUG TEST] to identify them as test messages.
        </AlertDescription>
      </Alert>
    </div>
  );
}
