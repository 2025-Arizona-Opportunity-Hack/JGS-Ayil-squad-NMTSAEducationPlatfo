import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { 
  Video, 
  FileText, 
  FileAudio, 
  Newspaper, 
  Filter,
  Search,
  X,
  Folder,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Package,
  Star,
  ClipboardList,
  Menu,
  SlidersHorizontal
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ContentViewer } from "./ContentViewer";
import { ShareLinksManager } from "./ShareLinksManager";
import { Shop } from "./Shop";
import { OrderHistory } from "./OrderHistory";
import { RecommendedContent } from "./RecommendedContent";
import { MyPurchaseRequests } from "./MyPurchaseRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ClientDashboard() {
  const allContent = useQuery(api.content.listContent, {});
  const contentGroups = useQuery(api.contentGroups.listContentGroups, {});
  const contentGroupItems = useQuery(api.contentGroups.listAllContentGroupItems, {});

  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage or default to 'content'
    return localStorage.getItem('clientDashboardTab') || 'content';
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | "video" | "image" | "pdf" | "audio" | "richtext">("all");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "title-asc" | "title-desc" | "type">("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const getContentTypeCount = (attachmentType: "all" | "video" | "image" | "pdf" | "audio" | "richtext") => {
    if (attachmentType === "all") return allContent?.length || 0;
    return allContent?.filter(item => item.attachmentType === attachmentType).length || 0;
  };

  const allTags = Array.from(new Set(allContent?.flatMap(item => item.tags || [])));

  const filteredContent = allContent?.filter(item => {
    const matchesSearch = searchQuery
      ? item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesTags = selectedTags.length > 0
      ? selectedTags.every(tag => item.tags?.includes(tag))
      : true;

    const matchesType = contentTypeFilter !== "all"
      ? item.attachmentType === contentTypeFilter
      : true;

    const matchesGroup = selectedGroupId
      ? contentGroupItems?.some(groupItem => groupItem.contentId === item._id && groupItem.groupId === selectedGroupId)
      : true;

    return matchesSearch && matchesTags && matchesType && matchesGroup;
  }) || [];

  // Sort content
  const sortedContent = [...filteredContent].sort((a, b) => {
    const typeOrder = { video: 0, image: 1, pdf: 2, audio: 3, richtext: 4 };
    
    switch (sortBy) {
      case "date-desc":
        return b._creationTime - a._creationTime;
      case "date-asc":
        return a._creationTime - b._creationTime;
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "type":
        return (typeOrder[a.attachmentType as keyof typeof typeOrder] || 5) - (typeOrder[b.attachmentType as keyof typeof typeOrder] || 5);
      default:
        return 0;
    }
  });

  // Pagination calculations
  const totalItems = sortedContent.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContent = sortedContent.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [contentTypeFilter, searchQuery, selectedTags, selectedGroupId, sortBy]);

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('clientDashboardTab', value);
  };

  // Handle tab change and close mobile menu
  const handleMobileTabChange = (value: string) => {
    handleTabChange(value);
    setMobileMenuOpen(false);
  };

  // Navigation items component to avoid duplication
  const NavigationItems = ({ onTabChange }: { onTabChange: (value: string) => void }) => (
    <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1">
      <TabsTrigger 
        value="content" 
        onClick={() => onTabChange('content')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <Folder className="w-4 h-4" />
        Content Library
      </TabsTrigger>
      <TabsTrigger 
        value="shareLinks" 
        onClick={() => onTabChange('shareLinks')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <ExternalLink className="w-4 h-4" />
        My Share Links
      </TabsTrigger>
      <TabsTrigger 
        value="shop" 
        onClick={() => onTabChange('shop')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <ShoppingBag className="w-4 h-4" />
        Shop
      </TabsTrigger>
      <TabsTrigger 
        value="purchaseRequests" 
        onClick={() => onTabChange('purchaseRequests')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <ClipboardList className="w-4 h-4" />
        My Requests
      </TabsTrigger>
      <TabsTrigger 
        value="orders" 
        onClick={() => onTabChange('orders')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <Package className="w-4 h-4" />
        Order History
      </TabsTrigger>
      <TabsTrigger 
        value="recommendations" 
        onClick={() => onTabChange('recommendations')}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
      >
        <Star className="w-4 h-4" />
        Recommendations
      </TabsTrigger>
    </TabsList>
  );

  // Filters component to avoid duplication
  const FiltersContent = () => (
    <div className="space-y-4">
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground">
                Found {filteredContent.length} result{filteredContent.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <Separator />

          {/* Content Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachment Type</Label>
            <div className="space-y-1">
              {[
                { value: "all", label: "All Types", icon: null, count: allContent?.length || 0 },
                { value: "video", label: "Video", icon: Video, count: getContentTypeCount("video") },
                { value: "audio", label: "Audio", icon: FileAudio, count: getContentTypeCount("audio") },
                { value: "image", label: "Image", icon: Folder, count: getContentTypeCount("image") },
                { value: "pdf", label: "PDF", icon: FileText, count: getContentTypeCount("pdf") },
                { value: "richtext", label: "Rich Text", icon: Newspaper, count: getContentTypeCount("richtext") },
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setContentTypeFilter(type.value as any)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      contentTypeFilter === type.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" />}
                      {type.label}
                    </span>
                    <Badge 
                      variant={contentTypeFilter === type.value ? "secondary" : "outline"}
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
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                    >
                      {tag}
                      {selectedTags.includes(tag) && (
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
                <Label className="text-sm font-medium">Filter by Content Bundle</Label>
                <select
                  value={selectedGroupId || "all"}
                  onChange={(e) => setSelectedGroupId(e.target.value === "all" ? null : e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Bundles</option>
                  {contentGroups.map((group: any) => (
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
            <Label className="text-sm font-medium">Sort By</Label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="type">Content Type</option>
            </select>
          </div>

          {/* Results Summary */}
          <Separator />
          <div className="text-sm">
            <span className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredContent.length}</span> of {allContent?.length || 0}
            </span>
            {filteredContent.length !== allContent?.length && (
              <Badge variant="secondary" className="ml-2">
                Filtered
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col md:flex-row">
        {/* Mobile Header with Menu Button */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-muted/30">
          <div>
            <h1 className="text-base font-bold tracking-tight">My Content</h1>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="text-left">My Content</SheetTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Browse and share resources
                </p>
              </SheetHeader>
              <div className="p-4">
                <NavigationItems onTabChange={handleMobileTabChange} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Left Sidebar Navigation - Hidden on mobile */}
        <div className="hidden md:block w-64 border-r bg-muted/30 flex-shrink-0">
          <div className="p-6 border-b">
            <h1 className="text-lg font-bold tracking-tight">My Content</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Browse and share resources
            </p>
          </div>
          
          <div className="p-4">
            <NavigationItems onTabChange={handleTabChange} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <TabsContent value="content" className="m-0 h-full">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full p-4 md:p-6">
              {/* Mobile Filters Button */}
              <div className="lg:hidden flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Your Content Library</h3>
                  <p className="text-xs text-muted-foreground">Access your personalized resources</p>
                </div>
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      Filters
                      {(searchQuery || selectedTags.length > 0 || contentTypeFilter !== "all" || selectedGroupId) && (
                        <Badge variant="secondary" className="ml-1">
                          {(searchQuery ? 1 : 0) + selectedTags.length + (contentTypeFilter !== "all" ? 1 : 0) + (selectedGroupId ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
                    <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
                      <div className="flex items-center justify-between">
                        <SheetTitle>Filters</SheetTitle>
                        {(searchQuery || selectedTags.length > 0 || contentTypeFilter !== "all" || selectedGroupId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedTags([]);
                              setContentTypeFilter("all");
                              setSelectedGroupId(null);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </SheetHeader>
                    <div className="p-4">
                      <FiltersContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Desktop Filters Sidebar - Hidden on mobile */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      <h3 className="text-lg font-semibold">Filters</h3>
                    </div>
                    {(searchQuery || selectedTags.length > 0 || contentTypeFilter !== "all" || selectedGroupId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedTags([]);
                          setContentTypeFilter("all");
                          setSelectedGroupId(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                  <FiltersContent />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-4 lg:space-y-6">
                <div className="hidden lg:block">
                  <h3 className="text-2xl font-bold tracking-tight">Your Content Library</h3>
                  <p className="text-sm text-muted-foreground">Access your personalized neurologic music therapy resources</p>
                </div>

                {/* Content Display */}
                <ContentViewer content={paginatedContent} />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4 lg:mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage = 
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 1 && page <= currentPage + 1);
                          
                          const showEllipsis = 
                            (page === currentPage - 2 && currentPage > 3) ||
                            (page === currentPage + 2 && currentPage < totalPages - 2);

                          if (showEllipsis) {
                            return <span key={page} className="px-2 text-muted-foreground">...</span>;
                          }

                          if (!showPage) {
                            return null;
                          }

                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-[2rem] sm:min-w-[2.5rem]"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shareLinks" className="m-0 p-4 md:p-6 h-full">
            <ShareLinksManager />
          </TabsContent>

          <TabsContent value="shop" className="m-0 p-4 md:p-6 h-full">
            <Shop />
          </TabsContent>

          <TabsContent value="purchaseRequests" className="m-0 p-4 md:p-6 h-full">
            <MyPurchaseRequests />
          </TabsContent>

          <TabsContent value="orders" className="m-0 p-4 md:p-6 h-full">
            <OrderHistory />
          </TabsContent>

          <TabsContent value="recommendations" className="m-0 p-4 md:p-6 h-full">
            <RecommendedContent />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
