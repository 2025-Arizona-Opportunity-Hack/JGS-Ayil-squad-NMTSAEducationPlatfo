import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  Link, 
  Mail, 
  Phone, 
  Send,
  User,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface ClientInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientInviteModal({ open, onOpenChange }: ClientInviteModalProps) {
  const [selectedRole, setSelectedRole] = useState<"client" | "parent" | "professional">("client");
  const [sendMethod, setSendMethod] = useState<"email" | "sms" | "both">("email");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState("");
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createWithEmail = useMutation(api.clientInvites.createClientInviteWithEmail);
  const createWithSms = useMutation(api.clientInvites.createClientInviteWithSms);
  const createWithBoth = useMutation(api.clientInvites.createClientInviteWithBoth);
  const clientInvites = useQuery(api.clientInvites.listClientInvites);
  const deactivateInvite = useMutation(api.clientInvites.deactivateClientInvite);
  const resendInvite = useMutation(api.clientInvites.resendClientInvite);

  const handleSendInvite = async () => {
    // Validation
    if (sendMethod === "email" || sendMethod === "both") {
      if (!email.trim()) {
        toast.error("Please enter an email address");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }

    if (sendMethod === "sms" || sendMethod === "both") {
      if (!phoneNumber.trim()) {
        toast.error("Please enter a phone number");
        return;
      }
      if (!phoneNumber.startsWith("+")) {
        toast.error("Phone number must start with + and country code (e.g., +1 for US)");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const expiresAt = expiryDays
        ? Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000
        : undefined;

      let result;
      if (sendMethod === "email") {
        result = await createWithEmail({
          role: selectedRole,
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          message: message.trim() || undefined,
          expiresAt,
        });
      } else if (sendMethod === "sms") {
        result = await createWithSms({
          role: selectedRole,
          phoneNumber: phoneNumber.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          message: message.trim() || undefined,
          expiresAt,
        });
      } else {
        result = await createWithBoth({
          role: selectedRole,
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          message: message.trim() || undefined,
          expiresAt,
        });
      }

      setGeneratedCode(result.code);
      toast.success("Invitation sent successfully!", {
        description: `Code: ${result.code}`,
      });
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const inviteUrl = `${window.location.origin}?clientInvite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeactivate = async (inviteId: Id<"clientInvites">) => {
    try {
      await deactivateInvite({ inviteId });
      toast.success("Invitation deactivated");
    } catch (error) {
      console.error("Error deactivating invite:", error);
      toast.error("Failed to deactivate invitation");
    }
  };

  const handleResend = async (inviteId: Id<"clientInvites">, method: "email" | "sms" | "both") => {
    try {
      await resendInvite({ inviteId, method });
      toast.success("Invitation resent successfully");
    } catch (error) {
      console.error("Error resending invite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
    }
  };

  const handleReset = () => {
    setGeneratedCode(null);
    setEmail("");
    setPhoneNumber("");
    setFirstName("");
    setLastName("");
    setMessage("");
    setExpiryDays("");
    setSelectedRole("client");
    setSendMethod("email");
  };

  const roleDescriptions = {
    client: "Access educational content and resources",
    parent: "Manage family's educational content",
    professional: "Access professional resources and recommend content",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Client Users</DialogTitle>
          <DialogDescription>
            Send invitations to clients, parents, or professionals to join the platform.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Invitation</TabsTrigger>
            <TabsTrigger value="history">Invitation History</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-6 mt-4">
            {generatedCode ? (
              <div className="space-y-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Invitation Sent Successfully!</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Invite Code:
                    </p>
                    <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-300 mt-1">
                      {generatedCode}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generatedCode)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-green-900 dark:text-green-100">
                    Invite Link:
                  </p>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded border">
                    <code className="text-xs flex-1 truncate">
                      {window.location.origin}?clientInvite={generatedCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(generatedCode)}
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Send Another Invitation
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>User Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value: "client" | "parent" | "professional") =>
                      setSelectedRole(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {roleDescriptions[selectedRole]}
                  </p>
                </div>

                {/* Send Method */}
                <div className="space-y-2">
                  <Label>Send Via</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sendMethod === "email" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSendMethod("email")}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={sendMethod === "sms" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSendMethod("sms")}
                      className="flex-1"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      type="button"
                      variant={sendMethod === "both" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSendMethod("both")}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Both
                    </Button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(sendMethod === "email" || sendMethod === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@example.com"
                      />
                    </div>
                  )}
                  {(sendMethod === "sms" || sendMethod === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                      <p className="text-xs text-muted-foreground">
                        Include country code (e.g., +1 for US)
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name (Optional)</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name (Optional)</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a personal message to include in the invitation..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDays">Expires In (Days)</Label>
                  <Input
                    id="expiryDays"
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    placeholder="Never"
                  />
                </div>

                <Button
                  onClick={handleSendInvite}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {!clientInvites ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
              </div>
            ) : clientInvites.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No invitations sent yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {clientInvites.map((invite) => {
                  const isExpired = invite.expiresAt && invite.expiresAt < Date.now();
                  const isUsed = !!invite.usedBy;

                  return (
                    <div
                      key={invite._id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-lg">
                              {invite.code}
                            </span>
                            <Badge variant="secondary">{invite.role}</Badge>
                            {!invite.isActive && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                            {isExpired && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                            {isUsed && (
                              <Badge className="bg-green-500">Used</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {invite.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {invite.email}
                              </span>
                            )}
                            {invite.phoneNumber && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {invite.phoneNumber}
                              </span>
                            )}
                          </div>
                          {(invite.firstName || invite.lastName) && (
                            <div className="flex items-center gap-1 text-sm">
                              <User className="w-3 h-3 text-muted-foreground" />
                              {invite.firstName} {invite.lastName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(invite.code)}
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(invite.code)}
                            title="Copy invite link"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                          {invite.expiresAt && (
                            <span>
                              Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          {invite.usedByName && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              Used by {invite.usedByName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {invite.emailSent && (
                            <Badge variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          )}
                          {invite.smsSent && (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          )}
                        </div>
                      </div>

                      {invite.isActive && !isUsed && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {invite.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(invite._id, "email")}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Resend Email
                            </Button>
                          )}
                          {invite.phoneNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(invite._id, "sms")}
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              Resend SMS
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(invite._id)}
                            className="ml-auto text-destructive hover:text-destructive"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
