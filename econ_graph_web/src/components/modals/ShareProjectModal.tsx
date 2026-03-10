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
import { useAuth } from "@/lib/auth/AuthContext";
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
  const { user } = useAuth();
  const project = projects.find((p) => p.id === projectId);
  const userIsOwner = isOwner(projectId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: fullProject } = useQuery({
    queryKey: ["project-full", projectId],
    queryFn: async () => {
      return apiClient.get<any>(`/projects/${projectId}`);
    },
    enabled: open,
  });

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

  const currentRole = project?.user_role || "viewer";
  const ownerName = fullProject?.owner?.username || "Propriétaire";
  const ownerEmail = fullProject?.owner?.email || "";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden bg-white border border-zinc-200 shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-zinc-100">
          <DialogTitle className="text-lg font-semibold text-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-500" />
              <span>Partage et collaboration</span>
            </div>
            {!userIsOwner && (
               <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                 Votre rôle : {currentRole === 'editor' ? 'Éditeur' : 'Lecteur'}
               </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Non-owner message */}
          {!userIsOwner && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
              Vous n'êtes pas le propriétaire de ce projet. Vous pouvez voir les collaborateurs mais ne pouvez pas en ajouter.
            </div>
          )}

          {/* Invite Form (Owner Only) */}
          {userIsOwner && (
            <div className="space-y-2">
              <label className="text-sm text-zinc-500">
                Ajouter un collaborateur (droit d'édition)
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
                    className="h-10 text-sm bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400"
                  />
                  <Button
                    size="sm"
                    className="h-10 px-4 shrink-0 bg-zinc-900 hover:bg-zinc-800 text-white"
                    onClick={() => handleInvite()}
                    disabled={!inviteEmail.trim() || addCollaborator.isPending}
                  >
                    Inviter
                  </Button>
                </div>

                {/* Suggestions List */}
                {showSuggestions && inviteEmail.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-zinc-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
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
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 text-left transition-colors group"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={`https://avatar.vercel.sh/${user.username}`}
                                />
                                <AvatarFallback className="text-[10px] bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-zinc-900 group-hover:text-zinc-700">
                                  {user.username}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
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
            <div className="text-sm font-medium text-zinc-900 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-500" />
              Membres du projet
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
              <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scroll p-1">

                {/* PROPRIETAIRE */}
                <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-white transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-yellow-300">
                        <AvatarImage src={`https://avatar.vercel.sh/${ownerName}`} />
                        <AvatarFallback className="text-xs bg-yellow-50 text-yellow-600 font-bold">
                          {ownerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate flex items-center gap-2">
                          {ownerName}
                          {userIsOwner && <span className="text-xs text-zinc-500 font-normal">(Moi)</span>}
                        </div>
                        {ownerEmail && (
                          <div className="text-xs text-zinc-500 truncate">
                            {ownerEmail}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2.5 py-0.5 rounded-full border border-yellow-200">
                      Propriétaire
                    </span>
                 </div>

                {isLoadingCollabs && (
                  <div className="py-4 text-center text-xs text-zinc-500">
                    Chargement des collaborateurs...
                  </div>
                )}

                {!isLoadingCollabs && collaborators.map((collab) => (
                  <div
                    key={collab.user_id}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-white transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${collab.username}`}
                        />
                        <AvatarFallback className="text-xs bg-zinc-100 text-zinc-500">
                          {collab.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate flex items-center gap-2">
                          {collab.username}
                          {user?.id === collab.user_id && <span className="text-xs text-zinc-500 font-normal">(Moi)</span>}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">
                          {collab.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Éditeur
                      </span>
                      {userIsOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
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

                {!isLoadingCollabs && collaborators.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-xs text-zinc-500">
                      Aucun autre collaborateur
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-zinc-50 border-t border-zinc-100">
          <Button
            variant="ghost"
            onClick={onClose}
             className="w-full sm:w-auto text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

