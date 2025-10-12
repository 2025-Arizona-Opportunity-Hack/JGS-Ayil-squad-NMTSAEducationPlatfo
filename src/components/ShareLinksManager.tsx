import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, ExternalLink, Trash2, Check, Eye, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function ShareLinksManager() {
  const shares = useQuery(api.contentShares.listMyShares, {});
  const deleteShare = useMutation(api.contentShares.deleteShare);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    shareId: string;
    contentTitle: string;
  } | null>(null);

  const handleCopyLink = (accessToken: string) => {
    const shareUrl = `${window.location.origin}/share/${accessToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(accessToken);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteShare = async (shareId: string) => {
    try {
      await deleteShare({ shareId: shareId as any });
      toast.success("Share link deleted successfully");
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting share:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete share link");
    }
  };

  const isExpired = (expiresAt: number) => {
    return expiresAt < Date.now();
  };

  if (shares === undefined) {
    return (
      <Card>
        <CardContent className="flex flex-col justify-center items-center py-16 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading share links...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (shares.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Share Links</CardTitle>
          <CardDescription>
            Manage temporary share links you've created for 3rd parties
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-4 flex justify-center">
            <ExternalLink className="w-16 h-16" />
          </div>
          <h4 className="text-lg font-semibold">No Share Links Yet</h4>
          <p className="text-sm text-muted-foreground mt-2">
            Create share links from content items to share with 3rd parties.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Share Links</CardTitle>
          <CardDescription>
            Manage temporary share links you've created for 3rd parties ({shares.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((share) => {
                  const expired = isExpired(share.expiresAt);
                  const shareUrl = `${window.location.origin}/share/${share.accessToken}`;

                  return (
                    <TableRow key={share._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{share.contentTitle}</span>
                          {share.contentDescription && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {share.contentDescription}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {share.recipientEmail ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span>{share.recipientEmail}</span>
                            </div>
                          ) : share.recipientName ? (
                            <span className="text-sm">{share.recipientName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Anyone</span>
                          )}
                          {share.message && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              "{share.message}"
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{share.viewCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className={expired ? "text-destructive" : ""}>
                            {format(new Date(share.expiresAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {share.lastViewedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last viewed: {format(new Date(share.lastViewedAt), "MMM d, h:mm a")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyLink(share.accessToken)}
                            title="Copy link"
                          >
                            {copiedToken === share.accessToken ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                            title="Open link"
                          >
                            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteConfirm({
                                shareId: share._id,
                                contentTitle: share.contentTitle,
                              })
                            }
                            title="Delete link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Share Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the share link for{" "}
              <span className="font-semibold">{deleteConfirm?.contentTitle}</span>? This action
              cannot be undone and the link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteShare(deleteConfirm.shareId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

