import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MockPaymentModal } from "./MockPaymentModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  ShoppingCart,
  CheckCircle2,
  Clock,
} from "lucide-react";

export function Shop() {
  const pricedContent = useQuery(api.pricing.listPricedContent);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
                    {getContentIcon(item.type)}
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
                    {getContentIcon(item.type)}
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.type}
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
                <Button
                  className="w-full"
                  onClick={() => handleBuyClick(item)}
                  disabled={item.hasAccess || false}
                >
                  {item.hasAccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Already Owned
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
