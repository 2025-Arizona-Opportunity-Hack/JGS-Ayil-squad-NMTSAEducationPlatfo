import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ContentCard } from "@/components/client/ContentCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const content = useQuery(api.content.listContent, {});
  const items = content ?? [];

  const filtered = searchQuery
    ? items.filter((item: any) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  return (
    <div>
      <h1 className="text-2xl font-bold text-client-text mb-6">
        Browse Content
      </h1>
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-client-text-secondary"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-client-card border-client-border min-h-[44px]"
          aria-label="Search content"
        />
      </div>
      {filtered.length === 0 ? (
        <p
          className="text-client-text-secondary py-8 text-center"
          role="status"
        >
          {searchQuery
            ? "No content matches your search."
            : "No content available yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item: any) => (
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
    </div>
  );
}
