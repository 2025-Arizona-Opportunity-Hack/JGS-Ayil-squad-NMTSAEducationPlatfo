import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export function OrderHistory() {
  const orders = useQuery(api.orders.getUserOrders);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline">
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isAccessActive = (order: any) => {
    if (!order.accessExpiresAt) return true;
    return order.accessExpiresAt > Date.now();
  };

  if (!orders) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Package className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Orders Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your purchase history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Order History</h2>
        <p className="text-muted-foreground mt-2">
          View your past purchases and access status
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order._id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {order.thumbnailUrl ? (
                    <img
                      src={order.thumbnailUrl}
                      alt={order.contentTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getContentIcon(order.contentType)
                  )}
                </div>

                {/* Order Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">
                        {order.contentTitle}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {order.contentType}
                        </Badge>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${formatPrice(order.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.currency}
                      </div>
                    </div>
                  </div>

                  {/* Order Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order Date:</span>
                      <div className="font-medium">
                        {format(new Date(order.createdAt), "PPP")}
                      </div>
                    </div>
                    {order.completedAt && (
                      <div>
                        <span className="text-muted-foreground">
                          Completed:
                        </span>
                        <div className="font-medium">
                          {format(new Date(order.completedAt), "PPP")}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Access Status */}
                  {order.status === "completed" && (
                    <div className="pt-2 border-t">
                      {order.accessExpiresAt ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Access Expires:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(order.accessExpiresAt), "PPP")}
                            </span>
                            {isAccessActive(order) ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Lifetime Access
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
