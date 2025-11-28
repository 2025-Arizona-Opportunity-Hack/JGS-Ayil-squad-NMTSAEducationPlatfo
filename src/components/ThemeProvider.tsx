import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Converts a hex color to HSL values (without the hsl() wrapper)
 * Returns format: "h s% l%" for use in CSS variables
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Generates a slightly lighter version of a color for the ring/focus state
 */
function lightenHSL(hsl: string, amount: number = 10): string {
  const parts = hsl.split(" ");
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.min(100, l + amount);
  return `${h} ${s} ${newL}%`;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);

  useEffect(() => {
    if (siteSettings?.primaryColor) {
      const primaryHSL = hexToHSL(siteSettings.primaryColor);
      
      // Apply to CSS variables
      document.documentElement.style.setProperty("--primary", primaryHSL);
      document.documentElement.style.setProperty("--ring", primaryHSL);
      
      // Also set a CSS custom property for the raw hex value (useful for gradients, etc.)
      document.documentElement.style.setProperty("--primary-hex", siteSettings.primaryColor);
    }
  }, [siteSettings?.primaryColor]);

  return <>{children}</>;
}
