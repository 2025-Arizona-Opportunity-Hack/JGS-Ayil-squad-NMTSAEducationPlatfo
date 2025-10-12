import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";
import { LexicalEditor } from "./LexicalEditor";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    _id: string;
    title: string;
    description?: string;
    type: "video" | "article" | "document" | "audio";
    fileId?: string;
    externalUrl?: string;
    richTextContent?: string;
    body?: string;
    isPublic: boolean;
    tags?: string[];
    active: boolean;
    startDate?: number;
    endDate?: number;
    status?: string;
    reviewNotes?: string;
    reviewedAt?: number;
    reviewerName?: string;
    password?: string;
  };
}

export function ContentEditModal({ isOpen, onClose, content }: ContentEditModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
    title: content.title,
    description: content.description || "",
    type: content.type,
    externalUrl: content.externalUrl || "",
    richTextContent: content.richTextContent || "",
      body: content.body || "",
    isPublic: content.isPublic,
    authorName: content.authorName || "",
    tags: content.tags?.join(", ") || "",
      active: content.active,
      startDate: content.startDate ? format(new Date(content.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: content.endDate ? format(new Date(content.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      password: content.password || "",
    },
  });

  const formType = watch("type");
  const formIsPublic = watch("isPublic");
  const formActive = watch("active");

  // Reset form when content changes
  useEffect(() => {
    reset({
      title: content.title,
      description: content.description || "",
      type: content.type,
      externalUrl: content.externalUrl || "",
      authorName: content.authorName || "",
      richTextContent: content.richTextContent || "",
      body: content.body || "",
      isPublic: content.isPublic,
      tags: content.tags?.join(", ") || "",
      active: content.active,
      startDate: content.startDate ? format(new Date(content.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: content.endDate ? format(new Date(content.endDate), "yyyy-MM-dd'T'HH:mm") : "",
      password: content.password || "",
    });
    setSelectedFile(null);
  }, [content, reset]);

  const contentWithFile = useQuery(api.content.getContent, { contentId: content._id as any });
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const updateContent = useMutation(api.content.updateContent);

  const handleSubmit = async (data: ContentFormData) => {
    setUploading(true);
    
    try {
      let fileId = content.fileId;
      
      // Handle file upload for videos, documents, and audio if a new file is selected
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

      await updateContent({
        contentId: content._id as any,
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        fileId: fileId as any,
        externalUrl: data.externalUrl || undefined,
        richTextContent: data.richTextContent || undefined,
        body: data.body || undefined,
        isPublic: data.isPublic,
        authorName: data.authorName || undefined,
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()) : undefined,
        active: data.active,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
        password: data.password || undefined,
      });
      
      toast.success("Content updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update content");
    } finally {
      setUploading(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
          <DialogDescription>
            Update the content details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        {/* Review Notes Alert */}
        {(content.status === "changes_requested" || content.status === "rejected") && content.reviewNotes && (
          <div className={`p-4 border rounded-lg flex gap-3 ${
            content.status === "rejected"
              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
              : "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              content.status === "rejected" ? "text-red-600" : "text-orange-600"
            }`} />
            <div className="flex-1 space-y-1">
              <h4 className={`font-semibold ${
                content.status === "rejected"
                  ? "text-red-900 dark:text-red-100"
                  : "text-orange-900 dark:text-orange-100"
              }`}>
                {content.status === "changes_requested" ? "Changes Requested" : "Content Rejected"}
                {content.reviewerName && ` by ${content.reviewerName}`}
              </h4>
              <p className={`text-sm ${
                content.status === "rejected"
                  ? "text-red-800 dark:text-red-200"
                  : "text-orange-800 dark:text-orange-200"
              }`}>
                {content.reviewNotes}
              </p>
              {content.reviewedAt && (
                <p className={`text-xs mt-2 ${
                  content.status === "rejected"
                    ? "text-red-600 dark:text-red-300"
                    : "text-orange-600 dark:text-orange-300"
                }`}>
                  Reviewed on {new Date(content.reviewedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
        </div>
        )}

        <form onSubmit={(e) => { void handleFormSubmit(handleSubmit)(e); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              className={errors.description ? "border-red-500" : ""}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorName">Author Name</Label>
            <Input
              id="authorName"
              {...register("authorName")}
              placeholder="Neurological Music Therapy Services of Arizona"
              className={errors.authorName ? "border-red-500" : ""}
            />
            {errors.authorName && (
              <p className="text-sm text-red-500">{errors.authorName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formType} onValueChange={(value) => setValue("type", value as "video" | "article" | "document" | "audio")}>
              <SelectTrigger id="type" className={errors.type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          {(formType === "video" || formType === "document" || formType === "audio") && (
            <div className="space-y-2">
              <Label htmlFor="file">
                {formType === "video" ? "Video File" : 
                 formType === "audio" ? "Audio File" : "Document File"}
              </Label>
              
              {contentWithFile?.fileUrl && !selectedFile && (
                <div className="p-3 bg-muted border rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current {formType} file</p>
                      <p className="text-xs text-muted-foreground">Choose a new file to replace</p>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      asChild
                    >
                    <a
                      href={contentWithFile.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                    </Button>
                  </div>
                </div>
              )}
              
              <Input
                id="file"
                type="file"
                accept={
                  formType === "video" ? "video/*" : 
                  formType === "audio" ? "audio/*" : 
                  ".pdf,.doc,.docx,.txt,.rtf"
                }
                onChange={handleFileChange}
              />
              
              {selectedFile && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-900">
                    New: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
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
              className={errors.externalUrl ? "border-red-500" : ""}
              placeholder="https://..."
            />
            {errors.externalUrl && (
              <p className="text-sm text-red-500">{errors.externalUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="therapy, music, neurologic"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic-edit"
              checked={formIsPublic}
              onCheckedChange={(checked) => setValue("isPublic", checked as boolean)}
            />
            <Label htmlFor="isPublic-edit" className="font-normal cursor-pointer">
              Make this content public
            </Label>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h5 className="text-sm font-medium">Availability Settings</h5>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="inactive-edit"
                checked={!formActive}
                onCheckedChange={(checked) => setValue("active", !checked as boolean)}
              />
              <Label htmlFor="inactive-edit" className="font-normal cursor-pointer">
                Set content as in-active
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
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP HH:mm") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Preserve time if it exists, otherwise set to current time
                              const currentValue = field.value ? new Date(field.value) : new Date();
                              date.setHours(currentValue.getHours());
                              date.setMinutes(currentValue.getMinutes());
                              field.onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
                            } else {
                              field.onChange("");
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                            onChange={(e) => {
                              const date = field.value ? new Date(field.value) : new Date();
                              const [hours, minutes] = e.target.value.split(":");
                              date.setHours(parseInt(hours));
                              date.setMinutes(parseInt(minutes));
                              field.onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Content becomes available at this date/time</p>
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
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP HH:mm") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Preserve time if it exists, otherwise set to current time
                              const currentValue = field.value ? new Date(field.value) : new Date();
                              date.setHours(currentValue.getHours());
                              date.setMinutes(currentValue.getMinutes());
                              field.onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
                            } else {
                              field.onChange("");
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input
                            type="time"
                            value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                            onChange={(e) => {
                              const date = field.value ? new Date(field.value) : new Date();
                              const [hours, minutes] = e.target.value.split(":");
                              date.setHours(parseInt(hours));
                              date.setMinutes(parseInt(minutes));
                              field.onChange(format(date, "yyyy-MM-dd'T'HH:mm"));
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Content expires at this date/time</p>
              </div>
            </div>
          </div>

          {/* Password Protection (Admin Only) */}
          {userProfile?.role === "admin" && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="password-edit">Password Protection (optional)</Label>
              <Input
                id="password-edit"
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

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? "Updating..." : "Update Content"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
