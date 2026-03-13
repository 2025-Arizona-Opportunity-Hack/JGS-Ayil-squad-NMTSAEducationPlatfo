import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  Folder,
  Filter,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ContentTypeFilter = "all" | "video" | "image" | "pdf" | "audio" | "richtext";
export type StatusFilter = "all" | "draft" | "review" | "published" | "rejected" | "changes_requested";
export type SortBy = "date-desc" | "date-asc" | "title-asc" | "title-desc" | "status" | "type";

export interface FilterState {
  searchQuery: string;
  contentTypeFilter: ContentTypeFilter;
  statusFilter: StatusFilter;
  selectedTags: string[];
  selectedGroupId: string | null;
  sortBy: SortBy;
}

interface ContentGroup {
  _id: string;
  name: string;
  [key: string]: any;
}

interface ContentFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  allTags: string[];
  contentGroups: ContentGroup[] | undefined;
  totalCount: number;
  filteredCount: number;
  statusCounts: {
    all: number;
    draft: number;
    review: number;
    changes_requested: number;
    published: number;
    rejected: number;
  };
  typeCounts: {
    all: number;
    video: number;
    audio: number;
    image: number;
    pdf: number;
    richtext: number;
  };
}

export function ContentFilters({
  filters,
  onFiltersChange,
  allTags,
  contentGroups,
  totalCount,
  filteredCount,
  statusCounts,
  typeCounts,
}: ContentFiltersProps) {
  const hasActiveFilters =
    filters.searchQuery ||
    filters.selectedTags.length > 0 ||
    filters.statusFilter !== "all" ||
    filters.contentTypeFilter !== "all" ||
    filters.selectedGroupId;

  const updateFilter = (patch: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <div className="w-80 flex-shrink-0" role="search" aria-label="Content filters">
      <div className="sticky top-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => {
                onFiltersChange({
                  searchQuery: "",
                  selectedTags: [],
                  statusFilter: "all",
                  contentTypeFilter: "all",
                  selectedGroupId: null,
                  sortBy: filters.sortBy,
                });
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Search Content</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by title or description..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter({ searchQuery: e.target.value })}
                  className="pl-9 pr-9"
                  aria-label="Search content by title or description"
                />
                {filters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => updateFilter({ searchQuery: "" })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center -mr-3"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {filters.searchQuery && (
                <p className="text-xs text-muted-foreground">
                  Found {filteredCount} result{filteredCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" id="status-filter-label">Status</Label>
              <div className="space-y-1" role="listbox" aria-labelledby="status-filter-label">
                {([
                  { value: "all" as const, label: "All Statuses", count: statusCounts.all },
                  { value: "draft" as const, label: "Drafts", count: statusCounts.draft },
                  { value: "review" as const, label: "In Review", count: statusCounts.review },
                  { value: "changes_requested" as const, label: "Changes Requested", count: statusCounts.changes_requested },
                  { value: "published" as const, label: "Published", count: statusCounts.published },
                  { value: "rejected" as const, label: "Rejected", count: statusCounts.rejected },
                ]).map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    role="option"
                    aria-selected={filters.statusFilter === status.value}
                    onClick={() => updateFilter({ statusFilter: status.value })}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors min-h-[44px]",
                      filters.statusFilter === status.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <span>{status.label}</span>
                    <Badge
                      variant={filters.statusFilter === status.value ? "secondary" : "outline"}
                      className="ml-2"
                    >
                      {status.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Content Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" id="type-filter-label">Attachment Type</Label>
              <div className="space-y-1" role="listbox" aria-labelledby="type-filter-label">
                {([
                  { value: "all" as const, label: "All Types", icon: null, count: typeCounts.all },
                  { value: "video" as const, label: "Video", icon: Video, count: typeCounts.video },
                  { value: "audio" as const, label: "Audio", icon: FileAudio, count: typeCounts.audio },
                  { value: "image" as const, label: "Image", icon: Folder, count: typeCounts.image },
                  { value: "pdf" as const, label: "PDF", icon: FileText, count: typeCounts.pdf },
                  { value: "richtext" as const, label: "Rich Text", icon: Newspaper, count: typeCounts.richtext },
                ]).map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      role="option"
                      aria-selected={filters.contentTypeFilter === type.value}
                      onClick={() => updateFilter({ contentTypeFilter: type.value })}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors min-h-[44px]",
                        filters.contentTypeFilter === type.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4" />}
                        {type.label}
                      </span>
                      <Badge
                        variant={filters.contentTypeFilter === type.value ? "secondary" : "outline"}
                        className="ml-2"
                      >
                        {type.count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Filter by Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={filters.selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/90 min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        role="button"
                        tabIndex={0}
                        aria-pressed={filters.selectedTags.includes(tag)}
                        onClick={() => {
                          if (filters.selectedTags.includes(tag)) {
                            updateFilter({ selectedTags: filters.selectedTags.filter(t => t !== tag) });
                          } else {
                            updateFilter({ selectedTags: [...filters.selectedTags, tag] });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (filters.selectedTags.includes(tag)) {
                              updateFilter({ selectedTags: filters.selectedTags.filter(t => t !== tag) });
                            } else {
                              updateFilter({ selectedTags: [...filters.selectedTags, tag] });
                            }
                          }
                        }}
                      >
                        {tag}
                        {filters.selectedTags.includes(tag) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Content Bundle Filter */}
            {contentGroups && contentGroups.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="bundle-filter" className="text-sm font-medium">Filter by Content Bundle</Label>
                  <select
                    id="bundle-filter"
                    value={filters.selectedGroupId || "all"}
                    onChange={(e) => updateFilter({ selectedGroupId: e.target.value === "all" ? null : e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="all">All Bundles</option>
                    {contentGroups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Sort By */}
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="sort-by" className="text-sm font-medium">Sort By</Label>
              <select
                id="sort-by"
                value={filters.sortBy}
                onChange={(e) => updateFilter({ sortBy: e.target.value as SortBy })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
                <option value="status">Status</option>
                <option value="type">Content Type</option>
              </select>
            </div>

            {/* Results Summary */}
            <Separator />
            <div className="text-sm" role="status" aria-live="polite">
              <span className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredCount}</span> of {totalCount}
              </span>
              {filteredCount !== totalCount && (
                <Badge variant="secondary" className="ml-2">
                  Filtered
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
