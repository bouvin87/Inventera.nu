import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Welcome from "@/pages/welcome";
import Home from "@/pages/home";
import type { User } from "@shared/schema";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSavedLogin = async () => {
      const savedUserId = localStorage.getItem("loggedInUserId");
      
      if (savedUserId) {
        try {
          const response = await fetch(`/api/users/${savedUserId}`);
          if (response.ok) {
            const user = await response.json();
            setCurrentUser(user);
          } else {
            localStorage.removeItem("loggedInUserId");
          }
        } catch (error) {
          console.error("Failed to fetch saved user:", error);
          localStorage.removeItem("loggedInUserId");
        }
      }
      
      setIsCheckingAuth(false);
    };

    checkSavedLogin();
  }, []);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedInUserId");
    setCurrentUser(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {currentUser ? (
          <Home user={currentUser} onLogout={handleLogout} />
        ) : (
          <Welcome onSelectUser={handleSelectUser} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
