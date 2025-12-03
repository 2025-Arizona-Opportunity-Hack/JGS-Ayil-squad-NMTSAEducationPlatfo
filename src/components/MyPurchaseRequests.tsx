import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingBag,
  FileText,
  DollarSign,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";

export function MyPurchaseRequests() {
  const requests = useQuery(api.purchaseRequests.getMyPurchaseRequests);
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (priceInCents: number) => {
    return (priceInCents / 100).toFixed(2);
  };

  if (!requests) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Purchase Requests</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You haven't requested to purchase any content yet
          </p>
          <Button 
            className="mt-4" 
            onClick={() => navigate("/dashboard")}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Browse Shop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Purchase Requests</h2>
        <p className="text-muted-foreground mt-2">
          Track the status of your content purchase requests
        </p>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    <span className="text-sm text-muted-foreground">
                      Requested {format(new Date(request.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Content</span>
                    </div>
                    <p className="font-medium text-lg">{request.contentTitle}</p>
                    {request.contentDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.contentDescription}
                      </p>
                    )}
                    {request.pricing && (
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>${formatPrice(request.pricing.price)} {request.pricing.currency}</span>
                      </div>
                    )}
                  </div>

                  {request.message && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>Your message</span>
                      </div>
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}

                  {request.adminNotes && (
                    <div className={`p-3 rounded-lg ${
                      request.status === "approved" 
                        ? "bg-green-50 border border-green-200" 
                        : request.status === "denied"
                        ? "bg-red-50 border border-red-200"
                        : "bg-blue-50 border border-blue-200"
                    }`}>
                      <p className={`text-sm font-medium ${
                        request.status === "approved" 
                          ? "text-green-900" 
                          : request.status === "denied"
                          ? "text-red-900"
                          : "text-blue-900"
                      }`}>
                        Admin Response
                      </p>
                      <p className={`text-sm ${
                        request.status === "approved" 
                          ? "text-green-800" 
                          : request.status === "denied"
                          ? "text-red-800"
                          : "text-blue-800"
                      }`}>
                        {request.adminNotes}
                      </p>
                      {request.reviewerName && (
                        <p className={`text-xs mt-1 ${
                          request.status === "approved" 
                            ? "text-green-600" 
                            : request.status === "denied"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}>
                          — {request.reviewerName}
                        </p>
                      )}
                    </div>
                  )}

                  {request.purchaseCompletedAt && (
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Purchased on {format(new Date(request.purchaseCompletedAt), "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>

                {request.status === "approved" && !request.purchaseCompletedAt && (
                  <Button onClick={() => navigate("/dashboard")}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Complete Purchase
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
