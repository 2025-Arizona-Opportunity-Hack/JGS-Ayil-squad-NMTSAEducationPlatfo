import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, X, UserPlus } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function UserGroupManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const userGroups = useQuery(api.userGroups.listUserGroups);
  const users = useQuery(api.users.listUsers);
  const createUserGroup = useMutation(api.userGroups.createUserGroup);
  const addUserToGroup = useMutation(api.userGroups.addUserToGroup);
  const removeUserFromGroup = useMutation(api.userGroups.removeUserFromGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createUserGroup({
        name: formData.name,
        description: formData.description || undefined,
      });

      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating user group:", error);
    }
  };

  const handleAddUser = async (groupId: string, userId: string) => {
    try {
      await addUserToGroup({
        groupId: groupId as any,
        userId: userId as any,
      });
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  };

  const handleRemoveUser = async (groupId: string, userId: string) => {
    try {
      await removeUserFromGroup({
        groupId: groupId as any,
        userId: userId as any,
      });
    } catch (error) {
      console.error("Error removing user from group:", error);
    }
  };

  const nonAdminUsers = users?.filter(user => user.role !== "admin") || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>User Groups</CardTitle>
              <CardDescription>Create and manage user groups for easier content access control</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Group
            </Button>
          </div>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New User Group</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Advanced Practitioners"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe this user group..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">
                      Create Group
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      <div className="space-y-4">
        {userGroups?.map((group) => (
          <UserGroupCard
            key={group._id}
            group={group}
            users={nonAdminUsers}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
          />
        ))}
      </div>
    </div>
  );
}

interface UserGroupCardProps {
  group: any;
  users: any[];
  onAddUser: (groupId: string, userId: string) => void;
  onRemoveUser: (groupId: string, userId: string) => void;
}

function UserGroupCard({ group, users, onAddUser, onRemoveUser }: UserGroupCardProps) {
  const [showAddUser, setShowAddUser] = useState(false);
  const groupMembers = useQuery(api.userGroups.getGroupMembers, { groupId: group._id });

  const availableUsers = users.filter(user => 
    !groupMembers?.some(member => member.userId === user.userId)
  );

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case "professional": return "secondary";
      case "parent": return "default";
      case "client": return "outline";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{group.name}</CardTitle>
            {group.description && (
              <CardDescription>{group.description}</CardDescription>
            )}
          </div>
          <Badge variant={group.isActive ? "default" : "destructive"}>
            {group.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-medium">
            Members ({groupMembers?.length || 0})
          </h5>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddUser(!showAddUser)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add User
          </Button>
        </div>

        {/* Current Members */}
        {groupMembers && groupMembers.length > 0 && (
          <div className="space-y-2">
            {groupMembers.map((member) => {
              const user = users.find(u => u.userId === member.userId);
              if (!user) return null;
              
              return (
                <Card key={member.userId} className="bg-muted/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveUser(group._id, member.userId)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add User Form */}
        {showAddUser && availableUsers.length > 0 && (
          <>
            <Separator />
            <div>
              <h6 className="text-sm font-medium mb-3">Add Users to Group</h6>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availableUsers.map((user) => (
                  <Card key={user.userId} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddUser(group._id, user.userId)}
                      >
                        Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}

        {showAddUser && availableUsers.length === 0 && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground">All users are already in this group.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
