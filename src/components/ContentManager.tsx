import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentEditModal } from "./ContentEditModal";

export function ContentManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "article" | "document" | "audio">("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "article" | "document" | "audio",
    externalUrl: "",
    richTextContent: "",
    isPublic: false,
    tags: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Get all content and filter client-side to avoid flickering
  const allContent = useQuery(api.content.listContent, {});
  const createContent = useMutation(api.content.createContent);
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);

  // Filter content client-side for better UX
  const filteredContent = allContent?.filter(item => {
    if (contentTypeFilter === "all") return true;
    return item.type === contentTypeFilter;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let fileId = undefined;
      
      // Handle file upload for videos, documents, and audio
      if (selectedFile && (formData.type === "video" || formData.type === "document" || formData.type === "audio")) {
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
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        fileId: fileId,
        externalUrl: formData.externalUrl || undefined,
        richTextContent: formData.richTextContent || undefined,
        isPublic: formData.isPublic,
        tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : undefined,
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        type: "video",
        externalUrl: "",
        richTextContent: "",
        isPublic: false,
        tags: "",
      });
      setSelectedFile(null);
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating content:", error);
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
      if (formData.type === "video" && !file.type.startsWith('video/')) {
        alert('Please select a video file');
        e.target.value = '';
        return;
      }
      if (formData.type === "audio" && !file.type.startsWith('audio/')) {
        alert('Please select an audio file');
        e.target.value = '';
        return;
      }
      if (formData.type === "document" && !file.type.includes('pdf') && !file.type.includes('document')) {
        alert('Please select a document file (PDF, DOC, etc.)');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return "🎥";
      case "article": return "📰";
      case "document": return "📄";
      case "audio": return "🎵";
      default: return "📁";
    }
  };

  const getContentTypeCount = (type: "all" | "video" | "article" | "document" | "audio") => {
    if (type === "all") return allContent?.length || 0;
    return allContent?.filter(item => item.type === type).length || 0;
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

      {/* Content Type Filter */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "all" as const, label: "All Content", icon: "📁" },
            { id: "video" as const, label: "Videos", icon: "🎥" },
            { id: "audio" as const, label: "Audio", icon: "🎵" },
            { id: "article" as const, label: "Articles", icon: "📰" },
            { id: "document" as const, label: "Documents", icon: "📄" },
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
              <span>{filter.icon}</span>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "video" | "article" | "document" | "audio" })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="article">Article</option>
                <option value="document">Document</option>
              </select>
            </div>

            {formData.type === "video" && (
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

            {formData.type === "audio" && (
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

            {formData.type === "document" && (
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

            {formData.type === "article" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <textarea
                  value={formData.richTextContent}
                  onChange={(e) => setFormData({ ...formData, richTextContent: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={6}
                  placeholder="Enter article content..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">External URL (optional)</label>
              <input
                type="url"
                value={formData.externalUrl}
                onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="therapy, music, neurologic"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                Make this content public
              </label>
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
            <div className="text-gray-400 text-6xl mb-4">
              {contentTypeFilter === "all" ? "📭" : getTypeIcon(contentTypeFilter)}
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
                  <span className="text-2xl mr-3">{getTypeIcon(item.type)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {item.type}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {item.isPublic ? "Public" : "Private"}
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {item.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {tag}
                            </span>
                          ))}
                        </div>
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
