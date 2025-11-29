import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, FolderOpen, Lock, Edit } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentGroupContentModal } from "./ContentGroupContentModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function ContentGroupManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const contentGroups = useQuery(api.contentGroups.listContentGroups);
  const createContentGroup = useMutation(api.contentGroups.createContentGroup);

  const handleManageAccess = (group: any) => {
    setSelectedGroup(group);
    setShowAccessModal(true);
  };

  const handleManageContent = (group: any) => {
    setSelectedGroup(group);
    setShowContentModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createContentGroup({
        name: formData.name,
        description: formData.description || undefined,
      });

      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating content group:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Content Bundles</CardTitle>
              <CardDescription>Organize content into bundles for easier management</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Bundle
            </Button>
          </div>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Content Bundle</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Bundle Name</Label>
                    <Input
                      id="groupName"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Beginner Resources"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe what this bundle contains..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">
                      Create Bundle
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contentGroups?.map((group) => (
          <Card key={group._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <Badge variant={group.isActive ? "default" : "destructive"}>
                  {group.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageContent(group)}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Content
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageAccess(group)}
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Access
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Management Modal */}
      {selectedGroup && (
        <ContentGroupContentModal
          isOpen={showContentModal}
          onClose={() => {
            setShowContentModal(false);
            setSelectedGroup(null);
          }}
          groupId={selectedGroup._id}
          groupName={selectedGroup.name}
        />
      )}

      {/* Access Management Modal */}
      {selectedGroup && (
        <AccessManagementModal
          isOpen={showAccessModal}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedGroup(null);
          }}
          contentGroupId={selectedGroup._id}
          title={selectedGroup.name}
        />
      )}
    </div>
  );
}
