import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { OrderLine } from "@shared/schema";
import { Upload, CheckCircle, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ImportModal from "./import-modal";
import { Button } from "@/components/ui/button";

interface OrdersTabProps {
  userId: string;
}

export default function OrdersTab({ userId }: OrdersTabProps) {
  const { toast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);

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

  const stats = {
    total: orderLines.length,
    inventoried: orderLines.filter((line) => line.isInventoried).length,
    remaining: orderLines.filter((line) => !line.isInventoried).length,
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ordernr
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Artikelnr
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Beskrivning
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Längd
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Antal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Plockstatus
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orderLines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Inga orderrader hittades. Importera orderrader från Excel.
                  </td>
                </tr>
              ) : (
                orderLines.map((order) => (
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
