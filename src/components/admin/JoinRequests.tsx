"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  User,
  Calendar,
} from "lucide-react";

export function JoinRequests() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "denied"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const allRequests = useQuery(api.joinRequests.listJoinRequests, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const approveRequest = useMutation(api.joinRequests.approveJoinRequest);
  const denyRequest = useMutation(api.joinRequests.denyJoinRequest);

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
      toast.success("Join request approved");
      setShowReviewModal(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve request"
      );
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
      toast.success("Join request denied");
      setShowReviewModal(false);
      setSelectedRequest(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to deny request"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string, emailVerified?: boolean | null) => {
    if (status === "pending_verification") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          Awaiting Verification
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending Review
        </Badge>
      );
    }
    if (status === "approved") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (status === "denied") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Denied
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (allRequests === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const filteredRequests = allRequests.filter((request) => {
    const query = searchQuery.toLowerCase();
    return (
      request.email.toLowerCase().includes(query) ||
      request.firstName.toLowerCase().includes(query) ||
      request.lastName.toLowerCase().includes(query) ||
      (request.message && request.message.toLowerCase().includes(query))
    );
  });

  const pendingCount = allRequests.filter(
    (r) => r.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Join Requests</h2>
          <p className="text-muted-foreground mt-2">
            Review and approve user requests to join the platform
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Pending Requests</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as any)}
        >
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
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No join requests found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? "Try adjusting your search filters"
                : "No requests match the selected criteria"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">
                            {request.firstName} {request.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {request.email}
                            </p>
                            {request.emailVerified && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {request.message && (
                      <p className="text-sm text-muted-foreground pl-7">
                        {request.message}
                      </p>
                    )}

                    <div className="flex items-center gap-4 pl-7 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Requested:{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {request.verifiedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            Verified:{" "}
                            {new Date(request.verifiedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {request.reviewedAt && (
                        <div className="flex items-center gap-1">
                          <span>
                            Reviewed:{" "}
                            {new Date(request.reviewedAt).toLocaleDateString()}
                          </span>
                          {request.reviewerName && (
                            <span>by {request.reviewerName}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {request.adminNotes && (
                      <div className="pl-7 mt-2 p-3 bg-muted rounded-md">
                        <p className="text-xs font-medium mb-1">Admin Notes:</p>
                        <p className="text-xs text-muted-foreground">
                          {request.adminNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {getStatusBadge(request.status, request.emailVerified)}
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(request)}
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Join Request</DialogTitle>
            <DialogDescription>
              Review the request from {selectedRequest?.firstName}{" "}
              {selectedRequest?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.email}
                </p>
              </div>
              {selectedRequest.message && (
                <div>
                  <p className="text-sm font-medium">Message</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.message}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this request..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
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
              {isProcessing ? "Processing..." : "Deny"}
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

