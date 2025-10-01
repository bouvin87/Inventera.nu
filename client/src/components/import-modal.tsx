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
import { Upload, Info } from "lucide-react";

interface ImportModalProps {
  type: "articles" | "orders";
  open: boolean;
  onClose: () => void;
}

export default function ImportModal({ type, open, onClose }: ImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const importData = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = type === "articles" ? "/api/articles/import" : "/api/order-lines/import";
      return await apiRequest("POST", endpoint, formData);
    },
    onSuccess: (response) => {
      const key = type === "articles" ? "/api/articles" : "/api/order-lines";
      queryClient.invalidateQueries({ queryKey: [key] });
      
      toast({
        title: "Import lyckades",
        description: `${(response as any).count} ${type === "articles" ? "artiklar" : "orderrader"} har importerats`,
      });
      
      onClose();
      setFile(null);
    },
    onError: () => {
      toast({
        title: "Import misslyckades",
        description: "Kontrollera att filen har rätt format",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "Ingen fil vald",
        description: "Välj en Excel-fil att importera",
        variant: "destructive",
      });
      return;
    }
    importData.mutate();
  };

  const expectedColumns = type === "articles"
    ? ["Artikelnummer", "Beskrivning", "Längd", "Lagerplats"]
    : ["Ordernummer", "Artikelnummer", "Beskrivning", "Längd", "Antal", "Plockstatus"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid={`modal-import-${type}`}>
        <DialogHeader>
          <DialogTitle>
            Importera {type === "articles" ? "artiklar" : "orderrader"} från Excel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <p className="font-medium mb-1">
                  {file ? file.name : "Klicka för att välja fil eller dra och släpp"}
                </p>
                <p className="text-sm text-muted-foreground">Excel (.xlsx, .xls) upp till 10MB</p>
              </label>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Förväntade kolumner
            </h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {expectedColumns.map((col) => (
                <div key={col}>• {col}</div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              data-testid="button-cancel-import"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={importData.isPending || !file}
              data-testid="button-submit-import"
            >
              {importData.isPending ? "Importerar..." : "Importera"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
