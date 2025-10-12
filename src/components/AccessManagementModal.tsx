import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId?: string;
  contentGroupId?: string;
  title: string;
}

export function AccessManagementModal({ 
  isOpen, 
  onClose, 
  contentId, 
  contentGroupId, 
  title 
}: AccessManagementModalProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>([]);
  const [canShare, setCanShare] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const users = useQuery(api.users.listUsers);
  const userGroups = useQuery(api.userGroups.listUserGroups);
  
  const grantContentAccess = useMutation(api.content.grantContentAccess);
  const grantContentGroupAccess = useMutation(api.contentGroups.grantContentGroupAccess);
  const updateContentPublic = useMutation(api.content.updateContentPublic);

  if (!isOpen) return null;

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleUserGroupToggle = (groupId: string) => {
    setSelectedUserGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Handle public access first
      if (isPublic && contentId) {
        await updateContentPublic({
          contentId: contentId as any,
          isPublic: true,
        });
      }

      const accessData = {
        canShare,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
      };

      // Grant access to selected users
      for (const userId of selectedUsers) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            userId: userId as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            userId: userId as any,
            ...accessData,
          });
        }
      }

      // Grant access to selected roles
      for (const role of selectedRoles) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            role: role as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            role: role as any,
            ...accessData,
          });
        }
      }

      // Grant access to selected user groups
      for (const userGroupId of selectedUserGroups) {
        if (contentId) {
          await grantContentAccess({
            contentId: contentId as any,
            userGroupId: userGroupId as any,
            ...accessData,
          });
        } else if (contentGroupId) {
          await grantContentGroupAccess({
            groupId: contentGroupId as any,
            userGroupId: userGroupId as any,
            ...accessData,
          });
        }
      }

      onClose();
      // Reset form
      setIsPublic(false);
      setSelectedUsers([]);
      setSelectedRoles([]);
      setSelectedUserGroups([]);
      setCanShare(false);
      setExpiresAt("");
      setUserSearchTerm("");
    } catch (error) {
      console.error("Error granting access:", error);
    }
  };

  const nonAdminUsers = users?.filter(user => user.role !== "admin") || [];
  const roles = ["client", "parent", "professional"];

  // Filter users based on search term
  const filteredUsers = nonAdminUsers.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Access: {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Public Access */}
          {contentId && (
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm font-medium text-gray-900">
                  Make this content public (accessible to all users)
                </label>
              </div>
            </div>
          )}

          {/* Role-based Access */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Grant Access by Role
            </label>
            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900 capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Individual User Access */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Grant Access to Specific Users
            </label>
            
            {/* Selected Users Display */}
            {selectedUsers.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  Selected Users ({selectedUsers.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = nonAdminUsers.find(u => u.userId === userId);
                    if (!user) return null;
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {user.firstName} {user.lastName}
                        <button
                          type="button"
                          onClick={() => handleUserToggle(userId)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Search and Add Users */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search users by name or email to add..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {/* Search Results - Only show when searching */}
            {userSearchTerm && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users found matching your search</p>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => handleUserToggle(user.userId)}
                        className={`w-full flex items-center p-2 rounded hover:bg-gray-50 text-left ${
                          selectedUsers.includes(user.userId) ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <span className="text-sm text-gray-900">
                          {user.firstName} {user.lastName} ({user.email})
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "professional" ? "bg-blue-100 text-blue-800" :
                          user.role === "parent" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {user.role}
                        </span>
                        {selectedUsers.includes(user.userId) && (
                          <span className="ml-auto text-blue-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Group Access */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Grant Access to User Groups
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
              {userGroups && userGroups.length > 0 ? (
                <div className="space-y-2">
                  {userGroups.map((group) => (
                    <label key={group._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUserGroups.includes(group._id)}
                        onChange={() => handleUserGroupToggle(group._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{group.name}</span>
                      {group.description && (
                        <span className="ml-2 text-xs text-gray-500">({group.description})</span>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No user groups available</p>
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="canShare"
                checked={canShare}
                onChange={(e) => setCanShare(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="canShare" className="ml-2 block text-sm text-gray-900">
                Allow users to share this content with others
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Grant Access
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
