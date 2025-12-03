import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { MockPaymentModal } from "./MockPaymentModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
} from "lucide-react";

export function Shop() {
  const pricedContent = useQuery(api.pricing.listPricedContent);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPurchaseRequest = useMutation(api.purchaseRequests.createPurchaseRequest);

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5" />;
      case "audio":
        return <FileAudio className="w-5 h-5" />;
      case "article":
        return <Newspaper className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return "Lifetime Access";
    const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
    if (days === 1) return "1 Day";
    if (days < 30) return `${days} Days`;
    if (days < 365) return `${Math.floor(days / 30)} Months`;
    return `${Math.floor(days / 365)} Year${days >= 730 ? "s" : ""}`;
  };

  const handleBuyClick = (item: any) => {
    setSelectedItem(item);
    setShowPaymentModal(true);
  };

  const handleRequestClick = (item: any) => {
    setSelectedItem(item);
    setRequestMessage("");
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await createPurchaseRequest({
        contentId: selectedItem._id,
        message: requestMessage || undefined,
      });
      toast.success("Purchase request submitted! You'll be notified when it's reviewed.");
      setShowRequestModal(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pricedContent) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (pricedContent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <ShoppingCart className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Items Available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later for new content
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Shop</h2>
        <p className="text-muted-foreground mt-2">
          Purchase premium content to expand your library
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pricedContent.map((item) => (
          <Card
            key={item._id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-0">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getContentIcon(item.attachmentType || item.type || "unknown")}
                  </div>
                )}
                {item.hasAccess && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Owned
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getContentIcon(item.attachmentType || item.type || "unknown")}
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.attachmentType || item.type || "content"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Pricing Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      ${formatPrice(item.pricing.price)}
                    </span>
                    {item.pricing.accessDuration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(item.pricing.accessDuration)}
                      </div>
                    )}
                  </div>
                  {!item.pricing.accessDuration && (
                    <p className="text-xs text-muted-foreground">
                      Lifetime Access
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <ShopItemButton 
                  item={item} 
                  onRequestClick={handleRequestClick}
                  onBuyClick={handleBuyClick}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request to Purchase</DialogTitle>
            <DialogDescription>
              Submit a request to purchase this content. An admin will review your request.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedItem.title}</h4>
                <p className="text-lg font-bold mt-1">
                  ${formatPrice(selectedItem.pricing.price)} {selectedItem.pricing.currency}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestMessage">Message (optional)</Label>
                <Textarea
                  id="requestMessage"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell us why you'd like to purchase this content..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
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

      {/* Payment Modal */}
      {selectedItem && showPaymentModal && (
        <MockPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedItem(null);
          }}
          contentId={selectedItem._id}
          pricingId={selectedItem.pricing._id}
          contentTitle={selectedItem.title}
          price={selectedItem.pricing.price}
          currency={selectedItem.pricing.currency}
        />
      )}
    </div>
  );
}

// Separate component to handle per-item purchase request status
function ShopItemButton({ 
  item, 
  onRequestClick, 
  onBuyClick 
}: { 
  item: any; 
  onRequestClick: (item: any) => void;
  onBuyClick: (item: any) => void;
}) {
  const purchaseStatus = useQuery(api.purchaseRequests.canPurchaseContent, {
    contentId: item._id,
  });

  if (!purchaseStatus) {
    return (
      <Button className="w-full" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Already owns the content
  if (item.hasAccess) {
    return (
      <Button className="w-full" disabled>
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Already Owned
      </Button>
    );
  }

  // Can purchase (has approved request)
  if (purchaseStatus.canPurchase) {
    return (
      <div className="space-y-2">
        <Badge className="w-full justify-center bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Request Approved
        </Badge>
        <Button className="w-full" onClick={() => onBuyClick(item)}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Complete Purchase
        </Button>
      </div>
    );
  }

  // Has pending request
  if (purchaseStatus.requestStatus === "pending") {
    return (
      <Button className="w-full" disabled variant="secondary">
        <Clock className="w-4 h-4 mr-2" />
        Request Pending
      </Button>
    );
  }

  // Needs to request
  return (
    <Button className="w-full" onClick={() => onRequestClick(item)}>
      <Send className="w-4 h-4 mr-2" />
      Request to Purchase
    </Button>
  );
}
