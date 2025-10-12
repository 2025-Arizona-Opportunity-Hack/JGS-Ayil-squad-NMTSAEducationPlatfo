import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ContentViewer } from "./ContentViewer";

export function ClientDashboard() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const content = useQuery(api.content.listContent, 
    selectedType === "all" ? {} : { type: selectedType as any }
  );
  const contentGroups = useQuery(api.contentGroups.listContentGroups);

  const contentTypes = [
    { id: "all", name: "All Content", icon: "📋" },
    { id: "video", name: "Videos", icon: "🎥" },
    { id: "document", name: "Documents", icon: "📄" },
    { id: "article", name: "Articles", icon: "📰" },
    { id: "audio", name: "Audio", icon: "🎵" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Your Content Library
        </h2>
        <p className="text-gray-600">
          Access your personalized neurologic music therapy resources and materials.
        </p>
      </div>

      {/* Content Groups */}
      {contentGroups && contentGroups.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Content Collections</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentGroups.map((group) => (
              <div
                key={group._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <h4 className="font-medium text-gray-900">{group.name}</h4>
                {group.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Filter */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedType === type.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{type.icon}</span>
                {type.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <ContentViewer content={content || []} />
        </div>
      </div>
    </div>
  );
}
