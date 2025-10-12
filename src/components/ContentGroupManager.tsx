import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentGroupContentModal } from "./ContentGroupContentModal";

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Content Groups</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Create New Content Group</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Beginner Resources"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Describe what this group contains..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Group
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentGroups?.map((group) => (
          <div key={group._id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-gray-900">{group.name}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                group.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {group.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            
            {group.description && (
              <p className="text-sm text-gray-600 mb-4">{group.description}</p>
            )}

            <div className="flex space-x-2">
              <button 
                onClick={() => handleManageContent(group)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Manage Content
              </button>
              <button 
                onClick={() => handleManageAccess(group)}
                className="text-green-600 hover:text-green-800 text-sm"
              >
                Manage Access
              </button>
              <button className="text-gray-600 hover:text-gray-800 text-sm">
                Edit
              </button>
            </div>
          </div>
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
