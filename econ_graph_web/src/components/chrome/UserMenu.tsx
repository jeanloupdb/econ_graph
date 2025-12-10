'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push('/profile');
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-2 hover:!bg-transparent dark:hover:!bg-transparent transition-all"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 transition-all group-hover:border-blue-500 dark:group-hover:border-blue-500 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-300">
          {user.username}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform group-hover:text-blue-500 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {user.full_name || user.username}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleProfile}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 transition-colors hover:text-blue-600 dark:hover:text-blue-300"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:text-red-500 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
