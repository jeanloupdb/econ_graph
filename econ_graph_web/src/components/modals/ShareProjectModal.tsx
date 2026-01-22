"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { useProjectStore } from "@/store/projectState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProjectCollaborator {
  user_id: string;
  username: string;
  email: string;
  role: "viewer" | "editor";
}

interface ShareProjectModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ShareProjectModal({
  open,
  onClose,
  projectId,
  projectName,
}: ShareProjectModalProps) {
  const { projects, isOwner } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const userIsOwner = isOwner(projectId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  // User Search Query
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["user-search", inviteEmail],
    queryFn: async () => {
      if (inviteEmail.length < 2) return [];
      return apiClient.get<any[]>(`/auth/search?q=${encodeURIComponent(inviteEmail)}`);
    },
    enabled: inviteEmail.length >= 2,
  });

  // Collaborators Query
  const { data: collaborators = [], isLoading: isLoadingCollabs } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: async () => {
      return apiClient.get<ProjectCollaborator[]>(
        `/projects/${projectId}/collaborators`
      );
    },
    enabled: open,
  });

  // Add Collaborator Mutation - always as editor
  const addCollaborator = useMutation({
    mutationFn: async (targetEmail?: string) => {
      const emailToUse = targetEmail || inviteEmail;
      return apiClient.post(`/projects/${projectId}/collaborators`, {
        email_or_username: emailToUse,
        role: "editor", // Always editor now
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });
      setInviteEmail("");
      setShowSuggestions(false);
      toast.success("Collaborateur ajouté en tant qu'éditeur");
    },
    onError: () => {
      toast.error("Impossible d'ajouter le collaborateur");
    },
  });

  // Remove Collaborator Mutation
  const removeCollaborator = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.delete(`/projects/${projectId}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });
      toast.success("Collaborateur retiré");
    },
    onError: () => {
      toast.error("Impossible de retirer le collaborateur");
    },
  });

  const handleInvite = (email?: string) => {
    const emailToUse = email || inviteEmail;
    if (emailToUse.trim()) {
      addCollaborator.mutate(emailToUse);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden shadow-2xl shadow-black/50">
        <DialogHeader className="px-6 py-4 border-b border-zinc-800">
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-violet-400" />
            Inviter des collaborateurs
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Collaborators Section */}
          <div className="space-y-4">
            {/* Only show invite form for owners */}
            {userIsOwner && (
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">
                  Ajouter un collaborateur (aura les droits d'édition)
                </label>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email ou nom d'utilisateur"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      className="h-10 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Button
                      size="sm"
                      className="h-10 px-4 shrink-0 bg-violet-600 hover:bg-violet-500 text-white"
                      onClick={() => handleInvite()}
                      disabled={!inviteEmail.trim() || addCollaborator.isPending}
                    >
                      Inviter
                    </Button>
                  </div>

                  {/* Suggestions List */}
                  {showSuggestions && inviteEmail.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      {isSearching ? (
                        <div className="px-4 py-3 text-xs text-zinc-500 italic">
                          Recherche...
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="max-h-[200px] overflow-y-auto">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                handleInvite(user.email);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-600/20 text-left transition-colors group"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={`https://avatar.vercel.sh/${user.username}`}
                                />
                                <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-400 group-hover:bg-violet-600/30 group-hover:text-violet-200">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white group-hover:text-violet-200">
                                  {user.username}
                                </div>
                                <div className="text-xs text-zinc-500 group-hover:text-violet-300/70 truncate">
                                  {user.email}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-xs text-zinc-500 italic">
                          Aucun utilisateur trouvé
                        </div>
                      )}
                    </div>
                  )}

                  {/* Backdrop for closing suggestions */}
                  {showSuggestions && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSuggestions(false)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Collaborators list */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Collaborateurs ({collaborators.length})
              </div>

              {isLoadingCollabs ? (
                <div className="py-6 text-center text-sm text-zinc-500">
                  Chargement...
                </div>
              ) : collaborators.length === 0 ? (
                <div className="py-6 text-center text-sm text-zinc-500">
                  <p className="mb-1">Aucun collaborateur</p>
                  <p className="text-xs text-zinc-600">
                    Invitez quelqu'un pour collaborer sur ce projet
                  </p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scroll -mr-2 pr-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user_id}
                      className="flex items-center justify-between py-2.5 group rounded-lg px-3 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={`https://avatar.vercel.sh/${collab.username}`}
                          />
                          <AvatarFallback className="text-xs bg-zinc-700 text-zinc-300">
                            {collab.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-100 truncate">
                            {collab.username}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {collab.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Éditeur
                        </span>
                        {userIsOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={() =>
                              removeCollaborator.mutate(collab.user_id)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

