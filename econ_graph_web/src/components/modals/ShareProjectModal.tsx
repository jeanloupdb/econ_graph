'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api/client';
import { useProjectStore } from '@/store/projectState';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Globe, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProjectCollaborator {
  user_id: string;
  username: string;
  email: string;
  role: 'viewer' | 'editor';
}

interface ShareProjectModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function ShareProjectModal({ open, onClose, projectId, projectName }: ShareProjectModalProps) {
  const { projects, shareProject, revokeShare } = useProjectStore();
  const project = projects.find(p => p.id === projectId);
  const publicToken = project?.public_view_token;

  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const queryClient = useQueryClient();

  // Collaborators Query
  const { data: collaborators = [], isLoading: isLoadingCollabs } = useQuery({
    queryKey: ['project-collaborators', projectId],
    queryFn: async () => {
      return apiClient.get<ProjectCollaborator[]>(`/projects/${projectId}/collaborators`);
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
      queryClient.invalidateQueries({ queryKey: ['project-collaborators', projectId] });
      setInviteEmail('');
      toast.success('Collaborateur ajouté');
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
      queryClient.invalidateQueries({ queryKey: ['project-collaborators', projectId] });
      toast.success('Collaborateur retiré');
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
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="text-lg font-semibold">Partager le projet</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Public Access Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  Lien public
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[300px]">
                  Toute personne disposant du lien pourra consulter le projet en lecture seule.
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
                      value={`${window.location.origin}/viewer/${publicToken}`} 
                      className="font-mono text-xs h-9 bg-zinc-50 dark:bg-zinc-900 pr-20"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/viewer/${publicToken}`);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                          toast.success("Lien copié !");
                        }}
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-zinc-500" />}
                      </Button>
                      <a 
                        href={`/viewer/${publicToken}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Collaborators Section */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-500" />
                Membres de l'équipe
              </div>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Email ou nom d'utilisateur" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-9 text-sm"
                />
                <select 
                  className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                >
                  <option value="viewer">Lecteur</option>
                  <option value="editor">Éditeur</option>
                </select>
                <Button 
                  size="sm"
                  className="h-9 px-3 shrink-0"
                  onClick={() => addCollaborator.mutate()}
                  disabled={!inviteEmail.trim() || addCollaborator.isPending}
                >
                  Inviter
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              {isLoadingCollabs ? (
                <div className="py-4 text-center text-sm text-zinc-500">Chargement...</div>
              ) : collaborators.length === 0 ? (
                <div className="py-4 text-center text-sm text-zinc-500 italic">
                  Aucun collaborateur pour le moment.
                </div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scroll -mr-2 pr-2">
                  {collaborators.map((collab) => (
                    <div key={collab.user_id} className="flex items-center justify-between py-2 group">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`https://avatar.vercel.sh/${collab.username}`} />
                          <AvatarFallback className="text-xs">{collab.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{collab.username}</div>
                          <div className="text-xs text-zinc-500 truncate">{collab.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 capitalize">
                          {collab.role === 'viewer' ? 'Lecteur' : 'Éditeur'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          onClick={() => removeCollaborator.mutate(collab.user_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
