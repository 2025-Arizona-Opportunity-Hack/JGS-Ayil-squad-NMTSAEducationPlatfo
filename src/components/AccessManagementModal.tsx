import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId?: string;
  contentGroupId?: string;
  title: string;
}

export function AccessManagementModal({ 
  isOpen, 
  onClose, 
  contentId, 
  contentGroupId, 
  title 
}: AccessManagementModalProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [canShare, setCanShare] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const users = useQuery(api.users.listUsers);
  const userGroups = useQuery(api.userGroups.listUserGroups);
  
  const grantContentAccess = useMutation(api.content.grantContentAccess);
  const grantContentGroupAccess = useMutation(api.contentGroups.grantContentGroupAccess);
  const updateContentPublic = useMutation(api.content.updateContentPublic);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleUserGroupToggle = (groupId: string) => {
    setSelectedUserGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Handle public access first
      if (isPublic && contentId) {
        await updateContentPublic({
          contentId: contentId as any,
          isPublic: true,
        });
      }

      const accessData = {
        canShare,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
      };

      // Grant access to selected users
      for (const userId of selectedUsers) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            userId: userId as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            userId: userId as any,
            ...accessData,
          });
        }
      }

      // Grant access to selected roles
      for (const role of selectedRoles) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            role: role as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            role: role as any,
            ...accessData,
          });
        }
      }

      // Grant access to selected user groups
      for (const userGroupId of selectedUserGroups) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            userGroupId: userGroupId as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            userGroupId: userGroupId as any,
            ...accessData,
          });
        }
      }

      onClose();
      // Reset form
      setIsPublic(false);
      setSelectedUsers([]);
      setSelectedRoles([]);
      setSelectedUserGroups([]);
      setCanShare(false);
      setExpiresAt("");
      setUserSearchTerm("");
    } catch (error) {
      console.error("Error granting access:", error);
    }
  };

  const nonAdminUsers = users?.filter(user => user.role !== "admin") || [];
  const roles = ["client", "parent", "professional"];

  // Filter users based on search term
  const filteredUsers = nonAdminUsers.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Access: {title}</DialogTitle>
          <DialogDescription>
            Configure who can access this content and their permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          {/* Public Access */}
          {contentId && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
                <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                  Make this content public (accessible to all users)
                </Label>
              </div>
              <Separator />
            </>
          )}

          {/* Role-based Access */}
          <div className="space-y-3">
            <Label>Grant Access by Role</Label>
            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="font-normal cursor-pointer capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Individual User Access */}
          <div className="space-y-3">
            <Label>Grant Access to Specific Users</Label>
            
            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="text-sm font-medium text-blue-900">
                  Selected Users ({selectedUsers.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = nonAdminUsers.find(u => u.userId === userId);
                    if (!user) return null;
                    return (
                      <Badge key={userId} variant="secondary" className="bg-blue-100 text-blue-800">
                        {user.firstName} {user.lastName}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUserToggle(userId)}
                          className="ml-1 h-auto p-0 text-blue-600 hover:text-blue-800 hover:bg-transparent"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Search and Add Users */}
            <Input
              type="text"
              placeholder="Search users by name or email to add..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
            />

            {/* Search Results - Only show when searching */}
            {userSearchTerm && (
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users found matching your search</p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <Button
                        key={user.userId}
                        type="button"
                        variant={selectedUsers.includes(user.userId) ? "secondary" : "ghost"}
                        onClick={() => handleUserToggle(user.userId)}
                        className="w-full justify-start h-auto p-2"
                      >
                        <div className="flex items-center w-full">
                          <span className="text-sm">
                            {user.firstName} {user.lastName} ({user.email})
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${
                              user.role === "professional" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              user.role === "parent" ? "bg-green-100 text-green-800 border-green-200" :
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }`}
                          >
                            {user.role}
                          </Badge>
                          {selectedUsers.includes(user.userId) && (
                            <Check className="ml-auto text-blue-600 w-5 h-5" />
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Group Access */}
          <div className="space-y-3">
            <Label>Grant Access to User Groups</Label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-3">
              {userGroups && userGroups.length > 0 ? (
                <div className="space-y-2">
                  {userGroups.map((group) => (
                    <div key={group._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group._id}`}
                        checked={selectedUserGroups.includes(group._id)}
                        onCheckedChange={() => handleUserGroupToggle(group._id)}
                      />
                      <Label htmlFor={`group-${group._id}`} className="font-normal cursor-pointer">
                        {group.name}
                        {group.description && (
                          <span className="ml-2 text-xs text-muted-foreground">({group.description})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No user groups available</p>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <Separator />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="canShare"
                checked={canShare}
                onCheckedChange={(checked) => setCanShare(checked as boolean)}
              />
              <Label htmlFor="canShare" className="font-normal cursor-pointer">
                Allow users to share this content with others
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Grant Access
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
