import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Article, OrderLine, InventoryCount } from "@shared/schema";
import { Upload, Download, Users, Activity, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import ImportModal from "./import-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadArticlesAsExcel, downloadOrderLinesAsExcel, downloadDiscrepanciesAsExcel } from "@/lib/excel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminTab() {
  const [showImportArticles, setShowImportArticles] = useState(false);
  const [showImportOrders, setShowImportOrders] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { toast } = useToast();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: articles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: orderLines = [] } = useQuery<OrderLine[]>({
    queryKey: ["/api/order-lines"],
  });

  const { data: inventoryCounts = [] } = useQuery<InventoryCount[]>({
    queryKey: ["/api/inventory-counts"],
  });

  const verifyPasswordMutation = useMutation({
    mutationFn: async (pwd: string) => {
      return await apiRequest("/api/admin/verify", {
        method: "POST",
        body: JSON.stringify({ password: pwd }),
      });
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      setPassword("");
      toast({
        title: "Inloggad",
        description: "Du har tillgång till administrationspanelen",
      });
    },
    onError: () => {
      toast({
        title: "Felaktigt lösenord",
        description: "Försök igen",
        variant: "destructive",
      });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/admin/clear-data", {
        method: "POST",
        body: JSON.stringify({ password: "admin123" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order-lines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
      toast({
        title: "Databasen har tömts",
        description: "Alla artiklar, orderrader och inventeringar har tagits bort",
      });
      setShowClearDialog(false);
    },
    onError: () => {
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte tömma databasen",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPasswordMutation.mutate(password);
  };

  const handleClearData = () => {
    clearDataMutation.mutate();
  };

  const handleExportInventory = () => {
    downloadArticlesAsExcel(articles, inventoryCounts);
  };

  const handleExportOrders = () => {
    downloadOrderLinesAsExcel(orderLines);
  };

  const handleExportDiscrepancies = () => {
    downloadDiscrepanciesAsExcel(articles, inventoryCounts);
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Aldrig";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just nu";
    if (minutes < 60) return `${minutes} minut${minutes > 1 ? "er" : ""} sedan`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} timm${hours > 1 ? "ar" : "e"} sedan`;
    const days = Math.floor(hours / 24);
    return `${days} dag${days > 1 ? "ar" : ""} sedan`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg border border-border p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2" data-testid="text-admin-login-title">
              Administrationspanel
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Ange lösenord för att få åtkomst
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Lösenord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-admin-password"
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyPasswordMutation.isPending || !password}
                data-testid="button-admin-login"
              >
                {verifyPasswordMutation.isPending ? "Verifierar..." : "Logga in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1" data-testid="text-admin-title">Administration</h2>
          <p className="text-sm text-muted-foreground">Hantera användare, import och exportera rapporter</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowClearDialog(true)}
          data-testid="button-clear-database"
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Töm databas
        </Button>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Import Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Importera data</h3>
              <p className="text-sm text-muted-foreground">Ladda upp Excel-filer</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowImportArticles(true)}
              data-testid="button-import-articles-admin"
              className="w-full flex items-center justify-between p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">Artiklar</div>
                  <div className="text-xs text-muted-foreground">Importera lagerartiklar</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>

            <button
              onClick={() => setShowImportOrders(true)}
              data-testid="button-import-orders-admin"
              className="w-full flex items-center justify-between p-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">Orderrader</div>
                  <div className="text-xs text-muted-foreground">Importera plockade orderrader</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Exportera rapporter</h3>
              <p className="text-sm text-muted-foreground">Generera Excel-rapporter</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={handleExportInventory}
              className="w-full justify-between bg-accent hover:bg-accent/90 text-accent-foreground"
              data-testid="button-export-inventory"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">Inventeringsrapport</div>
                  <div className="text-xs opacity-90">Fullständig rapport av lagerinventering</div>
                </div>
              </div>
              <Download className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleExportOrders}
              className="w-full justify-between bg-accent hover:bg-accent/90 text-accent-foreground"
              data-testid="button-export-orders"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">Orderrapport</div>
                  <div className="text-xs opacity-90">Rapport över plockade orderrader</div>
                </div>
              </div>
              <Download className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleExportDiscrepancies}
              className="w-full justify-between bg-accent hover:bg-accent/90 text-accent-foreground"
              data-testid="button-export-discrepancies"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="text-left">
                  <div className="font-medium">Avvikelserapport</div>
                  <div className="text-xs opacity-90">Artiklar med avvikelser</div>
                </div>
              </div>
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Användarhantering</h3>
              <p className="text-sm text-muted-foreground">Hantera användare och deras behörigheter</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full" data-testid="table-users">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Användare
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Roll
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Senast aktiv
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-user-${user.id}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-semibold">
                        {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {user.role === "Administratör" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                        </svg>
                        {user.role}
                      </span>
                    ) : (
                      <span className="text-sm">{user.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
                        <Activity className="w-3 h-3" />
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                        Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-user-last-active-${user.id}`}>
                    {getTimeAgo(user.lastActive)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ImportModal
        type="articles"
        open={showImportArticles}
        onClose={() => setShowImportArticles(false)}
      />

      <ImportModal
        type="orders"
        open={showImportOrders}
        onClose={() => setShowImportOrders(false)}
      />

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent data-testid="dialog-clear-database">
          <AlertDialogHeader>
            <AlertDialogTitle>Töm databas</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att ta bort alla artiklar, orderrader och inventeringar permanent. 
              Användare påverkas inte. Är du säker på att du vill fortsätta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive hover:bg-destructive/90"
              disabled={clearDataMutation.isPending}
              data-testid="button-confirm-clear"
            >
              {clearDataMutation.isPending ? "Tömmer..." : "Töm databas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
