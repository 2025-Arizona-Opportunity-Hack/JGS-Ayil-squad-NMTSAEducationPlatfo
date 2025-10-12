import { useQuery } from "convex/react";
import { Video, FileText, FileAudio, Newspaper, Folder } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ContentViewer } from "./ContentViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ClientDashboard() {
  const content = useQuery(api.content.listContent, {});
  const contentGroups = useQuery(api.contentGroups.listContentGroups);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Your Content Library</CardTitle>
          <CardDescription>
            Access your personalized neurologic music therapy resources and materials.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Content Groups */}
      {contentGroups && contentGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content Collections</CardTitle>
            <CardDescription>Curated content organized into themed collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentGroups.map((group) => (
                <Card key={group._id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription>{group.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Folder className="w-4 h-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="document" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="article" className="flex items-center gap-2">
                <Newspaper className="w-4 h-4" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                Audio
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <ContentViewer content={content || []} />
            </TabsContent>
            <TabsContent value="video" className="mt-6">
              <ContentViewer content={content?.filter(c => c.type === "video") || []} />
            </TabsContent>
            <TabsContent value="document" className="mt-6">
              <ContentViewer content={content?.filter(c => c.type === "document") || []} />
            </TabsContent>
            <TabsContent value="article" className="mt-6">
              <ContentViewer content={content?.filter(c => c.type === "article") || []} />
            </TabsContent>
            <TabsContent value="audio" className="mt-6">
              <ContentViewer content={content?.filter(c => c.type === "audio") || []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
