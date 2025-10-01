import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { OrderLine } from "@shared/schema";
import { Upload, CheckCircle, Clock, ArrowUpDown, Search, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ImportModal from "./import-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrdersTabProps {
  userId: string;
}

type SortField = "orderNumber" | "articleNumber" | "description" | "length" | "position" | "quantity" | "pickStatus";
type SortOrder = "asc" | "desc";

export default function OrdersTab({ userId }: OrdersTabProps) {
  const { toast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("orderNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const { data: orderLines = [], isLoading } = useQuery<OrderLine[]>({
    queryKey: ["/api/order-lines"],
  });

  const markInventoried = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/order-lines/${id}/inventory`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-lines"] });
      toast({
        title: "Orderrad inventerad",
        description: "Orderraden har markerats som inventerad",
      });
    },
  });

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orderLines.filter((order) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(search) ||
        order.articleNumber?.toLowerCase().includes(search) ||
        order.description?.toLowerCase().includes(search) ||
        order.length?.toLowerCase().includes(search) ||
        order.position?.toLowerCase().includes(search) ||
        order.pickStatus?.toLowerCase().includes(search)
      );
    });

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortOrder === "asc" ? 1 : -1;
      if (bVal == null) return sortOrder === "asc" ? -1 : 1;
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
      if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orderLines, searchTerm, sortField, sortOrder]);

  const stats = {
    total: orderLines.length,
    inventoried: orderLines.filter((line) => line.isInventoried).length,
    remaining: orderLines.filter((line) => !line.isInventoried).length,
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Laddar orderrader...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1" data-testid="text-orders-title">Orderrader</h2>
          <p className="text-sm text-muted-foreground">Inventera plockade orderrader</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowImportModal(true)}
            variant="secondary"
            data-testid="button-import-orders"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importera orderrader
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Sök efter ordernr, artikelnr, beskrivning, längd, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            data-testid="input-search-orders"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Totalt orderrader</p>
              <p className="text-2xl font-bold" data-testid="text-total-orders">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inventerade</p>
              <p className="text-2xl font-bold text-accent" data-testid="text-inventoried-orders">{stats.inventoried}</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Återstår</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-remaining-orders">{stats.remaining}</p>
            </div>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" data-testid="table-orders">
            <thead className="bg-muted">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("orderNumber")}
                  data-testid="header-order-number"
                >
                  <div className="flex items-center gap-1">
                    Ordernr
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "orderNumber" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("articleNumber")}
                  data-testid="header-article-number"
                >
                  <div className="flex items-center gap-1">
                    Artikelnr
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "articleNumber" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("description")}
                  data-testid="header-description"
                >
                  <div className="flex items-center gap-1">
                    Beskrivning
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "description" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("length")}
                  data-testid="header-length"
                >
                  <div className="flex items-center gap-1">
                    Längd
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "length" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("position")}
                  data-testid="header-position"
                >
                  <div className="flex items-center gap-1">
                    Pos
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "position" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("quantity")}
                  data-testid="header-quantity"
                >
                  <div className="flex items-center gap-1">
                    Antal
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "quantity" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("pickStatus")}
                  data-testid="header-pick-status"
                >
                  <div className="flex items-center gap-1">
                    Plockstatus
                    <ArrowUpDown className={`w-3 h-3 ${sortField === "pickStatus" ? "text-primary" : ""}`} />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {orderLines.length === 0 
                      ? "Inga orderrader hittades. Importera orderrader från Excel."
                      : "Inga orderrader matchar sökningen."}
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-muted/50 transition-colors ${order.isInventoried ? "bg-accent/5" : ""}`}
                    data-testid={`row-order-${order.id}`}
                  >
                    <td className="px-4 py-4 text-sm font-mono font-medium" data-testid={`text-order-number-${order.id}`}>
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono" data-testid={`text-article-number-${order.id}`}>
                      {order.articleNumber}
                    </td>
                    <td className="px-4 py-4 text-sm" data-testid={`text-description-${order.id}`}>
                      {order.description}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono" data-testid={`text-length-${order.id}`}>
                      {order.length}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono" data-testid={`text-position-${order.id}`}>
                      {order.position || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-secondary rounded-full text-sm font-semibold">
                        {order.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          order.pickStatus === "Plockat"
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {order.pickStatus === "Plockat" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {order.pickStatus}
                        </span>
                        {order.isInventoried && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Inventerad
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {order.isInventoried ? (
                        <Button
                          disabled
                          variant="secondary"
                          size="sm"
                          data-testid={`button-inventoried-${order.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Inventerad
                        </Button>
                      ) : order.pickStatus !== "Plockat" ? (
                        <Button
                          disabled
                          variant="secondary"
                          size="sm"
                          data-testid={`button-not-available-${order.id}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                          </svg>
                          Ej tillgänglig
                        </Button>
                      ) : (
                        <Button
                          onClick={() => markInventoried.mutate(order.id)}
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          data-testid={`button-mark-inventoried-${order.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Markera inventerad
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportModal
        type="orders"
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </>
  );
}
