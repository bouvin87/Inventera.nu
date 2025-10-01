import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";

interface AddArticleModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddArticleModal({
  open,
  onClose,
}: AddArticleModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    articleNumber: "",
    description: "",
    length: "",
    location: "",
  });

  const createArticle = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/articles", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Artikel tillagd",
        description: `${formData.articleNumber} har lagts till`,
      });
      onClose();
      setFormData({
        articleNumber: "",
        description: "",
        length: "",
        location: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.articleNumber || !formData.length) {
      toast({
        title: "Ofullständiga uppgifter",
        description: "Alla fält måste fyllas i",
        variant: "destructive",
      });
      return;
    }
    createArticle.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="modal-add-article">
        <DialogHeader>
          <DialogTitle>Lägg till ny artikel</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="articleNumber">
                Artikelnummer
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="articleNumber"
                value={formData.articleNumber}
                onChange={(e) =>
                  setFormData({ ...formData, articleNumber: e.target.value })
                }
                placeholder="t.ex. 46152985"
                className="mt-2"
                data-testid="input-article-number"
              />
            </div>

            <div>
              <Label htmlFor="description">Beskrivning</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="t.ex. C+ 70-0,46"
                className="mt-2"
                data-testid="input-description"
              />
            </div>

            <div>
              <Label htmlFor="length">
                Längd
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="length"
                value={formData.length}
                onChange={(e) =>
                  setFormData({ ...formData, length: e.target.value })
                }
                placeholder="t.ex. 6000"
                className="mt-2"
                data-testid="input-length"
              />
            </div>

            <div>
              <Label htmlFor="location">Lagerplats</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="t.ex. P.E.P.05.01"
                className="mt-2"
                data-testid="input-location"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              data-testid="button-cancel-add"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createArticle.isPending}
              data-testid="button-submit-add"
            >
              {createArticle.isPending ? "Lägger till..." : "Lägg till artikel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
