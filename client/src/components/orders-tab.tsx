import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { OrderLine } from "@shared/schema";
import {
  Upload,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ImportModal from "./import-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface OrdersTabProps {
  userId: string;
}

type SortField =
  | "orderNumber"
  | "articleNumber"
  | "description"
  | "length"
  | "position"
  | "quantity"
  | "pickStatus";
type SortOrder = "asc" | "desc";

const inventoryFormSchema = z.object({
  inventoriedQuantity: z.coerce.number().int().min(0),
});

export default function OrdersTab({ userId }: OrdersTabProps) {
  const { toast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("orderNumber");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [inventoryingOrder, setInventoryingOrder] = useState<OrderLine | null>(
    null,
  );

  const form = useForm<z.infer<typeof inventoryFormSchema>>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      inventoriedQuantity: 0,
    },
  });

  const { data: orderLines = [], isLoading } = useQuery<OrderLine[]>({
    queryKey: ["/api/order-lines"],
  });

  const markInventoried = useMutation({
    mutationFn: async ({
      id,
      inventoriedQuantity,
    }: {
      id: string;
      inventoriedQuantity: number;
    }) => {
      return await apiRequest("POST", `/api/order-lines/${id}/inventory`, {
        userId,
        inventoriedQuantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-lines"] });
      setInventoryingOrder(null);
      form.reset();
      toast({
        title: "Orderrad inventerad",
        description: "Orderraden har markerats som inventerad",
      });
    },
  });

  const undoInventory = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/order-lines/${id}/inventory`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/order-lines"] });
      toast({
        title: "Inventering ångrad",
        description: "Orderraden är inte längre inventerad",
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
      // Primary sort by the selected field
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) {
        // If both values are null, use default sorting (orderNumber + position)
        const orderNumA = a.orderNumber?.toLowerCase() || "";
        const orderNumB = b.orderNumber?.toLowerCase() || "";
        if (orderNumA !== orderNumB) {
          return orderNumA < orderNumB ? -1 : 1;
        }
        const posA = a.position?.toLowerCase() || "";
        const posB = b.position?.toLowerCase() || "";
        return posA < posB ? -1 : 1;
      }

      if (aVal == null) return sortOrder === "asc" ? 1 : -1;
      if (bVal == null) return sortOrder === "asc" ? -1 : 1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        const result = aVal - bVal;
        if (result !== 0) return sortOrder === "asc" ? result : -result;
      } else {
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) return sortOrder === "asc" ? -1 : 1;
        if (aStr > bStr) return sortOrder === "asc" ? 1 : -1;
      }

      // Secondary sort by orderNumber + position when primary values are equal
      const orderNumA = a.orderNumber?.toLowerCase() || "";
      const orderNumB = b.orderNumber?.toLowerCase() || "";
      if (orderNumA !== orderNumB) {
        return orderNumA < orderNumB ? -1 : 1;
      }
      const posA = a.position?.toLowerCase() || "";
      const posB = b.position?.toLowerCase() || "";
      return posA < posB ? -1 : 1;
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

  const openInventoryModal = (order: OrderLine) => {
    setInventoryingOrder(order);
    form.setValue("inventoriedQuantity", order.quantity);
  };

  const handleInventorySubmit = (
    values: z.infer<typeof inventoryFormSchema>,
  ) => {
    if (inventoryingOrder) {
      markInventoried.mutate({
        id: inventoryingOrder.id,
        inventoriedQuantity: values.inventoriedQuantity,
      });
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
          <h2
            className="text-2xl font-bold mb-1"
            data-testid="text-orders-title"
          >
            Orderrader
          </h2>
          <p className="text-sm text-muted-foreground">
            Inventera plockade orderrader
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="sticky top-0 z-20 bg-background pb-4 pt-2 -mt-2">
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
              <p className="text-sm text-muted-foreground mb-1">
                Totalt orderrader
              </p>
              <p className="text-2xl font-bold" data-testid="text-total-orders">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                ></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inventerade</p>
              <p
                className="text-2xl font-bold text-accent"
                data-testid="text-inventoried-orders"
              >
                {stats.inventoried}
              </p>
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
              <p
                className="text-2xl font-bold text-destructive"
                data-testid="text-remaining-orders"
              >
                {stats.remaining}
              </p>
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
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "orderNumber" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("position")}
                  data-testid="header-position"
                >
                  <div className="flex items-center gap-1">
                    Pos
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "position" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("articleNumber")}
                  data-testid="header-article-number"
                >
                  <div className="flex items-center gap-1">
                    Artikelnr
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "articleNumber" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("description")}
                  data-testid="header-description"
                >
                  <div className="flex items-center gap-1">
                    Beskrivning
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "description" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("length")}
                  data-testid="header-length"
                >
                  <div className="flex items-center gap-1">
                    Längd
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "length" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("quantity")}
                  data-testid="header-quantity"
                >
                  <div className="flex items-center gap-1">
                    Antal
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "quantity" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("pickStatus")}
                  data-testid="header-pick-status"
                >
                  <div className="flex items-center gap-1">
                    Plockstatus
                    <ArrowUpDown
                      className={`w-3 h-3 ${sortField === "pickStatus" ? "text-primary" : ""}`}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Inventerat antal
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
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
                    <td
                      className="px-4 py-4 text-sm font-mono font-medium"
                      data-testid={`text-order-number-${order.id}`}
                    >
                      {order.orderNumber}
                    </td>
                    <td
                      className="px-4 py-4 text-sm font-mono"
                      data-testid={`text-position-${order.id}`}
                    >
                      {order.position || "-"}
                    </td>
                    <td
                      className="px-4 py-4 text-sm font-mono"
                      data-testid={`text-article-number-${order.id}`}
                    >
                      {order.articleNumber}
                    </td>
                    <td
                      className="px-4 py-4 text-sm"
                      data-testid={`text-description-${order.id}`}
                    >
                      {order.description}
                    </td>
                    <td
                      className="px-4 py-4 text-sm font-mono"
                      data-testid={`text-length-${order.id}`}
                    >
                      {order.length}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-secondary rounded-full text-sm font-semibold">
                        {order.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            order.pickStatus === "Plockat"
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
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
                    <td
                      className="px-4 py-4 text-sm font-mono"
                      data-testid={`text-inventoried-quantity-${order.id}`}
                    >
                      {order.inventoriedQuantity !== null &&
                      order.inventoriedQuantity !== undefined
                        ? order.inventoriedQuantity
                        : "–"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {order.isInventoried ? (
                        <Button
                          onClick={() => undoInventory.mutate(order.id)}
                          variant="secondary"
                          size="sm"
                          data-testid={`button-undo-inventory-${order.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Ångra inventering
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openInventoryModal(order)}
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

      <Dialog
        open={!!inventoryingOrder}
        onOpenChange={() => setInventoryingOrder(null)}
      >
        <DialogContent data-testid="modal-inventory-quantity">
          <DialogHeader>
            <DialogTitle>Ange inventerat antal</DialogTitle>
          </DialogHeader>

          {inventoryingOrder && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleInventorySubmit)}
                className="space-y-4"
              >
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Orderrad:</span>{" "}
                    {inventoryingOrder.orderNumber}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Artikel:</span>{" "}
                    {inventoryingOrder.articleNumber}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Beställt antal:</span>{" "}
                    {inventoryingOrder.quantity}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="inventoriedQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventerat antal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max={inventoryingOrder.quantity}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                          data-testid="input-inventoried-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInventoryingOrder(null)}
                    className="flex-1"
                    data-testid="button-cancel-inventory"
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="submit"
                    disabled={markInventoried.isPending}
                    className="flex-1"
                    data-testid="button-confirm-inventory"
                  >
                    {markInventoried.isPending ? "Sparar..." : "Bekräfta"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
