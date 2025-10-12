import { useState } from "react";
import { Folder, FolderTree, Users, UsersRound } from "lucide-react";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("content");

  const tabs = [
    { id: "content", label: "Content", icon: <Folder className="w-4 h-4" />, component: ContentManager },
    { id: "contentGroups", label: "Content Groups", icon: <FolderTree className="w-4 h-4" />, component: ContentGroupManager },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, component: UserManager },
    { id: "userGroups", label: "User Groups", icon: <UsersRound className="w-4 h-4" />, component: UserGroupManager },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ContentManager;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
