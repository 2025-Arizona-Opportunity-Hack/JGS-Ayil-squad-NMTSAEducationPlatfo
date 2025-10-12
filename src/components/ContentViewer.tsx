interface ContentViewerProps {
  content: Array<{
    _id: string;
    title: string;
    description?: string;
    type: "video" | "article" | "document" | "audio";
    externalUrl?: string;
    richTextContent?: string;
    tags?: string[];
    _creationTime: number;
  }>;
}

export function ContentViewer({ content }: ContentViewerProps) {
  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No content available</h3>
        <p className="text-gray-600">
          You don't have access to any content yet. Contact your administrator for access.
        </p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return "🎥";
      case "article": return "📰";
      case "document": return "📄";
      case "audio": return "🎵";
      default: return "📁";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.map((item) => (
        <div key={item._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{getTypeIcon(item.type)}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
              {item.type}
            </span>
          </div>
          
          <h3 className="font-medium text-gray-900 mb-2">{item.title}</h3>
          
          {item.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
          )}

          {item.richTextContent && item.type === "article" && (
            <div className="text-sm text-gray-700 mb-3 line-clamp-3">
              {item.richTextContent.substring(0, 150)}...
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {new Date(item._creationTime).toLocaleDateString()}
            </span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
