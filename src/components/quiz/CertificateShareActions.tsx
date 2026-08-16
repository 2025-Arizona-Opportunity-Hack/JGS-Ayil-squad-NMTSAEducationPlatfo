import { useQuery } from "convex/react";
import { Link2, Share2, Linkedin, Twitter, Facebook } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

interface CertificateShareActionsProps {
  shareToken: string;
  quizTitle: string;
  issuedAt?: number;
}

/**
 * Share row for a certificate: copy the public verification link and
 * one-click share intents. The link points at /certificate/:token, which is
 * anonymous-viewable and unfurls via api/meta.ts, so social previews show
 * the recipient + quiz.
 */
export function CertificateShareActions({
  shareToken,
  quizTitle,
  issuedAt,
}: CertificateShareActionsProps) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const orgName = siteSettings?.organizationName ?? "";

  const url = `${window.location.origin}/certificate/${shareToken}`;
  const text = `I passed “${quizTitle}”${orgName ? ` from ${orgName}` : ""}!`;
  const issued = new Date(issuedAt ?? Date.now());

  // LinkedIn "Add to profile" deep link (Licenses & certifications section)
  const linkedInAddUrl =
    `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME` +
    `&name=${encodeURIComponent(quizTitle)}` +
    (orgName ? `&organizationName=${encodeURIComponent(orgName)}` : "") +
    `&issueYear=${issued.getFullYear()}` +
    `&issueMonth=${issued.getMonth() + 1}` +
    `&certUrl=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Certificate link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: quizTitle, text, url });
    } catch {
      // user dismissed the sheet — not an error
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Share your certificate"
    >
      <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
        <Link2 className="w-4 h-4 mr-2" aria-hidden="true" />
        Copy link
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={linkedInAddUrl} target="_blank" rel="noreferrer">
          <Linkedin className="w-4 h-4 mr-2" aria-hidden="true" />
          Add to LinkedIn
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={twitterUrl} target="_blank" rel="noreferrer">
          <Twitter className="w-4 h-4 mr-2" aria-hidden="true" />
          Post on X
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={facebookUrl} target="_blank" rel="noreferrer">
          <Facebook className="w-4 h-4 mr-2" aria-hidden="true" />
          Share on Facebook
        </a>
      </Button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button type="button" variant="outline" size="sm" onClick={() => void nativeShare()}>
          <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Share…
        </Button>
      )}
    </div>
  );
}
