"use client";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ProviderTesterProps {
  url: string;
  path: string;
}

export function ProviderTester({ url, path }: ProviderTesterProps) {
  const [tLoading, setTLoading] = useState(false);
  const [tVal, setTVal] = useState<string | null>(null);
  const [tErr, setTErr] = useState<string | null>(null);
  const [tRaw, setTRaw] = useState<any>(null);
  const [rawOpen, setRawOpen] = useState(false);

  const doTest = async () => {
    setTLoading(true);
    setTVal(null);
    setTErr(null);
    setTRaw(null);
    setRawOpen(false);
    try {
      const res = await apiClient.post<
        { ok: boolean; value?: number; raw?: any; error?: string },
        any
      >("/providers/test", {
        url,
        json_path: path && path.length > 0 ? path : null,
        timeout: 8.0,
      });
      const raw = (res as any).raw;
      if ((res as any).ok) {
        setTVal(String((res as any).value));
        setTRaw(raw);
        setRawOpen(raw !== null && raw !== undefined);
      } else {
        setTErr((res as any).error || "Test failed");
        setTRaw(raw);
        setRawOpen(raw !== null && raw !== undefined);
      }
    } catch (error: any) {
      setTErr(error?.message || "Test failed");
      setRawOpen(false);
    } finally {
      setTLoading(false);
    }
  };

  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={doTest}
          disabled={tLoading || !url}
        >
          {tLoading ? "Test…" : "Tester la source"}
        </Button>
        {tVal && (
          <div className="text-xs text-emerald-600 dark:text-emerald-300">
            Valeur : <span className="font-mono">{tVal}</span>
          </div>
        )}
        {tErr && (
          <div className="text-xs text-red-600 dark:text-red-300">
            Erreur : {tErr}
          </div>
        )}
      </div>
      {tRaw != null && (
        <details
          className="mt-2 group rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
          open={rawOpen}
          onToggle={(event) =>
            setRawOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-open:rotate-180" />
            Détails du JSON
          </summary>
          <div className="px-3 pb-3 text-[11px] overflow-auto max-h-40">
            <pre>
              {(() => {
                try {
                  return JSON.stringify(tRaw, null, 2);
                } catch {
                  return String(tRaw);
                }
              })()}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
