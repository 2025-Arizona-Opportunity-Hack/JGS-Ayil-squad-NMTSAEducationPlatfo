import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Video,
  FileText,
  FileAudio,
  Newspaper,
  Folder,
  FileEdit,
  Eye,
  CheckCircle,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Ban,
  Archive,
  CalendarDays,
  Trash2,
  Share2,
  Check,
  Send,
  AlertCircle,
  Play,
  Lock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoThumbnail } from "../VideoThumbnail";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export interface ContentItem {
  _id: string;
  _creationTime: number;
  title: string;
  description?: string;
  type: string;
  attachmentType: string;
  status?: string;
  isPublic?: boolean;
  active?: boolean;
  tags?: string[];
  startDate?: number;
  endDate?: number;
  password?: string;
  [key: string]: any;
}

interface ContentListActions {
  onPreview: (item: ContentItem) => void;
  onReview: (item: ContentItem) => void;
  onSubmitForReview: (contentId: string) => void;
  onEdit: (item: ContentItem) => void;
  onShare: (contentId: string) => void;
  onThirdPartyShare: (item: ContentItem) => void;
  onRecommend: (item: ContentItem) => void;
  onManageAccess: (item: ContentItem) => void;
  onSetPricing: (item: ContentItem) => void;
  onViewAnalytics: (item: ContentItem) => void;
  onArchive: (contentId: string) => void;
  onDelete: (item: ContentItem) => void;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

interface ContentListProps {
  items: ContentItem[];
  isLoading: boolean;
  contentTypeFilter: string;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  copiedId: string | null;
  viewCounts: Record<string, number> | undefined;
  allPricing: any[] | undefined;
  effectivePermissions: string[] | undefined;
  actions: ContentListActions;
  pagination: PaginationState;
}

function getTypeIcon(attachmentType: string): ReactNode {
  const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
  switch (attachmentType) {
    case "video": return <Video {...iconProps} />;
    case "richtext": return <Newspaper {...iconProps} />;
    case "pdf": return <FileText {...iconProps} />;
    case "audio": return <FileAudio {...iconProps} />;
    case "image": return <Folder {...iconProps} />;
    default: return <Folder {...iconProps} />;
  }
}

function getStatusIcon(status: string | undefined): ReactNode {
  const iconProps = { className: "w-4 h-4", strokeWidth: 2 };
  switch (status) {
    case "draft": return <FileEdit {...iconProps} />;
    case "review": return <Eye {...iconProps} />;
    case "published": return <CheckCircle {...iconProps} />;
    case "rejected": return <XCircle {...iconProps} />;
    case "changes_requested": return <AlertCircle {...iconProps} />;
    default: return <FileText {...iconProps} />;
  }
}

export function ContentList({
  items,
  isLoading,
  contentTypeFilter,
  selectedIds,
  onToggleSelect,
  copiedId,
  viewCounts,
  allPricing,
  effectivePermissions,
  actions,
  pagination,
}: ContentListProps) {
  const { currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange } = pagination;

  return (
    <div className="space-y-4" aria-busy={isLoading} aria-label="Content list">
      {isLoading ? (
        // Loading state
        <Card>
          <CardContent className="flex flex-col justify-center items-center py-16 gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-muted"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center" role="status">
              <p className="text-sm font-medium text-foreground">Loading content...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait</p>
            </div>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        // Empty state
        <Card>
          <CardContent className="text-center py-12" role="status">
            <div className="text-muted-foreground mb-4 flex justify-center">
              {contentTypeFilter === "all" ? <Folder className="w-16 h-16" /> : <div className="[&>svg]:w-16 [&>svg]:h-16">{getTypeIcon(contentTypeFilter)}</div>}
            </div>
            <h3 className="text-lg font-medium mb-2">
              {contentTypeFilter === "all"
                ? "No content available"
                : `No ${contentTypeFilter}${contentTypeFilter === "audio" ? "" : "s"} available`
              }
            </h3>
            <p className="text-muted-foreground">
              {contentTypeFilter === "all"
                ? "Create your first piece of content to get started."
                : `Create your first ${contentTypeFilter} to get started.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        // Content list
        items.map((item, index) => (
          <motion.div
            key={item._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/20 relative overflow-hidden group">
              {/* Status Banner - Positioned at top */}
              <div className={`absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-2.5 border-b ${
                item.status === "published" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200/50 dark:border-green-800/50" :
                item.status === "review" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/50" :
                item.status === "rejected" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200/50 dark:border-red-800/50" :
                item.status === "changes_requested" ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50" :
                "bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200/50 dark:border-gray-700/50"
              }`}>
                <div className="w-4 h-4 flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <span className="text-xs font-medium capitalize">
                  {item.status === "changes_requested"
                    ? `Changes Requested${item.reviewerName ? ` by ${item.reviewerName}` : ""}`
                    : item.status === "rejected"
                    ? `Rejected${item.reviewerName ? ` by ${item.reviewerName}` : ""}`
                    : item.status}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.includes(item._id)}
                    onCheckedChange={() => onToggleSelect(item._id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${item.title}`}
                  />
                </div>
              </div>

              <CardContent className="p-4 pt-14">
                <div className="flex items-start gap-4">
                  {/* Thumbnail - Clickable with uniform size */}
                  <div
                    className="flex-shrink-0 cursor-pointer group-hover:ring-2 ring-primary/20 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => actions.onPreview(item)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actions.onPreview(item); } }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Preview ${item.title}`}
                  >
                    {item.type === "video" && (
                      <VideoThumbnail
                        contentId={item._id}
                        videoUrl={item.fileUrl}
                        thumbnailUrl={item.thumbnailUrl}
                        title={item.title}
                      />
                    )}
                    {item.type === "audio" && (
                      item.thumbnailUrl ? (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/50 shadow-sm">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shadow-sm">
                          <div className="text-purple-500 dark:text-purple-400">
                            {getTypeIcon(item.type)}
                          </div>
                        </div>
                      )
                    )}
                    {(item.type === "article" || item.type === "document") && (
                      item.thumbnailUrl ? (
                        <div className="w-36 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/50 shadow-sm">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-36 h-24 rounded-lg overflow-hidden ${
                          item.type === "article"
                            ? "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50"
                            : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200/50 dark:border-amber-800/50"
                        } border flex items-center justify-center shadow-sm`}>
                          <div className={item.type === "article" ? "text-blue-500 dark:text-blue-400" : "text-amber-500 dark:text-amber-400"}>
                            {getTypeIcon(item.type)}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Content Info - Horizontal Layout */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    {/* Title and Description */}
                    <div className="flex-1 min-w-0 mb-3">
                      {/* Title - Clickable */}
                      <h4
                        className="font-semibold text-base leading-snug mb-1.5 cursor-pointer hover:text-primary transition-colors line-clamp-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                        onClick={() => actions.onPreview(item)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actions.onPreview(item); } }}
                        role="button"
                        tabIndex={0}
                        title={item.title}
                      >
                        {item.title}
                      </h4>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Metadata Section - Uniform badges */}
                    <div className="space-y-2 mt-auto">
                      {/* Line 1: Type, Visibility, Active Status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] capitalize h-5 font-medium px-2">
                          {item.type}
                        </Badge>
                        <Badge variant={item.isPublic ? "default" : "secondary"} className="text-[10px] h-5 font-medium px-2">
                          {item.isPublic ? "Public" : "Private"}
                        </Badge>
                        {item.status === "published" && (
                          <Badge variant={item.active ? "default" : "outline"} className="gap-1 text-[10px] h-5">
                            {item.active ? <><CheckCheck className="w-2.5 h-2.5" /> Active</> : <><Ban className="w-2.5 h-2.5" /> Inactive</>}
                          </Badge>
                        )}
                        {/* Total Views */}
                        {viewCounts && viewCounts[item._id] && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] h-5 border-blue-500 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              actions.onViewAnalytics(item);
                            }}
                          >
                            <BarChart3 className="w-2.5 h-2.5" />
                            {viewCounts[item._id]} views
                          </Badge>
                        )}
                        {allPricing && allPricing.some((p: any) => p.contentId === item._id) && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px] h-5 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          >
                            <DollarSign className="w-2.5 h-2.5" />
                            {(() => {
                              const p = allPricing.find((x: any) => x.contentId === item._id);
                              const dollars = p ? (p.price / 100).toFixed(2) : null;
                              return dollars ? `$${dollars}` : "Priced";
                            })()}
                          </Badge>
                        )}
                        {item.password && (
                          <Badge variant="outline" className="gap-1 text-[10px] h-5 border-amber-500 text-amber-600 dark:text-amber-400">
                            <Lock className="w-2.5 h-2.5" /> Password
                          </Badge>
                        )}
                      </div>

                      {/* Line 2: Dates */}
                      {(item.startDate || item.endDate) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.startDate && (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5">
                              <CalendarDays className="w-2.5 h-2.5" />
                              Start: {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </Badge>
                          )}
                          {item.endDate && (
                            <Badge variant="outline" className="gap-1 text-[10px] h-5">
                              <CalendarDays className="w-2.5 h-2.5" />
                              End: {new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Line 3: Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-medium text-muted-foreground mr-1">Tags:</span>
                          {item.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-[10px] h-5">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Menu - 3 Dots */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-primary/10 min-h-[44px] min-w-[44px]"
                          aria-label={`Actions for ${item.title}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Preview - Everyone */}
                        <DropdownMenuItem onClick={() => actions.onPreview(item)}>
                          <Play className="w-4 h-4 mr-2" />
                          Preview Content
                        </DropdownMenuItem>

                        {/* Review - requires REVIEW_CONTENT permission, when in review status */}
                        {item.status === "review" && hasPermission(effectivePermissions, PERMISSIONS.REVIEW_CONTENT) && (
                          <DropdownMenuItem
                            onClick={() => actions.onReview(item)}
                            className="text-yellow-600 focus:text-yellow-600"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Review Content
                          </DropdownMenuItem>
                        )}

                        {/* Submit for Review - requires SUBMIT_FOR_REVIEW permission, when draft/rejected/changes_requested */}
                        {(item.status === "draft" || item.status === "rejected" || item.status === "changes_requested") &&
                         hasPermission(effectivePermissions, PERMISSIONS.SUBMIT_FOR_REVIEW) && (
                          <DropdownMenuItem
                            onClick={() => void actions.onSubmitForReview(item._id)}
                            className="text-blue-600 focus:text-blue-600"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Submit for Review
                          </DropdownMenuItem>
                        )}

                        {/* Edit - requires EDIT_CONTENT permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.EDIT_CONTENT) && (
                          <DropdownMenuItem onClick={() => actions.onEdit(item)}>
                            <FileEdit className="w-4 h-4 mr-2" />
                            Edit Content
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Share Link - Everyone */}
                        <DropdownMenuItem onClick={() => void actions.onShare(item._id)}>
                          {copiedId === item._id ? (
                            <><Check className="w-4 h-4 mr-2 text-green-600" /><span className="text-green-600">Link Copied!</span></>
                          ) : (
                            <><Share2 className="w-4 h-4 mr-2" />Copy Share Link</>
                          )}
                        </DropdownMenuItem>

                        {/* Share with 3rd Party - requires SHARE_WITH_THIRD_PARTY permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.SHARE_WITH_THIRD_PARTY) && (
                          <DropdownMenuItem onClick={() => actions.onThirdPartyShare(item)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Share with 3rd Party
                          </DropdownMenuItem>
                        )}

                        {/* Recommend to User - requires RECOMMEND_CONTENT permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.RECOMMEND_CONTENT) && (
                          <DropdownMenuItem onClick={() => actions.onRecommend(item)}>
                            <Send className="w-4 h-4 mr-2" />
                            Recommend to User
                          </DropdownMenuItem>
                        )}

                        {/* Manage Access - requires MANAGE_CONTENT_ACCESS permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.MANAGE_CONTENT_ACCESS) && (
                          <DropdownMenuItem onClick={() => actions.onManageAccess(item)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Manage Access
                          </DropdownMenuItem>
                        )}

                        {/* Set Pricing - requires SET_CONTENT_PRICING permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.SET_CONTENT_PRICING) && (
                          <DropdownMenuItem onClick={() => actions.onSetPricing(item)}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Set Pricing
                          </DropdownMenuItem>
                        )}

                        {/* View Analytics - If has views */}
                        {viewCounts && viewCounts[item._id] && (
                          <DropdownMenuItem onClick={() => actions.onViewAnalytics(item)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics ({viewCounts[item._id]} views)
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Archive - requires ARCHIVE_CONTENT permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.ARCHIVE_CONTENT) && (
                          <DropdownMenuItem
                            onClick={() => void actions.onArchive(item._id)}
                            className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archive Content
                          </DropdownMenuItem>
                        )}

                        {/* Delete - requires DELETE_CONTENT permission */}
                        {hasPermission(effectivePermissions, PERMISSIONS.DELETE_CONTENT) && (
                          <DropdownMenuItem
                            onClick={() => actions.onDelete(item)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Content
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t pt-4 mt-6" aria-label="Content pagination">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="min-h-[44px]"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only">Previous</span>
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
                  return <span key={page} className="px-2 text-muted-foreground" aria-hidden="true">...</span>;
                }

                if (!showPage) {
                  return null;
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="min-w-[2.5rem] min-h-[44px]"
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[44px]"
              aria-label="Next page"
            >
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
