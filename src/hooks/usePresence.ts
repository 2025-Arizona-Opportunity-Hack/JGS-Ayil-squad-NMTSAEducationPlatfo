import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface UsePresenceOptions {
  contentId: Id<"content">;
  contentTitle: string;
}

export function usePresence({ contentId, contentTitle }: UsePresenceOptions) {
  const updatePresence = useMutation(api.presence.updatePresence);
  const removePresence = useMutation(api.presence.removePresence);

  useEffect(() => {
    // Update presence when component mounts
    const update = () => {
      void updatePresence({
        contentId,
        contentTitle,
      });
    };

    // Initial update
    update();

    // Update presence every 10 seconds to keep it alive, might need to be changed depending on performance
    const interval = setInterval(update, 10000);

    return () => {
      clearInterval(interval);
      // Remove presence when user leaves
      void removePresence({ contentId });
    };
  }, [contentId, contentTitle, updatePresence, removePresence]);
}
