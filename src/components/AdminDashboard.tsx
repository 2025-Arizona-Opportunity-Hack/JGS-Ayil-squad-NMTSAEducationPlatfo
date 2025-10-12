import { Folder, FolderTree, Users, UsersRound } from "lucide-react";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export function AdminDashboard() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your content, users, and groups</p>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="contentGroups" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Content Groups
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="userGroups" className="flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            User Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <ContentManager />
        </TabsContent>

        <TabsContent value="contentGroups" className="space-y-4">
          <ContentGroupManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManager />
        </TabsContent>

        <TabsContent value="userGroups" className="space-y-4">
          <UserGroupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
