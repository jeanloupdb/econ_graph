"use client";

import {
    DeleteProjectDialog,
    RenameProjectDialog,
    ShareDialog,
} from "@/components/dashboard/DashboardDialogs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Project } from "@/store/projectState";
import { useProjectStore } from "@/store/projectState";
import { Edit3, MoreHorizontal, SquarePen, Trash2, Upload, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

interface DashboardSidebarProps {
    onNewModel?: () => void;
    onImportClick?: () => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export function DashboardSidebar({
    onNewModel,
    onImportClick,
    isOpen = false,
    onClose
}: DashboardSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { projects, setCurrentProject, deleteProject, renameProject } = useProjectStore();

    const isOnDashboard = pathname === "/dashboard";

    const [editOpen, setEditOpen] = useState<null | { id: string; name: string }>(null);
    const [deleteOpen, setDeleteOpen] = useState<null | { id: string; name: string }>(null);
    const [shareOpen, setShareOpen] = useState<null | { id: string; name: string }>(null);
    const [editName, setEditName] = useState("");

    const completedProjects = [...projects]
        .filter(p => p.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const myProjects = completedProjects.filter(p => !p.user_role || p.user_role === 'owner');
    const sharedProjects = completedProjects.filter(p => p.user_role === 'editor' || p.user_role === 'viewer');

    const getDateGroup = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (date >= todayStart) return "Aujourd'hui";
        if (date >= sevenDaysAgo) return "Cette semaine";
        if (date >= monthStart) return "Ce mois";
        return "Avant";
    };

    const DATE_GROUP_ORDER = ["Aujourd'hui", "Cette semaine", "Ce mois", "Avant"];
    const groupedProjects = myProjects.reduce((acc, p) => {
        const g = getDateGroup(p.updatedAt);
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {} as Record<string, typeof myProjects>);

    const handleOpenProject = (projectId: string) => {
        setCurrentProject(projectId);
        router.push("/graph");
    };

    const handleRename = () => {
        if (!editOpen || !editName.trim()) return;
        renameProject(editOpen.id, editName.trim());
        setEditOpen(null);
    };

    const ProjectItem = ({ p, isShared = false }: { p: Project; isShared?: boolean }) => {
        const collaboratorCount = typeof p.collaborator_count === "number" ? p.collaborator_count : 0;
        const isCollaborative = !isShared && collaboratorCount > 0;

        return (
            <div
                key={p.id}
                className={cn(
                    "group flex items-center justify-between px-3 py-1.5 rounded-lg transition-all cursor-pointer mx-2 text-[13px] font-medium",
                    "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70"
                )}
                onClick={() => handleOpenProject(p.id)}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {isShared && (
                        <Users className="w-3 h-3 shrink-0 text-zinc-400" />
                    )}
                    <span className="truncate flex-1" title={p.name}>
                        {p.name}
                    </span>
                </div>

                {isCollaborative && (
                    <span className="ml-1.5 text-zinc-400">
                        <Users className="h-3 w-3" />
                    </span>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className={cn(
                            "ml-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100",
                            "hover:bg-accent text-muted-foreground hover:text-foreground"
                        )}>
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-card border-border text-foreground rounded-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShareOpen({ id: p.id, name: p.name }); }}>
                            <Users className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">Partager</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditName(p.name); setEditOpen({id: p.id, name: p.name}); }}>
                            <Edit3 className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">Renommer</span>
                        </DropdownMenuItem>
                        {!isShared && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteOpen({id: p.id, name: p.name}); }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span className="text-xs">Supprimer</span>
                        </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={() => onClose?.()}
                />
            )}
            <aside
                className={cn(
                    "w-[300px] flex flex-col shrink-0 lg:h-full z-50",
                    "fixed left-0 top-0 bottom-0 lg:static",
                    "bg-white border-r border-zinc-200 lg:border lg:border-zinc-200 lg:rounded-xl lg:overflow-hidden",
                    "transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="h-12 flex items-center px-4 shrink-0 justify-between border-b border-zinc-100">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <SmartGraphLogo size={20} />
                        <span className="font-mono font-semibold text-[12px] text-zinc-800 tracking-tight">SmartGraph</span>
                    </Link>
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => {
                                if (isOnDashboard && onNewModel) {
                                    onNewModel();
                                } else {
                                    router.push("/dashboard");
                                }
                                onClose?.();
                            }}
                            title="Nouveau modèle"
                            aria-label="Nouveau modèle"
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <SquarePen className="w-[15px] h-[15px]" />
                        </button>
                        <button
                            onClick={() => {
                                if (onImportClick) {
                                    onImportClick();
                                } else {
                                    router.push("/dashboard?view=import");
                                }
                                onClose?.();
                            }}
                            title="Importer un Excel"
                            aria-label="Importer un Excel"
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                            <Upload className="w-[14px] h-[14px]" />
                        </button>
                        <button
                            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            onClick={() => onClose?.()}
                            aria-label="Fermer le menu"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable project list */}
                <div className="flex-1 relative min-h-0">
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 hidden lg:block" />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 lg:hidden" />
                <div className="h-full overflow-y-auto pt-1 pb-2 sidebar-scroll">
                    {/* My Projects — grouped by date */}
                    {myProjects.length > 0 && (
                        <div className="pt-1">
                            {DATE_GROUP_ORDER.filter(g => groupedProjects[g]?.length).map((group, gi) => (
                                <div key={group} className={gi > 0 ? "mt-5" : ""}>
                                    <div className="px-5 mb-1.5">
                                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-medium">› {group}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {groupedProjects[group].map((p) => (
                                            <ProjectItem key={p.id} p={p} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Shared Projects */}
                    {sharedProjects.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-zinc-200/60">
                            <div className="px-5 mb-1.5">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-medium">› Partagés</span>
                            </div>
                            <div className="space-y-0.5">
                                {sharedProjects.map((p) => (
                                    <ProjectItem key={p.id} p={p} isShared />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                </div>

                {/* User menu */}
                <div className="px-2 pb-3 pt-2 shrink-0 border-t border-zinc-100">
                    <UserMenu dropUp sidebar />
                </div>
            </aside>

            <RenameProjectDialog
                open={!!editOpen}
                onOpenChange={(open) => setEditOpen(open ? editOpen : null)}
                name={editName}
                onNameChange={setEditName}
                onSubmit={handleRename}
            />

            <DeleteProjectDialog
                open={!!deleteOpen}
                onOpenChange={(open) => setDeleteOpen(open ? deleteOpen : null)}
                projectName={deleteOpen?.name || ""}
                onConfirm={() => {
                    if (deleteOpen) {
                        deleteProject(deleteOpen.id);
                        setDeleteOpen(null);
                    }
                }}
            />

            <ShareDialog
                open={!!shareOpen}
                onClose={() => setShareOpen(null)}
                projectId={shareOpen?.id || ""}
                projectName={shareOpen?.name || "Projet"}
            />
        </>
    );
}
