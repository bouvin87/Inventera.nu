import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Article } from "@shared/schema";
import { Upload, Plus, CheckCircle, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CountModal from "./count-modal";
import AddArticleModal from "./add-article-modal";
import ImportModal from "./import-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InventoryTabProps {
  userId: string;
}

export default function InventoryTab({ userId }: InventoryTabProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    articleNumber: "",
    description: "",
    length: "",
    location: "",
  });
  const [sortColumn, setSortColumn] = useState<keyof Article | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const updateArticleNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await apiRequest("PATCH", `/api/articles/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  const handleSort = (column: keyof Article) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedArticles = articles
    .filter((article) => {
      return (
        article.articleNumber.toLowerCase().includes(filters.articleNumber.toLowerCase()) &&
        article.description.toLowerCase().includes(filters.description.toLowerCase()) &&
        article.length.toLowerCase().includes(filters.length.toLowerCase()) &&
        article.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const direction = sortDirection === "asc" ? 1 : -1;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return aVal > bVal ? direction : -direction;
    });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Laddar artiklar...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1" data-testid="text-inventory-title">Lagerinventering</h2>
          <p className="text-sm text-muted-foreground">Inventera och hantera lagerartiklar</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="secondary"
            data-testid="button-import-excel"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importera Excel
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-article"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till artikel
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            Filtrera artiklar
          </h3>
          <button
            onClick={() => setFilters({ articleNumber: "", description: "", length: "", location: "" })}
            className="text-sm text-primary hover:underline"
            data-testid="button-clear-filters"
          >
            Rensa alla filter
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Artikelnummer</label>
            <Input
              value={filters.articleNumber}
              onChange={(e) => setFilters({ ...filters, articleNumber: e.target.value })}
              placeholder="Sök artikelnr..."
              data-testid="input-filter-article-number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Beskrivning</label>
            <Input
              value={filters.description}
              onChange={(e) => setFilters({ ...filters, description: e.target.value })}
              placeholder="Sök beskrivning..."
              data-testid="input-filter-description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Längd</label>
            <Input
              value={filters.length}
              onChange={(e) => setFilters({ ...filters, length: e.target.value })}
              placeholder="Sök längd..."
              data-testid="input-filter-length"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lagerplats</label>
            <Input
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              placeholder="Sök lagerplats..."
              data-testid="input-filter-location"
            />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" data-testid="table-inventory">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("articleNumber")}
                  data-testid="th-article-number"
                >
                  <div className="flex items-center gap-1">
                    Artikelnr
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("description")}
                  data-testid="th-description"
                >
                  <div className="flex items-center gap-1">
                    Beskrivning
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("length")}
                  data-testid="th-length"
                >
                  <div className="flex items-center gap-1">
                    Längd
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("location")}
                  data-testid="th-location"
                >
                  <div className="flex items-center gap-1">
                    Lagerplats
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Anteckningar
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Inga artiklar hittades. Importera artiklar från Excel eller lägg till manuellt.
                  </td>
                </tr>
              ) : (
                filteredAndSortedArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="hover:bg-muted/50 transition-colors"
                    data-testid={`row-article-${article.id}`}
                  >
                    <td className="px-4 py-4 text-sm font-mono font-medium" data-testid={`text-article-number-${article.id}`}>
                      {article.articleNumber}
                    </td>
                    <td className="px-4 py-4 text-sm" data-testid={`text-description-${article.id}`}>
                      {article.description}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono" data-testid={`text-length-${article.id}`}>
                      {article.length}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        {article.location}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {article.isInventoried ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Inventerad
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Ej inventerad
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Input
                        value={article.notes || ""}
                        onChange={(e) => {
                          updateArticleNotes.mutate({ id: article.id, notes: e.target.value });
                        }}
                        placeholder="Lägg till anteckning..."
                        className="text-sm"
                        data-testid={`input-notes-${article.id}`}
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        onClick={() => {
                          setSelectedArticle(article);
                          setShowCountModal(true);
                        }}
                        size="sm"
                        data-testid={`button-inventory-${article.id}`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        Inventera
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedArticle && (
        <CountModal
          article={selectedArticle}
          userId={userId}
          open={showCountModal}
          onClose={() => {
            setShowCountModal(false);
            setSelectedArticle(null);
          }}
        />
      )}

      <AddArticleModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      <ImportModal
        type="articles"
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </>
  );
}
