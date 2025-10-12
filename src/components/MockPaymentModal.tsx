import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
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
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface MockPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: Id<"content">;
  pricingId: Id<"contentPricing">;
  contentTitle: string;
  price: number;
  currency: string;
}

export function MockPaymentModal({
  isOpen,
  onClose,
  contentId,
  pricingId,
  contentTitle,
  price,
  currency,
}: MockPaymentModalProps) {
  const createOrder = useMutation(api.orders.createOrder);
  const completeOrder = useMutation(api.orders.completeOrder);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock card details (pre-filled for demo)
  const [cardNumber] = useState("4242 4242 4242 4242");
  const [expiryDate] = useState("12/25");
  const [cvv] = useState("123");
  const [cardholderName] = useState("John Doe");

  const handlePurchase = async () => {
    setIsProcessing(true);

    try {
      // Create the order
      const orderId = await createOrder({
        contentId,
        pricingId,
      });

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Complete the order
      await completeOrder({ orderId });

      setIsSuccess(true);
      toast.success("Purchase successful! You now have access to this content.");

      // Close modal after showing success
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process payment");
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <DialogTitle className="text-2xl">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center">
              You now have access to "{contentTitle}"
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Your Purchase</DialogTitle>
              <DialogDescription>
                You are purchasing: <strong>{contentTitle}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item:</span>
                  <span className="font-medium">{contentTitle}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>
                    {currency === "USD" ? "$" : currency}{" "}
                    {formatPrice(price)}
                  </span>
                </div>
              </div>

              {/* Mock Payment Form */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>Demo Payment Information (Pre-filled)</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    disabled
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={expiryDate}
                      disabled
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={cvv}
                      disabled
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    value={cardholderName}
                    disabled
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handlePurchase()}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                This is a demo payment. No actual charges will be made.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
