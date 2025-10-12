import logo from "../assets/logo.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizeMap = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
  xl: "h-24",
};

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logo} 
        alt="NMTSA Logo" 
        className={`${sizeMap[size]} w-auto object-contain`}
      />
      {showText && (
        <span className="font-semibold text-gray-900">
          NMTSA Content Platform
        </span>
      )}
    </div>
  );
}

