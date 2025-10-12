import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Folder, FolderTree, Users, UsersRound, Mail } from "lucide-react";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";
import { InviteCodeModal } from "./InviteCodeModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Wait for profile to load to avoid race conditions
  if (!userProfile) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const isAdmin = userProfile.role === "admin";

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAdmin ? "Admin Dashboard" : "Content Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage your content, users, and groups"
              : "Manage and create content"}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Generate Invite Code
          </Button>
        )}
      </div>

      {isAdmin && (
        <InviteCodeModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
        />
      )}

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList
          className={`grid w-full ${isAdmin ? "grid-cols-4" : "grid-cols-1"}`}
        >
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Content
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="contentGroups"
                className="flex items-center gap-2"
              >
                <FolderTree className="w-4 h-4" />
                Content Groups
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="userGroups"
                className="flex items-center gap-2"
              >
                <UsersRound className="w-4 h-4" />
                User Groups
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <ContentManager />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="contentGroups" className="space-y-4">
              <ContentGroupManager />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UserManager />
            </TabsContent>

            <TabsContent value="userGroups" className="space-y-4">
              <UserGroupManager />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
