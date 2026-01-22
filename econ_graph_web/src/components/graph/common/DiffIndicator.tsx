
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface DiffIndicatorProps {
  diff: number | null;
  baseline: number | null;
  isScenarioActive: boolean;
}

export function DiffIndicator({ diff, baseline, isScenarioActive }: DiffIndicatorProps) {
    if (!isScenarioActive || diff === null || baseline === null || Math.abs(diff) < 1e-9) return null;
    
    const isPositive = diff > 0;
    const percent = baseline !== 0 ? Math.abs((diff / baseline) * 100) : 0;
    
    return (
      <span className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium ml-1",
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {percent > 0.1 ? `${percent.toFixed(1)}%` : '~0%'}
      </span>
    );
}
