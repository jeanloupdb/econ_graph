import { AiInput } from "@/components/ui/ai-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAiGraphAction } from "@/graph/hooks/useAiGraphAction";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface AiAssistantModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiAssistantModal({ open, onClose }: AiAssistantModalProps) {
  const [prompt, setPrompt] = useState("");
  const { execute, isPending } = useAiGraphAction();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await execute(prompt, 'new_project');
    onClose();
    setPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Assistant Graphique IA
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Décrivez le modèle que vous souhaitez construire. L'IA créera les paramètres et les calculs nécessaires.
          </p>
          
          <AiInput
            value={prompt}
            onChange={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isPending}
            placeholder="Crée un modèle de Marge Nette avec CA et Coûts..."
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
