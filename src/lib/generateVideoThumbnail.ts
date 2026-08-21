/**
 * Generate a poster-frame JPEG from a local video File using an off-DOM
 * <video> + <canvas>. Seeks to 1s (or 10% of duration for very short clips),
 * scales to ≤640px wide, and times out after 30s for unplayable formats.
 * Shared by the create form and the edit modal.
 */
export function generateVideoThumbnail(videoFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail generation timed out - video may not be playable'));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      console.log("[Thumbnail] Video metadata loaded:", {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onloadeddata = () => {
      console.log("[Thumbnail] Video data loaded, seeking...");
      // Seek to 1 second or 10% of video duration, whichever is smaller
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      console.log("[Thumbnail] Seeked to:", video.currentTime);
      // Set canvas size to video dimensions (max 640px width to keep file size reasonable)
      const maxWidth = 640;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      if (canvas.width === 0 || canvas.height === 0) {
        cleanup();
        reject(new Error('Video dimensions are zero - format may not be supported'));
        return;
      }

      // Draw video frame to canvas
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail - blob is empty'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = (e) => {
      console.error("[Thumbnail] Video error:", e);
      cleanup();
      reject(new Error(`Failed to load video: ${video.error?.message || 'unknown error'}`));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}
