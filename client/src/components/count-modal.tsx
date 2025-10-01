import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Article } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface CountModalProps {
  article: Article;
  userId: string;
  open: boolean;
  onClose: () => void;
}

export default function CountModal({ article, userId, open, onClose }: CountModalProps) {
  const { toast } = useToast();
  const [count, setCount] = useState<string>("");
  const [notes, setNotes] = useState(article.notes || "");

  const saveInventory = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/articles/${article.id}/inventory`, {
        inventoryCount: parseInt(count),
        notes,
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Inventering sparad",
        description: `${article.articleNumber} har inventerats`,
      });
      onClose();
      setCount("");
      setNotes("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count === "" || isNaN(parseInt(count))) {
      toast({
        title: "Ogiltigt antal",
        description: "Ange ett giltigt antal",
        variant: "destructive",
      });
      return;
    }
    saveInventory.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="modal-count-inventory">
        <DialogHeader>
          <DialogTitle>Registrera inventering</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-sm text-muted-foreground">Artikelnummer:</div>
                <div className="font-mono font-semibold" data-testid="text-modal-article-number">
                  {article.articleNumber}
                </div>
              </div>
              <div className="text-sm" data-testid="text-modal-article-description">
                {article.description}, {article.length}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground" data-testid="text-modal-article-location">
                  {article.location}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="count">
                Inventerat antal
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Ange antal..."
                min="0"
                className="text-lg mt-2"
                data-testid="input-inventory-count"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <Label htmlFor="notes">Anteckning (valfritt)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lägg till anteckning om avvikelser eller problem..."
                rows={3}
                className="mt-2"
                data-testid="input-inventory-notes"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-count"
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={saveInventory.isPending}
                data-testid="button-save-count"
              >
                {saveInventory.isPending ? "Sparar..." : "Spara inventering"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
