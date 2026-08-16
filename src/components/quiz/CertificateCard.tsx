import { useQuery } from "convex/react";
import { Award } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export interface CertificateDetails {
  recipientName: string;
  quizTitle: string;
  targetTitle: string | null;
  score: number;
  passingScore: number;
  issuedAt: number;
}

/**
 * The visual certificate. Rendered inline after a passing quiz attempt and
 * on the public /certificate/:token page. Org branding comes from the
 * public siteSettings query, so it works for anonymous visitors too.
 */
export function CertificateCard({
  certificate,
}: {
  certificate: CertificateDetails;
}) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const orgName = siteSettings?.organizationName ?? "";
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <div className="rounded-xl border-2 border-primary/40 bg-card p-1.5 shadow-sm print:border-black print:shadow-none">
      <div className="rounded-lg border border-primary/20 px-4 py-8 sm:px-8 text-center">
        {siteSettings?.logoUrl ? (
          <img
            src={siteSettings.logoUrl}
            alt=""
            className="mx-auto mb-4 h-12 w-auto object-contain"
          />
        ) : (
          <Award
            className="mx-auto mb-4 h-12 w-12 text-primary"
            aria-hidden="true"
          />
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Certificate of Achievement
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          This certifies that
        </p>
        <p className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-foreground">
          {certificate.recipientName}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          successfully passed
        </p>
        <p className="mt-1 text-lg font-medium text-foreground">
          {certificate.quizTitle}
        </p>
        {certificate.targetTitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {certificate.targetTitle}
          </p>
        )}
        <p className="mt-4 text-sm text-foreground">
          Score: {certificate.score}%{" "}
          <span className="text-muted-foreground">
            ({certificate.passingScore}% required)
          </span>
        </p>
        <div className="mt-6 border-t pt-4">
          {orgName && (
            <p className="text-sm font-medium text-foreground">{orgName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Awarded {issuedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
