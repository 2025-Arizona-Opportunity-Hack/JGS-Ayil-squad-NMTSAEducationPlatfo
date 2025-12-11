import { useState, useEffect } from "react";
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
  Archive,
  Search,
  X,
  Filter,
  CalendarDays,
  Trash2,
  Share2,
  Check,
  Send,
  AlertCircle,
  ExternalLink,
  Play,
  Lock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  MoreVertical,
  Globe,
  GlobeLock,
  Package,
  FolderPlus
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentEditModal } from "./ContentEditModal";
import { ContentReviewModal } from "./ContentReviewModal";
import { ThirdPartyShareModal } from "./ThirdPartyShareModal";
import { ContentPricingModal } from "./ContentPricingModal";
import { ContentAnalyticsModal } from "./ContentAnalyticsModal";
import { RecommendContentModal } from "./RecommendContentModal";
import { VideoThumbnail } from "./VideoThumbnail";
import { LexicalEditor } from "./LexicalEditor";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export function ContentManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showThirdPartyShareModal, setShowThirdPartyShareModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [previewContentId, setPreviewContentId] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "image" | "pdf" | "audio" | "richtext">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "review" | "published" | "rejected" | "changes_requested">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "title-asc" | "title-desc" | "status" | "type">("date-desc");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      attachmentType: "video",
      externalUrl: "",
      isPublic: false,
      authorName: "",
      tags: "",
      active: true,
      startDate: "",
      endDate: "",
    },
  });

  const formAttachmentType = watch("attachmentType");

  // Get all content and filter client-side to avoid flickering
  const allContent = useQuery(api.content.listContent, {});
  const contentGroups = useQuery(api.contentGroups.listContentGroups, {});
  const contentGroupItems = useQuery(api.contentGroups.listAllContentGroupItems, {});
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const viewCounts = useQuery(api.analytics.getContentViewCounts);
  const allPricing = useQuery(
    api.pricing.listAllPricing,
    hasPermission(userProfile?.effectivePermissions, PERMISSIONS.SET_CONTENT_PRICING) || 
    hasPermission(userProfile?.effectivePermissions, PERMISSIONS.VIEW_ALL_CONTENT) ? undefined as any : "skip" as any
  );
  const previewContent = useQuery(
    api.content.getContent,
    previewContentId ? { contentId: previewContentId as any } : "skip" as any
  );
  const createContent = useMutation(api.content.createContent);
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const deleteContentMutation = useMutation(api.content.deleteContent);
  const archiveContentMutation = useMutation(api.content.archiveContent);
  const submitForReview = useMutation(api.content.submitForReview);
  
  // Bulk action mutations
  const bulkUpdateVisibility = useMutation(api.content.bulkUpdateVisibility);
  const bulkUpdateActiveStatus = useMutation(api.content.bulkUpdateActiveStatus);
  const bulkArchiveContent = useMutation(api.content.bulkArchiveContent);
  const bulkDeleteContent = useMutation(api.content.bulkDeleteContent);
  const bulkAddToGroup = useMutation(api.contentGroups.bulkAddContentToGroup);
  const createGroupWithContent = useMutation(api.contentGroups.createGroupWithContent);
  
  // Bulk action modal states
  const [showBulkAddToGroupModal, setShowBulkAddToGroupModal] = useState(false);
  const [showBulkRecommendModal, setShowBulkRecommendModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  // Filter content client-side for better UX
  const filteredContent = allContent?.filter(item => {
    const typeMatch = contentTypeFilter === "all" || item.attachmentType === contentTypeFilter;
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    
    // Search by title or description
    const searchMatch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by tags
    const tagMatch = selectedTags.length === 0 || 
      (item.tags && selectedTags.some(tag => item.tags?.includes(tag)));
    
    // Filter by content bundle
    const groupMatch = !selectedGroupId ||
      (contentGroupItems?.some((groupItem: any) => 
        groupItem.contentId === item._id && groupItem.groupId === selectedGroupId
      ));
    
    return typeMatch && statusMatch && searchMatch && tagMatch && groupMatch;
  }) || [];

  // Sort content
  const sortedContent = [...filteredContent].sort((a, b) => {
    const statusOrder = { published: 0, changes_requested: 1, review: 2, draft: 3, rejected: 4 };
    const typeOrder = { video: 0, image: 1, pdf: 2, audio: 3, richtext: 4 };
    
    switch (sortBy) {
      case "date-desc":
        return b._creationTime - a._creationTime;
      case "date-asc":
        return a._creationTime - b._creationTime;
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "status":
        return (statusOrder[a.status as keyof typeof statusOrder] || 5) - (statusOrder[b.status as keyof typeof statusOrder] || 5);
      case "type":
        return (typeOrder[a.attachmentType as keyof typeof typeOrder] || 5) - (typeOrder[b.attachmentType as keyof typeof typeOrder] || 5);
      default:
        return 0;
    }
  });

  // Get all unique tags from content
  const allTags = Array.from(
    new Set(
      allContent?.flatMap(item => item.tags || []) || []
    )
  ).sort();

  // Pagination calculations
  const totalItems = sortedContent.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContent = sortedContent.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [contentTypeFilter, statusFilter, searchQuery, selectedTags, selectedGroupId, sortBy]);

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

  // Selection and bulk actions (component scope)
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedContent.map(c => c._id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds((prev) => allSelected
      ? prev.filter(id => !pageIds.includes(id))
      : Array.from(new Set([...prev, ...pageIds]))
    );
  };

  // Bulk action handlers
  const handleBulkSetPublic = async (isPublic: boolean) => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading(`Setting ${selectedIds.length} item(s) to ${isPublic ? "public" : "private"}...`);
    try {
      const result = await bulkUpdateVisibility({ 
        contentIds: selectedIds as any[], 
        isPublic 
      });
      toast.success(`Updated ${result.updated} item(s) to ${isPublic ? "public" : "private"}`, { id: toastId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to update visibility", { id: toastId });
    }
  };

  const handleBulkSetActive = async (active: boolean) => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading(`Setting ${selectedIds.length} item(s) to ${active ? "active" : "inactive"}...`);
    try {
      const result = await bulkUpdateActiveStatus({ 
        contentIds: selectedIds as any[], 
        active 
      });
      toast.success(`Updated ${result.updated} item(s) to ${active ? "active" : "inactive"}`, { id: toastId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status", { id: toastId });
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`Archive ${selectedIds.length} selected item(s)?`);
    if (!confirm) return;
    const toastId = toast.loading(`Archiving ${selectedIds.length} item(s)...`);
    try {
      const result = await bulkArchiveContent({ contentIds: selectedIds as any[] });
      toast.success(`Archived ${result.archived} item(s)`, { id: toastId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive content", { id: toastId });
    }
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`Delete ${selectedIds.length} selected item(s)? This cannot be undone.`);
    if (!confirm) return;
    const toastId = toast.loading("Deleting selected content...");
    try {
      const result = await bulkDeleteContent({ contentIds: selectedIds as any[] });
      toast.success(`Deleted ${result.deleted} item(s)`, { id: toastId });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed", { id: toastId });
    }
  };

  const handleBulkAddToExistingGroup = async (groupId: string) => {
    if (selectedIds.length === 0) return;
    const toastId = toast.loading("Adding content to bundle...");
    try {
      const result = await bulkAddToGroup({ 
        groupId: groupId as any, 
        contentIds: selectedIds as any[] 
      });
      toast.success(`Added ${result.added} item(s) to "${result.groupName}"`, { id: toastId });
      setSelectedIds([]);
      setShowBulkAddToGroupModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add to bundle", { id: toastId });
    }
  };

  const handleBulkCreateNewGroup = async () => {
    if (selectedIds.length === 0 || !newGroupName.trim()) return;
    const toastId = toast.loading("Creating bundle and adding content...");
    try {
      const result = await createGroupWithContent({ 
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        contentIds: selectedIds as any[] 
      });
      toast.success(`Created "${result.groupName}" with ${result.added} item(s)`, { id: toastId });
      setSelectedIds([]);
      setShowBulkAddToGroupModal(false);
      setNewGroupName("");
      setNewGroupDescription("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create bundle", { id: toastId });
    }
  };

  const handleSubmit = async (data: ContentFormData) => {
    setUploading(true);
    
    try {
      let fileId = undefined;
      let thumbnailId = undefined;
      
      // Handle file upload for videos, pdfs, images, and audio
      if (selectedFile && (data.attachmentType === "video" || data.attachmentType === "pdf" || data.attachmentType === "audio" || data.attachmentType === "image")) {
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
        if (data.attachmentType === "video") {
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
        attachmentType: data.attachmentType,
        fileId: fileId,
        thumbnailId: thumbnailId,
        externalUrl: data.externalUrl || undefined,
        isPublic: data.isPublic,
        authorName: data.authorName || undefined,
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()) : undefined,
        active: data.active,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
        password: data.password || undefined,
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

  const handleReviewContent = (content: any) => {
    setSelectedContent(content);
    setShowReviewModal(true);
  };

  const handlePreviewContent = (content: any) => {
    setSelectedContent(content);
    setPreviewContentId(content._id);
    setShowPreviewModal(true);
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

  const handleArchiveContent = async (contentId: string) => {
    const toastId = toast.loading("Archiving content...");
    
    try {
      await archiveContentMutation({ contentId: contentId as any });
      toast.success("Content archived successfully!", { id: toastId });
    } catch (error) {
      console.error("Error archiving content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to archive content", { id: toastId });
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

  const handleThirdPartyShare = (content: any) => {
    setSelectedContent(content);
    setShowThirdPartyShareModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type based on attachment type
      if (formAttachmentType === "video" && !file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        e.target.value = '';
        return;
      }
      if (formAttachmentType === "audio" && !file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        e.target.value = '';
        return;
      }
      if (formAttachmentType === "pdf" && !file.type.includes('pdf')) {
        toast.error('Please select a PDF file');
        e.target.value = '';
        return;
      }
      if (formAttachmentType === "image" && !file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const getTypeIcon = (attachmentType: string) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
    switch (attachmentType) {
      case "video": return <Video {...iconProps} />;
      case "richtext": return <Newspaper {...iconProps} />;
      case "pdf": return <FileText {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      case "image": return <Folder {...iconProps} />;
      default: return <Folder {...iconProps} />;
    }
  };

  const getContentTypeCount = (attachmentType: "all" | "video" | "image" | "pdf" | "audio" | "richtext") => {
    if (attachmentType === "all") return allContent?.length || 0;
    return allContent?.filter(item => item.attachmentType === attachmentType).length || 0;
  };

  const getStatusIcon = (status: string | undefined) => {
    const iconProps = { className: "w-4 h-4", strokeWidth: 2 };
    switch (status) {
      case "draft": return <FileEdit {...iconProps} />;
      case "review": return <Eye {...iconProps} />;
      case "published": return <CheckCircle {...iconProps} />;
      case "rejected": return <XCircle {...iconProps} />;
      case "changes_requested": return <AlertCircle {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  return (
    <div className="flex gap-6 h-full -m-6 p-6">
      {/* Left Sidebar - Filters */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Filters</h3>
      </div>
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
                Clear
              </Button>
            )}
      </div>

          <Card>
            <CardContent className="p-4 space-y-4">
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
            <div className="space-y-1">
              {[
                { value: "all", label: "All Statuses", count: allContent?.length || 0 },
                { value: "draft", label: "Drafts", count: allContent?.filter(c => c.status === "draft").length || 0 },
                { value: "review", label: "In Review", count: allContent?.filter(c => c.status === "review").length || 0 },
                { value: "changes_requested", label: "Changes Requested", count: allContent?.filter(c => c.status === "changes_requested").length || 0 },
                { value: "published", label: "Published", count: allContent?.filter(c => c.status === "published").length || 0 },
                { value: "rejected", label: "Rejected", count: allContent?.filter(c => c.status === "rejected").length || 0 },
              ].map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setStatusFilter(status.value as any)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                    statusFilter === status.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span>{status.label}</span>
                  <Badge 
                    variant={statusFilter === status.value ? "secondary" : "outline"}
                    className="ml-2"
                  >
                    {status.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <Separator />

      {/* Content Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachment Type</Label>
            <div className="space-y-1">
              {[
                { value: "all", label: "All Types", icon: null, count: allContent?.length || 0 },
                { value: "video", label: "Video", icon: Video, count: getContentTypeCount("video") },
                { value: "audio", label: "Audio", icon: FileAudio, count: getContentTypeCount("audio") },
                { value: "image", label: "Image", icon: Folder, count: getContentTypeCount("image") },
                { value: "pdf", label: "PDF", icon: FileText, count: getContentTypeCount("pdf") },
                { value: "richtext", label: "Rich Text", icon: Newspaper, count: getContentTypeCount("richtext") },
              ].map((type) => {
                const Icon = type.icon;
                return (
            <button
                    key={type.value}
                    type="button"
                    onClick={() => setContentTypeFilter(type.value as any)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      contentTypeFilter === type.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" />}
                      {type.label}
              </span>
                    <Badge 
                      variant={contentTypeFilter === type.value ? "secondary" : "outline"}
                      className="ml-2"
                    >
                      {type.count}
                    </Badge>
            </button>
                );
              })}
            </div>
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

          {/* Content Bundle Filter */}
          {contentGroups && contentGroups.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Filter by Content Bundle</Label>
                <select
                  value={selectedGroupId || "all"}
                  onChange={(e) => setSelectedGroupId(e.target.value === "all" ? null : e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Bundles</option>
                  {contentGroups.map((group: any) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Sort By */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sort By</Label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="status">Status</option>
              <option value="type">Content Type</option>
            </select>
          </div>

          {/* Results Summary */}
          <Separator />
          <div className="text-sm">
            <span className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredContent.length}</span> of {allContent?.length || 0}
            </span>
            {filteredContent.length !== allContent?.length && (
              <Badge variant="secondary" className="ml-2">
                Filtered
              </Badge>
            )}
          </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Content Management</h3>
            <p className="text-sm text-muted-foreground">Manage and organize your content library</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <Checkbox
                checked={paginatedContent.length > 0 && paginatedContent.every(c => selectedIds.includes(c._id))}
                onCheckedChange={toggleSelectAllOnPage}
                id="selectAllPage"
              />
              <Label htmlFor="selectAllPage" className="text-sm">Select page</Label>
              {selectedIds.length > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedIds.length} selected</Badge>
              )}
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0}
              onClick={() => { void handleBulkDeleteSelected(); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>

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
                <Label htmlFor="authorName">Author Name</Label>
                <Input
                  id="authorName"
                  {...register("authorName")}
                  placeholder="Neurological Music Therapy Services of Arizona"
                  className={errors.authorName ? "border-destructive" : ""}
                />
                {errors.authorName && (
                  <p className="text-sm text-destructive">{errors.authorName.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave blank to use default: "Neurological Music Therapy Services of Arizona"
                </p>
            </div>

              <div className="space-y-2">
                <Label htmlFor="attachmentType">Attachment Type *</Label>
              <select
                  id="attachmentType"
                  {...register("attachmentType")}
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    errors.attachmentType ? "border-destructive" : ""
                  }`}
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="image">Image</option>
                <option value="pdf">PDF</option>
                <option value="richtext">Rich Text</option>
              </select>
                {errors.attachmentType && (
                  <p className="text-sm text-destructive">{errors.attachmentType.message}</p>
                )}
            </div>

              {formAttachmentType === "video" && (
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

              {formAttachmentType === "audio" && (
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

              {formAttachmentType === "image" && (
                <div className="space-y-2">
                  <Label htmlFor="imageFile">Image File</Label>
                  <Input
                    id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

              {formAttachmentType === "pdf" && (
                <div className="space-y-2">
                  <Label htmlFor="pdfFile">PDF File</Label>
                  <Input
                    id="pdfFile"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

              {formAttachmentType === "richtext" && (
                <div className="space-y-2">
                  <Label htmlFor="description">Content</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <LexicalEditor
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Enter your rich text content here..."
                        isRichText={true}
                      />
                    )}
                  />
              </div>
            )}

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
                    <Controller
                      name="active"
                      control={control}
                      render={({ field }) => (
                        <>
                          <Checkbox
                            id="inactive"
                            checked={!field.value}
                            onCheckedChange={(checked) => field.onChange(!checked)}
                          />
                          <Label htmlFor="inactive" className="font-normal">
                            Set content as in-active
                          </Label>
                        </>
                      )}
                    />
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

              {/* Password Protection (requires MANAGE_CONTENT_ACCESS permission) */}
              {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.MANAGE_CONTENT_ACCESS) && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="password">Password Protection (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Set a password for this content"
                    {...register("password")}
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If set, users will need this password to view the content (in addition to other access controls)
                  </p>
                </div>
              )}

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

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-primary text-primary-foreground rounded-lg shadow-lg p-3 mb-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={paginatedContent.every(c => selectedIds.includes(c._id))}
                  onCheckedChange={toggleSelectAllOnPage}
                  className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                />
                <span className="text-sm font-medium">
                  {selectedIds.length} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Set Public/Private */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Globe className="w-4 h-4 mr-1" />
                    Visibility
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => void handleBulkSetPublic(true)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Set Public
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleBulkSetPublic(false)}>
                    <GlobeLock className="w-4 h-4 mr-2" />
                    Set Private
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Set Active/Inactive */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => void handleBulkSetActive(true)}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Set Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleBulkSetActive(false)}>
                    <Ban className="w-4 h-4 mr-2" />
                    Set Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add to Bundle */}
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowBulkAddToGroupModal(true)}
              >
                <Package className="w-4 h-4 mr-1" />
                Add to Bundle
              </Button>

              {/* Recommend */}
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowBulkRecommendModal(true)}
              >
                <Send className="w-4 h-4 mr-1" />
                Recommend
              </Button>

              {/* Archive */}
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => void handleBulkArchive()}
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>

              {/* Delete */}
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => void handleBulkDeleteSelected()}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {allContent === undefined ? (
          // Loading state
                    <Card>
                      <CardContent className="flex flex-col justify-center items-center py-16 gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
                          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">Loading content...</p>
                          <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                        </div>
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
          paginatedContent.map((item, index) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/20 relative overflow-hidden group">
                {/* Status Banner - Positioned at top */}
                <div className={`absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-2.5 border-b ${
                  item.status === "published" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200/50 dark:border-green-800/50" :
                  item.status === "review" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/50" :
                  item.status === "rejected" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200/50 dark:border-red-800/50" :
                  item.status === "changes_requested" ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50" :
                  "bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/50"
                }`}>
                  <div className="w-4 h-4 flex-shrink-0">
                    {getStatusIcon(item.status)}
                  </div>
                  <span className="text-xs font-medium capitalize">
                    {item.status === "changes_requested" 
                      ? `Changes Requested${(item as any).reviewerName ? ` by ${(item as any).reviewerName}` : ""}`
                      : item.status === "rejected"
                      ? `Rejected${(item as any).reviewerName ? ` by ${(item as any).reviewerName}` : ""}`
                      : item.status}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.includes(item._id)}
                      onCheckedChange={() => toggleSelect(item._id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select content"
                    />
                  </div>
                </div>

              <CardContent className="p-4 pt-14">
                <div className="flex items-start gap-4">
                  {/* Thumbnail - Clickable with uniform size */}
                  <div 
                    className="flex-shrink-0 cursor-pointer group-hover:ring-2 ring-primary/20 rounded-lg transition-all" 
                    onClick={() => handlePreviewContent(item)}
                  >
                    {item.type === "video" && (
                      <VideoThumbnail
                        contentId={item._id}
                        videoUrl={(item as any).fileUrl}
                        thumbnailUrl={(item as any).thumbnailUrl}
                        title={item.title}
                      />
                    )}
                    {item.type === "audio" && (
                      (item as any).thumbnailUrl ? (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/50 shadow-sm">
                          <img 
                            src={(item as any).thumbnailUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shadow-sm">
                          <div className="text-purple-500 dark:text-purple-400">
                            {getTypeIcon(item.type)}
                          </div>
                        </div>
                      )
                    )}
                    {(item.type === "article" || item.type === "document") && (
                      (item as any).thumbnailUrl ? (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/50 shadow-sm">
                          <img 
                            src={(item as any).thumbnailUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-36 h-24 rounded-lg overflow-hidden ${
                          item.type === "article" 
                            ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50" 
                            : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50"
                        } border flex items-center justify-center shadow-sm`}>
                          <div className={item.type === "article" ? "text-blue-500 dark:text-blue-400" : "text-amber-500 dark:text-amber-400"}>
                            {getTypeIcon(item.type)}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Content Info - Horizontal Layout */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    {/* Title and Description */}
                    <div className="flex-1 min-w-0 mb-3">
                      {/* Title - Clickable */}
                      <h4 
                        className="font-semibold text-base leading-snug mb-1.5 cursor-pointer hover:text-primary transition-colors line-clamp-2"
                        onClick={() => handlePreviewContent(item)}
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      
                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                    </div>

                    {/* Metadata Section - Uniform badges */}
                    <div className="space-y-2 mt-auto">
                      {/* Line 1: Type, Visibility, Active Status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize h-5 font-medium px-2">
                          {item.type}
                        </Badge>
                        <Badge variant={item.isPublic ? "default" : "secondary"} className="text-[10px] h-5 font-medium px-2">
                          {item.isPublic ? "Public" : "Private"}
                        </Badge>
                          {item.status === "published" && (
                            <Badge variant={item.active ? "default" : "outline"} className="gap-1 text-[10px] h-5">
                              {item.active ? <><CheckCheck className="w-2.5 h-2.5" /> Active</> : <><Ban className="w-2.5 h-2.5" /> Inactive</>}
                            </Badge>
                          )}
                          {/* Total Views */}
                          {viewCounts && viewCounts[item._id] && (
                            <Badge 
                              variant="outline" 
                              className="gap-1 text-[10px] h-5 border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContent(item);
                                setShowAnalyticsModal(true);
                              }}
                            >
                              <BarChart3 className="w-2.5 h-2.5" />
                              {viewCounts[item._id]} views
                            </Badge>
                          )}
                          {allPricing && (allPricing as any[]).some((p: any) => p.contentId === item._id) && (
                            <Badge 
                              variant="outline" 
                              className="gap-1 text-[10px] h-5 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            >
                              <DollarSign className="w-2.5 h-2.5" />
                              {(() => {
                                const p = (allPricing as any[]).find((x: any) => x.contentId === item._id);
                                const dollars = p ? (p.price / 100).toFixed(2) : null;
                                return dollars ? `$${dollars}` : "Priced";
                              })()}
                            </Badge>
                          )}
                          {item.password && (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5 border-amber-500 text-amber-600 dark:text-amber-400">
                              <Lock className="w-2.5 h-2.5" /> Password
                            </Badge>
                          )}
                        </div>

                        {/* Line 2: Dates */}
                        {(item.startDate || item.endDate) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.startDate && (
                              <Badge variant="outline" className="gap-1 text-[10px] h-5">
                                <CalendarDays className="w-2.5 h-2.5" />
                                Start: {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </Badge>
                            )}
                            {item.endDate && (
                              <Badge variant="outline" className="gap-1 text-[10px] h-5">
                                <CalendarDays className="w-2.5 h-2.5" />
                                End: {new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Line 3: Tags */}
                      {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-medium text-muted-foreground mr-1">Tags:</span>
                            {item.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-[10px] h-5">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Actions Menu - 3 Dots */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Preview - Everyone */}
                        <DropdownMenuItem onClick={() => handlePreviewContent(item)}>
                          <Play className="w-4 h-4 mr-2" />
                          Preview Content
                        </DropdownMenuItem>

                        {/* Review - requires REVIEW_CONTENT permission, when in review status */}
                        {item.status === "review" && hasPermission(userProfile?.effectivePermissions, PERMISSIONS.REVIEW_CONTENT) && (
                          <DropdownMenuItem 
                            onClick={() => handleReviewContent(item)}
                            className="text-yellow-600 focus:text-yellow-600"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Review Content
                          </DropdownMenuItem>
                        )}

                        {/* Submit for Review - requires SUBMIT_FOR_REVIEW permission, when draft/rejected/changes_requested */}
                        {(item.status === "draft" || item.status === "rejected" || item.status === "changes_requested") && 
                         hasPermission(userProfile?.effectivePermissions, PERMISSIONS.SUBMIT_FOR_REVIEW) && (
                          <DropdownMenuItem 
                            onClick={() => void handleSubmitForReview(item._id)}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Submit for Review
                          </DropdownMenuItem>
                        )}

                        {/* Edit - requires EDIT_CONTENT permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.EDIT_CONTENT) && (
                          <DropdownMenuItem onClick={() => handleEditContent(item)}>
                            <FileEdit className="w-4 h-4 mr-2" />
                            Edit Content
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Share Link - Everyone */}
                        <DropdownMenuItem onClick={() => void handleShareContent(item._id)}>
                          {copiedId === item._id ? (
                            <><Check className="w-4 h-4 mr-2 text-green-600" /><span className="text-green-600">Link Copied!</span></>
                          ) : (
                            <><Share2 className="w-4 h-4 mr-2" />Copy Share Link</>
                          )}
                        </DropdownMenuItem>

                        {/* Share with 3rd Party - requires SHARE_WITH_THIRD_PARTY permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.SHARE_WITH_THIRD_PARTY) && (
                          <DropdownMenuItem onClick={() => handleThirdPartyShare(item)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Share with 3rd Party
                          </DropdownMenuItem>
                        )}

                        {/* Recommend to User - requires RECOMMEND_CONTENT permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.RECOMMEND_CONTENT) && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedContent(item);
                            setShowRecommendModal(true);
                          }}>
                            <Send className="w-4 h-4 mr-2" />
                            Recommend to User
                          </DropdownMenuItem>
                        )}

                        {/* Manage Access - requires MANAGE_CONTENT_ACCESS permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.MANAGE_CONTENT_ACCESS) && (
                          <DropdownMenuItem onClick={() => handleManageAccess(item)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Manage Access
                          </DropdownMenuItem>
                        )}

                        {/* Set Pricing - requires SET_CONTENT_PRICING permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.SET_CONTENT_PRICING) && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedContent(item);
                            setShowPricingModal(true);
                          }}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Set Pricing
                          </DropdownMenuItem>
                        )}

                        {/* View Analytics - If has views */}
                        {viewCounts && viewCounts[item._id] && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedContent(item);
                            setShowAnalyticsModal(true);
                          }}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics ({viewCounts[item._id]} views)
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Archive - requires ARCHIVE_CONTENT permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.ARCHIVE_CONTENT) && (
                          <DropdownMenuItem 
                            onClick={() => void handleArchiveContent(item._id)}
                            className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive Content
                          </DropdownMenuItem>
                        )}

                        {/* Delete - requires DELETE_CONTENT permission */}
                        {hasPermission(userProfile?.effectivePermissions, PERMISSIONS.DELETE_CONTENT) && (
                          <DropdownMenuItem 
                            onClick={() => setContentToDelete(item)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Content
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4 mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  const showEllipsis = 
                    (page === currentPage - 2 && currentPage > 3) ||
                    (page === currentPage + 2 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return <span key={page} className="px-2 text-muted-foreground">...</span>;
                  }

                  if (!showPage) {
                    return null;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Access Management Modal */}
      {selectedContent && showAccessModal && (
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
      {selectedContent && showEditModal && (
        <ContentEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
        />
      )}

      {/* Review Content Modal */}
      {selectedContent && showReviewModal && (
        <ContentReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
        />
      )}

      {/* Preview Content Modal */}
      {selectedContent && (
        <Dialog open={showPreviewModal} onOpenChange={(open) => {
          if (!open) {
            setShowPreviewModal(false);
            setSelectedContent(null);
            setPreviewContentId(null);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTypeIcon(selectedContent.type)}
                {selectedContent.title}
              </DialogTitle>
              <DialogDescription>
                Content Preview
              </DialogDescription>
            </DialogHeader>

            {!previewContent ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto space-y-6 p-6">
              {/* Status and Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={
                  selectedContent.status === "published" ? "default" :
                  selectedContent.status === "review" ? "outline" :
                  selectedContent.status === "rejected" ? "destructive" :
                  selectedContent.status === "changes_requested" ? "outline" :
                  "secondary"
                } className={selectedContent.status === "changes_requested" ? "border-orange-500 text-orange-600" : ""}>
                  {selectedContent.status === "changes_requested" ? "Changes Requested" : selectedContent.status}
                </Badge>
                <Badge variant="outline">{selectedContent.type}</Badge>
                <Badge variant={selectedContent.isPublic ? "default" : "secondary"}>
                  {selectedContent.isPublic ? "Public" : "Private"}
                </Badge>
                {allPricing && (allPricing as any[]).some((p: any) => p.contentId === selectedContent._id) && (
                  <Badge variant="outline" className="gap-1">
                    <DollarSign className="w-3 h-3" />
                    {(() => {
                      const p = (allPricing as any[]).find((x: any) => x.contentId === selectedContent._id);
                      const dollars = p ? (p.price / 100).toFixed(2) : null;
                      return dollars ? `$${dollars}` : "Priced";
                    })()}
                  </Badge>
                )}
                {selectedContent.status === "published" && !selectedContent.active && <Badge variant="destructive">Inactive</Badge>}
              </div>

              {/* Description */}
              {selectedContent.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedContent.description}</p>
                </div>
              )}

              {/* Content Preview */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Content</h4>
                {previewContent.type === "video" && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {previewContent.fileUrl ? (
                      <video src={previewContent.fileUrl} controls className="w-full h-full">
                        Your browser does not support video playback.
                      </video>
                    ) : previewContent.externalUrl ? (
                      <iframe
                        src={previewContent.externalUrl.includes('youtube.com') || previewContent.externalUrl.includes('youtu.be') 
                          ? previewContent.externalUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                          : previewContent.externalUrl
                        }
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={previewContent.title}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center text-muted-foreground">
                          <Video className="w-16 h-16 mx-auto mb-2" />
                          <p>Video file not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {previewContent.type === "audio" && (
                  <div className="space-y-4">
                    {previewContent.thumbnailUrl && (
                      <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden">
                        <img 
                          src={previewContent.thumbnailUrl} 
                          alt={previewContent.title}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                    {previewContent.fileUrl ? (
                      <audio src={previewContent.fileUrl} controls className="w-full">
                        Your browser does not support audio playback.
                      </audio>
                    ) : previewContent.externalUrl ? (
                      <div className="space-y-3">
                        <audio src={previewContent.externalUrl} controls className="w-full">
                          Your browser does not support audio playback.
                        </audio>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ExternalLink className="w-4 h-4" />
                          <a href={previewContent.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Open in new tab
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
                        <div className="text-center text-muted-foreground">
                          <FileAudio className="w-16 h-16 mx-auto mb-2" />
                          <p>Audio file not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {previewContent.type === "document" && (
                  <div>
                    {previewContent.fileUrl ? (
                      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <FileText className="w-10 h-10 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Document File</p>
                          <p className="text-sm text-muted-foreground">Click to download or view</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <a href={previewContent.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12 bg-muted rounded-lg">
                        <div className="text-center text-muted-foreground">
                          <FileText className="w-16 h-16 mx-auto mb-2" />
                          <p>Document file not available</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {previewContent.type === "article" && (
                  <div className="space-y-4">
                    {previewContent.externalUrl && (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <ExternalLink className="w-5 h-5 text-primary" />
                        <a
                          href={previewContent.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          {previewContent.externalUrl}
                        </a>
                      </div>
                    )}
                    {previewContent.attachmentType === "richtext" && previewContent.description && (
                      <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: previewContent.description }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body Content */}
              {previewContent.body && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Additional Content</h4>
                  <div className="prose prose-sm max-w-none p-4 bg-muted rounded-lg">
                    <div dangerouslySetInnerHTML={{ __html: previewContent.body }} />
                  </div>
                </div>
              )}

              {/* Tags */}
              {previewContent.tags && previewContent.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {previewContent.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              {(previewContent.startDate || previewContent.endDate) && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Availability</h4>
                  <div className="flex gap-3 text-sm">
                    {previewContent.startDate && (
                      <div>
                        <span className="text-muted-foreground">Start: </span>
                        <span>{new Date(previewContent.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {previewContent.endDate && (
                      <div>
                        <span className="text-muted-foreground">End: </span>
                        <span>{new Date(previewContent.endDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Creator Info */}
              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>Created by {previewContent.creatorName}</p>
                <p>on {new Date(previewContent._creationTime).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}</p>
              </div>
            </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Third Party Share Modal */}
      {selectedContent && showThirdPartyShareModal && (
        <ThirdPartyShareModal
          isOpen={showThirdPartyShareModal}
          onClose={() => {
            setShowThirdPartyShareModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          contentTitle={selectedContent.title}
        />
      )}

      {/* Pricing Modal */}
      {selectedContent && showPricingModal && (
        <ContentPricingModal
          isOpen={showPricingModal}
          onClose={() => {
            setShowPricingModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          contentTitle={selectedContent.title}
        />
      )}

      {/* Analytics Modal */}
      {selectedContent && showAnalyticsModal && (
        <ContentAnalyticsModal
          open={showAnalyticsModal}
          onOpenChange={(open) => {
            setShowAnalyticsModal(open);
            if (!open) setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          contentTitle={selectedContent.title}
        />
      )}

      {/* Recommend Content Modal */}
      {selectedContent && showRecommendModal && (
        <RecommendContentModal
          content={selectedContent}
          isOpen={showRecommendModal}
          onClose={() => {
            setShowRecommendModal(false);
            setSelectedContent(null);
          }}
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
                <li>Remove from all content bundles</li>
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

      {/* Bulk Add to Bundle Modal */}
      <Dialog open={showBulkAddToGroupModal} onOpenChange={setShowBulkAddToGroupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Content Bundle</DialogTitle>
            <DialogDescription>
              Add {selectedIds.length} selected item(s) to an existing bundle or create a new one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Bundles */}
            {contentGroups && contentGroups.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Add to Existing Bundle</Label>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                  {contentGroups.map((group) => (
                    <Button
                      key={group._id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => void handleBulkAddToExistingGroup(group._id)}
                    >
                      <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.itemCount} items
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Create New Bundle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                Create New Bundle
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder="Bundle name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={2}
                />
                <Button 
                  onClick={() => void handleBulkCreateNewGroup()}
                  disabled={!newGroupName.trim()}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Bundle with {selectedIds.length} Item(s)
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Recommend Modal */}
      <Dialog open={showBulkRecommendModal} onOpenChange={setShowBulkRecommendModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recommend Content</DialogTitle>
            <DialogDescription>
              Recommend {selectedIds.length} selected item(s) to users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a user to recommend the selected content to. They will receive a notification about the recommended content.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Bulk recommendations coming soon. For now, please recommend content individually.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowBulkRecommendModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
