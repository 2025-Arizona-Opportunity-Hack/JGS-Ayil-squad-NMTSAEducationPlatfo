import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function UserGroupManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const userGroups = useQuery(api.userGroups.listUserGroups);
  const users = useQuery(api.users.listUsers);
  const createUserGroup = useMutation(api.userGroups.createUserGroup);
  const addUserToGroup = useMutation(api.userGroups.addUserToGroup);
  const removeUserFromGroup = useMutation(api.userGroups.removeUserFromGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createUserGroup({
        name: formData.name,
        description: formData.description || undefined,
      });

      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating user group:", error);
    }
  };

  const handleAddUser = async (groupId: string, userId: string) => {
    try {
      await addUserToGroup({
        groupId: groupId as any,
        userId: userId as any,
      });
    } catch (error) {
      console.error("Error adding user to group:", error);
    }
  };

  const handleRemoveUser = async (groupId: string, userId: string) => {
    try {
      await removeUserFromGroup({
        groupId: groupId as any,
        userId: userId as any,
      });
    } catch (error) {
      console.error("Error removing user from group:", error);
    }
  };

  const nonAdminUsers = users?.filter(user => user.role !== "admin") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">User Groups</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">Create New User Group</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Advanced Practitioners"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Describe this user group..."
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

      <div className="space-y-6">
        {userGroups?.map((group) => (
          <UserGroupCard
            key={group._id}
            group={group}
            users={nonAdminUsers}
            onAddUser={handleAddUser}
            onRemoveUser={handleRemoveUser}
          />
        ))}
      </div>
    </div>
  );
}

interface UserGroupCardProps {
  group: any;
  users: any[];
  onAddUser: (groupId: string, userId: string) => void;
  onRemoveUser: (groupId: string, userId: string) => void;
}

function UserGroupCard({ group, users, onAddUser, onRemoveUser }: UserGroupCardProps) {
  const [showAddUser, setShowAddUser] = useState(false);
  const groupMembers = useQuery(api.userGroups.getGroupMembers, { groupId: group._id });

  const availableUsers = users.filter(user => 
    !groupMembers?.some(member => member.userId === user.userId)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "professional": return "bg-blue-100 text-blue-800";
      case "parent": return "bg-green-100 text-green-800";
      case "client": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{group.name}</h4>
          {group.description && (
            <p className="text-sm text-gray-600 mt-1">{group.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          group.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {group.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-medium text-gray-700">
            Members ({groupMembers?.length || 0})
          </h5>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Add User
          </button>
        </div>

        {/* Current Members */}
        {groupMembers && groupMembers.length > 0 && (
          <div className="space-y-2">
            {groupMembers.map((member) => {
              const user = users.find(u => u.userId === member.userId);
              if (!user) return null;
              
              return (
                <div key={member.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      <span className="text-xs font-medium text-gray-700">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveUser(group._id, member.userId)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add User Form */}
        {showAddUser && availableUsers.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h6 className="text-sm font-medium text-gray-700 mb-2">Add Users to Group</h6>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {availableUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      <span className="text-xs font-medium text-gray-700">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onAddUser(group._id, user.userId)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddUser && availableUsers.length === 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">All users are already in this group.</p>
          </div>
        )}
      </div>
    </div>
  );
}
