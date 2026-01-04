"use client";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";
import { Logo } from "./Logo";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Mail,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export function JoinRequestStatus({ email, onBack }: { email: string; onBack: () => void }) {
  const requestStatus = useQuery(
    api.joinRequests.checkJoinRequestStatus,
    email ? { email } : "skip"
  );

  if (requestStatus === undefined) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requestStatus) {
    return null; // No request found, show join request form
  }

  const { status, createdAt, adminNotes } = requestStatus;
  const requestDate = new Date(createdAt).toLocaleDateString();

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-4 pb-6">
        <div className="text-center space-y-1">
          <CardTitle>Request Status</CardTitle>
          <CardDescription>
            Check the status of your join request.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "pending" && (
          <>
            <div className="flex items-center justify-center py-2">
              <div className="rounded-full bg-amber-100 p-4">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                Pending Review
              </Badge>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Submitted on <strong className="text-foreground">{requestDate}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  We'll notify you at <strong>{email}</strong> once reviewed.
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Check your email
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    You'll receive an email notification when your request is reviewed.
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </>
        )}

        {status === "approved" && (
          <>
            <div className="flex items-center justify-center py-2">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                Approved!
              </Badge>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Approved on{" "}
                  <strong className="text-foreground">
                    {requestStatus.reviewedAt
                      ? new Date(requestStatus.reviewedAt).toLocaleDateString()
                      : requestDate}
                  </strong>
                </p>
                {adminNotes && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3 text-left">
                    <p className="text-xs text-green-800 font-medium mb-1">
                      Message from admin:
                    </p>
                    <p className="text-xs text-green-700">{adminNotes}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  You can now sign in to access the platform.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={onBack}
                className="flex-1"
                size="lg"
              >
                Sign In Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {status === "denied" && (
          <>
            <div className="flex items-center justify-center py-2">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                Request Denied
              </Badge>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Reviewed on{" "}
                  <strong className="text-foreground">
                    {requestStatus.reviewedAt
                      ? new Date(requestStatus.reviewedAt).toLocaleDateString()
                      : requestDate}
                  </strong>
                </p>
                {adminNotes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-left">
                    <p className="text-xs text-red-800 font-medium mb-1">
                      Reason:
                    </p>
                    <p className="text-xs text-red-700">{adminNotes}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  If you believe this is an error, please contact support.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

