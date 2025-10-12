import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { Video } from "lucide-react";
import { api } from "../../convex/_generated/api";

interface VideoThumbnailProps {
  contentId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  title: string;
  onThumbnailGenerated?: () => void;
}

export function VideoThumbnail({
  contentId,
  videoUrl,
  thumbnailUrl,
  title,
  onThumbnailGenerated,
}: VideoThumbnailProps) {
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasAttemptedGeneration = useRef(false);
  
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const updateThumbnail = useMutation(api.content.updateContentThumbnailId);

  useEffect(() => {
    // Only try to generate if:
    // 1. No thumbnail URL exists
    // 2. Video URL is available
    // 3. Haven't already attempted generation
    // 4. Not currently generating
    if (!thumbnailUrl && videoUrl && !hasAttemptedGeneration.current && !isGenerating) {
      hasAttemptedGeneration.current = true;
      void generateThumbnail();
    }
  }, [thumbnailUrl, videoUrl]);

  const generateThumbnail = async () => {
    if (!videoUrl) return;
    
    setIsGenerating(true);
    
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => {
          // Seek to 1 second or 10% of video duration
          video.currentTime = Math.min(1, video.duration * 0.1);
        };
        
        video.onseeked = async () => {
          try {
            // Set canvas size
            const maxWidth = 640;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            // Draw video frame
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  // Upload thumbnail
                  const uploadUrl = await generateUploadUrl();
                  const uploadResult = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": "image/jpeg" },
                    body: blob,
                  });
                  const uploadJson = await uploadResult.json();
                  
                  if (uploadResult.ok && uploadJson.storageId) {
                    // Update content with new thumbnail
                    await updateThumbnail({
                      contentId: contentId as any,
                      thumbnailId: uploadJson.storageId,
                    });
                    
                    // Set local thumbnail for immediate display
                    const thumbnailDataUrl = URL.createObjectURL(blob);
                    setGeneratedThumbnail(thumbnailDataUrl);
                    
                    // Notify parent
                    onThumbnailGenerated?.();
                  }
                } catch (error) {
                  console.error("Error uploading thumbnail:", error);
                }
              }
              
              // Cleanup
              URL.revokeObjectURL(video.src);
              resolve();
            }, 'image/jpeg', 0.8);
          } catch (error) {
            reject(error);
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video'));
          URL.revokeObjectURL(video.src);
        };
        
        video.src = videoUrl;
      });
      
    } catch (error) {
      console.error("Error generating thumbnail:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Show existing thumbnail if available
  if (thumbnailUrl) {
    return (
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Show generated thumbnail while it's being saved
  if (generatedThumbnail) {
    return (
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border">
        <img 
          src={generatedThumbnail} 
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Show loading state or fallback icon
  return (
    <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border flex items-center justify-center">
      {isGenerating ? (
        <div className="flex flex-col items-center gap-1">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground">Generating...</span>
        </div>
      ) : (
        <Video className="w-8 h-8 text-muted-foreground" />
      )}
    </div>
  );
}

