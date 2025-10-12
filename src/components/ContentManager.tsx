import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Video, 
  FileText, 
  FileAudio, 
  Newspaper,
  Folder,
  FileEdit,
  Eye,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  CheckCheck,
  Ban,
  Plus,
  History,
  Search,
  X,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Trash2,
  Share2,
  Check,
  Send
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentEditModal } from "./ContentEditModal";
import { ContentVersionHistory } from "./ContentVersionHistory";
import { ContentReviewModal } from "./ContentReviewModal";
import { VideoThumbnail } from "./VideoThumbnail";
import { LexicalEditor } from "./LexicalEditor";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

export function ContentManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "article" | "document" | "audio">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "review" | "published" | "rejected" | "changes_requested">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [contentToDelete, setContentToDelete] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // React Hook Form
  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    reset,
    control,
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
  const contentGroups = useQuery(api.contentGroups.listContentGroups, {});
  const contentGroupItems = useQuery(api.contentGroups.listAllContentGroupItems, {});
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const createContent = useMutation(api.content.createContent);
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const deleteContentMutation = useMutation(api.content.deleteContent);
  const submitForReview = useMutation(api.content.submitForReview);

  // Filter content client-side for better UX
  const filteredContent = allContent?.filter(item => {
    const typeMatch = contentTypeFilter === "all" || item.type === contentTypeFilter;
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    
    // Search by title or description
    const searchMatch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tags
    const tagMatch = selectedTags.length === 0 || 
      (item.tags && selectedTags.some(tag => item.tags?.includes(tag)));
    
    // Filter by content group
    const groupMatch = !selectedGroupId ||
      (contentGroupItems?.some((groupItem: any) => 
        groupItem.contentId === item._id && groupItem.groupId === selectedGroupId
      ));
    
    return typeMatch && statusMatch && searchMatch && tagMatch && groupMatch;
  }) || [];

  // Get all unique tags from content
  const allTags = Array.from(
    new Set(
      allContent?.flatMap(item => item.tags || []) || []
    )
  ).sort();

  // Generate thumbnail from video
  const generateVideoThumbnail = (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        // Seek to 1 second or 10% of video duration, whichever is smaller
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        // Set canvas size to video dimensions (max 640px width to keep file size reasonable)
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        // Draw video frame to canvas
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
            // Cleanup
            URL.revokeObjectURL(video.src);
          },
          'image/jpeg',
          0.8
        );
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleSubmit = async (data: ContentFormData) => {
    setUploading(true);
    
    try {
      let fileId = undefined;
      let thumbnailId = undefined;
      
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
        
        // Generate and upload thumbnail for videos
        if (data.type === "video") {
          try {
            toast.loading("Generating thumbnail...", { id: "thumbnail" });
            const thumbnailBlob = await generateVideoThumbnail(selectedFile);
            
            const thumbnailUploadUrl = await generateUploadUrl();
            const thumbnailResult = await fetch(thumbnailUploadUrl, {
              method: "POST",
              headers: { "Content-Type": "image/jpeg" },
              body: thumbnailBlob,
            });
            const thumbnailJson = await thumbnailResult.json();
            
            if (thumbnailResult.ok) {
              thumbnailId = thumbnailJson.storageId;
              toast.success("Thumbnail generated!", { id: "thumbnail" });
            } else {
              toast.dismiss("thumbnail");
            }
          } catch (error) {
            console.error("Error generating thumbnail:", error);
            toast.dismiss("thumbnail");
            // Continue without thumbnail if generation fails
          }
        }
      }

      await createContent({
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        fileId: fileId,
        thumbnailId: thumbnailId,
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
      toast.success("Content created successfully!");
    } catch (error) {
      console.error("Error creating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create content");
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

  const handleReviewContent = (content: any) => {
    setSelectedContent(content);
    setShowReviewModal(true);
  };

  const handleSubmitForReview = async (contentId: string) => {
    const toastId = toast.loading("Submitting for review...");
    
    try {
      await submitForReview({ contentId: contentId as any });
      toast.success("Content submitted for review!", { id: toastId });
    } catch (error) {
      console.error("Error submitting for review:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit for review", { id: toastId });
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    const toastId = toast.loading("Deleting content...");
    
    try {
      await deleteContentMutation({ contentId: contentId as any });
      toast.success("Content deleted successfully!", { id: toastId });
      setContentToDelete(null);
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete content", { id: toastId });
    }
  };

  const handleShareContent = async (contentId: string) => {
    const shareUrl = `${window.location.origin}/view/${contentId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(contentId);
      toast.success("Link copied to clipboard!");
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type based on content type
      if (formType === "video" && !file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        e.target.value = '';
        return;
      }
      if (formType === "audio" && !file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        e.target.value = '';
        return;
      }
      if (formType === "document" && !file.type.includes('pdf') && !file.type.includes('document')) {
        toast.error('Please select a document file (PDF, DOC, etc.)');
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

      {/* Search and Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
                  <Filter className="w-5 h-5" />
                  <CardTitle>Search & Filters</CardTitle>
                  {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              {(searchQuery || selectedTags.length > 0 || statusFilter !== "all" || contentTypeFilter !== "all" || selectedGroupId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTags([]);
                    setStatusFilter("all");
                    setContentTypeFilter("all");
                    setSelectedGroupId(null);
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Search Content</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="search"
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground">
                Found {filteredContent.length} result{filteredContent.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <Separator />

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="draft" className="text-xs">
                  <span className="hidden sm:inline">Drafts</span>
                  <span className="sm:hidden">Draft</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {allContent?.filter(c => c.status === "draft").length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs">
                  Review
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {allContent?.filter(c => c.status === "review").length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="changes_requested" className="text-xs">
                  <span className="hidden sm:inline">Changes</span>
                  <span className="sm:hidden">Chg</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {allContent?.filter(c => c.status === "changes_requested").length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="published" className="text-xs">
                  <span className="hidden sm:inline">Published</span>
                  <span className="sm:hidden">Pub</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {allContent?.filter(c => c.status === "published").length || 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">
                  <span className="hidden sm:inline">Rejected</span>
                  <span className="sm:hidden">Rej</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {allContent?.filter(c => c.status === "rejected").length || 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />
          
          {/* Content Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Content Type</Label>
            <Tabs value={contentTypeFilter} onValueChange={(value) => setContentTypeFilter(value as any)}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="video" className="text-xs flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span className="hidden sm:inline">Video</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getContentTypeCount("video")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="audio" className="text-xs flex items-center gap-1">
                  <FileAudio className="w-3 h-3" />
                  <span className="hidden sm:inline">Audio</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getContentTypeCount("audio")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="article" className="text-xs flex items-center gap-1">
                  <Newspaper className="w-3 h-3" />
                  <span className="hidden sm:inline">Article</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getContentTypeCount("article")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="document" className="text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span className="hidden sm:inline">Doc</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getContentTypeCount("document")}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Content Group Filter */}
          {contentGroups && contentGroups.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by Content Group</Label>
                <select
                  value={selectedGroupId || "all"}
                  onChange={(e) => setSelectedGroupId(e.target.value === "all" ? null : e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Groups</option>
                  {contentGroups.map((group: any) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Results Summary */}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {filteredContent.length} of {allContent?.length || 0} items
            </span>
            {filteredContent.length !== allContent?.length && (
              <Badge variant="secondary">
                Filtered
              </Badge>
            )}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Content</DialogTitle>
            <DialogDescription>Add a new piece of content to your library</DialogDescription>
          </DialogHeader>
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
                <Controller
                  name="body"
                  control={control}
                  render={({ field }) => (
                    <LexicalEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Add additional rich text content, notes, or descriptions here..."
                      isRichText={true}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">This field is available for all content types to add supplementary information. Use the toolbar for formatting.</p>
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
                      <Label>Start Date (optional)</Label>
                      <Controller
                        name="startDate"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  errors.startDate && "border-destructive"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.startDate && (
                        <p className="text-sm text-destructive">{errors.startDate.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Content becomes available on this date</p>
                    </div>

                    <div className="space-y-2">
                      <Label>End Date (optional)</Label>
                      <Controller
                        name="endDate"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  errors.endDate && "border-destructive"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      {errors.endDate && (
                        <p className="text-sm text-destructive">{errors.endDate.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Content expires on this date</p>
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
        </DialogContent>
      </Dialog>

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
          filteredContent.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Status Indicator on Left */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-16 border-r pr-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      item.status === "review" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      item.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      item.status === "changes_requested" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    }`}>
                      {getStatusIcon(item.status)}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight uppercase tracking-wide text-muted-foreground">
                      {item.status === "changes_requested" ? "Changes" : item.status}
                    </span>
                  </div>

                  {/* Content Area */}
                  <div className="flex justify-between items-start gap-4 flex-1 min-w-0">
                    {/* Thumbnail for video/audio content */}
                    {item.type === "video" && (
                      <VideoThumbnail
                        contentId={item._id}
                        videoUrl={(item as any).fileUrl}
                        thumbnailUrl={(item as any).thumbnailUrl}
                        title={item.title}
                      />
                    )}
                    {item.type === "audio" && (item as any).thumbnailUrl && (
                      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border">
                        <img 
                          src={(item as any).thumbnailUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {item.type === "audio" && !(item as any).thumbnailUrl && (
                      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                    )}
                    
                    <div className="flex items-start flex-1 min-w-0">
                      {item.type !== "video" && item.type !== "audio" && (
                        <div className="mr-3 mt-1 flex-shrink-0">{getTypeIcon(item.type)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="capitalize">
                            {item.type}
                          </Badge>
                          <Badge variant={item.isPublic ? "default" : "secondary"}>
                            {item.isPublic ? "Public" : "Private"}
                          </Badge>
                          <Badge variant={item.active ? "default" : "outline"} className="gap-1">
                            {item.active ? <><CheckCheck className="w-3 h-3" /> Active</> : <><Ban className="w-3 h-3" /> Inactive</>}
                          </Badge>
                          {item.startDate && (
                            <Badge variant="outline" className="gap-1">
                              <CalendarDays className="w-3 h-3" /> Starts: {new Date(item.startDate).toLocaleDateString()}
                            </Badge>
                          )}
                          {item.endDate && (
                            <Badge variant="outline" className="gap-1">
                              <CalendarDays className="w-3 h-3" /> Ends: {new Date(item.endDate).toLocaleDateString()}
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
                    <div className="flex gap-2 ml-4 flex-wrap">
                    {item.status === "review" && (userProfile?.role === "admin" || userProfile?.role === "editor") && (
                      <Button 
                        size="sm"
                        variant="default"
                        onClick={() => handleReviewContent(item)}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    )}
                    {(item.status === "draft" || item.status === "rejected" || item.status === "changes_requested") && 
                     (userProfile?.role === "admin" || userProfile?.role === "contributor") && (
                      <Button 
                        size="sm"
                        variant="default"
                        onClick={() => void handleSubmitForReview(item._id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Submit for Review
                      </Button>
                    )}
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
                    {userProfile?.role === "admin" && (
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={() => handleManageAccess(item)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Access
                      </Button>
                    )}
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleShareContent(item._id)}
                      className={copiedId === item._id ? "text-green-600" : ""}
                    >
                      {copiedId === item._id ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => setContentToDelete(item)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </motion.div>
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

      {/* Review Content Modal */}
      {selectedContent && (
        <ContentReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={contentToDelete !== null} onOpenChange={(open) => !open && setContentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{contentToDelete?.title}"? This action cannot be undone and will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Delete all version history</li>
                <li>Remove from all content groups</li>
                <li>Delete all access permissions</li>
                <li>Remove all shares</li>
              </ul>
              <p className="mt-2 font-semibold text-destructive">This is a permanent action!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => contentToDelete && void handleDeleteContent(contentToDelete._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
