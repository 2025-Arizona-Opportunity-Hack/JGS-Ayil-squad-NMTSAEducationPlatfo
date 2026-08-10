import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "../../convex/_generated/api";
import { resolveBrandTokens } from "@/lib/brandTheme";

interface BrandColorProviderProps {
  children: React.ReactNode;
}

/**
 * Applies the admin's configured brand colour to the primary CSS variables.
 *
 * Re-runs on theme change: the dark palette needs a lighter, dark-on-light
 * variant of the brand colour to stay readable (see src/lib/brandTheme.ts).
 */
export function BrandColorProvider({ children }: BrandColorProviderProps) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!siteSettings?.primaryColor) return;

    const tokens = resolveBrandTokens(siteSettings.primaryColor, resolvedTheme === "dark");
    if (!tokens) return;

    const root = document.documentElement;
    root.style.setProperty("--primary", tokens.primary);
    root.style.setProperty("--ring", tokens.ring);
    root.style.setProperty("--primary-foreground", tokens.primaryForeground);
    root.style.setProperty("--primary-hex", tokens.primaryHex);

    // Cached so index.html can apply it before first paint on the next load.
    localStorage.setItem("theme-primary-color", siteSettings.primaryColor);
  }, [siteSettings?.primaryColor, resolvedTheme]);

  return <>{children}</>;
}
