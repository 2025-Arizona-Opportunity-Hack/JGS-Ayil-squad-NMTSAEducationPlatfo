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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, RefreshCw } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface InviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteCodeModal({ open, onOpenChange }: InviteCodeModalProps) {
  const [selectedRole, setSelectedRole] = useState<
    "admin" | "editor" | "contributor"
  >("editor");
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInviteCode = useMutation(api.inviteCodes.createInviteCode);
  const inviteCodes = useQuery(api.inviteCodes.listInviteCodes);
  const deactivateCode = useMutation(api.inviteCodes.deactivateInviteCode);
  const reactivateCode = useMutation(api.inviteCodes.reactivateInviteCode);

  const handleGenerate = async () => {
    try {
      const expiresAt = expiryDays
        ? Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000
        : undefined;

      const result = await createInviteCode({
        role: selectedRole,
        expiresAt,
      });

      setGeneratedCode(result.code);
      toast.success("Invite code generated!", {
        description: `Code: ${result.code}`,
      });
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast.error("Failed to generate invite code");
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeactivate = async (inviteCodeId: Id<"inviteCodes">) => {
    try {
      await deactivateCode({ inviteCodeId });
      toast.success("Invite code deactivated");
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      toast.error("Failed to deactivate invite code");
    }
  };

  const handleReactivate = async (inviteCodeId: Id<"inviteCodes">) => {
    try {
      await reactivateCode({ inviteCodeId });
      toast.success("Invite code reactivated");
    } catch (error) {
      console.error("Error reactivating invite code:", error);
      toast.error("Failed to reactivate invite code");
    }
  };

  const handleReset = () => {
    setGeneratedCode(null);
    setSelectedRole("editor");
    setExpiryDays("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Code Management</DialogTitle>
          <DialogDescription>
            Generate invite codes for users to sign up with specific roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate New Code Section */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-semibold text-lg">Generate New Code</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: "admin" | "editor" | "contributor") =>
                    setSelectedRole(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expires in (Days)</Label>
                <Input
                  id="expiryDays"
                  type="number"
                  min="1"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  placeholder="Never"
                />
              </div>
            </div>

            {generatedCode ? (
              <div className="space-y-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Generated Code:
                    </p>
                    <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-300 mt-1">
                      {generatedCode}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generatedCode)}
                    className="ml-2"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Another
                </Button>
              </div>
            ) : (
              <Button onClick={handleGenerate} className="w-full">
                Generate Invite Code
              </Button>
            )}
          </div>

          {/* Existing Codes Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Existing Invite Codes</h3>

            {!inviteCodes ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
              </div>
            ) : inviteCodes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No invite codes created yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {inviteCodes.map((code) => {
                  const isExpired =
                    code.expiresAt && code.expiresAt < Date.now();

                  return (
                    <div
                      key={code._id}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">
                            {code.code}
                          </span>
                          <Badge
                            variant={
                              code.role === "admin"
                                ? "destructive"
                                : code.role === "editor"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {code.role}
                          </Badge>
                          {!code.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                          {isExpired && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>
                            Created by {code.creatorName} on{" "}
                            {new Date(code.createdAt).toLocaleDateString()}
                          </p>
                          {code.expiresAt && (
                            <p>
                              Expires:{" "}
                              {new Date(code.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(code.code)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {code.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(code._id)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(code._id)}
                          >
                            <RefreshCw className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
