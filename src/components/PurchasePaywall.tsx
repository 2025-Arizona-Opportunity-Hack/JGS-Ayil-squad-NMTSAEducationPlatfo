import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { sanitizeHtml } from "@/lib/sanitize";
import { redirectToStripeCheckout } from "@/lib/checkout";
import { toast } from "sonner";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";

interface PaywallPreview {
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  authorName: string | null;
  publishedAt: number | null;
}

interface PaywallPricing {
  pricingId: string;
  price: number;
  currency: string;
  accessDuration: number | null;
}

interface PurchasePaywallProps {
  contentId: string;
  preview: PaywallPreview;
  pricing: PaywallPricing;
  // True when the viewer is anonymous — they must log in before purchasing.
  requiresAuth: boolean;
  onGoToLogin: () => void;
}

function formatPrice(priceInCents: number) {
  return (priceInCents / 100).toFixed(2);
}

function formatDuration(durationMs: number | null) {
  if (!durationMs) return "Lifetime Access";
  const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
  if (days === 1) return "1 Day Access";
  if (days < 30) return `${days} Days Access`;
  if (days < 365) return `${Math.floor(days / 30)} Months Access`;
  return `${Math.floor(days / 365)} Year${days >= 730 ? "s" : ""} Access`;
}

export function PurchasePaywall({
  contentId,
  preview,
  pricing,
  requiresAuth,
  onGoToLogin,
}: PurchasePaywallProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrder = useMutation(api.orders.createOrder);
  const createPurchaseRequest = useMutation(
    api.purchaseRequests.createPurchaseRequest
  );
  // canPurchaseContent requires auth, so skip it for anonymous viewers.
  const purchaseStatus = useQuery(
    api.purchaseRequests.canPurchaseContent,
    requiresAuth ? "skip" : { contentId: contentId as any }
  );

  const handleBuy = async () => {
    setIsSubmitting(true);
    try {
      toast.info("Redirecting to checkout...");
      const { orderId } = await createOrder({
        contentId: contentId as any,
        pricingId: pricing.pricingId as any,
      });
      await redirectToStripeCheckout(orderId);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
      setIsSubmitting(false);
    }
  };

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    try {
      await createPurchaseRequest({
        contentId: contentId as any,
        message: requestMessage || undefined,
      });
      toast.success(
        "Purchase request submitted! You'll be notified when it's reviewed."
      );
      setShowRequestModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCta = () => {
    if (requiresAuth) {
      return (
        <div className="space-y-2">
          <Button className="w-full" onClick={onGoToLogin}>
            Log in to purchase
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You'll return to this page after logging in.
          </p>
        </div>
      );
    }

    if (!purchaseStatus) {
      return (
        <Button className="w-full" disabled>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    if (purchaseStatus.canPurchase) {
      return (
        <div className="space-y-2">
          <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Request Approved
          </Badge>
          <Button
            className="w-full"
            onClick={() => void handleBuy()}
            disabled={isSubmitting}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy for ${formatPrice(pricing.price)}
          </Button>
        </div>
      );
    }

    if (purchaseStatus.requestStatus === "pending") {
      return (
        <div className="space-y-2">
          <Button className="w-full" disabled variant="secondary">
            <Clock className="w-4 h-4 mr-2" />
            Request Pending
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            An admin is reviewing your purchase request.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Button className="w-full" onClick={() => setShowRequestModal(true)}>
          <Send className="w-4 h-4 mr-2" />
          Request to Purchase
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Purchases start with a request that an admin approves.
        </p>
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full overflow-hidden">
          {preview.thumbnailUrl && (
            <img
              src={preview.thumbnailUrl}
              alt=""
              className="w-full aspect-video object-cover"
            />
          )}
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" showText={false} />
            </div>
            <Lock
              className="w-10 h-10 mx-auto mb-2 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="flex justify-center gap-2 mb-1">
              <Badge variant="secondary" className="capitalize">
                {preview.type}
              </Badge>
              <Badge variant="outline">{formatDuration(pricing.accessDuration)}</Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl break-words">
              {preview.title}
            </CardTitle>
            {preview.authorName && (
              <p className="text-sm text-muted-foreground italic">
                By {preview.authorName}
              </p>
            )}
            {preview.description && (
              <div
                className="text-sm text-muted-foreground mt-2 text-left prose prose-sm max-w-none break-words"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(preview.description),
                }}
              />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-bold text-center">
              ${formatPrice(pricing.price)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {pricing.currency}
              </span>
            </p>
            {renderCta()}
          </CardContent>
        </Card>
      </div>

      {/* Purchase request modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request to Purchase</DialogTitle>
            <DialogDescription>
              Submit a request to purchase "{preview.title}". An admin will
              review your request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="paywallRequestMessage">Message (optional)</Label>
            <Textarea
              id="paywallRequestMessage"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Tell us why you'd like to purchase this content..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmitRequest()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
