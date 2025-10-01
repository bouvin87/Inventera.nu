import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Welcome from "@/pages/welcome";
import Home from "@/pages/home";
import type { User } from "@shared/schema";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

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
