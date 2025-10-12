import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ContentPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: Id<"content">;
  contentTitle: string;
}

export function ContentPricingModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
}: ContentPricingModalProps) {
  const setPricing = useMutation(api.pricing.setPricing);
  const removePricing = useMutation(api.pricing.removePricing);
  const existingPricing = useQuery(api.pricing.getPricing, { contentId });

  const [price, setPrice] = useState(
    existingPricing ? (existingPricing.price / 100).toFixed(2) : ""
  );
  const [duration, setDuration] = useState<string>(
    existingPricing?.accessDuration
      ? String(existingPricing.accessDuration / (24 * 60 * 60 * 1000))
      : "indefinite"
  );
  const [customDays, setCustomDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const priceInCents = Math.round(parseFloat(price) * 100);
      
      if (isNaN(priceInCents) || priceInCents <= 0) {
        toast.error("Please enter a valid price");
        setIsSubmitting(false);
        return;
      }

      let accessDuration: number | undefined = undefined;
      if (duration !== "indefinite") {
        const days = duration === "custom" ? parseInt(customDays) : parseInt(duration);
        if (isNaN(days) || days <= 0) {
          toast.error("Please enter a valid duration");
          setIsSubmitting(false);
          return;
        }
        accessDuration = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      }

      await setPricing({
        contentId,
        price: priceInCents,
        currency: "USD",
        accessDuration,
      });

      toast.success("Pricing set successfully");
      onClose();
    } catch (error) {
      console.error("Error setting pricing:", error);
      toast.error("Failed to set pricing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePricing = async () => {
    setIsSubmitting(true);
    try {
      await removePricing({ contentId });
      toast.success("Pricing removed successfully");
      onClose();
    } catch (error) {
      console.error("Error removing pricing:", error);
      toast.error("Failed to remove pricing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Content Pricing</DialogTitle>
          <DialogDescription>
            Make "{contentTitle}" available for purchase
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Price (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="19.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the price customers will pay to access this content
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Access Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinite">Indefinite Access</SelectItem>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
                <SelectItem value="custom">Custom Duration</SelectItem>
              </SelectContent>
            </Select>
            {duration === "custom" && (
              <div className="mt-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter number of days"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  required
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              How long will customers have access after purchase?
            </p>
          </div>

          <DialogFooter className="gap-2">
            {existingPricing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleRemovePricing()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Pricing"
                )}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set Pricing"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
