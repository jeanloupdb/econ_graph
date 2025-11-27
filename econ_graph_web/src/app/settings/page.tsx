import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings as SettingsIcon, Server, Globe } from 'lucide-react';

export default function SettingsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Configure your preferences and application settings
              </p>
            </div>
            <Link href="/graph">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to Graph
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-950">
              <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">API Configuration</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    Base URL
                  </p>
                  <code className="block rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
                    {apiUrl}
                  </code>
                </div>
                <div>
                  <a
                    href={`${apiUrl}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Globe className="h-4 w-4" />
                    View API Documentation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-950">
              <SettingsIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2">Keyboard Shortcuts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="N" description="Switch to Add Node mode" />
                <ShortcutItem shortcut="C" description="Switch to Connect mode" />
                <ShortcutItem shortcut="L" description="Switch to Lasso mode" />
                <ShortcutItem shortcut="V" description="Switch to Select mode" />
                <ShortcutItem shortcut="F" description="Fit view to all nodes" />
                <ShortcutItem shortcut="Esc" description="Clear selection" />
                <ShortcutItem shortcut="⌘K / Ctrl+K" description="Open command palette" />
                <ShortcutItem shortcut="⌘Z / Ctrl+Z" description="Undo" />
                <ShortcutItem shortcut="⌘⇧Z / Ctrl+Shift+Z" description="Redo" />
                <ShortcutItem shortcut="⌘↵ / Ctrl+Enter" description="Check coherency" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold mb-4">Application Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Version</p>
              <p className="font-medium">0.1.0</p>
            </div>
            <div>
              <p className="text-zinc-600 dark:text-zinc-400">Environment</p>
              <Badge variant="secondary">Development</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <kbd className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-mono dark:border-zinc-700 dark:bg-zinc-800">
        {shortcut}
      </kbd>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{description}</span>
    </div>
  );
}
