import { Video, FileText, FileAudio, Newspaper, Folder } from "lucide-react";

interface ContentSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType?: "video" | "document" | "article" | "audio";
  onTypeChange: (type: "video" | "document" | "article" | "audio" | undefined) => void;
}

export function ContentSearch({ 
  searchQuery, 
  onSearchChange, 
  selectedType, 
  onTypeChange 
}: ContentSearchProps) {
  const contentTypes = [
    { value: undefined, label: "All Types", icon: <Folder className="w-4 h-4" /> },
    { value: "video" as const, label: "Videos", icon: <Video className="w-4 h-4" /> },
    { value: "audio" as const, label: "Audio", icon: <FileAudio className="w-4 h-4" /> },
    { value: "document" as const, label: "Documents", icon: <FileText className="w-4 h-4" /> },
    { value: "article" as const, label: "Articles", icon: <Newspaper className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search Content
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title or description..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="sm:w-48">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Content Type
          </label>
          <select
            id="type"
            value={selectedType || ""}
            onChange={(e) => onTypeChange(e.target.value as any || undefined)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {contentTypes.map((type) => (
              <option key={type.label} value={type.value || ""}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
