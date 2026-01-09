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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import { useProjectStore } from "@/store/projectState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Trash2, User } from "lucide-react";
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
  const { projects, shareProject, revokeShare, isOwner } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const publicToken = project?.public_view_token;
  const userIsOwner = isOwner(projectId);

  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const queryClient = useQueryClient();

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

  // Add Collaborator Mutation
  const addCollaborator = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/projects/${projectId}/collaborators`, {
        email_or_username: inviteEmail,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });
      setInviteEmail("");
      toast.success("Collaborateur ajouté");
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

  const handlePublicToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await shareProject(projectId);
      } else {
        await revokeShare(projectId);
      }
    } catch (e) {
      console.error("Failed to toggle share", e);
      toast.error("Impossible de modifier le partage public");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden shadow-2xl shadow-black/50">
        <DialogHeader className="px-6 py-4 border-b border-zinc-800">
          <DialogTitle className="text-lg font-semibold text-white">
            Partager le projet
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Public Access Section - only for owners */}
          {userIsOwner && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-zinc-400" />
                    Lien public
                  </div>
                  <div className="text-xs text-zinc-500 max-w-[300px]">
                    Toute personne disposant du lien pourra consulter le projet
                    en lecture seule.
                  </div>
                </div>
                <Switch
                  checked={!!publicToken}
                  onCheckedChange={handlePublicToggle}
                />
              </div>

              {publicToken && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        value={`${window.location.origin}/public/${publicToken}`}
                        className="font-mono text-xs h-9 bg-zinc-800/50 border-zinc-700 text-zinc-300 pr-20"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-zinc-700"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/public/${publicToken}`
                            );
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                            toast.success("Lien copié !");
                          }}
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </Button>
                        <a
                          href={`/public/${publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-violet-400 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {userIsOwner && <Separator className="bg-zinc-800" />}

          {/* Collaborators Section */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Membres de l&apos;équipe
              </div>

              {/* Only show invite form for owners */}
              {userIsOwner && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Email ou nom d'utilisateur"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  <select
                    className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "viewer" | "editor")
                    }
                    style={{
                      colorScheme: 'dark'
                    }}
                  >
                    <option value="viewer" className="bg-zinc-800 text-white">Lecteur</option>
                    <option value="editor" className="bg-zinc-800 text-white">Éditeur</option>
                  </select>
                  <Button
                    size="sm"
                    className="h-9 px-3 shrink-0 bg-violet-600 hover:bg-violet-500 text-white"
                    onClick={() => addCollaborator.mutate()}
                    disabled={!inviteEmail.trim() || addCollaborator.isPending}
                  >
                    Inviter
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              {isLoadingCollabs ? (
                <div className="py-4 text-center text-sm text-zinc-500">
                  Chargement...
                </div>
              ) : collaborators.length === 0 ? (
                <div className="py-4 text-center text-sm text-zinc-500 italic">
                  Aucun collaborateur pour le moment.
                </div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scroll -mr-2 pr-2">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user_id}
                      className="flex items-center justify-between py-2 group rounded-lg px-2 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
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
                        <span className="text-xs text-zinc-500 capitalize">
                          {collab.role === "viewer" ? "Lecteur" : "Éditeur"}
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
