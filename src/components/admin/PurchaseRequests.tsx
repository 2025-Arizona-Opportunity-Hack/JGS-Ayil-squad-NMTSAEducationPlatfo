import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  MessageSquare,
  User,
  FileText,
  DollarSign,
  Check,
  X,
  ShoppingBag,
} from "lucide-react";

export function PurchaseRequests() {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const allRequests = useQuery(api.purchaseRequests.listAllRequests, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const pendingCount = useQuery(api.purchaseRequests.getPendingRequestCount);
  const approveRequest = useMutation(api.purchaseRequests.approveRequest);
  const denyRequest = useMutation(api.purchaseRequests.denyRequest);

  const handleReview = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes("");
    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await approveRequest({
        requestId: selectedRequest._id,
        adminNotes: adminNotes || undefined,
      });
      toast.success("Purchase request approved");
      setShowReviewModal(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await denyRequest({
        requestId: selectedRequest._id,
        adminNotes: adminNotes || undefined,
      });
      toast.success("Purchase request denied");
      setShowReviewModal(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deny request");
    } finally {
      setIsProcessing(false);
    }
  };

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
            Pending
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

  if (!allRequests) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredRequests = allRequests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.contentTitle.toLowerCase().includes(query) ||
      request.userName.toLowerCase().includes(query) ||
      request.userEmail.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Requests</h2>
          <p className="text-muted-foreground mt-2">
            Review and approve user requests to purchase content
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Pending Requests</p>
          <p className="text-2xl font-bold">{pendingCount || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by content, user, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <ShoppingBag className="w-16 h-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">No Purchase Requests</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter === "pending" 
                ? "No pending requests to review"
                : "No requests match your filters"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(request.status)}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>Requested by</span>
                        </div>
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>Content</span>
                        </div>
                        <p className="font-medium">{request.contentTitle}</p>
                        {request.pricing && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            <span>${formatPrice(request.pricing.price)} {request.pricing.currency}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {request.message && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>User's message</span>
                        </div>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}

                    {request.adminNotes && request.status !== "pending" && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">Admin Notes</p>
                        <p className="text-sm text-blue-800">{request.adminNotes}</p>
                        {request.reviewerName && (
                          <p className="text-xs text-blue-600 mt-1">
                            Reviewed by {request.reviewerName} on {format(new Date(request.reviewedAt!), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    )}

                    {request.purchaseCompletedAt && (
                      <Badge variant="outline" className="mt-2">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Purchase completed on {format(new Date(request.purchaseCompletedAt), "MMM d, yyyy")}
                      </Badge>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview(request)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Purchase Request</DialogTitle>
            <DialogDescription>
              Approve or deny this request to purchase content
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedRequest.userName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Content</p>
                  <p className="font-medium">{selectedRequest.contentTitle}</p>
                  {selectedRequest.pricing && (
                    <p className="text-sm text-muted-foreground">
                      ${formatPrice(selectedRequest.pricing.price)} {selectedRequest.pricing.currency}
                    </p>
                  )}
                </div>
                {selectedRequest.message && (
                  <div>
                    <p className="text-sm text-muted-foreground">User's Message</p>
                    <p className="text-sm">{selectedRequest.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-1" />
              Deny
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
