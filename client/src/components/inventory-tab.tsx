import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Article, InventoryCount, User } from "@shared/schema";
import {
  Upload,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CountModal from "./count-modal";
import AddArticleModal from "./add-article-modal";
import ImportModal from "./import-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface InventoryTabProps {
  userId: string;
}

export default function InventoryTab({ userId }: InventoryTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Article | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingCount, setEditingCount] = useState<{
    id: string;
    count: number;
    notes: string;
  } | null>(null);

  const { data: articles = [], isLoading: articlesLoading } = useQuery<
    Article[]
  >({
    queryKey: ["/api/articles"],
  });

  const { data: inventoryCounts = [], isLoading: countsLoading } = useQuery<
    InventoryCount[]
  >({
    queryKey: ["/api/inventory-counts"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Create user lookup map for displaying names
  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u.name]));
  }, [users]);

  const updateInventoryCount = useMutation({
    mutationFn: async ({
      id,
      count,
      notes,
    }: {
      id: string;
      count?: number;
      notes?: string | null;
    }) => {
      return await apiRequest("PATCH", `/api/inventory-counts/${id}`, {
        count,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      setEditingCount(null);
      toast({ title: "Inventering uppdaterad" });
    },
  });

  const deleteInventoryCount = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/inventory-counts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      toast({ title: "Inventering borttagen" });
    },
  });

  // Group inventory counts by article (memoized for performance)
  const countsByArticle = useMemo(() => {
    return inventoryCounts.reduce(
      (acc, count) => {
        if (!acc[count.articleId]) {
          acc[count.articleId] = [];
        }
        acc[count.articleId].push(count);
        return acc;
      },
      {} as Record<string, InventoryCount[]>,
    );
  }, [inventoryCounts]);

  // Calculate total count per article (memoized for performance)
  const articleTotals = useMemo(() => {
    return Object.entries(countsByArticle).reduce(
      (acc, [articleId, counts]) => {
        acc[articleId] = counts.reduce((sum, c) => sum + c.count, 0);
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [countsByArticle]);

  const handleSort = (column: keyof Article) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleRow = (articleId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(articleId)) {
      newExpanded.delete(articleId);
    } else {
      newExpanded.add(articleId);
    }
    setExpandedRows(newExpanded);
  };

  const filteredAndSortedArticles = articles
    .filter((article) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        article.articleNumber.toLowerCase().includes(search) ||
        article.description.toLowerCase().includes(search) ||
        article.length.toLowerCase().includes(search) ||
        article.location.toLowerCase().includes(search)
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

  if (articlesLoading || countsLoading) {
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
          <h2
            className="text-2xl font-bold mb-1"
            data-testid="text-inventory-title"
          >
            Lagerinventering
          </h2>
          <p className="text-sm text-muted-foreground">
            Inventera och hantera lagerartiklar
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-article"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till artikel
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-[112px] z-10 bg-background pb-4 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Sök efter artikelnr, beskrivning, längd, lagerplats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            data-testid="input-search-articles"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" data-testid="table-inventory">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-4 py-3 w-12"></th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("articleNumber")}
                  data-testid="th-article-number"
                >
                  <div className="flex items-center gap-1">
                    Artikelnr
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      ></path>
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      ></path>
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      ></path>
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
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      ></path>
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Totalt inventerat
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedArticles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Inga artiklar hittades. Importera artiklar från Excel eller
                    lägg till manuellt.
                  </td>
                </tr>
              ) : (
                filteredAndSortedArticles.map((article) => {
                  const articleCounts = countsByArticle[article.id] || [];
                  const totalCount = articleTotals[article.id] || 0;
                  const isExpanded = expandedRows.has(article.id);
                  const hasInventories = articleCounts.length > 0;

                  return (
                    <Fragment key={article.id}>
                      <tr
                        className="hover:bg-muted/50 transition-colors"
                        data-testid={`row-article-${article.id}`}
                      >
                        <td className="px-4 py-4">
                          {hasInventories && (
                            <button
                              onClick={() => toggleRow(article.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              data-testid={`button-expand-${article.id}`}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                        <td
                          className="px-4 py-4 text-sm font-mono font-medium"
                          data-testid={`text-article-number-${article.id}`}
                        >
                          {article.articleNumber}
                        </td>
                        <td
                          className="px-4 py-4 text-sm"
                          data-testid={`text-description-${article.id}`}
                        >
                          {article.description}
                        </td>
                        <td
                          className="px-4 py-4 text-sm font-mono"
                          data-testid={`text-length-${article.id}`}
                        >
                          {article.length}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-xs font-medium">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              ></path>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              ></path>
                            </svg>
                            {article.location}
                          </span>
                        </td>
                        <td
                          className="px-4 py-4 text-sm"
                          data-testid={`text-total-count-${article.id}`}
                        >
                          {hasInventories ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                              {totalCount} st
                              {articleCounts.length > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  ({articleCounts.length} inv.)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Ej inventerad
                            </span>
                          )}
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
                            <Plus className="w-4 h-4 mr-1" />
                            Inventera
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded inventory counts */}
                      {isExpanded && hasInventories && (
                        <tr>
                          <td colSpan={7} className="px-4 py-2 bg-muted/30">
                            <div className="space-y-2">
                              {articleCounts.map((count) => (
                                <div
                                  key={count.id}
                                  className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg"
                                  data-testid={`inventory-count-${count.id}`}
                                >
                                  {editingCount?.id === count.id ? (
                                    <>
                                      <div className="flex-1 grid grid-cols-3 gap-3">
                                        <div>
                                          <label className="block text-xs text-muted-foreground mb-1">
                                            Antal
                                          </label>
                                          <Input
                                            type="number"
                                            value={editingCount.count}
                                            onChange={(e) =>
                                              setEditingCount({
                                                ...editingCount,
                                                count:
                                                  parseInt(e.target.value) || 0,
                                              })
                                            }
                                            className="text-sm"
                                            data-testid={`input-edit-count-${count.id}`}
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="block text-xs text-muted-foreground mb-1">
                                            Anteckningar
                                          </label>
                                          <Input
                                            value={editingCount.notes || ""}
                                            onChange={(e) =>
                                              setEditingCount({
                                                ...editingCount,
                                                notes: e.target.value,
                                              })
                                            }
                                            placeholder="Anteckningar..."
                                            className="text-sm"
                                            data-testid={`input-edit-notes-${count.id}`}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            updateInventoryCount.mutate({
                                              id: count.id,
                                              count: editingCount.count,
                                              notes: editingCount.notes,
                                            });
                                          }}
                                          data-testid={`button-save-${count.id}`}
                                        >
                                          Spara
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingCount(null)}
                                          data-testid={`button-cancel-${count.id}`}
                                        >
                                          Avbryt
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="text-xs text-muted-foreground block mb-1">
                                            Antal
                                          </span>
                                          <span
                                            className="font-semibold text-accent"
                                            data-testid={`text-count-${count.id}`}
                                          >
                                            {count.count} st
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground block mb-1">
                                            Användare
                                          </span>
                                          <span
                                            className="text-foreground"
                                            data-testid={`text-user-${count.id}`}
                                          >
                                            {userMap.get(count.userId) ||
                                              count.userId}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground block mb-1">
                                            Datum
                                          </span>
                                          <span
                                            className="text-foreground"
                                            data-testid={`text-date-${count.id}`}
                                          >
                                            {count.createdAt
                                              ? format(
                                                  new Date(count.createdAt),
                                                  "d MMM yyyy HH:mm",
                                                  { locale: sv },
                                                )
                                              : "-"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground block mb-1">
                                            Anteckningar
                                          </span>
                                          <span
                                            className="text-foreground"
                                            data-testid={`text-notes-${count.id}`}
                                          >
                                            {count.notes || "-"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setEditingCount({
                                              id: count.id,
                                              count: count.count,
                                              notes: count.notes || "",
                                            })
                                          }
                                          data-testid={`button-edit-${count.id}`}
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => {
                                            if (
                                              confirm(
                                                "Är du säker på att du vill ta bort denna inventering?",
                                              )
                                            ) {
                                              deleteInventoryCount.mutate(
                                                count.id,
                                              );
                                            }
                                          }}
                                          data-testid={`button-delete-${count.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
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
