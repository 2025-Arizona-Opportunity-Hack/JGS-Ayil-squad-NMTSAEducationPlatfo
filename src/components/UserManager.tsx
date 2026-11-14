import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { canDeleteUser, hasPermission, PERMISSIONS } from "@/lib/permissions";

export function UserManager() {
  const users = useQuery(api.users.listUsers);
  const currentProfile = useQuery(api.users.getCurrentUserProfile);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const promoteToAdmin = useMutation(api.users.promoteToAdmin);
  const deleteUser = useMutation(api.users.deleteUser);

  // Permission-based checks
  const canUpdateRoles = hasPermission(currentProfile?.effectivePermissions, PERMISSIONS.UPDATE_USER_ROLES);
  const canPromoteToAdmin = hasPermission(currentProfile?.effectivePermissions, PERMISSIONS.PROMOTE_TO_ADMIN);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole({ 
        userId: userId as any, 
        role: newRole as any 
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    try {
      await deleteUser({ userId: userId as any });
      toast.success(`${name} was deleted`);
    } catch (error) {
      const message =
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't delete this user. Please try again.";
      toast.error(message);
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case "owner": return "destructive";
      case "admin": return "default";
      case "editor": return "secondary";
      case "contributor": return "outline";
      case "professional": return "secondary";
      case "parent": return "secondary";
      case "client": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <Card key={user._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Owner cannot be changed; Admin can only be changed by owner */}
                    {user.role === "owner" ? (
                      <span className="text-sm text-muted-foreground px-3 py-2">Owner</span>
                    ) : user.role === "admin" && !canPromoteToAdmin ? (
                      <span className="text-sm text-muted-foreground px-3 py-2">Admin</span>
                    ) : canUpdateRoles ? (
                      <>
                        {canPromoteToAdmin && user.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void promoteToAdmin({ userId: user.userId as any })}
                          >
                            Promote to Admin
                          </Button>
                        )}
                        {canPromoteToAdmin && user.role !== "admin" && (
                          <span className="text-muted-foreground text-xs">or set another role:</span>
                        )}
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => void handleRoleChange(user.userId, newRole)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {canPromoteToAdmin && <SelectItem value="admin">Admin</SelectItem>}
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="contributor">Contributor</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground px-3 py-2">{user.role}</span>
                    )}
                    {currentProfile &&
                      canDeleteUser(
                        {
                          userId: currentProfile.userId,
                          role: currentProfile.role,
                          permissions: currentProfile.effectivePermissions,
                        },
                        { userId: user.userId, role: user.role },
                      ) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive">
                              Delete
                              <span className="sr-only"> {user.firstName} {user.lastName}</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete {user.firstName} {user.lastName}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes their account and signs them out everywhere. It also
                                removes them from their groups and takes away content shared
                                directly with them. Content they created stays. This can't be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() =>
                                  void handleDelete(user.userId, `${user.firstName} ${user.lastName}`)
                                }
                              >
                                Delete user
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
