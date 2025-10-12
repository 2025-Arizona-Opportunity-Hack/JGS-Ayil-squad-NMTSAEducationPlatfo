import { useState } from "react";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, ExternalLink } from "lucide-react";

const shareSchema = z.object({
  recipientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  recipientName: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
  expiresInDays: z.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days"),
});

type ShareFormData = z.infer<typeof shareSchema>;

interface ThirdPartyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
}

export function ThirdPartyShareModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
}: ThirdPartyShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const createShare = useMutation(api.contentShares.createThirdPartyShare);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      recipientEmail: "",
      recipientName: "",
      message: "",
      expiresInDays: 7,
    },
  });

  const expiresInDays = watch("expiresInDays");

  const onSubmit = async (data: ShareFormData) => {
    setIsCreating(true);
    const toastId = toast.loading("Creating share link...");

    try {
      const result = await createShare({
        contentId: contentId as any,
        recipientEmail: data.recipientEmail || undefined,
        recipientName: data.recipientName || undefined,
        message: data.message || undefined,
        expiresInDays: data.expiresInDays,
      });

      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      setShareUrl(fullUrl);
      setExpiresAt(result.expiresAt);
      toast.success("Share link created!", { id: toastId });
    } catch (error) {
      console.error("Error creating share:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create share link",
        { id: toastId }
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setExpiresAt(null);
    setCopied(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share with 3rd Party</DialogTitle>
          <DialogDescription>
            Create a temporary shareable link for: <strong>{contentTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Link Expires In *</Label>
              <Select
                value={expiresInDays.toString()}
                onValueChange={(value) => setValue("expiresInDays", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
              {errors.expiresInDays && (
                <p className="text-sm text-destructive">{errors.expiresInDays.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email (optional)</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="recipient@example.com"
                {...register("recipientEmail")}
                className={errors.recipientEmail ? "border-destructive" : ""}
              />
              {errors.recipientEmail && (
                <p className="text-sm text-destructive">{errors.recipientEmail.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional: Track who this link was shared with
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name (optional)</Label>
              <Input
                id="recipientName"
                placeholder="John Doe"
                {...register("recipientName")}
              />
              <p className="text-xs text-muted-foreground">
                Optional: For your reference
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                rows={3}
                placeholder="Add a message for the recipient..."
                {...register("message")}
              />
              <p className="text-xs text-muted-foreground">
                Optional: This message will be shown to the recipient
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? "Creating..." : "Create Share Link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                Share link created successfully!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                This link will expire on{" "}
                {expiresAt && new Date(expiresAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopy()}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => void handleCopy()}
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(shareUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

