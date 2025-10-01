import { useQuery, useMutation } from "@tanstack/react-query";
import type { User, Article, OrderLine, InventoryCount, InsertUser } from "@shared/schema";
import { Upload, Download, Users, Activity, Lock, Trash2, Edit, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import ImportModal from "./import-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface AdminTabProps {
  user: User;
}

export default function AdminTab({ user }: AdminTabProps) {
  const isAdmin = user.role === "Administratör";
  const [showImportArticles, setShowImportArticles] = useState(false);
  const [showImportOrders, setShowImportOrders] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(isAdmin);
  const [password, setPassword] = useState("");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<Partial<InsertUser>>({
    name: "",
    role: "Användare",
    email: "",
    password: "",
    isActive: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    setIsAuthenticated(user.role === "Administratör");
  }, [user.role]);

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
      return await apiRequest("POST", "/api/admin/verify", { password: pwd });
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
      return await apiRequest("POST", "/api/admin/clear-data", { password: "admin123" });
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

  const createUserMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Användare skapad",
        description: "Den nya användaren har lagts till",
      });
      setShowAddUserDialog(false);
      setUserForm({ name: "", role: "Användare", email: "", password: "", isActive: true });
    },
    onError: () => {
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte skapa användare",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Användare uppdaterad",
        description: "Användarens information har sparats",
      });
      setShowEditUserDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte uppdatera användare",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Användare borttagen",
        description: "Användaren har tagits bort permanent",
      });
      setShowDeleteUserDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Ett fel uppstod",
        description: "Kunde inte ta bort användare",
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

  const handleAddUser = () => {
    if (!userForm.name) {
      toast({
        title: "Namn krävs",
        description: "Ange ett namn för användaren",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(userForm as InsertUser);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      role: user.role,
      email: user.email || "",
      password: "",
      isActive: user.isActive,
    });
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    if (!userForm.name) {
      toast({
        title: "Namn krävs",
        description: "Ange ett namn för användaren",
        variant: "destructive",
      });
      return;
    }
    
    const updateData = { ...userForm };
    if (!updateData.password || updateData.password === "") {
      delete updateData.password;
    }
    
    updateUserMutation.mutate({ 
      id: selectedUser.id, 
      data: updateData as Partial<User>
    });
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteUserDialog(true);
  };

  const confirmDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate(selectedUser.id);
  };

  const handleExportInventory = () => {
    downloadArticlesAsExcel(articles, inventoryCounts, users);
  };

  const handleExportOrders = () => {
    downloadOrderLinesAsExcel(orderLines);
  };

  const handleExportDiscrepancies = () => {
    downloadDiscrepanciesAsExcel(articles, inventoryCounts, users);
  };

  const getTimeAgo = (date: string | null) => {
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
          <Button
            onClick={() => {
              setUserForm({ name: "", role: "Användare", email: "", password: "", isActive: true });
              setShowAddUserDialog(true);
            }}
            data-testid="button-add-user"
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Lägg till användare
          </Button>
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Åtgärder
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
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        data-testid={`button-edit-user-${user.id}`}
                        className="gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Redigera
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        data-testid={`button-delete-user-${user.id}`}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Ta bort
                      </Button>
                    </div>
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

      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent data-testid="dialog-add-user">
          <DialogHeader>
            <DialogTitle>Lägg till användare</DialogTitle>
            <DialogDescription>
              Skapa en ny användare för lagerhanteringssystemet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Namn *</Label>
              <Input
                id="add-name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Förnamn Efternamn"
                data-testid="input-add-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">E-post</Label>
              <Input
                id="add-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="namn@example.com"
                data-testid="input-add-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Lösenord (lämna tomt för standard: Euro2025!)</Label>
              <Input
                id="add-password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Ange lösenord eller lämna tomt"
                data-testid="input-add-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Roll</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger id="add-role" data-testid="select-add-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Användare">Användare</SelectItem>
                  <SelectItem value="Administratör">Administratör</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="add-active"
                checked={userForm.isActive}
                onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                className="w-4 h-4"
                data-testid="checkbox-add-user-active"
              />
              <Label htmlFor="add-active">Aktiv användare</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddUserDialog(false)}
              data-testid="button-cancel-add-user"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={createUserMutation.isPending}
              data-testid="button-confirm-add-user"
            >
              {createUserMutation.isPending ? "Skapar..." : "Skapa användare"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Redigera användare</DialogTitle>
            <DialogDescription>
              Uppdatera användarens information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Namn *</Label>
              <Input
                id="edit-name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Förnamn Efternamn"
                data-testid="input-edit-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-post</Label>
              <Input
                id="edit-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="namn@example.com"
                data-testid="input-edit-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nytt lösenord (lämna tomt för att behålla nuvarande)</Label>
              <Input
                id="edit-password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Ange nytt lösenord eller lämna tomt"
                data-testid="input-edit-user-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Roll</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger id="edit-role" data-testid="select-edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Användare">Användare</SelectItem>
                  <SelectItem value="Administratör">Administratör</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={userForm.isActive}
                onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                className="w-4 h-4"
                data-testid="checkbox-edit-user-active"
              />
              <Label htmlFor="edit-active">Aktiv användare</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditUserDialog(false)}
              data-testid="button-cancel-edit-user"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
              data-testid="button-confirm-edit-user"
            >
              {updateUserMutation.isPending ? "Sparar..." : "Spara ändringar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent data-testid="dialog-delete-user">
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort användare</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort <strong>{selectedUser?.name}</strong>? 
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-user">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete-user"
            >
              {deleteUserMutation.isPending ? "Tar bort..." : "Ta bort användare"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
