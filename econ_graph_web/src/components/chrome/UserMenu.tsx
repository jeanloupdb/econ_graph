"use client";

import { ShareProjectModal } from "@/components/modals/ShareProjectModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/AuthContext";
import { useProjectStore } from "@/store/projectState";
import { cn } from "@/lib/utils";
import { ChevronUp, Download, LogOut, Share2, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function UserMenu({
  dropUp = false,
  forceDark = false,
  compact: _compact = false,
  sidebar = false,
  onExportExcel,
}: {
  dropUp?: boolean;
  forceDark?: boolean;
  compact?: boolean;
  sidebar?: boolean;
  onExportExcel?: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showShareModal, setShowShareModal] = useState(false);

  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (!user) return null;

  const initials = user.username.charAt(0).toUpperCase();
  const displayName = user.full_name || user.username;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {sidebar ? (
            /* ── Sidebar variant: full-width row ── */
            <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-100/80 transition-colors group outline-none text-left">
              <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center shrink-0">
                <span className="font-mono font-bold text-white text-[10px] leading-none">{initials}</span>
              </div>
              <span className="flex-1 min-w-0 text-[13px] font-medium text-zinc-600 group-hover:text-zinc-900 truncate transition-colors">
                {displayName}
              </span>
              <ChevronUp className="w-3 h-3 text-zinc-400 group-hover:text-zinc-500 transition-colors shrink-0" />
            </button>
          ) : (
            /* ── Default: compact icon ── */
            <button className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg outline-none transition-all duration-150",
              "bg-zinc-900 hover:bg-zinc-800",
              forceDark ? "ring-white/20 hover:ring-white/40" : ""
            )}>
              <span className="font-mono font-bold text-white text-[11px] leading-none">{initials}</span>
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={sidebar ? "start" : "end"}
          side={dropUp ? "top" : "bottom"}
          className="w-52 bg-white border border-zinc-200 rounded-xl shadow-xl p-1"
          sideOffset={8}
        >
          <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
            <p className="text-[13px] font-semibold text-zinc-900 truncate">{displayName}</p>
            <p className="font-mono text-[10px] text-zinc-400 truncate mt-0.5">{user.email}</p>
          </div>

          {pathname?.startsWith("/graph") && currentProjectId && (
            <>
              <DropdownMenuItem
                onClick={() => setShowShareModal(true)}
                className="rounded-lg text-zinc-600 focus:text-zinc-900 focus:bg-zinc-50 cursor-pointer"
              >
                <Share2 className="mr-2 h-3.5 w-3.5" />
                <span className="text-[13px]">Partager le projet</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100" />
            </>
          )}

          {onExportExcel && (
            <>
              <DropdownMenuItem
                onClick={onExportExcel}
                className="rounded-lg text-zinc-600 focus:text-zinc-900 focus:bg-zinc-50 cursor-pointer"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                <span className="text-[13px]">Exporter en Excel</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100" />
            </>
          )}

          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="rounded-lg text-zinc-600 focus:text-zinc-900 focus:bg-zinc-50 cursor-pointer"
          >
            <User className="mr-2 h-3.5 w-3.5" />
            <span className="text-[13px]">Mon profil</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-zinc-100" />

          <DropdownMenuItem
            className="rounded-lg text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={() => { logout(); router.push("/login"); }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span className="text-[13px]">Se déconnecter</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
