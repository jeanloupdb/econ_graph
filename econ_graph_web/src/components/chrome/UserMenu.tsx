"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function UserMenu() {
  const { isLightMode } = useGraphTheme();
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleProfile = () => {
    setIsOpen(false);
    router.push("/profile");
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 px-2 hover:!bg-transparent transition-all"
      >
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg border transition-all group-hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]",
            isLightMode
              ? "bg-blue-100 border-blue-300 group-hover:border-blue-500"
              : "bg-blue-950 border-blue-800 group-hover:border-blue-500"
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold transition-colors",
              isLightMode
                ? "text-blue-700 group-hover:text-blue-600"
                : "text-blue-400 group-hover:text-blue-300"
            )}
          >
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-medium hidden sm:inline transition-colors",
            isLightMode
              ? "text-zinc-900 group-hover:text-blue-700"
              : "text-zinc-300 group-hover:text-blue-300"
          )}
        >
          {user.username}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform group-hover:text-blue-500",
            isOpen ? "rotate-180" : "",
            isLightMode ? "text-zinc-700" : "text-zinc-500"
          )}
        />
      </Button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-56 rounded-lg border shadow-lg z-[10000000]",
            isLightMode
              ? "bg-white border-zinc-300"
              : "bg-zinc-950 border-zinc-800"
          )}
        >
          {/* User Info */}
          <div
            className={cn(
              "px-4 py-3 border-b",
              isLightMode ? "border-zinc-200" : "border-zinc-800"
            )}
          >
            <p
              className={cn(
                "text-sm font-medium",
                isLightMode ? "text-zinc-900" : "text-white"
              )}
            >
              {user.full_name || user.username}
            </p>
            <p
              className={cn(
                "text-xs",
                isLightMode ? "text-zinc-600" : "text-zinc-400"
              )}
            >
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleProfile}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                isLightMode
                  ? "text-zinc-800 hover:text-blue-700 hover:bg-zinc-100"
                  : "text-zinc-300 hover:text-blue-300"
              )}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                isLightMode
                  ? "text-red-600 hover:text-red-700 hover:bg-zinc-100"
                  : "text-red-400 hover:text-red-300"
              )}
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
