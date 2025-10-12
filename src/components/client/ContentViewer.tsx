import { useState } from "react";
import { Video, FileText, FileAudio, Newspaper, Folder, FileDown } from "lucide-react";

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: "video" | "document" | "article" | "audio";
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number;
  richTextContent?: string;
  authorName?: string;
  tags?: string[];
  _creationTime: number;
}

const DEFAULT_AUTHOR = "Neurological Music Therapy Services of Arizona";

interface ContentViewerProps {
  content: Content[];
}

export function ContentViewer({ content }: ContentViewerProps) {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "w-6 h-6", strokeWidth: 2 };
    switch (type) {
      case "video": return <Video {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      case "document": return <FileText {...iconProps} />;
      case "article": return <Newspaper {...iconProps} />;
      default: return <Folder {...iconProps} />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (selectedContent) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <button
            onClick={() => setSelectedContent(null)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back to content list
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {getTypeIcon(selectedContent.type)} {selectedContent.title}
              </h2>
              <p className="text-sm text-gray-500 italic mb-3">
                By {selectedContent.authorName || DEFAULT_AUTHOR}
              </p>
              {selectedContent.description && (
                <p className="text-gray-600 mb-4">{selectedContent.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Added {formatDate(selectedContent._creationTime)}</span>
                {selectedContent.duration && (
                  <span>Duration: {formatDuration(selectedContent.duration)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {selectedContent.type === "video" && selectedContent.fileUrl && (
            <video
              controls
              className="w-full max-w-4xl mx-auto rounded-lg"
              poster={selectedContent.thumbnailUrl || undefined}
            >
              <source src={selectedContent.fileUrl} />
              Your browser does not support the video tag.
            </video>
          )}

          {selectedContent.type === "audio" && selectedContent.fileUrl && (
            <div className="max-w-2xl mx-auto">
              <audio controls className="w-full">
                <source src={selectedContent.fileUrl} />
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}

          {selectedContent.type === "document" && selectedContent.fileUrl && (
            <div className="text-center">
              <a
                href={selectedContent.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileDown className="w-5 h-5" /> Open Document
              </a>
            </div>
          )}

          {selectedContent.type === "article" && selectedContent.richTextContent && (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedContent.richTextContent }}
            />
          )}

          {selectedContent.tags && selectedContent.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {selectedContent.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.map((item) => (
        <div
          key={item._id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
          onClick={() => setSelectedContent(item)}
        >
          {/* Thumbnail - aspect-video for consistent sizing */}
          <div className="relative aspect-video bg-muted overflow-hidden">
            {item.thumbnailUrl ? (
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center transition-colors duration-300 group-hover:bg-muted/80">
                {getTypeIcon(item.type)}
              </div>
            )}
          </div>
          
          {/* Content Details */}
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {getTypeIcon(item.type)}
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                  {item.type}
                </span>
              </div>
              <h3 className="font-semibold text-lg line-clamp-2 text-gray-900">
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 italic">
                By {item.authorName || DEFAULT_AUTHOR}
              </p>
              {item.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
              <span>{formatDate(item._creationTime)}</span>
              {item.duration && (
                <span>{formatDuration(item.duration)}</span>
              )}
            </div>
            
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
