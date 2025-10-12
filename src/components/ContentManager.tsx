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
  Ban
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentEditModal } from "./ContentEditModal";
import { contentFormSchema, type ContentFormData } from "../lib/validationSchemas";

export function ContentManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "review": return "bg-yellow-100 text-yellow-800";
      case "published": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
        <h3 className="text-lg font-medium text-gray-900">Content Management</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Content
        </button>
      </div>

      {/* Status Filter */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "all" as const, label: "All Status", icon: <Folder className="w-4 h-4" /> },
            { id: "draft" as const, label: "Drafts", icon: <FileEdit className="w-4 h-4" /> },
            { id: "review" as const, label: "In Review", icon: <Eye className="w-4 h-4" /> },
            { id: "published" as const, label: "Published", icon: <CheckCircle className="w-4 h-4" /> },
            { id: "rejected" as const, label: "Rejected", icon: <XCircle className="w-4 h-4" /> },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                statusFilter === filter.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {allContent?.filter(c => filter.id === "all" || c.status === filter.id).length || 0}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Type Filter */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "all" as const, label: "All Content", icon: <Folder className="w-4 h-4" /> },
            { id: "video" as const, label: "Videos", icon: <Video className="w-4 h-4" /> },
            { id: "audio" as const, label: "Audio", icon: <FileAudio className="w-4 h-4" /> },
            { id: "article" as const, label: "Articles", icon: <Newspaper className="w-4 h-4" /> },
            { id: "document" as const, label: "Documents", icon: <FileText className="w-4 h-4" /> },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setContentTypeFilter(filter.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                contentTypeFilter === filter.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {getContentTypeCount(filter.id)}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Create New Content</h4>
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

            {formType === "video" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

            {formType === "audio" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Audio File</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

            {formType === "document" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Document File</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  onChange={handleFileChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
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
                id="isPublic"
                {...register("isPublic")}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this content public
              </label>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Availability Settings</h5>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="active"
                  {...register("active")}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
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

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Creating..." : "Create Content"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {allContent === undefined ? (
          // Loading state
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading content...</span>
          </div>
        ) : filteredContent.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4 flex justify-center">
              {contentTypeFilter === "all" ? <Folder className="w-16 h-16" /> : <div className="[&>svg]:w-16 [&>svg]:h-16">{getTypeIcon(contentTypeFilter)}</div>}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {contentTypeFilter === "all" 
                ? "No content available" 
                : `No ${contentTypeFilter}${contentTypeFilter === "audio" ? "" : "s"} available`
              }
            </h3>
            <p className="text-gray-600">
              {contentTypeFilter === "all"
                ? "Create your first piece of content to get started."
                : `Create your first ${contentTypeFilter} to get started.`
              }
            </p>
          </div>
        ) : (
          // Content list
          filteredContent.map((item) => (
            <div key={item._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">{getTypeIcon(item.type)}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {item.type}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {getStatusIcon(item.status)} <span>{item.status}</span>
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {item.isPublic ? "Public" : "Private"}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.active ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {item.active ? <><CheckCheck className="w-3 h-3" /> Active</> : <><Ban className="w-3 h-3" /> Inactive</>}
                      </span>
                      {item.startDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          <Calendar className="w-3 h-3" /> Starts: {new Date(item.startDate).toLocaleDateString()}
                        </span>
                      )}
                      {item.endDate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3" /> Ends: {new Date(item.endDate).toLocaleDateString()}
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <>
                          {item.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {tag}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditContent(item)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleManageAccess(item)}
                    className="text-green-600 hover:text-green-800 text-sm"
                  >
                    Manage Access
                  </button>
                </div>
              </div>
            </div>
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
    </div>
  );
}
