import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, FileText, FileAudio, Newspaper, Folder, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThirdPartyShareModal } from "./ThirdPartyShareModal";

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
  const navigate = useNavigate();
  const [showThirdPartyShareModal, setShowThirdPartyShareModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);

  const handleViewContent = (contentId: string) => {
    navigate(`/view/${contentId}`);
  };

  const handleThirdPartyShare = (item: any) => {
    setSelectedContent(item);
    setShowThirdPartyShareModal(true);
  };

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-4 flex justify-center">
            <Folder className="w-16 h-16" />
          </div>
          <h3 className="text-lg font-medium mb-2">No content available</h3>
          <p className="text-muted-foreground">
            You don't have access to any content yet. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
    switch (type) {
      case "video": return <Video {...iconProps} />;
      case "article": return <Newspaper {...iconProps} />;
      case "document": return <FileText {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      default: return <Folder {...iconProps} />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.map((item) => (
        <Card key={item._id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div>{getTypeIcon(item.type)}</div>
              <Badge variant="secondary" className="capitalize">
                {item.type}
              </Badge>
            </div>
            <CardTitle className="text-lg">{item.title}</CardTitle>
            {item.description && (
              <CardDescription className="line-clamp-2">{item.description}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Rich text preview - fixed height area */}
            {item.richTextContent && item.type === "article" ? (
              <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                {item.richTextContent.substring(0, 150)}...
              </p>
            ) : (
              <div className="min-h-[60px]" /> 
            )}

            {/* Tags section - always same height */}
            <div className="min-h-[28px]">
              {item.tags && item.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{item.tags.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground/50 italic">No tags</div>
              )}
            </div>

            {/* Footer - always at same position */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {new Date(item._creationTime).toLocaleDateString()}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleViewContent(item._id)}
                >
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleThirdPartyShare(item)}
                  title="Share with 3rd Party"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Third Party Share Modal */}
      {selectedContent && showThirdPartyShareModal && (
        <ThirdPartyShareModal
          isOpen={showThirdPartyShareModal}
          onClose={() => {
            setShowThirdPartyShareModal(false);
            setSelectedContent(null);
          }}
          contentId={selectedContent._id}
          contentTitle={selectedContent.title}
        />
      )}
    </div>
  );
}
