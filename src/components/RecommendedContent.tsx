import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Star, 
  Video, 
  FileText, 
  FileAudio, 
  Newspaper,
  ExternalLink,
  DollarSign,
  ShoppingCart,
  Eye,
  MessageSquare
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VideoThumbnail } from "./VideoThumbnail";

export function RecommendedContent() {
  const recommendations = useQuery(api.recommendations.getMyRecommendations);
  const markViewed = useMutation(api.recommendations.markRecommendationViewed);
  const createOrder = useMutation(api.orders.createOrder);
  const completeOrder = useMutation(api.orders.completeOrder);
  const navigate = useNavigate();

  const [processingPurchase, setProcessingPurchase] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
    switch (type) {
      case "video": return <Video {...iconProps} />;
      case "article": return <Newspaper {...iconProps} />;
      case "document": return <FileText {...iconProps} />;
      case "audio": return <FileAudio {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  const handleViewContent = async (recommendation: any) => {
    try {
      // Mark as viewed
      await markViewed({ recommendationId: recommendation._id });
      
      // Navigate to public content viewer
      navigate(`/view/${recommendation.contentId}`);
    } catch (error) {
      console.error("Error viewing content:", error);
      toast.error("Failed to open content");
    }
  };

  const handlePurchase = async (recommendation: any) => {
    if (!recommendation.pricing || !recommendation.pricing._id) {
      toast.error("Pricing information not available");
      return;
    }

    setProcessingPurchase(recommendation._id);
    const toastId = toast.loading("Processing purchase...");

    try {
      // Create the order
      const orderId = await createOrder({
        contentId: recommendation.contentId,
        pricingId: recommendation.pricing._id,
      });

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Complete the order
      await completeOrder({ orderId });

      toast.success("Purchase successful! You now have access to this content.", {
        id: toastId,
      });
      
      // Navigate to the content
      navigate(`/view/${recommendation.contentId}`);
    } catch (error) {
      console.error("Error purchasing content:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to complete purchase",
        { id: toastId }
      );
    } finally {
      setProcessingPurchase(null);
    }
  };

  if (recommendations === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground">
              When a professional recommends content to you, it will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Recommended for You</h2>
        <p className="text-sm text-muted-foreground">
          Content recommended by professionals
        </p>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec) => (
          <Card key={rec._id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {rec.content.type === "video" && (
                    <VideoThumbnail
                      contentId={rec.contentId}
                      videoUrl={rec.content.fileUrl}
                      thumbnailUrl={rec.content.thumbnailUrl}
                      title={rec.content.title}
                    />
                  )}
                  {rec.content.type === "audio" && (
                    rec.content.thumbnailUrl ? (
                      <div className="w-36 h-24 rounded-lg overflow-hidden">
                        <img 
                          src={rec.content.thumbnailUrl} 
                          alt={rec.content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-36 h-24 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center">
                        <div className="text-purple-500 dark:text-purple-400">
                          {getTypeIcon(rec.content.type)}
                        </div>
                      </div>
                    )
                  )}
                  {(rec.content.type === "article" || rec.content.type === "document") && (
                    rec.content.thumbnailUrl ? (
                      <div className="w-36 h-24 rounded-lg overflow-hidden">
                        <img 
                          src={rec.content.thumbnailUrl} 
                          alt={rec.content.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-36 h-24 rounded-lg ${
                        rec.content.type === "article" 
                          ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50" 
                          : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50"
                      } border flex items-center justify-center`}>
                        <div className={rec.content.type === "article" ? "text-blue-500 dark:text-blue-400" : "text-amber-500 dark:text-amber-400"}>
                          {getTypeIcon(rec.content.type)}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg leading-tight mb-1">
                        {rec.content.title}
                      </h3>
                      {rec.content.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {rec.content.description}
                        </p>
                      )}
                    </div>
                    
                    <Badge variant="secondary" className="flex-shrink-0">
                      <Star className="w-3 h-3 mr-1" />
                      Recommended
                    </Badge>
                  </div>

                  {/* Recommender and Message */}
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-muted-foreground">
                      Recommended by <span className="font-medium text-foreground">{rec.recommenderName}</span>
                    </p>
                    
                    {rec.message && (
                      <div className="bg-muted/50 rounded-md p-3 border border-border/50">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground italic">"{rec.message}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-3" />

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {rec.content.type}
                      </Badge>
                      
                      {rec.pricing && !rec.hasPurchased && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500">
                          <DollarSign className="w-3 h-3 mr-1" />
                          ${(rec.pricing.price / 100).toFixed(2)}
                        </Badge>
                      )}
                      
                      {rec.hasPurchased && (
                        <Badge variant="default" className="bg-green-600">
                          Purchased
                        </Badge>
                      )}
                      
                      {!rec.content.isPublic && !rec.hasPurchased && (
                        <Badge variant="outline" className="text-amber-600 border-amber-500">
                          Private
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {rec.pricing && !rec.hasPurchased && (
                        <Button
                          size="sm"
                          onClick={() => handlePurchase(rec)}
                          disabled={processingPurchase === rec._id}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Purchase
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant={rec.hasPurchased ? "default" : "outline"}
                        onClick={() => handleViewContent(rec)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {rec.hasPurchased ? "View" : "Preview"}
                      </Button>
                    </div>
                  </div>

                  {!rec.hasPurchased && rec.pricing && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Preview available - Purchase required for full access
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
