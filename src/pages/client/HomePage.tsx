import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ContentCard } from "@/components/client/ContentCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export function HomePage() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const content = useQuery(api.content.listContent, {});
  const scrollRef = useRef<HTMLDivElement>(null);

  const firstName = userProfile?.firstName || "there";
  const items = content ?? [];

  const continueItems = items.slice(0, 10);
  const recentItems = items.slice(0, 20);

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        Welcome back, {firstName}!
      </h1>

      {continueItems.length > 0 && (
        <section aria-labelledby="continue-heading" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="continue-heading"
              className="text-lg font-semibold text-client-text"
            >
              Continue Learning
            </h2>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="min-w-[44px] min-h-[44px]"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="min-w-[44px] min-h-[44px]"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            role="list"
            aria-label="Continue learning content"
          >
            {continueItems.map((item: any) => (
              <div
                key={item._id}
                className="snap-start shrink-0 w-[240px]"
                role="listitem"
              >
                <ContentCard
                  id={item._id}
                  title={item.title}
                  contentType={item.contentType || "richtext"}
                  isFree={!item.price || item.price === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="recent-heading">
        <h2
          id="recent-heading"
          className="text-lg font-semibold text-client-text mb-3"
        >
          Recent Content
        </h2>
        {recentItems.length === 0 ? (
          <p
            className="text-client-text-secondary py-8 text-center"
            role="status"
          >
            No content available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentItems.map((item: any) => (
              <ContentCard
                key={item._id}
                id={item._id}
                title={item.title}
                contentType={item.contentType || "richtext"}
                isFree={!item.price || item.price === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
