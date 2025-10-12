import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Video, 
  FileText, 
  FileAudio, 
  Newspaper,
  Folder,
  FileEdit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  CheckCheck,
  Ban,
  Plus,
  History
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentEditModal } from "./ContentEditModal";
import { ContentVersionHistory } from "./ContentVersionHistory";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export function ContentManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "article" | "document" | "audio">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "review" | "published" | "rejected">("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "video",
      externalUrl: "",
      richTextContent: "",
      body: "",
      isPublic: false,
      tags: "",
      active: true,
      startDate: "",
      endDate: "",
    },
  });

  const formType = watch("type");

  // Get all content and filter client-side to avoid flickering
  const allContent = useQuery(api.content.listContent, {});
  const createContent = useMutation(api.content.createContent);
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);

  // Filter content client-side for better UX
  const filteredContent = allContent?.filter(item => {
    const typeMatch = contentTypeFilter === "all" || item.type === contentTypeFilter;
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    return typeMatch && statusMatch;
  }) || [];

  const handleSubmit = async (data: ContentFormData) => {
    setUploading(true);
    
    try {
      let fileId = undefined;
      
      // Handle file upload for videos, documents, and audio
      if (selectedFile && (data.type === "video" || data.type === "document" || data.type === "audio")) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        const json = await result.json();
        if (!result.ok) {
          throw new Error(`Upload failed: ${JSON.stringify(json)}`);
        }
        fileId = json.storageId;
      }

      await createContent({
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        fileId: fileId,
        externalUrl: data.externalUrl || undefined,
        richTextContent: data.richTextContent || undefined,
        body: data.body || undefined,
        isPublic: data.isPublic,
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()) : undefined,
        active: data.active,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
      });

      // Reset form
      reset();
      setSelectedFile(null);
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating content:", error);
      alert(error instanceof Error ? error.message : "Failed to create content");
    } finally {
      setUploading(false);
    }
  };

  const handleManageAccess = (content: any) => {
    setSelectedContent(content);
    setShowAccessModal(true);
  };

  const handleEditContent = (content: any) => {
    setSelectedContent(content);
    setShowEditModal(true);
  };

  const handleViewVersionHistory = (content: any) => {
    setSelectedContent(content);
    setShowVersionHistory(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type based on content type
      if (formType === "video" && !file.type.startsWith('video/')) {
        alert('Please select a video file');
        e.target.value = '';
        return;
      }
      if (formType === "audio" && !file.type.startsWith('audio/')) {
        alert('Please select an audio file');
        e.target.value = '';
        return;
      }
      if (formType === "document" && !file.type.includes('pdf') && !file.type.includes('document')) {
        alert('Please select a document file (PDF, DOC, etc.)');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
    switch (type) {
      case "video": return <Video {...iconProps} />;
      case "article": return <Newspaper {...iconProps} />;
      case "document": return <FileText {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      default: return <Folder {...iconProps} />;
    }
  };

  const getContentTypeCount = (type: "all" | "video" | "article" | "document" | "audio") => {
    if (type === "all") return allContent?.length || 0;
    return allContent?.filter(item => item.type === type).length || 0;
  };

  const getStatusIcon = (status: string) => {
    const iconProps = { className: "w-4 h-4", strokeWidth: 2 };
    switch (status) {
      case "draft": return <FileEdit {...iconProps} />;
      case "review": return <Eye {...iconProps} />;
      case "published": return <CheckCircle {...iconProps} />;
      case "rejected": return <XCircle {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Content Management</h3>
          <p className="text-sm text-muted-foreground">Manage and organize your content library</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all" className="text-xs">
                  All ({allContent?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs">
                  Drafts ({allContent?.filter(c => c.status === "draft").length || 0})
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs">
                  Review ({allContent?.filter(c => c.status === "review").length || 0})
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs">
                  Published ({allContent?.filter(c => c.status === "published").length || 0})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">
                  Rejected ({allContent?.filter(c => c.status === "rejected").length || 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Content Type</Label>
            <Tabs value={contentTypeFilter} onValueChange={(value) => setContentTypeFilter(value as any)}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all" className="text-xs">
                  All ({allContent?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="video" className="text-xs">
                  Videos ({getContentTypeCount("video")})
                </TabsTrigger>
                <TabsTrigger value="audio" className="text-xs">
                  Audio ({getContentTypeCount("audio")})
                </TabsTrigger>
                <TabsTrigger value="article" className="text-xs">
                  Articles ({getContentTypeCount("article")})
                </TabsTrigger>
                <TabsTrigger value="document" className="text-xs">
                  Documents ({getContentTypeCount("document")})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Content</CardTitle>
            <CardDescription>Add a new piece of content to your library</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { void handleFormSubmit(handleSubmit)(e); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  {...register("type")}
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.type ? "border-destructive" : ""
                  }`}
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="article">Article</option>
                  <option value="document">Document</option>
                </select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>

              {formType === "video" && (
                <div className="space-y-2">
                  <Label htmlFor="videoFile">Video File</Label>
                  <Input
                    id="videoFile"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {formType === "audio" && (
                <div className="space-y-2">
                  <Label htmlFor="audioFile">Audio File</Label>
                  <Input
                    id="audioFile"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {formType === "document" && (
                <div className="space-y-2">
                  <Label htmlFor="documentFile">Document File</Label>
                  <Input
                    id="documentFile"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {formType === "article" && (
                <div className="space-y-2">
                  <Label htmlFor="richTextContent">Content</Label>
                  <Textarea
                    id="richTextContent"
                    {...register("richTextContent")}
                    rows={6}
                    placeholder="Enter article content..."
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="body">Body (optional rich text)</Label>
                <Textarea
                  id="body"
                  {...register("body")}
                  rows={8}
                  placeholder="Add additional rich text content, notes, or descriptions here..."
                />
                <p className="text-xs text-muted-foreground">This field is available for all content types to add supplementary information</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalUrl">External URL (optional)</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  {...register("externalUrl")}
                  className={errors.externalUrl ? "border-destructive" : ""}
                  placeholder="https://..."
                />
                {errors.externalUrl && (
                  <p className="text-sm text-destructive">{errors.externalUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  type="text"
                  {...register("tags")}
                  placeholder="therapy, music, neurologic"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  {...register("isPublic")}
                />
                <Label htmlFor="isPublic" className="font-normal">
                  Make this content public
                </Label>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Availability Settings</h4>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="active"
                      {...register("active")}
                    />
                    <Label htmlFor="active" className="font-normal">
                      Content is active (can be viewed when published)
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date (optional)</Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        {...register("startDate")}
                        className={errors.startDate ? "border-destructive" : ""}
                      />
                      {errors.startDate && (
                        <p className="text-sm text-destructive">{errors.startDate.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Content becomes available at this date/time</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date (optional)</Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        {...register("endDate")}
                        className={errors.endDate ? "border-destructive" : ""}
                      />
                      {errors.endDate && (
                        <p className="text-sm text-destructive">{errors.endDate.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Content expires at this date/time</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Creating..." : "Create Content"}
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
      )}

      {/* Content List */}
      <div className="space-y-4">
        {allContent === undefined ? (
          // Loading state
          <Card>
            <CardContent className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading content...</span>
            </CardContent>
          </Card>
        ) : filteredContent.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground mb-4 flex justify-center">
                {contentTypeFilter === "all" ? <Folder className="w-16 h-16" /> : <div className="[&>svg]:w-16 [&>svg]:h-16">{getTypeIcon(contentTypeFilter)}</div>}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {contentTypeFilter === "all" 
                  ? "No content available" 
                  : `No ${contentTypeFilter}${contentTypeFilter === "audio" ? "" : "s"} available`
                }
              </h3>
              <p className="text-muted-foreground">
                {contentTypeFilter === "all"
                  ? "Create your first piece of content to get started."
                  : `Create your first ${contentTypeFilter} to get started.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          // Content list
          filteredContent.map((item) => (
            <Card key={item._id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start flex-1">
                    <div className="mr-3 mt-1">{getTypeIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <Badge variant="secondary" className="capitalize">
                          {item.type}
                        </Badge>
                        <Badge variant={
                          item.status === "published" ? "default" :
                          item.status === "review" ? "outline" :
                          item.status === "rejected" ? "destructive" :
                          "secondary"
                        } className="gap-1">
                          {getStatusIcon(item.status)} <span>{item.status}</span>
                        </Badge>
                        <Badge variant={item.isPublic ? "default" : "secondary"}>
                          {item.isPublic ? "Public" : "Private"}
                        </Badge>
                        <Badge variant={item.active ? "default" : "outline"} className="gap-1">
                          {item.active ? <><CheckCheck className="w-3 h-3" /> Active</> : <><Ban className="w-3 h-3" /> Inactive</>}
                        </Badge>
                        {item.startDate && (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" /> Starts: {new Date(item.startDate).toLocaleDateString()}
                          </Badge>
                        )}
                        {item.endDate && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" /> Ends: {new Date(item.endDate).toLocaleDateString()}
                          </Badge>
                        )}
                        {item.tags && item.tags.length > 0 && item.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditContent(item)}
                    >
                      <FileEdit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewVersionHistory(item)}
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => handleManageAccess(item)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Access
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Access Management Modal */}
      {selectedContent && (
        <AccessManagementModal
          isOpen={showAccessModal}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          title={selectedContent.title}
        />
      )}

      {/* Edit Content Modal */}
      {selectedContent && (
        <ContentEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
        />
      )}

      {/* Version History Modal */}
      {selectedContent && (
        <ContentVersionHistory
          isOpen={showVersionHistory}
          onClose={() => {
            setShowVersionHistory(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          contentTitle={selectedContent.title}
        />
      )}
    </div>
  );
}
