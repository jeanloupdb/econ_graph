"use client";

import {
    DeleteProjectDialog,
    RenameProjectDialog,
} from "@/components/dashboard/DashboardDialogs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { Check, Edit3, FileText, MessageSquare, MoreHorizontal, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { UserMenu } from "./UserMenu";

export function DashboardSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { projects, setCurrentProject, deleteProject, renameProject } = useProjectStore();

    // On est sur le dashboard = mode création/discussion
    const isOnDashboard = pathname === "/dashboard";

    // Local state for rename/delete dialogs
    const [editOpen, setEditOpen] = useState<null | { id: string; name: string }>(null);
    const [deleteOpen, setDeleteOpen] = useState<null | { id: string; name: string }>(null);
    const [editName, setEditName] = useState("");

    // Multi-selection state
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // Only completed projects (no more drafts), sorted by update date
    const completedProjects = [...projects]
        .filter(p => p.id) // Ensure we have an ID
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Separate projects: personal vs shared
    const myProjects = completedProjects.filter(p => !p.user_role || p.user_role === 'owner');
    const sharedProjects = completedProjects.filter(p => p.user_role === 'editor' || p.user_role === 'viewer');

    const handleOpenProject = (projectId: string) => {
        setCurrentProject(projectId);
        router.push("/graph");
    };

    const handleRename = () => {
        if (!editOpen || !editName.trim()) return;
        renameProject(editOpen.id, editName.trim());
        setEditOpen(null);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        setSelectedIds(new Set(completedProjects.map(p => p.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setSelectionMode(false);
    };

    const handleBulkDelete = () => {
        selectedIds.forEach(id => deleteProject(id));
        clearSelection();
        setBulkDeleteOpen(false);
    };

    const ProjectItem = ({ p, isShared = false }: { p: any; isShared?: boolean }) => {
        const isSelected = selectedIds.has(p.id);

        if (selectionMode) {
            return (
                <div
                    key={p.id}
                    className={cn(
                        "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer mx-2",
                        isSelected
                            ? "bg-violet-500/20 text-zinc-100 border border-violet-500/30"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                    )}
                    onClick={() => toggleSelection(p.id)}
                >
                    <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        isSelected
                            ? "bg-violet-500 border-violet-500"
                            : "border-zinc-600 hover:border-zinc-500"
                    )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 text-[13px] font-medium truncate">
                        {p.name}
                    </span>
                </div>
            );
        }

        return (
            <div
                key={p.id}
                className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer relative mx-2",
                    "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                )}
                onClick={() => handleOpenProject(p.id)}
            >
                {isShared ? (
                    <Users className="w-3.5 h-3.5 shrink-0 transition-colors text-blue-400 group-hover:text-blue-300" />
                ) : (
                    <FileText className="w-3.5 h-3.5 shrink-0 transition-colors text-zinc-500 group-hover:text-zinc-400" />
                )}

                <span className="flex-1 text-[13px] font-medium truncate pr-6">
                    {p.name}
                </span>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className={cn(
                            "absolute right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all",
                            "hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
                        )}>
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 bg-zinc-900 border-zinc-800 text-zinc-200">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditName(p.name); setEditOpen({id: p.id, name: p.name}); }}>
                            <Edit3 className="w-3.5 h-3.5 mr-2" />
                            <span className="text-[13px]">Renommer</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteOpen({id: p.id, name: p.name}); }} className="text-red-400 focus:text-red-400 focus:bg-red-950/20">
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span className="text-[13px]">{!p.user_role || p.user_role === 'owner' ? 'Supprimer' : 'Se retirer'}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    };

    return (
        <>
            <aside className="w-[260px] flex flex-col border-r border-zinc-800/60 bg-[#0F1115]/95 backdrop-blur-xl shrink-0 h-screen">
                <div className="h-12 flex items-center px-4 shrink-0 mt-2">
                    <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group">
                        <div className="bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-white/5 p-1.5 rounded-lg group-hover:border-violet-500/30 transition-colors">
                            <SmartGraphLogo size={16} className="text-violet-400" />
                        </div>
                        <span className="font-semibold text-zinc-200 tracking-tight text-[13px]">SmartGraph</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    <div className="space-y-1">
                        <h4 className="px-4 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Discussion</h4>
                        <Link
                            href="/dashboard"
                            className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all mx-2",
                                isOnDashboard
                                    ? "bg-zinc-800/40 text-zinc-100 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                            )}
                        >
                            <MessageSquare className={cn(
                                "w-3.5 h-3.5 shrink-0 transition-colors",
                                isOnDashboard ? "text-violet-400" : "text-zinc-600"
                            )} />
                            <span className="text-[13px] font-medium">Nouvelle modélisation</span>
                        </Link>
                    </div>

                    {/* My Projects */}
                    {myProjects.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between px-4 mb-2">
                                <h4 className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Mes Graphes</h4>
                                {!selectionMode ? (
                                    <button
                                        onClick={() => setSelectionMode(true)}
                                        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                                    >
                                        Sélectionner
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={selectedIds.size === completedProjects.length ? clearSelection : selectAll}
                                            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            {selectedIds.size === completedProjects.length ? "Aucun" : "Tout"}
                                        </button>
                                        <button
                                            onClick={clearSelection}
                                            className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {selectionMode && selectedIds.size > 0 && (
                                <div className="mx-2 mb-2 p-2 bg-red-950/30 border border-red-900/30 rounded-md flex items-center justify-between">
                                    <span className="text-[11px] text-zinc-400">
                                        {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
                                    </span>
                                    <button
                                        onClick={() => setBulkDeleteOpen(true)}
                                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Supprimer
                                    </button>
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {myProjects.map((p) => (
                                    <ProjectItem key={p.id} p={p} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shared Projects */}
                    {sharedProjects.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between px-4 mb-2">
                                <h4 className="text-[11px] font-semibold text-blue-400/60 uppercase tracking-wider">Partagés avec moi</h4>
                            </div>
                            <div className="space-y-0.5">
                                {sharedProjects.map((p) => (
                                    <ProjectItem key={p.id} p={p} isShared />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 shrink-0">
                    <UserMenu dropUp />
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

            <DeleteProjectDialog
                open={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                projectName={`${selectedIds.size} projet${selectedIds.size > 1 ? "s" : ""}`}
                onConfirm={handleBulkDelete}
            />
        </>
    );
}
