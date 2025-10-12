import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function UserManager() {
  const users = useQuery(api.users.listUsers);
  const updateUserRole = useMutation(api.users.updateUserRole);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole({ 
        userId: userId as any, 
        role: newRole as any 
      });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-purple-100 text-purple-800";
      case "professional": return "bg-blue-100 text-blue-800";
      case "parent": return "bg-green-100 text-green-800";
      case "client": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users?.map((user) => (
            <li key={user._id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {user.role !== "admin" ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1"
                    >
                      <option value="client">Client</option>
                      <option value="parent">Parent</option>
                      <option value="professional">Professional</option>
                    </select>
                  ) : (
                    <span className="text-sm text-gray-500 px-2 py-1">Admin</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
