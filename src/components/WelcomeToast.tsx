import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WelcomeToastProps {
  title: string;
  description?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  onDismiss: () => void;
}

/**
 * The arrival greeting, shown as a custom sonner toast.
 *
 * Deliberately larger than an ordinary system toast: the audience includes
 * people who are unsure their sign-in worked, and a standard toast was too
 * easy to miss.
 *
 * Colours come from the shared popover/muted tokens rather than the client
 * portal's `--client-*` palette, because this renders for staff and families
 * alike, in both themes.
 */
export function WelcomeToast({
  title,
  description,
  firstName,
  lastName,
  profilePictureUrl,
  onDismiss,
}: WelcomeToastProps) {
  const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`;

  return (
    <div className="flex w-full items-center gap-4 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <Avatar className="h-14 w-14 shrink-0">
        <AvatarImage src={profilePictureUrl || undefined} alt="" />
        <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        {/* Heading-sized, but not a heading: a transient toast must stay out of
            the document outline that screen-reader users navigate by. */}
        <p className="text-xl font-semibold leading-tight">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
