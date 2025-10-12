import { useState } from "react";
import { useQuery } from "convex/react";
import { FileText, Users } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UserAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function UserAccessModal({ isOpen, onClose, userId, userName }: UserAccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Access Management: {userName}</DialogTitle>
          <DialogDescription>
            Manage user permissions and access to content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Current Access</h4>
            <Card className="bg-muted">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  This user's access is managed through their role and any specific permissions granted.
                  Use the Content Management section to grant specific content access.
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Grant Content Access</div>
                      <div className="text-xs text-muted-foreground">
                        Give access to specific content
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Add to Group</div>
                      <div className="text-xs text-muted-foreground">
                        Add to a user group
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
