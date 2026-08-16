import { useQuery } from "convex/react";
import { useParams, Link } from "react-router-dom";
import { Printer, AlertCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CertificateCard } from "./quiz/CertificateCard";
import { CertificateShareActions } from "./quiz/CertificateShareActions";
import { usePageMeta } from "@/lib/usePageMeta";

/**
 * Public certificate verification page (/certificate/:shareToken). Anyone
 * with the tokenized link — recruiters, social-media visitors — can see the
 * certificate; the query behind it returns only whitelisted display fields.
 * Unfurl bots never reach this SPA route (vercel.json rewrites them to
 * api/meta.ts), so usePageMeta covers humans and JS-rendering crawlers.
 */
export function CertificateView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const certificate = useQuery(
    api.certificates.getCertificateByShareToken,
    shareToken ? { shareToken } : "skip"
  );
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);

  // Tokenized URLs stay out of search indexes, like /share/:token
  usePageMeta({
    title: certificate
      ? `${certificate.recipientName} — ${certificate.quizTitle} Certificate`
      : null,
    description: certificate
      ? `Certificate of achievement awarded to ${certificate.recipientName}.`
      : null,
    noindex: true,
  });

  if (certificate === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (certificate === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" showText={false} />
            </div>
            <AlertCircle
              className="w-10 h-10 text-destructive mx-auto mb-2"
              aria-hidden="true"
            />
            <CardTitle>Certificate not found</CardTitle>
            <CardDescription>
              This certificate link is invalid or no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline">
              <Link to="/">Go to {siteSettings?.organizationName ?? "the home page"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b print:hidden">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
            Print / save PDF
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="sr-only">
          Certificate for {certificate.recipientName}: {certificate.quizTitle}
        </h1>
        <CertificateCard certificate={certificate} />
        <div className="print:hidden space-y-2">
          <h2 className="text-sm font-semibold">Share this certificate</h2>
          <CertificateShareActions
            shareToken={shareToken!}
            quizTitle={certificate.quizTitle}
            issuedAt={certificate.issuedAt}
          />
        </div>
      </main>
    </div>
  );
}
