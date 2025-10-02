import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User, Article, OrderLine } from "@shared/schema";
import { Clipboard, LogOut, Activity } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";
import InventoryTab from "@/components/inventory-tab";
import OrdersTab from "@/components/orders-tab";
import AdminTab from "@/components/admin-tab";

interface HomeProps {
  user: User;
  onLogout: () => void;
}

type TabType = "inventory" | "orders" | "admin";

export default function Home({ user, onLogout }: HomeProps) {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "article_created":
      case "article_updated":
      case "article_inventoried":
      case "articles_imported":
        queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
        break;
      case "inventory_count_created":
      case "inventory_count_updated":
      case "inventory_count_deleted":
        queryClient.invalidateQueries({ queryKey: ["/api/inventory-counts"] });
        break;
      case "order_line_created":
      case "order_line_inventoried":
      case "order_lines_imported":
        queryClient.invalidateQueries({ queryKey: ["/api/order-lines"] });
        break;
      case "user_created":
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        break;
    }
  }, []);

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  const tabs = [
    { id: "inventory" as TabType, label: "Lagerinventering", icon: "📦" },
    { id: "orders" as TabType, label: "Orderrader", icon: "📋" },
    { id: "admin" as TabType, label: "Administration", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Clipboard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1
                  className="text-lg font-semibold"
                  data-testid="text-app-title"
                >
                  Inventeringsapp
                </h1>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="text-current-user"
                >
                  {user.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isConnected && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-full">
                  <Activity className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent-foreground">
                    Realtid aktiv
                  </span>
                </div>
              )}

              <button
                onClick={onLogout}
                data-testid="button-logout"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logga ut
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border sticky top-16 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`button-tab-${tab.id}`}
                className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "inventory" && <InventoryTab userId={user.id} />}
        {activeTab === "orders" && <OrdersTab userId={user.id} />}
        {activeTab === "admin" && <AdminTab user={user} />}
      </main>
    </div>
  );
}
