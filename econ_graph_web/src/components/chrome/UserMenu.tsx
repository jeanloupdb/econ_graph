"use client";

import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { ChevronDown, LogOut, Share2, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function UserMenu({ dropUp = false, forceDark = false }: { dropUp?: boolean; forceDark?: boolean }) {
  const { isLightMode: globalIsLightMode } = useGraphTheme();
  const isLightMode = forceDark ? false : globalIsLightMode;
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);

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

  const handleShare = () => {
    setIsOpen(false);
    setShowShareModal(true);
  };

  return (
    <>
      <div className="relative w-full" ref={menuRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="group w-full flex items-center justify-start gap-3 px-2 py-6 hover:bg-zinc-800/50 transition-all rounded-lg"
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all",
              isLightMode
                ? "bg-blue-100 border-blue-300 group-hover:border-blue-500"
                : "bg-blue-950/30 border-blue-800/50 group-hover:border-blue-500/50"
            )}
          >
            <span
              className={cn(
                "text-xs font-semibold transition-colors",
                isLightMode
                  ? "text-blue-700"
                  : "text-blue-400"
              )}
            >
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
              <span
                className={cn(
                  "text-sm font-medium truncate w-full text-left transition-colors",
                  isLightMode
                    ? "text-zinc-900 group-hover:text-blue-700"
                    : "text-zinc-300 group-hover:text-blue-300"
                )}
              >
                {user.username}
              </span>
              <span className="text-[10px] text-zinc-500 truncate w-full text-left">
                  {user.email}
              </span>
          </div>
          
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform ml-auto",
              isOpen ? "rotate-180" : "",
              isLightMode ? "text-zinc-700" : "text-zinc-500"
            )}
          />
        </Button>

        {isOpen && (
          <div
            className={cn(
              "absolute left-0 right-0 rounded-lg border shadow-xl z-[100]",
              dropUp ? "bottom-full mb-2" : "top-full mt-2",
              isLightMode
                ? "bg-white border-zinc-300"
                : "bg-zinc-950 border-zinc-800"
            )}
          >
            {/* User Info (redundant if shown in button but good for mobile or compact view logic, though keeping here for now) */}
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
                Pro Plan
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Share Button - only show if on a project page (/graph) */}
              {pathname?.startsWith('/graph') && currentProjectId && (
                <>
                  <button
                    onClick={handleShare}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      isLightMode
                        ? "text-zinc-800 hover:text-violet-700 hover:bg-violet-50"
                        : "text-zinc-300 hover:text-violet-300 hover:bg-violet-500/10"
                    )}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Partager le projet</span>
                  </button>
                  <div className={cn(
                    "my-2 mx-4 border-t",
                    isLightMode ? "border-zinc-200" : "border-zinc-800"
                  )} />
                </>
              )}

              <button
                onClick={handleProfile}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                  isLightMode
                    ? "text-zinc-800 hover:text-blue-700 hover:bg-zinc-100"
                    : "text-zinc-300 hover:text-blue-300 hover:bg-zinc-900"
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
                    : "text-red-400 hover:text-red-300 hover:bg-zinc-900"
                )}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && currentProjectId && (
        <ShareProjectModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          projectId={currentProjectId}
          projectName={currentProject?.name || "Projet"}
        />
      )}
    </>
  );
}

