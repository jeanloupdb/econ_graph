import { cn } from "@/lib/utils";

interface SmartGraphLogoProps {
  className?: string;
  size?: number;
}

export function SmartGraphLogo({ className, size = 24 }: SmartGraphLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn(className)}
    >
      <defs>
        {/* Gradient bleu -> violet (AI colors) */}
        <linearGradient
          id="sg-grad"
          x1="0"
          y1="24"
          x2="24"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        {/* Glow subtil */}
        <filter id="sg-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        filter="url(#sg-glow)"
        stroke="url(#sg-grad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Network icon from Lucide */}
        <rect x="15" y="14.2" width="7.5" height="7.5" rx="1.5" />
        <circle cx="5" cy="18" r="4" />
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <path d="M5 14v-1a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1" />
        <path d="M12 12V8" />
      </g>
    </svg>
  );
}
