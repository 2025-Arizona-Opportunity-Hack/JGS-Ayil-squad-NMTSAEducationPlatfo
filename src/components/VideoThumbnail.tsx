import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { Video, AlertCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedGeneration = useRef(false);
  
  const generateUploadUrl = useMutation(api.content.generateUploadUrl);
  const updateThumbnail = useMutation(api.content.updateContentThumbnailId);

  useEffect(() => {
    // Only try to generate if:
    // 1. No thumbnail URL exists
    // 2. Video URL is available
    // 3. Haven't already attempted generation
    // 4. Not currently generating
    // 5. No previous error
    if (!thumbnailUrl && videoUrl && !hasAttemptedGeneration.current && !isGenerating && !error) {
      hasAttemptedGeneration.current = true;
      void generateThumbnail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailUrl, videoUrl]);

  const generateThumbnail = async () => {
    if (!videoUrl) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      // Try without crossOrigin first for better compatibility
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
          URL.revokeObjectURL(video.src);
        }, 10000); // 10 second timeout
        
        video.onloadeddata = () => {
          clearTimeout(timeout);
          // Seek to 1 second or 10% of video duration
          video.currentTime = Math.min(1, video.duration * 0.1);
        };
        
        video.onseeked = () => {
          clearTimeout(timeout);
          try {
            // Set canvas size
            const maxWidth = 640;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            // Draw video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob
            canvas.toBlob((blob) => {
              if (blob) {
                void (async () => {
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
                  } catch (err) {
                    console.error("Error uploading thumbnail:", err);
                    setError("Upload failed");
                  }
                })();
              }
              
              // Cleanup
              URL.revokeObjectURL(video.src);
              resolve();
            }, 'image/jpeg', 0.8);
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(err instanceof Error ? err.message : 'Failed to process video'));
          }
        };
        
        video.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          reject(new Error('Failed to load video - check video format and CORS'));
        };
        
        video.src = videoUrl;
      });
      
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
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

  // Show error state
  if (error) {
    return (
      <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden bg-muted border flex items-center justify-center">
        <div className="flex flex-col items-center gap-1 p-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] text-center text-muted-foreground">No thumbnail</span>
        </div>
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

