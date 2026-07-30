import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "critical" | "blocking" | "recommended" | "optional";

interface SetupCheck {
  id: string;
  title: string;
  severity: Severity;
  ok: boolean;
  impact: string;
  fix: string;
  docsAnchor?: string;
}

const SEVERITY_ORDER: Severity[] = [
  "critical",
  "blocking",
  "recommended",
  "optional",
];

const SEVERITY_META: Record<
  Severity,
  {
    label: string;
    description: string;
    icon: typeof ShieldAlert;
    badgeVariant: "destructive" | "secondary" | "outline";
    accentClass: string;
  }
> = {
  critical: {
    label: "Critical",
    description: "Actively dangerous or insecure right now.",
    icon: ShieldAlert,
    badgeVariant: "destructive",
    accentClass: "text-destructive",
  },
  blocking: {
    label: "Blocking",
    description: "A core user-facing feature is broken.",
    icon: AlertTriangle,
    badgeVariant: "secondary",
    accentClass: "text-amber-600 dark:text-amber-400",
  },
  recommended: {
    label: "Recommended",
    description: "Degraded, confusing, or not yet finished.",
    icon: Info,
    badgeVariant: "outline",
    accentClass: "text-blue-600 dark:text-blue-400",
  },
  optional: {
    label: "Optional",
    description: "A feature simply isn't enabled.",
    icon: Info,
    badgeVariant: "outline",
    accentClass: "text-muted-foreground",
  },
};

// Google Drive import is a build-time frontend var (VITE_GOOGLE_*), which is
// never visible to the Convex backend — so unlike every other check, this
// one is computed client-side from import.meta.env and appended here rather
// than coming from getSetupHealth. Mirrors the same criteria
// GoogleDrivePicker.tsx uses for `isGoogleDriveConfigured`.
const GOOGLE_DRIVE_CHECK: SetupCheck = {
  id: "google_drive_import",
  title: "Google Drive import configured",
  severity: "optional",
  ok: Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_API_KEY
  ),
  impact:
    "VITE_GOOGLE_CLIENT_ID and/or VITE_GOOGLE_API_KEY are not set at build " +
    "time, so staff cannot import files directly from Google Drive when " +
    "uploading content.",
  fix: "npm run setup:google — these are build-time frontend variables, so a new Vercel deploy is required after setting them.",
};

function CopyableFix({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the code
      // is still visible and selectable, so this is a soft failure.
    }
  };

  return (
    <div className="mt-2 flex items-start gap-2">
      <code className="flex-1 min-w-0 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs font-mono whitespace-pre-wrap break-words">
        {text}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Fix command copied" : "Copy fix command"}
        className={cn(
          "shrink-0 mt-0.5 inline-flex items-center justify-center rounded-md border p-1.5",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function CheckRow({ check }: { check: SetupCheck }) {
  const meta = SEVERITY_META[check.severity];
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {check.ok ? (
          <CheckCircle2
            className="w-5 h-5 mt-0.5 shrink-0 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
        ) : (
          <meta.icon
            className={cn("w-5 h-5 mt-0.5 shrink-0", meta.accentClass)}
            aria-hidden="true"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{check.title}</p>
            <span
              className={cn(
                "text-xs font-medium",
                check.ok
                  ? "text-green-600 dark:text-green-400"
                  : meta.accentClass
              )}
            >
              {check.ok ? "Configured" : "Needs attention"}
            </span>
          </div>
          {!check.ok && (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                {check.impact}
              </p>
              <CopyableFix text={check.fix} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function SeverityGroup({
  severity,
  checks,
}: {
  severity: Severity;
  checks: SetupCheck[];
}) {
  const meta = SEVERITY_META[severity];
  const failing = checks.filter((c) => !c.ok).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <meta.icon className={cn("w-5 h-5", meta.accentClass)} aria-hidden="true" />
          <CardTitle className="text-lg">{meta.label}</CardTitle>
          <Badge variant={failing > 0 ? meta.badgeVariant : "outline"}>
            {failing > 0 ? `${failing} need${failing === 1 ? "s" : ""} attention` : "All set"}
          </Badge>
        </div>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {checks.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SetupHealth() {
  const data = useQuery(api.setupHealth.getSetupHealth);

  const checks = useMemo(() => {
    if (!data) return [];
    return [...data.checks, GOOGLE_DRIVE_CHECK];
  }, [data]);

  const grouped = useMemo(() => {
    const map = new Map<Severity, SetupCheck[]>();
    for (const severity of SEVERITY_ORDER) map.set(severity, []);
    for (const c of checks) map.get(c.severity)!.push(c);
    return map;
  }, [checks]);

  const outstandingCount = useMemo(
    () =>
      checks.filter((c) => !c.ok && c.severity !== "optional").length,
    [checks]
  );

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data === null) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        You don't have permission to view setup health.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Setup</h2>
        <p className="text-muted-foreground mt-2">
          Deployment configuration that affects real users — some issues
          fail silently, so this checklist reads the live environment rather
          than relying on anyone remembering to check.
        </p>
      </div>

      {outstandingCount === 0 ? (
        <Card className="border-green-600/30 bg-green-600/5">
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2
              className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Setup looks good</p>
              <p className="text-sm text-muted-foreground">
                No critical, blocking, or recommended issues outstanding.
                Optional features below are just features you haven't turned
                on yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{outstandingCount}</strong>{" "}
          setup item{outstandingCount === 1 ? "" : "s"} below need
          {outstandingCount === 1 ? "s" : ""} attention.
        </p>
      )}

      {SEVERITY_ORDER.map((severity) => {
        const items = grouped.get(severity) ?? [];
        if (items.length === 0) return null;
        return (
          <SeverityGroup key={severity} severity={severity} checks={items} />
        );
      })}

      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Full runbook, env var matrix, and per-instance checklist:{" "}
        <code className="font-mono">docs/DEPLOYMENTS.md</code>
      </p>
    </div>
  );
}
