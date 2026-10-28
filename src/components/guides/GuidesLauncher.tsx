import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen, PlayCircle, Eye, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Guide } from "./guideContent";
import { searchGuides } from "./searchGuides";
import { firstVisibleMatch, focusableOrNull } from "./focusHelpers";

/**
 * How long typing must pause before the result count is announced. Screen
 * readers queue every change to a live region, so announcing per keystroke
 * would talk over the user's own typing with a string of stale counts.
 */
const ANNOUNCE_DELAY_MS = 500;

function describeResults(count: number, total: number, query: string): string {
  const q = query.trim();
  if (!q) return `Showing all ${total} ${total === 1 ? "guide" : "guides"}.`;
  if (count === 0) return `No guides match “${q}”.`;
  return `${count} ${count === 1 ? "guide matches" : "guides match"} “${q}”.`;
}

/**
 * Decides where focus lands when Help & Guides opens. Radix calls this before
 * moving focus; calling `event.preventDefault()` cancels its default, which is
 * to focus the first focusable element — the search box.
 */
function chooseInitialFocus(_event: Event, _searchBox: HTMLInputElement | null) {
  // TODO(you): the default suits keyboard and screen-reader users, who can type
  // straight away. On a phone, though, focusing a text box raises the on-screen
  // keyboard over half the guide list before the person has chosen to search.
  // Options: keep the default; or, on touch devices
  // (window.matchMedia("(pointer: coarse)")), preventDefault() and focus the
  // dialog itself (event.currentTarget) so the list is visible first.
}

interface GuidesLauncherProps {
  guides: Guide[];
  open: boolean;
  onClose: () => void;
  onReadSteps: (guideId: string) => void;
  onStartTour: (guideId: string) => void;
  /**
   * Supplied only for staff who administer the site. Opens a read-only view of
   * the client-portal guides so their wording can be checked against the real
   * portal. Absent for everyone else, so no entry point renders.
   */
  onPreviewClientGuides?: () => void;
  /** The control that opened the launcher (UseGuides.launcherOpener). */
  returnFocusTo?: HTMLElement | null;
}

export function GuidesLauncher({ guides, open, onClose, onReadSteps, onStartTour, onPreviewClientGuides, returnFocusTo }: GuidesLauncherProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const hintId = useId();
  const resultsId = useId();

  const matches = useMemo(() => searchGuides(guides, query), [guides, query]);
  const resultsText = describeResults(matches.length, guides.length, query);
  const [announced, setAnnounced] = useState(resultsText);

  useEffect(() => {
    const t = setTimeout(() => setAnnounced(resultsText), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [resultsText]);

  // Start each visit with the full list. Reopening onto a filtered list, with
  // no memory of having typed anything, reads as guides having gone missing.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const clearSearch = () => {
    setQuery("");
    searchRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto"
        onOpenAutoFocus={(e) => chooseInitialFocus(e, searchRef.current)}
        onCloseAutoFocus={(e) => {
          // Radix hands focus back only to a DialogTrigger, and this dialog has
          // none — it opens from the header, the More drawer, and the
          // first-visit prompt — so focus fell to <body>, sending keyboard and
          // screen-reader users back to the top of the page. Return it to the
          // opener, or to the visible help button when the opener has gone
          // (the More drawer's row closes with the drawer).
          e.preventDefault();
          // Opening a guide or tour also closes this dialog. That one has
          // already taken focus by the time this runs; leave it there.
          const active = document.activeElement;
          if (active && active !== document.body) return;
          (
            focusableOrNull(returnFocusTo) ??
            focusableOrNull(firstVisibleMatch('[aria-label="Help and guides"]'))
          )?.focus();
        }}
        onEscapeKeyDown={(e) => {
          // Escape in a search box conventionally empties it. Do that first and
          // close only on a second press, so someone clearing their typing
          // isn't thrown out of Help altogether.
          if (query && document.activeElement === searchRef.current) {
            e.preventDefault();
            setQuery("");
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Help & Guides</DialogTitle>
          <DialogDescription>
            Step-by-step help for common tasks. Read the written steps or follow an interactive tour.
          </DialogDescription>
        </DialogHeader>

        <div role="search">
          <label htmlFor={searchId} className="block text-sm font-medium text-foreground">
            Search the guides
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby={hintId}
              aria-controls={resultsId}
              className={cn(
                // 16px text stops iOS zooming the page when the box is focused.
                "w-full min-h-[44px] rounded-md border-2 border-input bg-background pl-10 text-base text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                // Our own clear button replaces the browser's, which is tiny
                // and has no accessible name in some browsers.
                "[&::-webkit-search-cancel-button]:appearance-none",
                query ? "pr-12" : "pr-3",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-0 top-0 flex h-full min-w-[44px] items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
            Type a word or two, like “video” or “share”.
          </p>
        </div>

        <p role="status" className="text-sm text-muted-foreground">
          {announced}
        </p>

        {matches.length > 0 ? (
          <ul id={resultsId} role="list" className="space-y-3">
            {matches.map(({ guide, matchedStep }) => (
              <li key={guide.id} className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-foreground">{guide.title}</h3>
                <p className="text-sm text-muted-foreground">{guide.summary}</p>
                {matchedStep && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Covers: <span className="font-medium text-foreground">{matchedStep}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {guide.tourStops.length > 0 && (
                    <Button className="min-h-[44px]" onClick={() => onStartTour(guide.id)}>
                      <PlayCircle className="w-4 h-4" aria-hidden="true" />
                      Start tour
                      {/* Every guide has these buttons; the title tells them
                          apart when a screen reader lists buttons out of
                          context. */}
                      <span className="sr-only"> for {guide.title}</span>
                    </Button>
                  )}
                  <Button variant="outline" className="min-h-[44px]" onClick={() => onReadSteps(guide.id)}>
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    Read steps
                    <span className="sr-only"> for {guide.title}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div id={resultsId} className="rounded-lg border-2 border-dashed border-border p-4 text-center">
            <p className="text-foreground">Try a different word, or check the spelling.</p>
            <Button variant="outline" className="mt-3 min-h-[44px]" onClick={clearSearch}>
              Show all guides
            </Button>
          </div>
        )}

        {onPreviewClientGuides && (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Clients have their own separate guides. You can read them to check the
              wording still matches the portal.
            </p>
            <Button variant="outline" className="min-h-[44px]" onClick={onPreviewClientGuides}>
              <Eye className="w-4 h-4" aria-hidden="true" />
              Preview the client guides
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
