import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import defaultLogo from "../assets/logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const fontSizeMap = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
};

// Generate initials from organization name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CP";
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);

  const logoUrl = siteSettings?.logoUrl;
  const orgName = siteSettings?.organizationName || "Content Platform";
  const primaryColor = siteSettings?.primaryColor || "#3b82f6";
  const hasCustomLogo = !!logoUrl;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {hasCustomLogo ? (
        <img 
          src={logoUrl} 
          alt={`${orgName} Logo`}
          className={`${sizeMap[size]} object-contain`}
        />
      ) : siteSettings?.setupCompleted ? (
        // Show placeholder with initials if setup is complete but no logo
        <div
          className={`${sizeMap[size]} rounded-lg flex items-center justify-center text-white font-bold ${fontSizeMap[size]}`}
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
          }}
        >
          {getInitials(orgName)}
        </div>
      ) : (
        // Show default logo if setup not complete
        <img 
          src={defaultLogo} 
          alt="Logo"
          className={`${sizeMap[size]} object-contain`}
        />
      )}
      {showText && (
        <span className={`font-semibold text-gray-900 ${textSizeMap[size]}`}>
          {orgName}
        </span>
      )}
    </div>
  );
}

