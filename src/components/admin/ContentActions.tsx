import { motion } from "framer-motion";
import {
  CheckCheck,
  Ban,
  Plus,
  Archive,
  X,
  Trash2,
  Send,
  Globe,
  GlobeLock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContentActionsProps {
  selectedIds: string[];
  allPageSelected: boolean;
  onToggleSelectAllOnPage: () => void;
  onClearSelection: () => void;
  onCreateContent: () => void;
  onBulkSetPublic: (isPublic: boolean) => void;
  onBulkSetActive: (active: boolean) => void;
  onBulkAddToBundle: () => void;
  onBulkRecommend: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
}

export function ContentActions({
  selectedIds,
  allPageSelected,
  onToggleSelectAllOnPage,
  onClearSelection,
  onCreateContent,
  onBulkSetPublic,
  onBulkSetActive,
  onBulkAddToBundle,
  onBulkRecommend,
  onBulkArchive,
  onBulkDelete,
}: ContentActionsProps) {
  return (
    <>
      {/* Header Actions */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Content Management</h3>
          <p className="text-sm text-muted-foreground">Manage and organize your content library</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap" role="toolbar" aria-label="Content actions">
          <div className="flex items-center gap-2 mr-2">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={onToggleSelectAllOnPage}
              id="selectAllPage"
              aria-label="Select all items on this page"
            />
            <Label htmlFor="selectAllPage" className="text-sm">Select page</Label>
            {selectedIds.length > 0 && (
              <Badge variant="secondary" className="ml-1">{selectedIds.length} selected</Badge>
            )}
          </div>
          <Button onClick={onCreateContent} className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-2" />
            Add Content
          </Button>
          <Button
            variant="destructive"
            disabled={selectedIds.length === 0}
            onClick={onBulkDelete}
            className="min-h-[44px]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-primary text-primary-foreground rounded-lg shadow-lg p-3 mb-4"
          role="toolbar"
          aria-label="Bulk actions for selected content"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={onToggleSelectAllOnPage}
                  className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                  aria-label="Select all items on this page"
                />
                <span className="text-sm font-medium">
                  {selectedIds.length} selected
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-primary-foreground hover:bg-primary-foreground/20 min-h-[44px]"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Set Public/Private */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="min-h-[44px]">
                    <Globe className="w-4 h-4 mr-1" />
                    Visibility
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onBulkSetPublic(true)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Set Public
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkSetPublic(false)}>
                    <GlobeLock className="w-4 h-4 mr-2" />
                    Set Private
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Set Active/Inactive */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="min-h-[44px]">
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onBulkSetActive(true)}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    Set Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkSetActive(false)}>
                    <Ban className="w-4 h-4 mr-2" />
                    Set Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add to Bundle */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onBulkAddToBundle}
                className="min-h-[44px]"
              >
                <Package className="w-4 h-4 mr-1" />
                Add to Bundle
              </Button>

              {/* Recommend */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onBulkRecommend}
                className="min-h-[44px]"
              >
                <Send className="w-4 h-4 mr-1" />
                Recommend
              </Button>

              {/* Archive */}
              <Button
                variant="secondary"
                size="sm"
                onClick={onBulkArchive}
                className="min-h-[44px]"
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                className="min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
