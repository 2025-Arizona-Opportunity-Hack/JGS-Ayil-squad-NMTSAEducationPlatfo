import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    isPublic: boolean;
    tags?: string[];
  };
}

export function ContentEditModal({ isOpen, onClose, content }: ContentEditModalProps) {
  const [formData, setFormData] = useState({
    title: content.title,
    description: content.description || "",
    type: content.type,
    externalUrl: content.externalUrl || "",
    richTextContent: content.richTextContent || "",
    isPublic: content.isPublic,
    tags: content.tags?.join(", ") || "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const contentWithFile = useQuery(api.content.getContent, { contentId: content._id as any });
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const updateContent = useMutation(api.content.updateContent);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let fileId = content.fileId;
      
      // Handle file upload for videos, documents, and audio if a new file is selected
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

      await updateContent({
        contentId: content._id as any,
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        fileId: fileId as any,
        externalUrl: formData.externalUrl || undefined,
        richTextContent: formData.richTextContent || undefined,
        isPublic: formData.isPublic,
        tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : undefined,
      });
      
      onClose();
    } catch (error) {
      console.error("Error updating content:", error);
    } finally {
      setUploading(false);
    }
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
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="article">Article</option>
              <option value="document">Document</option>
            </select>
          </div>

          {(formData.type === "video" || formData.type === "document" || formData.type === "audio") && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.type === "video" ? "Video File" : 
                 formData.type === "audio" ? "Audio File" : "Document File"}
              </label>
              
              {contentWithFile?.fileUrl && !selectedFile && (
                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">Current {formData.type} file</p>
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
                  formData.type === "video" ? "video/*" : 
                  formData.type === "audio" ? "audio/*" : 
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
