import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ContentGroupContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export function ContentGroupContentModal({ 
  isOpen, 
  onClose, 
  groupId, 
  groupName 
}: ContentGroupContentModalProps) {
  const [showAddContent, setShowAddContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const groupWithItems = useQuery(api.contentGroups.getContentGroupWithItems, 
    { groupId: groupId as any }
  );
  const availableContent = useQuery(api.contentGroups.getAvailableContent, 
    { groupId: groupId as any }
  );
  
  const addContentToGroup = useMutation(api.contentGroups.addContentToGroup);
  const removeContentFromGroup = useMutation(api.contentGroups.removeContentFromGroup);

  if (!isOpen) return null;

  const handleAddContent = async (contentId: string) => {
    try {
      await addContentToGroup({
        groupId: groupId as any,
        contentId: contentId as any,
      });
      setShowAddContent(false);
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding content to group:", error);
    }
  };

  const handleRemoveContent = async (groupItemId: string) => {
    try {
      await removeContentFromGroup({
        groupItemId: groupItemId as any,
      });
    } catch (error) {
      console.error("Error removing content from group:", error);
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

  const filteredAvailableContent = availableContent?.filter(content => {
    const searchLower = searchTerm.toLowerCase();
    return (
      content.title.toLowerCase().includes(searchLower) ||
      content.description?.toLowerCase().includes(searchLower) ||
      content.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Content: {groupName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Content in Group */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-medium text-gray-900">
                Content in Group ({groupWithItems?.items?.length || 0})
              </h4>
              <button
                onClick={() => setShowAddContent(!showAddContent)}
                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
              >
                {showAddContent ? "Cancel" : "Add Content"}
              </button>
            </div>

            {groupWithItems?.items && groupWithItems.items.length > 0 ? (
              <div className="space-y-2">
                {groupWithItems.items.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{getTypeIcon(item.type)}</span>
                      <div>
                        <h5 className="font-medium text-gray-900">{item.title}</h5>
                        {item.description && (
                          <p className="text-sm text-gray-600">{item.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {item.type}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {item.isPublic ? "Public" : "Private"}
                          </span>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {item.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { void handleRemoveContent(item.groupItemId); }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>No content in this group yet</p>
              </div>
            )}
          </div>

          {/* Add Content Section */}
          {showAddContent && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Add Content to Group</h4>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search available content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="max-h-60 overflow-y-auto">
                {filteredAvailableContent.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAvailableContent.map((content) => (
                      <div key={content._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{getTypeIcon(content.type)}</span>
                          <div>
                            <h5 className="font-medium text-gray-900">{content.title}</h5>
                            {content.description && (
                              <p className="text-sm text-gray-600">{content.description}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                {content.type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                content.isPublic ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {content.isPublic ? "Public" : "Private"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => { void handleAddContent(content._id); }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>
                      {searchTerm 
                        ? "No content found matching your search" 
                        : "No available content to add"
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
