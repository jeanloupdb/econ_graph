"use client";

import { Button } from "@/components/ui/button";

export function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="h-7 text-xs rounded-md">
      {label}
    </Button>
  );
}
