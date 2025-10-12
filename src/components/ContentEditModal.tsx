import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../convex/_generated/api";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";

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
  };
}

export function ContentEditModal({ isOpen, onClose, content }: ContentEditModalProps) {
  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    // Format to YYYY-MM-DDTHH:MM for datetime-local input
    return date.toISOString().slice(0, 16);
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    reset,
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
      tags: content.tags?.join(", ") || "",
      active: content.active,
      startDate: formatDateForInput(content.startDate),
      endDate: formatDateForInput(content.endDate),
    },
  });

  const formType = watch("type");

  // Reset form when content changes
  useEffect(() => {
    reset({
      title: content.title,
      description: content.description || "",
      type: content.type,
      externalUrl: content.externalUrl || "",
      richTextContent: content.richTextContent || "",
      body: content.body || "",
      isPublic: content.isPublic,
      tags: content.tags?.join(", ") || "",
      active: content.active,
      startDate: formatDateForInput(content.startDate),
      endDate: formatDateForInput(content.endDate),
    });
    setSelectedFile(null);
  }, [content, reset]);

  const contentWithFile = useQuery(api.content.getContent, { contentId: content._id as any });
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const updateContent = useMutation(api.content.updateContent);

  if (!isOpen) return null;

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
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()) : undefined,
        active: data.active,
        startDate: data.startDate ? new Date(data.startDate).getTime() : undefined,
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating content:", error);
      alert(error instanceof Error ? error.message : "Failed to update content");
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Content</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { void handleFormSubmit(handleSubmit)(e); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              {...register("title")}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register("description")}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                errors.description ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select
              {...register("type")}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                errors.type ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="article">Article</option>
              <option value="document">Document</option>
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {(formType === "video" || formType === "document" || formType === "audio") && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formType === "video" ? "Video File" : 
                 formType === "audio" ? "Audio File" : "Document File"}
              </label>
              
              {contentWithFile?.fileUrl && !selectedFile && (
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">Current {formType} file</p>
                      <p className="text-xs text-gray-500">Choose a new file to replace</p>
                    </div>
                    <a
                      href={contentWithFile.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </a>
                  </div>
                </div>
              )}
              
              <input
                type="file"
                accept={
                  formType === "video" ? "video/*" : 
                  formType === "audio" ? "audio/*" : 
                  ".pdf,.doc,.docx,.txt,.rtf"
                }
                onChange={handleFileChange}
                className="mt-2 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
              
              {selectedFile && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-900">
                    New: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {formType === "article" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                {...register("richTextContent")}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows={6}
                placeholder="Enter article content..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Body (optional rich text)</label>
            <textarea
              {...register("body")}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={8}
              placeholder="Add additional rich text content, notes, or descriptions here..."
            />
            <p className="text-xs text-gray-500 mt-1">This field is available for all content types to add supplementary information</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">External URL (optional)</label>
            <input
              type="url"
              {...register("externalUrl")}
              className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                errors.externalUrl ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="https://..."
            />
            {errors.externalUrl && (
              <p className="text-red-500 text-sm mt-1">{errors.externalUrl.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
            <input
              type="text"
              {...register("tags")}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="therapy, music, neurologic"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic-edit"
              {...register("isPublic")}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="isPublic-edit" className="ml-2 block text-sm text-gray-900">
              Make this content public
            </label>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Availability Settings</h5>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="active-edit"
                {...register("active")}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="active-edit" className="ml-2 block text-sm text-gray-900">
                Content is active (can be viewed when published)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date (optional)</label>
                <input
                  type="datetime-local"
                  {...register("startDate")}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    errors.startDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.startDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Content becomes available at this date/time</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                <input
                  type="datetime-local"
                  {...register("endDate")}
                  className={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    errors.endDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Content expires at this date/time</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Updating..." : "Update Content"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
