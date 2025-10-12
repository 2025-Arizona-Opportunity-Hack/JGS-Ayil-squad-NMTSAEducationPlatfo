import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Send, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecommendContentModalProps {
  content: any;
  isOpen: boolean;
  onClose: () => void;
}

export function RecommendContentModal({
  content,
  isOpen,
  onClose,
}: RecommendContentModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRecommendation = useMutation(api.recommendations.createRecommendation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientEmail.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Sending recommendation...");

    try {
      await createRecommendation({
        contentId: content._id,
        recipientEmail: recipientEmail.trim(),
        message: message.trim() || undefined,
      });

      toast.success("Recommendation sent successfully!", { id: toastId });
      setRecipientEmail("");
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Error creating recommendation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send recommendation",
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recommend Content</DialogTitle>
          <DialogDescription>
            Send a recommendation for "{content?.title}" to a user
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">Recipient Email *</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="user@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The user will see this recommendation in their content portal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message explaining why you're recommending this content..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-1">What the recipient will see:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content title and description</li>
              <li>Your message (if provided)</li>
              <li>Option to purchase if content is paid</li>
              <li>Preview only - full access requires purchase or permission</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Send className="w-4 h-4 mr-2" />
              Send Recommendation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
