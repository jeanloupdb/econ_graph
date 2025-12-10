import { ChevronDown, ChevronRight, Copy, Terminal } from 'lucide-react';
import { useState } from 'react';

interface RawLogViewerProps {
  logs: any[];
}

export function RawLogViewer({ logs }: RawLogViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Terminal className="w-4 h-4" />
          Debug Logs ({logs.length})
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="relative bg-zinc-950 p-4">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-md transition-colors"
            title="Copy logs"
          >
            <Copy className="w-3 h-3" />
          </button>
          <div className="h-64 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="break-all border-b border-zinc-800/50 pb-1 mb-1 last:border-0">
                <span className="text-zinc-500">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>{' '}
                <span className={log.level === 'error' ? 'text-red-400' : log.level === 'success' ? 'text-emerald-400' : 'text-blue-300'}>
                  [{log.level?.toUpperCase() || 'INFO'}]
                </span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
